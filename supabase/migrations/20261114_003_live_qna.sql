-- ============================================================================
-- MUTQIN ENGLISH / MR. ADEL MOSTAFA ACADEMY
-- Migration: 20261114_003_live_qna.sql
-- Subtask: AG-95 / AG-124 (Real Live Q&A Persistence, RLS Moderation & Rate Limit)
-- Target: Supabase / PostgreSQL 16+
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Ensure required extensions exist
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 2. Table: public.live_questions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    answered_at TIMESTAMPTZ,
    moderated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    moderated_at TIMESTAMPTZ,
    CONSTRAINT live_questions_body_length CHECK (char_length(body) >= 5 AND char_length(body) <= 1000),
    CONSTRAINT live_questions_status_check CHECK (status IN ('pending', 'approved', 'hidden', 'answered'))
);

-- Indexes for fast filtering and chronological retrieval
CREATE INDEX IF NOT EXISTS idx_live_questions_session_created
    ON public.live_questions(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_questions_student_created
    ON public.live_questions(student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_questions_status
    ON public.live_questions(status);

-- ----------------------------------------------------------------------------
-- 3. Row Level Security (RLS)
-- AG-124 Invariant: Pending questions are visible ONLY to staff, not author.
-- Students only SELECT approved or answered questions. Staff select all.
-- Direct INSERT / UPDATE / DELETE are blocked; writes must go through RPCs.
-- ----------------------------------------------------------------------------
ALTER TABLE public.live_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Live questions: read approved or staff" ON public.live_questions;
CREATE POLICY "Live questions: read approved or staff"
    ON public.live_questions FOR SELECT
    TO authenticated
    USING (
        status IN ('approved', 'answered')
        OR public.current_platform_role() IN ('admin', 'assistant', 'super_admin')
    );

DROP POLICY IF EXISTS "Live questions: anon read approved" ON public.live_questions;
CREATE POLICY "Live questions: anon read approved"
    ON public.live_questions FOR SELECT
    TO anon
    USING (status IN ('approved', 'answered'));

-- Revoke direct table mutations; RPCs govern all inserts & updates
REVOKE ALL ON public.live_questions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.live_questions TO authenticated, anon;
GRANT ALL ON public.live_questions TO service_role;

-- ----------------------------------------------------------------------------
-- 4. RPC: submit_live_question
-- Checks auth.uid(), derives student name securely from public.profiles,
-- enforces 15s rate limit via pg_advisory_xact_lock, inserts with 'pending' status.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_live_question(
    p_session_id TEXT,
    p_body TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid UUID;
    v_student_name TEXT;
    v_clean_body TEXT;
    v_last_created TIMESTAMPTZ;
    v_remaining INT;
    v_question_id UUID;
    v_created_at TIMESTAMPTZ;
BEGIN
    -- 1. Ensure caller is authenticated
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: must be authenticated to submit questions'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Validate session id
    IF p_session_id IS NULL OR length(trim(p_session_id)) NOT BETWEEN 1 AND 200 THEN
        RAISE EXCEPTION 'Session ID is required'
            USING ERRCODE = '22023';
    END IF;

    -- 3. Sanitize and validate body length (5..1000 characters)
    v_clean_body := trim(p_body);
    IF v_clean_body IS NULL OR char_length(v_clean_body) < 5 OR char_length(v_clean_body) > 1000 THEN
        RAISE EXCEPTION 'Question body must be between 5 and 1000 characters'
            USING ERRCODE = '22023';
    END IF;

    -- 4. 15-second atomic rate limit with pg_advisory_xact_lock
    -- Replay-safe lock keyed by authenticated user ID
    PERFORM pg_advisory_xact_lock(hashtext('live_qna_' || v_uid::text));

    SELECT created_at INTO v_last_created
    FROM public.live_questions
    WHERE student_id = v_uid
      AND created_at > (now() - interval '15 seconds')
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_last_created IS NOT NULL THEN
        v_remaining := ceil(15 - extract(epoch from (now() - v_last_created)));
        IF v_remaining < 1 THEN
            v_remaining := 1;
        END IF;
        RAISE EXCEPTION 'Rate limit exceeded: please wait % seconds before submitting another question.', v_remaining
            USING ERRCODE = 'P0001',
                  DETAIL = json_build_object('secondsRemaining', v_remaining)::text;
    END IF;

    -- 5. Fetch student name from server profile (never trust arbitrary client input)
    SELECT COALESCE(NULLIF(trim(full_name_ar), ''), NULLIF(trim(full_name_en), ''), 'Student')
    INTO v_student_name
    FROM public.profiles
    WHERE id = v_uid;

    IF v_student_name IS NULL THEN
        v_student_name := 'Student ' || substr(v_uid::text, 1, 6);
    END IF;

    -- 6. Insert pending live question
    v_created_at := now();
    INSERT INTO public.live_questions (
        session_id,
        student_id,
        student_name,
        body,
        status,
        created_at
    ) VALUES (
        trim(p_session_id),
        v_uid,
        v_student_name,
        v_clean_body,
        'pending',
        v_created_at
    )
    RETURNING id INTO v_question_id;

    RETURN jsonb_build_object(
        'success', true,
        'question', jsonb_build_object(
            'id', v_question_id::text,
            'liveSessionId', trim(p_session_id),
            'studentId', v_uid::text,
            'studentName', v_student_name,
            'body', v_clean_body,
            'status', 'pending',
            'createdAt', v_created_at
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_live_question(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_live_question(TEXT, TEXT) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 5. RPC: moderate_live_question
-- Verifies caller is staff (admin/assistant/super_admin), updates question status,
-- records audit actor (moderated_by) and timestamp (moderated_at / answered_at).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.moderate_live_question(
    p_question_id UUID,
    p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_role TEXT;
    v_uid UUID;
    v_updated_id UUID;
BEGIN
    -- 1. Authentication check
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: authentication required'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Validate caller role (admin, assistant, super_admin only)
    v_caller_role := public.current_platform_role();
    IF v_caller_role IS NULL OR v_caller_role NOT IN ('admin', 'assistant', 'super_admin') THEN
        RAISE EXCEPTION 'Forbidden: only staff (admin/assistant) can moderate live questions'
            USING ERRCODE = '42501';
    END IF;

    -- 3. Validate status
    IF p_status IS NULL OR p_status NOT IN ('approved', 'answered', 'hidden') THEN
        RAISE EXCEPTION 'Invalid status: must be approved, answered, or hidden'
            USING ERRCODE = '22023';
    END IF;

    -- 4. Update status with audit trail
    UPDATE public.live_questions
    SET status = p_status,
        moderated_by = v_uid,
        moderated_at = now(),
        answered_at = CASE WHEN p_status = 'answered' THEN now() ELSE answered_at END
    WHERE id = p_question_id
    RETURNING id INTO v_updated_id;

    IF v_updated_id IS NULL THEN
        RAISE EXCEPTION 'Live question not found'
            USING ERRCODE = 'P0002';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'questionId', v_updated_id::text,
        'status', p_status,
        'moderatedBy', v_uid::text,
        'moderatedAt', now()
    );
END;
$$;

REVOKE ALL ON FUNCTION public.moderate_live_question(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_live_question(UUID, TEXT) TO authenticated, service_role;

COMMIT;
