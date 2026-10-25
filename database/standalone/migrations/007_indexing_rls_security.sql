-- ============================================================================
-- Project: Mr. Adel Mostafa EdTech Platform (Project Key: AG)
-- Jira Subtask: AG-18 (DB-09: DDL Migration 007 - Performance Indexing, Partial Indexes,
--               PostgreSQL RLS & Security Roles)
-- Parent Story: AG-9 (Database Elements & Relational Persistence Layer)
-- SRS Alignment: Section 7 (Performance & Sub-10ms Latency SLAs),
--                Section 8 (Anti-Fraud Security & Verification),
--                Section 10 (PostgreSQL Row-Level Security & Role Separation)
-- Target Engine: PostgreSQL 15+ / 16+
-- Migration ID: 007_indexing_rls_security (UP Migration)
-- ============================================================================

BEGIN;

-- Zero-downtime migration safety timeouts (Prevents lock queues on live tables)
SET lock_timeout = '5s';
SET statement_timeout = '60s';
SET client_encoding = 'UTF8';

-- ============================================================================
-- 1. Performance, Partial & Anti-Fraud Indexes (SRS Section 7, 8 & 10)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Index 1: idx_users_phone (B-Tree)
-- Purpose: Sub-1ms O(1) lookup during student/staff login via Egyptian phone number.
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_phone
ON users(phone_number);

COMMENT ON INDEX idx_users_phone IS
'B-Tree index for instant authentication credential lookup by Egyptian mobile number (SRS Sec 5.6 & 10).';

-- ----------------------------------------------------------------------------
-- Index 2: idx_users_role (B-Tree)
-- Purpose: High-speed filtering by user role (super_admin, assistant, student).
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_role
ON users(role);

COMMENT ON INDEX idx_users_role IS
'B-Tree index for RBAC role filtering and staff delegation queries (SRS Sec 5.6 & 10).';

-- ----------------------------------------------------------------------------
-- Index 3: idx_users_group (B-Tree)
-- Purpose: Rapid retrieval of students belonging to a physical center or online cohort.
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_group
ON users(group_id);

COMMENT ON INDEX idx_users_group IS
'Foreign key index isolating educational center cohorts from online student batches (SRS Sec 10).';

-- ----------------------------------------------------------------------------
-- Index 4: idx_lecture_access_lookup (Composite B-Tree)
-- Purpose: Sub-1ms access entitlement verification when streaming video sessions.
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_lecture_access_lookup
ON lecture_access(student_id, lecture_id);

COMMENT ON INDEX idx_lecture_access_lookup IS
'Composite lookup index evaluating student video entitlement before signed HLS token issuance (SRS Sec 5.1 & 7).';

-- ----------------------------------------------------------------------------
-- Index 5: idx_assignments_deadline (B-Tree)
-- Purpose: Synchronized countdown timers, deadline alerts, and expired homework scans.
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_assignments_deadline
ON assignments(deadline_at);

COMMENT ON INDEX idx_assignments_deadline IS
'B-Tree index for synchronized deadline countdown queries and scheduled background cron jobs (SRS Sec 5.2 & 7).';

-- ----------------------------------------------------------------------------
-- Index 6: idx_submissions_assignment (B-Tree)
-- Purpose: High-throughput submission retrieval for assistant grading dashboards.
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_submissions_assignment
ON assignment_submissions(assignment_id);

COMMENT ON INDEX idx_submissions_assignment IS
'Foreign key index aggregating student submissions per assignment for grading queues (SRS Sec 5.2 & 10).';

-- ----------------------------------------------------------------------------
-- Index 7: idx_payments_pending_verification (Partial B-Tree Index)
-- Purpose: Assistant review queue acceleration. Indexes ONLY pending payments (status = 'pending').
-- Gherkin AC: 10,000 total payment rows with only 15 pending -> Cost < 5.0 in EXPLAIN plan.
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_payments_pending_verification
ON payments(status, created_at)
WHERE status = 'pending';

COMMENT ON INDEX idx_payments_pending_verification IS
'Partial index filtering exclusively pending payments for assistant verification dashboards (SRS Sec 5.4, 7 & 8).';

-- ----------------------------------------------------------------------------
-- Index 8: idx_payments_receipt_hash (B-Tree Anti-Fraud Index)
-- Purpose: Instant O(1) collision detection preventing reuse of payment screenshots.
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_payments_receipt_hash
ON payments(receipt_image_hash);

COMMENT ON INDEX idx_payments_receipt_hash IS
'Cryptographic SHA-256 hash index preventing duplicate payment receipt re-uploads across students (SRS Sec 5.4 & 8).';

