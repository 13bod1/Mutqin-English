-- Server-private guardian report links and auditable refund requests.
-- Prerequisite: 20261024_002. Replay-safe; no production execution implied.
BEGIN;
CREATE TABLE IF NOT EXISTS public.guardian_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES public.profiles(id),
 week_start date NOT NULL, data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
 token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL,
 revoked_at timestamptz, created_by uuid REFERENCES public.profiles(id), created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (data->>'studentId' = student_id::text)
);
ALTER TABLE public.guardian_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.guardian_reports FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.guardian_reports TO authenticated;
DROP POLICY IF EXISTS guardian_reports_admin ON public.guardian_reports;
CREATE POLICY guardian_reports_admin ON public.guardian_reports FOR SELECT TO authenticated
 USING (public.current_platform_role() IN ('admin','super_admin'));

CREATE TABLE IF NOT EXISTS public.refund_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payment_id uuid NOT NULL REFERENCES public.payments(id),
 amount numeric(12,2) NOT NULL CHECK (amount > 0), reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 5 AND 1000),
 status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','rejected','refunded')),
 idempotency_key uuid NOT NULL UNIQUE, requested_by uuid NOT NULL REFERENCES public.profiles(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.refund_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.refund_records FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.refund_records TO authenticated;
DROP POLICY IF EXISTS refund_records_admin ON public.refund_records;
CREATE POLICY refund_records_admin ON public.refund_records FOR SELECT TO authenticated
 USING (public.current_platform_role() IN ('admin','super_admin'));

CREATE OR REPLACE FUNCTION public.issue_guardian_report(p_student_id uuid,p_week_start date,p_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_token text; v_id uuid; v_exp timestamptz;
BEGIN
 IF auth.uid() IS NULL OR coalesce(public.current_platform_role(),'') NOT IN ('admin','super_admin') THEN
  RAISE EXCEPTION 'Administrator required' USING ERRCODE='42501';
 END IF;
 IF p_data IS NULL OR jsonb_typeof(p_data) <> 'object' OR p_data->>'studentId' IS DISTINCT FROM p_student_id::text THEN
  RAISE EXCEPTION 'Report must contain only the selected student identity' USING ERRCODE='22023';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=p_student_id AND p.role='student') THEN
  RAISE EXCEPTION 'Student not found' USING ERRCODE='22023';
 END IF;
 v_token:=encode(gen_random_bytes(32),'hex'); v_exp:=now()+interval '7 days';
 INSERT INTO public.guardian_reports(student_id,week_start,data,token_hash,expires_at,created_by)
 VALUES(p_student_id,p_week_start,p_data,encode(digest(v_token,'sha256'),'hex'),v_exp,auth.uid()) RETURNING id INTO v_id;
 RETURN jsonb_build_object('id',v_id,'token',v_token,'expiresAt',v_exp);
END $$;

CREATE OR REPLACE FUNCTION public.read_guardian_report(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_report public.guardian_reports%ROWTYPE; v_enabled jsonb;
BEGIN
 IF p_token IS NULL OR p_token !~ '^[0-9a-f]{64}$' THEN
  RETURN jsonb_build_object('status','not_found','report',NULL);
 END IF;
 SELECT value INTO v_enabled FROM public.public_settings WHERE key='guardianReportsEnabled';
 IF v_enabled='false'::jsonb THEN RETURN jsonb_build_object('status','disabled','report',NULL); END IF;
 SELECT * INTO v_report FROM public.guardian_reports WHERE token_hash=encode(digest(p_token,'sha256'),'hex');
 IF NOT FOUND OR v_report.revoked_at IS NOT NULL THEN RETURN jsonb_build_object('status','not_found','report',NULL); END IF;
 IF v_report.expires_at<=now() THEN RETURN jsonb_build_object('status','expired','report',NULL); END IF;
 RETURN jsonb_build_object('status','ok','report',jsonb_build_object('id',v_report.id,'studentId',v_report.student_id,
  'weekStart',v_report.week_start,'data',v_report.data,'expiresAt',v_report.expires_at,'isExpired',false));
END $$;

CREATE OR REPLACE FUNCTION public.revoke_guardian_report(p_report_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF auth.uid() IS NULL OR coalesce(public.current_platform_role(),'') NOT IN ('admin','super_admin') THEN
  RAISE EXCEPTION 'Administrator required' USING ERRCODE='42501';
 END IF;
 UPDATE public.guardian_reports SET revoked_at=now() WHERE id=p_report_id;
 RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.request_refund_record(p_payment_id uuid,p_amount numeric,p_reason text,p_idempotency_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_payment public.payments%ROWTYPE; v_refund public.refund_records%ROWTYPE; v_total numeric;
BEGIN
 IF auth.uid() IS NULL OR coalesce(public.current_platform_role(),'') NOT IN ('admin','super_admin') THEN
  RAISE EXCEPTION 'Administrator required' USING ERRCODE='42501';
 END IF;
 IF p_amount IS NULL OR p_amount<=0 OR p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 5 AND 1000 OR p_idempotency_key IS NULL THEN
  RAISE EXCEPTION 'Invalid refund request' USING ERRCODE='22023';
 END IF;
 SELECT * INTO v_payment FROM public.payments WHERE id=p_payment_id FOR UPDATE;
 IF NOT FOUND OR v_payment.status <> 'approved' THEN RAISE EXCEPTION 'Approved payment required' USING ERRCODE='22023'; END IF;
 SELECT * INTO v_refund FROM public.refund_records WHERE idempotency_key=p_idempotency_key;
 IF FOUND THEN
  IF v_refund.payment_id<>p_payment_id OR v_refund.amount<>p_amount OR v_refund.reason<>btrim(p_reason) THEN
   RAISE EXCEPTION 'Idempotency key payload conflict' USING ERRCODE='22023';
  END IF;
  RETURN to_jsonb(v_refund);
 END IF;
 SELECT coalesce(sum(amount),0) INTO v_total FROM public.refund_records WHERE payment_id=p_payment_id AND status <> 'rejected';
 IF v_total+p_amount>v_payment.amount THEN RAISE EXCEPTION 'Refund exceeds payment balance' USING ERRCODE='22023'; END IF;
 INSERT INTO public.refund_records(payment_id,amount,reason,idempotency_key,requested_by)
 VALUES(p_payment_id,p_amount,btrim(p_reason),p_idempotency_key,auth.uid()) RETURNING * INTO v_refund;
 RETURN to_jsonb(v_refund);
END $$;

REVOKE ALL ON FUNCTION public.issue_guardian_report(uuid,date,jsonb),public.read_guardian_report(text),
 public.revoke_guardian_report(uuid),public.request_refund_record(uuid,numeric,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.issue_guardian_report(uuid,date,jsonb),public.revoke_guardian_report(uuid),
 public.request_refund_record(uuid,numeric,text,uuid) TO authenticated;
-- The guardian URL is a high-entropy, revocable bearer capability; token is never stored in plaintext.
GRANT EXECUTE ON FUNCTION public.read_guardian_report(text) TO anon,authenticated;
COMMIT;
