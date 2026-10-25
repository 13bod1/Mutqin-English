-- ============================================================================
-- Project: Mr. Adel Mostafa EdTech Platform (Project Key: AG)
-- Jira Subtask: AG-14 (DB-05: DDL Migration 003 - Assignments, Countdown
--               Deadlines & Moodle-like Submissions)
-- Parent Story: AG-9 (Database Elements & Relational Persistence Layer)
-- Migration ID: 003_rollback (DOWN / Rollback Migration)
-- Description: Safely tears down Migration 003 objects in reverse dependency
--              order (Indexes -> Triggers -> Functions -> Tables -> ENUMs).
-- ============================================================================

BEGIN;

-- Zero-downtime rollback safety timeouts
SET lock_timeout = '5s';
SET statement_timeout = '30s';

-- ============================================================================
-- 1. Drop Indexes
-- ============================================================================
DROP INDEX IF EXISTS idx_submissions_graded_by;
DROP INDEX IF EXISTS idx_submissions_late;
DROP INDEX IF EXISTS idx_submissions_status;
DROP INDEX IF EXISTS idx_assignments_published_deadline;
DROP INDEX IF EXISTS idx_assignments_deadline_at;
DROP INDEX IF EXISTS idx_submissions_student_id;
DROP INDEX IF EXISTS idx_submissions_assignment_id;
DROP INDEX IF EXISTS idx_assignments_lecture_id;

-- ============================================================================
-- 2. Drop Triggers
-- ============================================================================
DROP TRIGGER IF EXISTS trg_assignment_submissions_process ON assignment_submissions;
DROP TRIGGER IF EXISTS trg_assignment_submissions_updated_at ON assignment_submissions;
DROP TRIGGER IF EXISTS trg_assignments_updated_at ON assignments;

-- ============================================================================
-- 3. Drop Custom Trigger Functions
-- ============================================================================
DROP FUNCTION IF EXISTS trg_fn_process_assignment_submission();

-- Note: set_updated_at_timestamp() is shared across migrations and defined in 001.

-- ============================================================================
-- 4. Drop Tables in Strict Reverse Dependency Order
--    (assignment_submissions -> assignments)
-- ============================================================================
DROP TABLE IF EXISTS assignment_submissions CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;

-- ============================================================================
-- 5. Drop Custom Domain ENUM Types
-- ============================================================================
DROP TYPE IF EXISTS submission_status_enum;

COMMIT;
