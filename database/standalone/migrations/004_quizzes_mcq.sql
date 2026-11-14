-- ============================================================================
-- Project: Mr. Adel Mostafa EdTech Platform (Project Key: AG)
-- Jira Subtask: AG-15 (DB-06: DDL Migration 004 - Native MCQ Quizzes (JSONB),
--               Auto-Grading & Attempts)
-- Parent Story: AG-9 (Database Elements & Relational Persistence Layer)
-- SRS Alignment: Section 5.3 (Quizzes & Gamification Engine - P4),
--                UC-03 (Take MCQ Quiz & Earn Gamification Points), & Section 10
-- Target Engine: PostgreSQL 15+ / 16+
-- Migration ID: 004_quizzes_mcq (UP Migration)
-- ============================================================================

BEGIN;

-- Zero-downtime migration safety timeouts
SET lock_timeout = '5s';
SET statement_timeout = '30s';
SET client_encoding = 'UTF8';

-- ============================================================================
-- 1. Prerequisite Extensions & Utility Trigger Function
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. Table: quizzes (منظومة الكويزات التفاعلية - Native Timed MCQ Quizzes)
-- ============================================================================
-- SRS Section 5.3 & 10:
--   * Linked to a specific lecture (ON DELETE CASCADE)
--   * Enforces positive duration_minutes (> 0) for server-validated timers
--   * Enforces non-negative points_bonus (>= 0) for gamification rewards
--   * Controls visibility to students via is_published flag
CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 15 CHECK (duration_minutes > 0),
    passing_score NUMERIC(5, 2) NOT NULL DEFAULT 50.00,
    points_bonus INTEGER NOT NULL DEFAULT 25 CHECK (points_bonus >= 0),
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_quiz_title_not_empty CHECK (char_length(trim(title)) > 0),
    CONSTRAINT check_quiz_duration_positive CHECK (duration_minutes > 0),
    CONSTRAINT check_quiz_passing_score_range CHECK (passing_score >= 0.00 AND passing_score <= 100.00),
    CONSTRAINT check_quiz_points_bonus_non_negative CHECK (points_bonus >= 0)
);

COMMENT ON TABLE quizzes IS 'Native interactive MCQ grammar quizzes attached to lectures with server-enforced timers and gamification point bonuses (SRS Sec 5.3 & 10).';
COMMENT ON COLUMN quizzes.lecture_id IS 'Cascading foreign key to lectures(id); deleting a lecture removes its associated quizzes.';
COMMENT ON COLUMN quizzes.duration_minutes IS 'Strict positive time limit in minutes (default 15m) for the quiz session countdown timer.';
COMMENT ON COLUMN quizzes.passing_score IS 'Minimum threshold score/percentage required to mark an attempt as passed (default 50.00).';
COMMENT ON COLUMN quizzes.points_bonus IS 'Gamification points awarded to the student upon passing/completing the quiz (default 25, >= 0).';
COMMENT ON COLUMN quizzes.is_published IS 'Visibility gate; false keeps the quiz in draft mode hidden from students.';

CREATE TRIGGER trg_quizzes_updated_at
BEFORE UPDATE ON quizzes
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

-- ============================================================================
-- 3. Table: quiz_questions (أسئلة الكويز والاختيارات - MCQ Questions & JSONB Options)
-- ============================================================================
-- SRS Section 5.3 & 10 / Gherkin AC (AG-15):
--   * Stores structured MCQ choices in a JSONB array:
--     e.g., [{"id": "A", "text": "is"}, {"id": "B", "text": "are"}]
--   * Enforces question ordering uniqueness per quiz via `unique_quiz_order`
--   * Enforces positive `score_weight` (> 0) for weighted auto-grading
--   * Stores pedagogical `explanation` returned immediately upon auto-grading
CREATE TABLE quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_order INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- e.g. [{"id": "A", "text": "is"}, {"id": "B", "text": "are"}]
    correct_option_id VARCHAR(10) NOT NULL,
    explanation TEXT,
    score_weight NUMERIC(4, 2) NOT NULL DEFAULT 1.00 CHECK (score_weight > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_quiz_order UNIQUE (quiz_id, question_order),
    CONSTRAINT check_question_order_positive CHECK (question_order >= 1),
    CONSTRAINT check_question_text_not_empty CHECK (char_length(trim(question_text)) > 0),
    CONSTRAINT check_options_jsonb_valid_array CHECK (
        jsonb_typeof(options) = 'array' AND jsonb_array_length(options) >= 2
    ),
    CONSTRAINT check_correct_option_id_not_empty CHECK (char_length(trim(correct_option_id)) > 0),
    CONSTRAINT check_score_weight_positive CHECK (score_weight > 0)
);