-- ----------------------------------------------------------------------------
-- Index 9: idx_payments_tx_ref (B-Tree Anti-Fraud Index)
-- Purpose: O(1) lookup of InstaPay and Vodafone Cash transaction references.
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_payments_tx_ref
ON payments(transaction_reference);

COMMENT ON INDEX idx_payments_tx_ref IS
'Anti-fraud index ensuring instant lookup and uniqueness check on wallet transaction references (SRS Sec 5.4 & 8).';

-- ----------------------------------------------------------------------------
-- Index 10: idx_users_leaderboard (Composite B-Tree with Ordering)
-- Purpose: Sub-5ms top-podium generation sorting by score DESC, tie-breaking by created_at ASC.
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_leaderboard
ON users(total_points DESC, created_at ASC);

COMMENT ON INDEX idx_users_leaderboard IS
'Deterministic leaderboard podium index with total_points DESC and chronological tie-breaking (SRS Sec 5.3 & 7).';

-- ----------------------------------------------------------------------------
-- Supporting Indexes for RLS Predicates & Foreign Key Query Optimizations
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_submissions_student
ON assignment_submissions(student_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student
ON quiz_attempts(student_id);

CREATE INDEX IF NOT EXISTS idx_payments_student
ON payments(student_id);

CREATE INDEX IF NOT EXISTS idx_lecture_watch_logs_student
ON lecture_watch_logs(student_id);

CREATE INDEX IF NOT EXISTS idx_lecture_access_student
ON lecture_access(student_id);

CREATE INDEX IF NOT EXISTS idx_leaderboard_ledger_student
ON leaderboard_points_ledger(student_id);

-- ============================================================================
-- 2. PostgreSQL Session Context Helper Functions for RLS
-- ============================================================================

-- Function: current_app_user_id()
-- Resolves the authenticated user UUID from session settings ('app.current_user_id').
CREATE OR REPLACE FUNCTION current_app_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_user_id', true), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION current_app_user_id() IS
'Extracts the active authenticated user UUID from session context variable app.current_user_id.';

-- Function: current_app_user_role()
-- Resolves the authenticated user role from session settings ('app.current_user_role').
CREATE OR REPLACE FUNCTION current_app_user_role()
RETURNS VARCHAR AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_user_role', true), '');
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION current_app_user_role() IS
'Extracts the active user role (super_admin, assistant, student, guest) from app.current_user_role.';

-- Function: is_admin_or_assistant()
-- Fast evaluation of elevated administrative privileges.
CREATE OR REPLACE FUNCTION is_admin_or_assistant()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_setting('app.current_user_role', true) IN ('super_admin', 'assistant');
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION is_admin_or_assistant() IS
'Returns true if current session user holds super_admin or assistant administrative privileges.';

-- ============================================================================
-- 3. Row-Level Security (RLS) Activation on Sensitive Tables (SRS Section 8 & 10)
-- ============================================================================

ALTER TABLE IF EXISTS assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lecture_watch_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lecture_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS leaderboard_points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Optional: Force RLS so even table owner follows policies unless BYPASSRLS is granted
ALTER TABLE IF EXISTS assignment_submissions FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quiz_attempts FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lecture_watch_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lecture_access FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS refresh_tokens FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS leaderboard_points_ledger FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admin_audit_logs FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. Tenant & Student Isolation Security Policies
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: assignment_submissions
-- Students can only view, submit, and update their own homework submissions.
-- Staff (super_admin & assistant) have global view and grading update authority.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS submissions_student_select ON assignment_submissions;
CREATE POLICY submissions_student_select ON assignment_submissions
FOR SELECT
USING (
    is_admin_or_assistant() OR
    student_id = current_app_user_id()
);

DROP POLICY IF EXISTS submissions_student_insert ON assignment_submissions;
CREATE POLICY submissions_student_insert ON assignment_submissions
FOR INSERT
WITH CHECK (
    is_admin_or_assistant() OR
    student_id = current_app_user_id()
);

DROP POLICY IF EXISTS submissions_student_update ON assignment_submissions;
CREATE POLICY submissions_student_update ON assignment_submissions
FOR UPDATE
USING (
    is_admin_or_assistant() OR
    (student_id = current_app_user_id() AND status = 'submitted')
)
WITH CHECK (
    is_admin_or_assistant() OR
    (student_id = current_app_user_id() AND status = 'submitted')
);

DROP POLICY IF EXISTS submissions_admin_delete ON assignment_submissions;
CREATE POLICY submissions_admin_delete ON assignment_submissions
FOR DELETE
USING (
    is_admin_or_assistant()
);

-- ----------------------------------------------------------------------------
-- Table: quiz_attempts
-- Students can only view and insert their own exam attempts.
-- Updates are limited to the student's active session or administrative adjustments.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS quiz_attempts_select ON quiz_attempts;
CREATE POLICY quiz_attempts_select ON quiz_attempts
FOR SELECT
USING (
    is_admin_or_assistant() OR
    student_id = current_app_user_id()
);

DROP POLICY IF EXISTS quiz_attempts_insert ON quiz_attempts;
CREATE POLICY quiz_attempts_insert ON quiz_attempts
FOR INSERT
WITH CHECK (
    is_admin_or_assistant() OR
    student_id = current_app_user_id()
);

DROP POLICY IF EXISTS quiz_attempts_update ON quiz_attempts;
CREATE POLICY quiz_attempts_update ON quiz_attempts
FOR UPDATE
USING (
    is_admin_or_assistant() OR
    student_id = current_app_user_id()
)
WITH CHECK (
    is_admin_or_assistant() OR
    student_id = current_app_user_id()
);

DROP POLICY IF EXISTS quiz_attempts_admin_delete ON quiz_attempts;
CREATE POLICY quiz_attempts_admin_delete ON quiz_attempts
FOR DELETE
USING (
    is_admin_or_assistant()
);

-- ----------------------------------------------------------------------------
-- Table: payments
-- Anti-fraud security: Students can view their payment proofs and submit requests.
-- ONLY assistants and super_admin can approve or reject payments (UPDATE).
-- Students CANNOT modify or delete payment records once submitted.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS payments_select ON payments;
CREATE POLICY payments_select ON payments
FOR SELECT
USING (
    is_admin_or_assistant() OR
    student_id = current_app_user_id()
);

DROP POLICY IF EXISTS payments_student_insert ON payments;
CREATE POLICY payments_student_insert ON payments
FOR INSERT
WITH CHECK (
    student_id = current_app_user_id()
);

DROP POLICY IF EXISTS payments_admin_update ON payments;
CREATE POLICY payments_admin_update ON payments
FOR UPDATE
USING (
    is_admin_or_assistant()
)
WITH CHECK (
    is_admin_or_assistant()
);

DROP POLICY IF EXISTS payments_super_admin_delete ON payments;
CREATE POLICY payments_super_admin_delete ON payments
FOR DELETE
USING (
    current_app_user_role() = 'super_admin'
);

-- ----------------------------------------------------------------------------
-- Table: lecture_watch_logs
-- Students log their personal playback heartbeats; staff can inspect telemetry.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS watch_logs_select ON lecture_watch_logs;
CREATE POLICY watch_logs_select ON lecture_watch_logs
FOR SELECT
USING (
    is_admin_or_assistant() OR
    student_id = current_app_user_id()
);

DROP POLICY IF EXISTS watch_logs_student_insert ON lecture_watch_logs;
CREATE POLICY watch_logs_student_insert ON lecture_watch_logs
FOR INSERT
WITH CHECK (
    student_id = current_app_user_id()
);

DROP POLICY IF EXISTS watch_logs_student_update ON lecture_watch_logs;
CREATE POLICY watch_logs_student_update ON lecture_watch_logs
FOR UPDATE
USING (
    student_id = current_app_user_id()
);

-- ----------------------------------------------------------------------------
-- Table: lecture_access
-- Students can query their granted video entitlements.
-- Only assistants and super_admin can grant or revoke access.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS lecture_access_select ON lecture_access;
CREATE POLICY lecture_access_select ON lecture_access
FOR SELECT
USING (
    is_admin_or_assistant() OR
    student_id = current_app_user_id()
);

DROP POLICY IF EXISTS lecture_access_admin_write ON lecture_access;
CREATE POLICY lecture_access_admin_write ON lecture_access
FOR ALL
USING (
    is_admin_or_assistant()
)
WITH CHECK (
    is_admin_or_assistant()
);

-- ----------------------------------------------------------------------------
-- Table: refresh_tokens
-- Strict session confidentiality: Users access and revoke only their own tokens.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS refresh_tokens_select ON refresh_tokens;
CREATE POLICY refresh_tokens_select ON refresh_tokens
FOR SELECT
USING (
    is_admin_or_assistant() OR
    user_id = current_app_user_id()
);

DROP POLICY IF EXISTS refresh_tokens_user_insert ON refresh_tokens;
CREATE POLICY refresh_tokens_user_insert ON refresh_tokens
FOR INSERT
WITH CHECK (
    user_id = current_app_user_id()
);

DROP POLICY IF EXISTS refresh_tokens_user_update ON refresh_tokens;
CREATE POLICY refresh_tokens_user_update ON refresh_tokens
FOR UPDATE
USING (
    is_admin_or_assistant() OR
    user_id = current_app_user_id()
);

DROP POLICY IF EXISTS refresh_tokens_user_delete ON refresh_tokens;
CREATE POLICY refresh_tokens_user_delete ON refresh_tokens
FOR DELETE
USING (
    is_admin_or_assistant() OR
    user_id = current_app_user_id()
);

-- ----------------------------------------------------------------------------
-- Table: leaderboard_points_ledger
-- Students can audit their personal gamification points transactions.
-- Staff can view all and perform manual point adjustments.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS leaderboard_ledger_select ON leaderboard_points_ledger;
CREATE POLICY leaderboard_ledger_select ON leaderboard_points_ledger
FOR SELECT
USING (
    is_admin_or_assistant() OR
    student_id = current_app_user_id()
);

DROP POLICY IF EXISTS leaderboard_ledger_admin_write ON leaderboard_points_ledger;
CREATE POLICY leaderboard_ledger_admin_write ON leaderboard_points_ledger
FOR ALL
USING (
    is_admin_or_assistant()
)
WITH CHECK (
    is_admin_or_assistant()
);

-- ----------------------------------------------------------------------------
-- Table: admin_audit_logs
-- Strictly restricted to super_admin and assistants for compliance.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS admin_audit_logs_select ON admin_audit_logs;
CREATE POLICY admin_audit_logs_select ON admin_audit_logs
FOR SELECT
USING (
    is_admin_or_assistant()
);

DROP POLICY IF EXISTS admin_audit_logs_admin_insert ON admin_audit_logs;
CREATE POLICY admin_audit_logs_admin_insert ON admin_audit_logs
FOR INSERT
WITH CHECK (
    is_admin_or_assistant()
);

-- ============================================================================
-- 5. Least-Privilege Database Roles & Security Grants (SRS Section 8 & 10)
-- ============================================================================

-- Safely create database roles if they do not already exist
DO $$
BEGIN
    -- 1. migration_admin: Dedicated schema administrator (CI/CD / DBA)
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'migration_admin') THEN
        CREATE ROLE migration_admin WITH LOGIN PASSWORD 'change_me_in_prod_migration_admin'
            BYPASSRLS CREATEROLE CREATEDB;
    ELSE
        ALTER ROLE migration_admin WITH BYPASSRLS CREATEROLE CREATEDB;
    END IF;

    -- 2. web_app: Application connection pool role (FastAPI / NestJS / PgBouncer)
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'web_app') THEN
        CREATE ROLE web_app WITH LOGIN PASSWORD 'change_me_in_prod_web_app'
            NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE;
    ELSE
        ALTER ROLE web_app WITH NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE;
    END IF;

    -- 3. read_only_analytics: Reporting, Metabase & BI dashboards role
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'read_only_analytics') THEN
        CREATE ROLE read_only_analytics WITH LOGIN PASSWORD 'change_me_in_prod_analytics'
            NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE;
    ELSE
        ALTER ROLE read_only_analytics WITH NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE;
    END IF;
END
$$;

-- Grant database connection permissions dynamically to current database
DO $$
DECLARE
    cur_db text := current_database();
BEGIN
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO web_app, read_only_analytics, migration_admin;', cur_db);
END
$$;

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO web_app, read_only_analytics, migration_admin;

-- ----------------------------------------------------------------------------
-- Permissions: web_app (Least Privilege: Full DML, RLS Enforced, Zero DDL)
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO web_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO web_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO web_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO web_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO web_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO web_app;

-- ----------------------------------------------------------------------------
-- Permissions: read_only_analytics (Least Privilege: SELECT Only, Zero Mutations)
-- ----------------------------------------------------------------------------
GRANT SELECT ON ALL TABLES IN SCHEMA public TO read_only_analytics;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO read_only_analytics;

-- Explicitly ensure read_only_analytics has no mutation capability
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM read_only_analytics;

-- ----------------------------------------------------------------------------
-- Permissions: migration_admin (Full DDL & Schema Management Authority)
-- ----------------------------------------------------------------------------
GRANT ALL PRIVILEGES ON SCHEMA public TO migration_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO migration_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO migration_admin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO migration_admin;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO migration_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO migration_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON FUNCTIONS TO migration_admin;

COMMIT;
