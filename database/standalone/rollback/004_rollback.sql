-- ============================================================================
-- Project: Mr. Adel Mostafa EdTech Platform (Project Key: AG)
-- Jira Subtask: AG-15 (DB-06: DDL Migration 004 - Native MCQ Quizzes (JSONB),
--               Auto-Grading & Attempts)
-- Parent Story: AG-9 (Database Elements & Relational Persistence Layer)
-- Migration ID: 004_rollback (DOWN / Rollback Migration)
-- Description: Safely tears down Migration 004 objects in strict reverse
--              dependency order (Indexes -> Triggers -> Tables).
-- ============================================================================

BEGIN;

SET lock_timeout = '5s';
SET statement_timeout = '30s';

-- ============================================================================
-- 1. Drop Indexes
-- ============================================================================
DROP INDEX IF EXISTS idx_quiz_attempts_answers_gin;
DROP INDEX IF EXISTS idx_quiz_attempts_student_passed;
DROP INDEX IF EXISTS idx_quiz_attempts_student_id;
DROP INDEX IF EXISTS idx_quiz_attempts_quiz_id;
DROP INDEX IF EXISTS idx_quiz_questions_options_gin;
DROP INDEX IF EXISTS idx_quiz_questions_quiz_id;
DROP INDEX IF EXISTS idx_quizzes_lecture_published;
DROP INDEX IF EXISTS idx_quizzes_lecture_id;

-- ============================================================================
-- 2. Drop Triggers
-- ============================================================================
DROP TRIGGER IF EXISTS trg_quiz_attempts_updated_at ON quiz_attempts;
DROP TRIGGER IF EXISTS trg_quiz_questions_updated_at ON quiz_questions;
DROP TRIGGER IF EXISTS trg_quizzes_updated_at ON quizzes;

-- ============================================================================
-- 3. Drop Tables in Strict Reverse Dependency Order
--    (quiz_attempts -> quiz_questions -> quizzes)
-- ============================================================================
DROP TABLE IF EXISTS quiz_attempts CASCADE;
DROP TABLE IF EXISTS quiz_questions CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;

COMMIT;
