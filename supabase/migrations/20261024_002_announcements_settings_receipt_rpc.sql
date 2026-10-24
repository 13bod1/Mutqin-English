-- ============================================================================
-- MUTQIN ENGLISH / MR. ADEL MOSTAFA ACADEMY
-- Migration: 20261024_002_announcements_settings_receipt_rpc.sql
-- Subtasks: AG-72 (RBAC Security), AG-73 (Theme & Popup), AG-74 (Announcements), AG-75 (Assistant KPIs)
-- Target: Supabase / PostgreSQL 16+
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Prerequisites: Ensure extensions exist
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 2. Base Profiles Table (if not existing) & Role Escalation Defense
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name_en TEXT,
    full_name_ar TEXT,
    initials TEXT,
    role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'assistant', 'admin', 'super_admin')),
    stage_en VARCHAR(20) DEFAULT 'sec3',
    stage_ar VARCHAR(20) DEFAULT 'sec3',
    phone VARCHAR(20) DEFAULT '',
    city_en TEXT DEFAULT 'Cairo',
    city_ar TEXT DEFAULT 'القاهرة',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow public read of select profile details (for leaderboard / display)
DROP POLICY IF EXISTS "Public: read profiles" ON public.profiles;
CREATE POLICY "Public: read profiles"
  ON public.profiles FOR SELECT
  USING (true);

-- Allow users to update their own profile (name, phone, stage)
DROP POLICY IF EXISTS "Users: update own profile" ON public.profiles;
CREATE POLICY "Users: update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow authenticated users to insert their own student profile (resolves signup / upsert defect)
DROP POLICY IF EXISTS "Users: insert own profile" ON public.profiles;
CREATE POLICY "Users: insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id AND role = 'student');

-- Prevent unauthorized role alteration / self-elevation on INSERT and UPDATE
CREATE OR REPLACE FUNCTION public.protect_profiles_role_change()
RETURNS TRIGGER AS $$
DECLARE
    v_caller_role TEXT;
    v_jwt_role TEXT;
BEGIN
    -- Allow server provisioning / service_role / system bypass
    BEGIN
        v_jwt_role := current_setting('request.jwt.claim.role', true);
    EXCEPTION WHEN OTHERS THEN
        v_jwt_role := NULL;
    END;

    IF v_jwt_role = 'service_role' THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        -- Non-admins cannot insert profiles with elevated roles
        -- Does NOT trust auth.uid() being NULL; unauthenticated callers cannot create elevated profiles
        IF NEW.role IS DISTINCT FROM 'student' THEN
            IF auth.uid() IS NULL THEN
                RAISE EXCEPTION 'Security Violation: Unauthenticated callers cannot create elevated profiles.';
            END IF;

            SELECT role INTO v_caller_role
            FROM public.profiles
            WHERE id = auth.uid();

            IF v_caller_role IS NULL OR v_caller_role NOT IN ('admin', 'super_admin') THEN
                RAISE EXCEPTION 'Security Violation: Users cannot self-assign elevated roles on profile creation.';
            END IF;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            IF auth.uid() IS NULL THEN
                RAISE EXCEPTION 'Security Violation: Unauthenticated callers cannot alter profile roles.';
            END IF;

            SELECT role INTO v_caller_role
            FROM public.profiles
            WHERE id = auth.uid();

            IF v_caller_role IS NULL OR v_caller_role NOT IN ('admin', 'super_admin') THEN
                RAISE EXCEPTION 'Security Violation: Users cannot alter their own profile role or privileges.';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_profiles_role ON public.profiles;
CREATE TRIGGER trg_protect_profiles_role
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profiles_role_change();

-- Defense-in-depth: Explicitly revoke EXECUTE from anon AND PUBLIC, grant only to authenticated and service_role
REVOKE EXECUTE ON FUNCTION public.protect_profiles_role_change() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.protect_profiles_role_change() TO authenticated;
GRANT EXECUTE ON FUNCTION public.protect_profiles_role_change() TO service_role;

-- ----------------------------------------------------------------------------
-- 3. Public Settings Table (NO Financial PII)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.public_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.public_settings ENABLE ROW LEVEL SECURITY;

-- Read policy: Anyone (anon or authenticated) can read public settings
DROP POLICY IF EXISTS "Public: read public_settings" ON public.public_settings;
CREATE POLICY "Public: read public_settings"
  ON public.public_settings FOR SELECT
  USING (true);

