-- ============================================================================
-- Project: Mr. Adel Mostafa EdTech Platform (Project Key: AG)
-- Jira Subtask: AG-12 (DB-03: DDL Migration 001 - Identity, RBAC, Egyptian Phone
--               Validation, Sessions & Courses)
-- Parent Story: AG-9 (Database Elements & Relational Persistence Layer)
-- Migration ID: 001_rollback (DOWN / Rollback Migration)
-- Description: Safely tears down Migration 001 objects in reverse dependency
--              order (Indexes -> Triggers -> Tables -> Functions -> ENUMs).
-- ============================================================================

BEGIN;

SET lock_timeout = '5s';
SET statement_timeout = '30s';

-- ============================================================================
-- 1. Drop Indexes
-- ============================================================================
DROP INDEX IF EXISTS idx_courses_academic_year_published;
DROP INDEX IF EXISTS idx_refresh_tokens_active_lookup;
DROP INDEX IF EXISTS idx_refresh_tokens_user_id;
DROP INDEX IF EXISTS idx_users_group;
DROP INDEX IF EXISTS idx_users_role;
DROP INDEX IF EXISTS idx_users_phone;

-- ============================================================================
-- 2. Drop Triggers
-- ============================================================================
DROP TRIGGER IF EXISTS trg_courses_updated_at ON courses;
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
DROP TRIGGER IF EXISTS trg_groups_updated_at ON groups;

-- ============================================================================
-- 3. Drop Tables in Strict Reverse Dependency Order
--    (courses -> refresh_tokens -> users -> groups)
-- ============================================================================
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS groups CASCADE;

-- ============================================================================
-- 4. Drop Utility Trigger Function
-- ============================================================================
DROP FUNCTION IF EXISTS set_updated_at_timestamp();

-- ============================================================================
-- 5. Drop Custom Domain ENUM Types
-- ============================================================================
DROP TYPE IF EXISTS student_type_enum;
DROP TYPE IF EXISTS user_role_enum;

COMMIT;
