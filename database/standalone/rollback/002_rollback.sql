-- ============================================================================
-- Migration Rollback: 002_rollback.sql
-- Project: Mr. Adel Mostafa EdTech Platform (Project AG)
-- Jira Parent Story: AG-9 (Database Elements & Relational Persistence Layer)
-- Jira Subtask: AG-13 (DB-04: DDL Migration 002 - Adaptive Lectures, Signed Access & Telemetry Watch Logs)
-- SRS Reference: Section 5.1, Section 6, Section 10
-- Academic Alignment: AASTMT Agile Software Development (Dr. Tamer Abdel Latif)
-- Target Engine: PostgreSQL 15+ / 16+
-- Description: Safely tears down Migration 002 objects (indexes, triggers,
--              tables, and custom ENUM types) in reverse dependency order.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Drop Performance Indexes (Explicit cleanup before table drops)
-- ----------------------------------------------------------------------------

-- Watch Logs Indexes
DROP INDEX IF EXISTS idx_lecture_watch_logs_session_started;
DROP INDEX IF EXISTS idx_lecture_watch_logs_ip;
DROP INDEX IF EXISTS idx_lecture_watch_logs_last_ping;
DROP INDEX IF EXISTS idx_lecture_watch_logs_student_lecture;

-- Lecture Access Indexes
DROP INDEX IF EXISTS idx_lecture_access_lecture_id;
DROP INDEX IF EXISTS idx_lecture_access_student_active;
DROP INDEX IF EXISTS idx_lecture_access_lookup;

-- Lectures Indexes
DROP INDEX IF EXISTS idx_lectures_lecture_type;
DROP INDEX IF EXISTS idx_lectures_published_course;
DROP INDEX IF EXISTS idx_lectures_course_id;

-- ----------------------------------------------------------------------------
-- 2. Drop Automatic Timestamp Triggers
-- (Note: Shared function `update_updated_at_column()` is preserved for Migration 001 tables)
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_lecture_access_updated_at ON lecture_access;
DROP TRIGGER IF EXISTS trg_lectures_updated_at ON lectures;

-- ----------------------------------------------------------------------------
-- 3. Drop Relational Tables (Strict Reverse Foreign-Key Dependency Order)
-- ----------------------------------------------------------------------------

-- 3.1 Drop telemetry watch logs first (depends on lectures & users)
DROP TABLE IF EXISTS lecture_watch_logs CASCADE;

-- 3.2 Drop student lecture access grants second (depends on lectures & users)
DROP TABLE IF EXISTS lecture_access CASCADE;

-- 3.3 Drop lectures table last (depends on courses)
DROP TABLE IF EXISTS lectures CASCADE;

-- ----------------------------------------------------------------------------
-- 4. Drop Custom Domain ENUM Types
-- ----------------------------------------------------------------------------
DROP TYPE IF EXISTS access_grant_type_enum CASCADE;
DROP TYPE IF EXISTS lecture_type_enum CASCADE;

COMMIT;