-- Write policy: Only admins can insert or update public settings
DROP POLICY IF EXISTS "Admin: write public_settings" ON public.public_settings;
CREATE POLICY "Admin: write public_settings"
  ON public.public_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Seed default public settings (Safe UI configurations only — no gateway secrets or payment accounts)
INSERT INTO public.public_settings (key, value, description)
VALUES
  ('theme', '"light"'::jsonb, 'Default visual theme (light or dark)'),
  ('userPortalTheme', '"classic"'::jsonb, 'Upstream user portal theme accent (classic, navy, emerald, purple, gold)'),
  ('popupMessage', jsonb_build_object(
      'enabled', false,
      'title', '',
      'message', '',
      'type', 'info',
      'dismissible', true,
      'linkText', '',
      'linkUrl', ''
  ), 'Global notification announcement popup banner'),
  ('branding', jsonb_build_object(
      'name', 'Mr. Adel Mostafa Academy',
      'defaultLang', 'ar',
      'showLangSwitch', true
  ), 'Public platform identity and language flags')
ON CONFLICT (key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. Public Announcements Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    audience VARCHAR(50) NOT NULL DEFAULT 'all',
    channels TEXT[] NOT NULL DEFAULT ARRAY['inApp'],
    state VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (state IN ('scheduled', 'sent', 'draft')),
    pinned BOOLEAN NOT NULL DEFAULT false,
    at TIMESTAMPTZ NOT NULL DEFAULT now(),
    seen INT NOT NULL DEFAULT 0,
    reach INT NOT NULL DEFAULT 0,
    icon VARCHAR(50) NOT NULL DEFAULT 'bell',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Read policy: Public and students can ONLY see published announcements whose publication time has arrived
DROP POLICY IF EXISTS "Public: read published announcements" ON public.announcements;
CREATE POLICY "Public: read published announcements"
  ON public.announcements FOR SELECT
  USING (
    (state = 'sent' AND at <= now())
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'assistant', 'super_admin')
    )
  );

-- Write policy: Only admins can create/update announcements (retained admin-only per original spec)
DROP POLICY IF EXISTS "Staff: write announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admin: write announcements" ON public.announcements;
CREATE POLICY "Admin: write announcements"
  ON public.announcements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- ----------------------------------------------------------------------------
-- 5. Canonical Payments Table (Matching 006 Schema)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_enum') THEN
        CREATE TYPE payment_method_enum AS ENUM (
            'instapay', 'vodafone_cash', 'orange_cash', 'center_cash_code', 'card'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_enum') THEN
        CREATE TYPE payment_status_enum AS ENUM (
            'pending', 'approved', 'rejected'
        );
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lecture_id UUID,
    amount NUMERIC(8, 2) NOT NULL CHECK (amount > 0),
    payment_method payment_method_enum NOT NULL DEFAULT 'instapay',
    sender_phone_or_account VARCHAR(50),
    transaction_reference VARCHAR(100) UNIQUE,
    receipt_image_url TEXT,
    receipt_image_hash VARCHAR(64) UNIQUE,
    status payment_status_enum NOT NULL DEFAULT 'pending',
    rejection_reason VARCHAR(255),
    verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Payments RLS:
-- Students can only view their own payment submissions
-- Staff can view all payments for auditing and verification
DROP POLICY IF EXISTS "payments_select" ON public.payments;
CREATE POLICY "payments_select" ON public.payments
  FOR SELECT
  USING (
    student_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'assistant', 'super_admin')
    )
  );

-- Students can insert their own payment requests with strictly pending status
DROP POLICY IF EXISTS "payments_student_insert" ON public.payments;
CREATE POLICY "payments_student_insert" ON public.payments
  FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND status = 'pending'
  );

-- Direct client updates to payments are strictly prohibited to prevent audit bypass
-- Status mutations must strictly be performed via review_receipt_rpc
DROP POLICY IF EXISTS "payments_staff_update" ON public.payments;

-- Privilege restrictions: Revoke direct UPDATE from anon and authenticated clients
REVOKE UPDATE ON public.payments FROM anon, authenticated, PUBLIC;
GRANT UPDATE ON public.payments TO service_role;
GRANT SELECT, INSERT ON public.payments TO authenticated;
GRANT SELECT ON public.payments TO anon;