COMMENT ON TABLE quiz_questions IS 'Individual MCQ items with JSONB choice arrays, deterministic ordering, correct option keys, and instant review explanations (SRS Sec 5.3 & 10).';
COMMENT ON COLUMN quiz_questions.quiz_id IS 'Cascading foreign key to quizzes(id); deleting a quiz purges all of its questions.';
COMMENT ON COLUMN quiz_questions.question_order IS '1-based display sequence number within the parent quiz; governed by UNIQUE(quiz_id, question_order).';
COMMENT ON COLUMN quiz_questions.options IS 'JSONB array of selectable options, e.g., [{"id": "A", "text": "is"}, {"id": "B", "text": "are"}]; must contain at least 2 choices.';
COMMENT ON COLUMN quiz_questions.correct_option_id IS 'Identifier of the right option (e.g., "A", "B", "C", "D") used by the <500ms auto-grading engine.';
COMMENT ON COLUMN quiz_questions.explanation IS 'Grammar rule explanation displayed to the student after submission (UC-03).';
COMMENT ON COLUMN quiz_questions.score_weight IS 'Points weight assigned to this question (default 1.00, must be > 0).';

CREATE TRIGGER trg_quiz_questions_updated_at
BEFORE UPDATE ON quiz_questions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

-- ============================================================================
-- 4. Table: quiz_attempts (محاولات الطلاب والتصحيح الآلي - Student Quiz Attempts)
-- ============================================================================
-- SRS Section 5.3, Section 10 & API POST /api/v1/quizzes/:id/submit:
--   * Enforces a single official attempt per student per quiz via
--     `unique_student_quiz_attempt` UNIQUE (quiz_id, student_id)
--   * Captures `answers_payload` as a JSONB array of student selections
--   * Records `score_achieved`, `total_possible_score`, `points_awarded`, `is_passed`
CREATE TABLE quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMPTZ,
    score_achieved NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    total_possible_score NUMERIC(5, 2) NOT NULL,
    points_awarded INTEGER NOT NULL DEFAULT 0,
    answers_payload JSONB NOT NULL DEFAULT '[]'::jsonb, -- سجل اختيارات الطالب
    is_passed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_student_quiz_attempt UNIQUE (quiz_id, student_id),
    CONSTRAINT check_score_achieved_non_negative CHECK (score_achieved >= 0.00),
    CONSTRAINT check_total_possible_score_positive CHECK (total_possible_score > 0.00),
    CONSTRAINT check_score_within_possible_bounds CHECK (score_achieved <= total_possible_score),
    CONSTRAINT check_points_awarded_non_negative CHECK (points_awarded >= 0),
    CONSTRAINT check_answers_payload_jsonb_array CHECK (jsonb_typeof(answers_payload) = 'array'),
    CONSTRAINT check_submission_chronology CHECK (submitted_at IS NULL OR submitted_at >= started_at)
);

COMMENT ON TABLE quiz_attempts IS 'Records student quiz sessions, auto-graded scores, gamification points awarded, and full JSONB answer audit payloads (SRS Sec 5.3 & 10).';
COMMENT ON COLUMN quiz_attempts.quiz_id IS 'Cascading foreign key to quizzes(id).';
COMMENT ON COLUMN quiz_attempts.student_id IS 'Cascading foreign key to users(id) identifying the student who took the quiz.';
COMMENT ON COLUMN quiz_attempts.answers_payload IS 'Immutable JSONB array logging student selections, e.g., [{"question_id": "...", "selected_option_id": "B"}].';
COMMENT ON COLUMN quiz_attempts.is_passed IS 'True when score_achieved meets or exceeds the parent quiz passing_score threshold.';

CREATE TRIGGER trg_quiz_attempts_updated_at
BEFORE UPDATE ON quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

-- ============================================================================
-- 5. High-Performance Indexes (SRS Section 5.3 & 10)
-- ============================================================================
-- Fast lookup of quizzes belonging to a lecture (both admin and student views)
CREATE INDEX idx_quizzes_lecture_id ON quizzes(lecture_id);
CREATE INDEX idx_quizzes_lecture_published ON quizzes(lecture_id, is_published)
WHERE is_published = true;

-- Fast ordered retrieval of questions for a quiz session and GIN indexing on JSONB options
CREATE INDEX idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX idx_quiz_questions_options_gin ON quiz_questions USING GIN (options);

-- Fast lookup of student attempts, grading analytics, and GIN indexing on JSONB answers
CREATE INDEX idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_student_id ON quiz_attempts(student_id);
CREATE INDEX idx_quiz_attempts_student_passed ON quiz_attempts(student_id, is_passed);
CREATE INDEX idx_quiz_attempts_answers_gin ON quiz_attempts USING GIN (answers_payload);

COMMIT;
