-- ============================================================================
-- Project: Mr. Adel Mostafa EdTech Platform (Project Key: AG)
-- Jira Subtask: AG-18 (DB-09: DDL Migration 007 - Performance Indexing, Partial Indexes,
--               PostgreSQL RLS & Security Roles)
-- Parent Story: AG-9 (Database Elements & Relational Persistence Layer)
-- Target Engine: PostgreSQL 15+ / 16+
-- Migration ID: 007_rollback (DOWN / Rollback Migration)
-- Description: Safely tears down Migration 007 objects in reverse dependency order:
--              1. Revoke Privileges & Teardown DB Roles
--              2. Drop Row-Level Security (RLS) Policies
--              3. Disable RLS on Sensitive Tables
--              4. Drop RLS Session Context Functions
--              5. Drop Performance, Partial & Anti-Fraud Indexes
-- ============================================================================

BEGIN;

-- Safe rollback timeouts
SET lock_timeout = '5s';
SET statement_timeout = '60s';
SET client_encoding = 'UTF8';

-- ============================================================================
-- 1. Revoke Security Grants & Teardown Database Roles
-- ============================================================================

-- Revoke default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM web_app, read_only_analytics, migration_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM web_app, read_only_analytics, migration_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM web_app, read_only_analytics, migration_admin;

-- Revoke specific object permissions
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM web_app, read_only_analytics, migration_admin;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM web_app, read_only_analytics, migration_admin;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM web_app, read_only_analytics, migration_admin;
REVOKE USAGE ON SCHEMA public FROM web_app, read_only_analytics, migration_admin;

-- Revoke connection privileges dynamically
DO $$
DECLARE
    cur_db text := current_database();
BEGIN
    EXECUTE format('REVOKE CONNECT ON DATABASE %I FROM web_app, read_only_analytics, migration_admin;', cur_db);
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END
$$;

-- Safely drop roles if no lingering dependencies exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'read_only_analytics') THEN
        DROP ROLE read_only_analytics;
    END IF;

    IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'web_app') THEN
        DROP ROLE web_app;
    END IF;

    IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'migration_admin') THEN
        DROP ROLE migration_admin;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Notice: Roles may still own objects outside public schema; drop deferred.';
END
$$;

-- ============================================================================
-- 2. Drop Row-Level Security Policies
-- ============================================================================

-- Table: admin_audit_logs
DROP POLICY IF EXISTS admin_audit_logs_admin_insert ON admin_audit_logs;
DROP POLICY IF EXISTS admin_audit_logs_select ON admin_audit_logs;

-- Table: leaderboard_points_ledger
DROP POLICY IF EXISTS leaderboard_ledger_admin_write ON leaderboard_points_ledger;
DROP POLICY IF EXISTS leaderboard_ledger_select ON leaderboard_points_ledger;

-- Table: refresh_tokens
DROP POLICY IF EXISTS refresh_tokens_user_delete ON refresh_tokens;
DROP POLICY IF EXISTS refresh_tokens_user_update ON refresh_tokens;
DROP POLICY IF EXISTS refresh_tokens_user_insert ON refresh_tokens;
DROP POLICY IF EXISTS refresh_tokens_select ON refresh_tokens;

-- Table: lecture_access
DROP POLICY IF EXISTS lecture_access_admin_write ON lecture_access;
DROP POLICY IF EXISTS lecture_access_select ON lecture_access;

-- Table: lecture_watch_logs
DROP POLICY IF EXISTS watch_logs_student_update ON lecture_watch_logs;
DROP POLICY IF EXISTS watch_logs_student_insert ON lecture_watch_logs;
DROP POLICY IF EXISTS watch_logs_select ON lecture_watch_logs;

-- Table: payments
DROP POLICY IF EXISTS payments_super_admin_delete ON payments;
DROP POLICY IF EXISTS payments_admin_update ON payments;
DROP POLICY IF EXISTS payments_student_insert ON payments;
DROP POLICY IF EXISTS payments_select ON payments;

-- Table: quiz_attempts
DROP POLICY IF EXISTS quiz_attempts_admin_delete ON quiz_attempts;
DROP POLICY IF EXISTS quiz_attempts_update ON quiz_attempts;
DROP POLICY IF EXISTS quiz_attempts_insert ON quiz_attempts;
DROP POLICY IF EXISTS quiz_attempts_select ON quiz_attempts;

-- Table: assignment_submissions
DROP POLICY IF EXISTS submissions_admin_delete ON assignment_submissions;
DROP POLICY IF EXISTS submissions_student_update ON assignment_submissions;
DROP POLICY IF EXISTS submissions_student_insert ON assignment_submissions;
DROP POLICY IF EXISTS submissions_student_select ON assignment_submissions;

-- ============================================================================
-- 3. Disable Row-Level Security on Sensitive Tables
-- ============================================================================

ALTER TABLE IF EXISTS admin_audit_logs NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admin_audit_logs DISABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS leaderboard_points_ledger NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS leaderboard_points_ledger DISABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS refresh_tokens NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS refresh_tokens DISABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS lecture_access NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lecture_access DISABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS lecture_watch_logs NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lecture_watch_logs DISABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS payments NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments DISABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS quiz_attempts NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quiz_attempts DISABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS assignment_submissions NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS assignment_submissions DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. Drop PostgreSQL Session Context Helper Functions
-- ============================================================================

DROP FUNCTION IF EXISTS is_admin_or_assistant();
DROP FUNCTION IF EXISTS current_app_user_role();
DROP FUNCTION IF EXISTS current_app_user_id();

-- ============================================================================
-- 5. Drop Performance, Partial & Anti-Fraud Indexes
-- ============================================================================

-- Drop supporting RLS indexes
DROP INDEX IF EXISTS idx_leaderboard_ledger_student;
DROP INDEX IF EXISTS idx_lecture_access_student;
DROP INDEX IF EXISTS idx_lecture_watch_logs_student;
DROP INDEX IF EXISTS idx_payments_student;
DROP INDEX IF EXISTS idx_quiz_attempts_student;
DROP INDEX IF EXISTS idx_submissions_student;

-- Drop core 10 SRS performance indexes
DROP INDEX IF EXISTS idx_users_leaderboard;
DROP INDEX IF EXISTS idx_payments_tx_ref;
DROP INDEX IF EXISTS idx_payments_receipt_hash;
DROP INDEX IF EXISTS idx_payments_pending_verification;
DROP INDEX IF EXISTS idx_submissions_assignment;
DROP INDEX IF EXISTS idx_assignments_deadline;
DROP INDEX IF EXISTS idx_lecture_access_lookup;
DROP INDEX IF EXISTS idx_users_group;
DROP INDEX IF EXISTS idx_users_role;
DROP INDEX IF EXISTS idx_users_phone;

COMMIT;
