-- ============================================================================
-- MUTQIN ENGLISH — Supplementary Migration: XP System
-- Run in Supabase SQL Editor AFTER the main migration
-- ============================================================================

-- 1. user_progress table (replaces progress_summaries for real-time XP tracking)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_progress (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  xp                  INT NOT NULL DEFAULT 0,
  quizzes_completed   INT NOT NULL DEFAULT 0,
  total_correct       INT NOT NULL DEFAULT 0,
  total_answered      INT NOT NULL DEFAULT 0,
  grammar_accuracy    NUMERIC(5,2) NOT NULL DEFAULT 0,
  vocab_accuracy      NUMERIC(5,2) NOT NULL DEFAULT 0,
  streak_days         INT NOT NULL DEFAULT 0,
  best_streak_days    INT NOT NULL DEFAULT 0,
  study_hours         NUMERIC(6,1) NOT NULL DEFAULT 0,
  study_hours_delta   NUMERIC(5,1) NOT NULL DEFAULT 0,
  vocabulary_words    INT NOT NULL DEFAULT 0,
  weekly_activity     TEXT NOT NULL DEFAULT '[]',  -- JSON array of {day, minutes}
  last_active_date    TEXT,                        -- YYYY-MM-DD
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_progress IS
  'Real-time XP and progress tracking per student. Starts at zero. Updated on each quiz attempt.';

-- 2. quiz_attempts table (individual quiz results)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id         TEXT NOT NULL,
  correct         INT NOT NULL DEFAULT 0,
  total           INT NOT NULL DEFAULT 0,
  percent         NUMERIC(5,2) NOT NULL DEFAULT 0,
  xp_earned       INT NOT NULL DEFAULT 0,
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.quiz_attempts IS
  'Individual quiz attempt records used for XP history and analytics.';

-- 3. Indexes
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_progress_xp     ON public.user_progress (xp DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user   ON public.quiz_attempts (user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz   ON public.quiz_attempts (quiz_id, completed_at DESC);

-- 4. RLS Policies
-- ----------------------------------------------------------------------------
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- user_progress: users can read all (for leaderboard), but only modify their own
DROP POLICY IF EXISTS "Public: read user_progress"         ON public.user_progress;
DROP POLICY IF EXISTS "Users: insert own user_progress"    ON public.user_progress;
DROP POLICY IF EXISTS "Users: update own user_progress"    ON public.user_progress;

CREATE POLICY "Public: read user_progress"
  ON public.user_progress FOR SELECT USING (true);

CREATE POLICY "Users: insert own user_progress"
  ON public.user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users: update own user_progress"
  ON public.user_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- quiz_attempts: private per user
DROP POLICY IF EXISTS "Users: insert quiz_attempts"  ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users: read own quiz_attempts" ON public.quiz_attempts;

CREATE POLICY "Users: insert quiz_attempts"
  ON public.quiz_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users: read own quiz_attempts"
  ON public.quiz_attempts FOR SELECT
  USING (auth.uid() = user_id);

-- 5. Join with profiles for leaderboard query
-- The Angular service runs:
--   SELECT user_id, xp, profiles!inner(full_name_en, full_name_ar, city_en, city_ar)
--   FROM user_progress ORDER BY xp DESC LIMIT 10
-- This requires profiles to be readable. Add public policy if not already present:
DROP POLICY IF EXISTS "Public: read profiles for leaderboard" ON public.profiles;
CREATE POLICY "Public: read profiles for leaderboard"
  ON public.profiles FOR SELECT USING (true);

-- ============================================================================
-- Done! Run this SQL in Supabase → SQL Editor
-- ============================================================================
