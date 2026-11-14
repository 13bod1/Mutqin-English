-- Server-authoritative viewing sessions. This is NOT a commercial DRM license server.
BEGIN;
CREATE TABLE IF NOT EXISTS public.playback_assets (
 lecture_id uuid PRIMARY KEY REFERENCES public.lectures(id), bucket text NOT NULL,
 object_path text NOT NULL CHECK(length(object_path)>0 AND object_path NOT LIKE '%..%'),
 enabled boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS public.playback_sessions (
 student_id uuid PRIMARY KEY REFERENCES public.profiles(id), session_hash text NOT NULL,
 device_hash text NOT NULL, expires_at timestamptz NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.playback_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playback_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.playback_assets,public.playback_sessions FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.begin_playback_session(p_device_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_token text; v_exp timestamptz;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 IF p_device_id IS NULL OR length(p_device_id) NOT BETWEEN 16 AND 200 THEN
  RAISE EXCEPTION 'Invalid device identifier' USING ERRCODE='22023';
 END IF;
 v_token:=encode(gen_random_bytes(32),'hex'); v_exp:=now()+interval '10 minutes';
 INSERT INTO public.playback_sessions(student_id,session_hash,device_hash,expires_at)
 VALUES(auth.uid(),encode(digest(v_token,'sha256'),'hex'),encode(digest(p_device_id,'sha256'),'hex'),v_exp)
 ON CONFLICT(student_id) DO UPDATE SET session_hash=EXCLUDED.session_hash,device_hash=EXCLUDED.device_hash,
 expires_at=EXCLUDED.expires_at,updated_at=now();
 RETURN jsonb_build_object('sessionToken',v_token,'expiresAt',v_exp);
END $$;

CREATE OR REPLACE FUNCTION public.authorize_playback_asset(p_lecture_id uuid,p_device_id text,p_session_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_session public.playback_sessions%ROWTYPE; v_asset public.playback_assets%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR p_session_token IS NULL OR p_device_id IS NULL THEN
  RAISE EXCEPTION 'Authentication and viewing session required' USING ERRCODE='42501';
 END IF;
 SELECT * INTO v_session FROM public.playback_sessions WHERE student_id=auth.uid();
 IF NOT FOUND OR v_session.expires_at<=now() OR v_session.session_hash<>encode(digest(p_session_token,'sha256'),'hex')
  OR v_session.device_hash<>encode(digest(p_device_id,'sha256'),'hex') THEN
  RAISE EXCEPTION 'Viewing session expired or replaced' USING ERRCODE='42501';
 END IF;
 IF coalesce(public.current_platform_role(),'') NOT IN ('admin','super_admin') AND NOT EXISTS(
  SELECT 1 FROM public.lecture_access a WHERE a.student_id=auth.uid() AND a.lecture_id=p_lecture_id AND NOT a.is_access_revoked
 ) THEN RAISE EXCEPTION 'Lecture entitlement required' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_asset FROM public.playback_assets WHERE lecture_id=p_lecture_id AND enabled;
 IF NOT FOUND THEN RAISE EXCEPTION 'Protected asset not configured' USING ERRCODE='22023'; END IF;
 RETURN jsonb_build_object('bucket',v_asset.bucket,'objectPath',v_asset.object_path);
END $$;

CREATE OR REPLACE FUNCTION public.end_playback_session(p_session_token text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 DELETE FROM public.playback_sessions WHERE student_id=auth.uid() AND session_hash=encode(digest(p_session_token,'sha256'),'hex');
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.begin_playback_session(text),public.authorize_playback_asset(uuid,text,text),public.end_playback_session(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.begin_playback_session(text),public.authorize_playback_asset(uuid,text,text),public.end_playback_session(text) TO authenticated;
COMMIT;
