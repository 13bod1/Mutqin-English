-- ============================================================================
-- Project: Mr. Adel Mostafa EdTech Platform (Project Key: AG)
-- Jira Subtask: AG-12 (DB-03: DDL Migration 001 - Identity, RBAC, Egyptian Phone
--               Validation, Sessions & Courses)
-- Parent Story: AG-9 (Database Elements & Relational Persistence Layer)
-- SRS Alignment: Section 5.6 (RBAC Anti-Micromanagement Hierarchy) & Section 10
-- Target Engine: PostgreSQL 15+ / 16+
-- Migration ID: 001_identity_rbac_courses (UP Migration)
-- ============================================================================

BEGIN;

-- Zero-downtime migration safety timeouts
SET lock_timeout = '5s';
SET statement_timeout = '30s';
SET client_encoding = 'UTF8';

-- ============================================================================
-- 1. Cryptographic & UUID Extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. Custom Domain ENUM Types (Identity & RBAC)
-- ============================================================================
-- SRS Section 5.6: Anti-Micromanagement RBAC Hierarchy
--   * super_admin : Teacher (Mr. Adel Mostafa) - Full platform, pricing & financial authority
--   * assistant   : Administrative Assistant - Delegated payment verification, group & grading ops
--   * student     : Enrolled Student - Authorized lecture streaming, quizzes & assignments
--   * guest       : Unauthenticated / Prospective Visitor - Free previews & single-session purchase
CREATE TYPE user_role_enum AS ENUM (
    'super_admin',
    'assistant',
    'student',
    'guest'
);

-- SRS Section 10: Student Attendance Mode Classification
--   * center_offline : Physical attendance at an educational center (free/included lecture access)
--   * online_only    : Remote platform student (pay-per-session or package access)
CREATE TYPE student_type_enum AS ENUM (
    'center_offline',
    'online_only'
);

-- ============================================================================
-- 3. Utility Trigger Function for Automatic `updated_at` Maintenance
-- ============================================================================
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. Table: groups (فصل السناتر عن الأونلاين - Center & Online Cohort Isolation)
-- ============================================================================
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    is_offline BOOLEAN NOT NULL DEFAULT true,
    center_location VARCHAR(150),
    schedule_description VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_group_name_not_empty CHECK (char_length(trim(name)) > 0)
);

COMMENT ON TABLE groups IS 'Isolates physical attendance center cohorts from online-only student batches (SRS Sec 10).';
COMMENT ON COLUMN groups.name IS 'Unique cohort identifier (e.g., سنتر ألفا - مجموعة السبت والثلاثاء 4 عصراً).';
COMMENT ON COLUMN groups.is_offline IS 'True for physical educational centers; false for virtual online cohorts.';

CREATE TRIGGER trg_groups_updated_at
BEFORE UPDATE ON groups
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

-- ============================================================================
-- 5. Table: users (جدول المستخدمين - Identity, RBAC & Gamification Balance)
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(15) NOT NULL UNIQUE,
    full_name VARCHAR(120) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'student',
    student_type student_type_enum NOT NULL DEFAULT 'online_only',
    group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    total_points INTEGER NOT NULL DEFAULT 0 CHECK (total_points >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_egyptian_phone CHECK (phone_number ~ '^01[0125][0-9]{8}$'),
    CONSTRAINT check_full_name_not_empty CHECK (char_length(trim(full_name)) >= 3),
    CONSTRAINT check_password_hash_format CHECK (char_length(trim(password_hash)) >= 20)
);

COMMENT ON TABLE users IS 'Core identity store separating Super Admin (Teacher), Assistants, Center Students, and Online Students (SRS Sec 5.6 & 10).';
COMMENT ON COLUMN users.phone_number IS 'Primary authentication identifier validated against Egyptian telecom prefixes (010, 011, 012, 015) + 8 digits.';
COMMENT ON COLUMN users.password_hash IS 'Argon2id or bcrypt cryptographic password hash (plaintext storage strictly prohibited).';
COMMENT ON COLUMN users.group_id IS 'Nullable reference to groups(id); ON DELETE SET NULL preserves student account if a group is dissolved.';
COMMENT ON COLUMN users.total_points IS 'Denormalized non-negative gamification score synchronized with leaderboard_points_ledger.';

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

-- ============================================================================
-- 6. Table: refresh_tokens (جدول رموز التوثيق المحدثة لتأمين JWT)
-- ============================================================================
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    device_info VARCHAR(255),
    ip_address INET,
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_token_hash_not_empty CHECK (char_length(trim(token_hash)) >= 32),
    CONSTRAINT check_refresh_token_expiry CHECK (expires_at > created_at)
);

COMMENT ON TABLE refresh_tokens IS 'Stateful JWT refresh token store supporting multi-device telemetry, IP auditing, and instant session revocation (SRS Sec 10).';
COMMENT ON COLUMN refresh_tokens.user_id IS 'Cascading foreign key to users(id); deleting a user purges all associated sessions immediately.';
COMMENT ON COLUMN refresh_tokens.token_hash IS 'Unique SHA-256/Argon2 hash of the HttpOnly refresh token cookie.';

-- ============================================================================
-- 7. Table: courses (منظومة الكورسات الدراسية - Academic Curriculum Containers)
-- ============================================================================
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(150) NOT NULL,
    academic_year VARCHAR(50) NOT NULL, -- e.g. 'الثانوية العامة - الصف الثالث'
    description TEXT,
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_course_title_not_empty CHECK (char_length(trim(title)) > 0),
    CONSTRAINT check_academic_year_not_empty CHECK (char_length(trim(academic_year)) > 0)
);

COMMENT ON TABLE courses IS 'Top-level academic curriculum containers categorized by Egyptian Secondary stage year (SRS Sec 10).';
COMMENT ON COLUMN courses.academic_year IS 'Target grade level, e.g., الثانوية العامة - الصف الثالث.';

CREATE TRIGGER trg_courses_updated_at
BEFORE UPDATE ON courses
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

-- ============================================================================
-- 8. Foundational Identity, Session & Course Indexes (SRS Section 10)
-- ============================================================================
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_group ON users(group_id);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_active_lookup ON refresh_tokens(token_hash) WHERE is_revoked = false;
CREATE INDEX idx_courses_academic_year_published ON courses(academic_year, is_published);

COMMIT;