-- ----------------------------------------------------------------------------
-- 6. Private Receipt Review Audit Events Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.receipt_review_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('approved', 'rejected')),
    reviewer_id UUID NOT NULL REFERENCES auth.users(id),
    reviewer_role VARCHAR(20) NOT NULL CHECK (reviewer_role IN ('admin', 'assistant', 'super_admin')),
    note TEXT,
    turnaround_minutes INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.receipt_review_events ENABLE ROW LEVEL SECURITY;

-- Private: Staff ONLY can read audit trail; students and anon have zero access
DROP POLICY IF EXISTS "Staff: read receipt_review_events" ON public.receipt_review_events;
CREATE POLICY "Staff: read receipt_review_events"
  ON public.receipt_review_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'assistant', 'super_admin')
    )
  );

-- ----------------------------------------------------------------------------
-- 7. Transactional Verification RPC: review_receipt_rpc
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.review_receipt_rpc(
    p_payment_id UUID,
    p_action TEXT,
    p_note TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_payment RECORD;
    v_turnaround_minutes INT := 0;
    v_result JSONB;
BEGIN
    -- 1. Identity & Role Verification
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Session missing auth.uid().';
    END IF;

    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = v_caller_id;

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('admin', 'assistant', 'super_admin') THEN
        RAISE EXCEPTION 'Unauthorized: Only verified staff (admin or assistant) can review receipts.';
    END IF;

    IF p_action NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid action: must be approved or rejected.';
    END IF;

    -- 2. Lock & Validate Payment Row
    SELECT * INTO v_payment
    FROM public.payments
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment receipt % not found.', p_payment_id;
    END IF;

    IF v_payment.status != 'pending' THEN
        RAISE EXCEPTION 'Payment receipt % is not pending review (current status: %).', p_payment_id, v_payment.status;
    END IF;

    -- Calculate Turnaround Minutes from Creation
    IF v_payment.created_at IS NOT NULL THEN
        v_turnaround_minutes := GREATEST(0, ROUND(EXTRACT(EPOCH FROM (now() - v_payment.created_at)) / 60)::INT);
    END IF;

    -- 3. Atomic State Mutation
    IF p_action = 'approved' THEN
        UPDATE public.payments
        SET status = 'approved',
            verified_by = v_caller_id,
            verified_at = now(),
            rejection_reason = NULL,
            updated_at = now()
        WHERE id = p_payment_id;

        -- Unlock lecture entitlement if canonical lecture_access table is present
        -- Preserves views_consumed counter while unrevoking on repeated approval
        IF v_payment.lecture_id IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lecture_access') THEN
            INSERT INTO public.lecture_access (
                student_id,
                lecture_id,
                grant_type,
                views_consumed,
                is_access_revoked,
                granted_at,
                updated_at
            )
            VALUES (
                v_payment.student_id,
                v_payment.lecture_id,
                'purchased',
                0,
                false,
                now(),
                now()
            )
            ON CONFLICT (student_id, lecture_id) DO UPDATE
            SET is_access_revoked = false,
                grant_type = 'purchased',
                updated_at = now();
        END IF;
    ELSE
        UPDATE public.payments
        SET status = 'rejected',
            verified_by = v_caller_id,
            verified_at = now(),
            rejection_reason = p_note,
            updated_at = now()
        WHERE id = p_payment_id;
    END IF;

    -- 4. Record Private Audit Event
    INSERT INTO public.receipt_review_events (
        payment_id,
        action,
        reviewer_id,
        reviewer_role,
        note,
        turnaround_minutes,
        created_at
    ) VALUES (
        p_payment_id,
        p_action,
        v_caller_id,
        v_caller_role,
        p_note,
        v_turnaround_minutes,
        now()
    );

    v_result := jsonb_build_object(
        'success', true,
        'payment_id', p_payment_id,
        'status', p_action,
        'reviewer_id', v_caller_id,
        'reviewed_at', now(),
        'turnaround_minutes', v_turnaround_minutes
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Defense-in-depth: Explicitly revoke EXECUTE from anon AND PUBLIC, grant only to authenticated and service_role
REVOKE EXECUTE ON FUNCTION public.review_receipt_rpc(UUID, TEXT, TEXT) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_receipt_rpc(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_receipt_rpc(UUID, TEXT, TEXT) TO service_role;

COMMIT;
