-- ============================================================================
-- Migration: 002_lectures_streaming_access.sql
-- Project: Mr. Adel Mostafa EdTech Platform (Project AG)
-- Jira Parent Story: AG-9 (Database Elements & Relational Persistence Layer)
-- Jira Subtask: AG-13 (DB-04: DDL Migration 002 - Adaptive Lectures, Signed Access & Telemetry Watch Logs)
-- SRS Reference: Section 5.1 (Lecture & Streaming Engine), Section 6 (Video Pipeline & HLS), Section 10 (DDL Schema)
-- Academic Alignment: AASTMT Agile Software Development (Dr. Tamer Abdel Latif)
-- Target Engine: PostgreSQL 15+ / 16+ (ACID Compliant)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Prerequisites: Extensions
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 2. Custom Domain ENUM Types (Idempotent Creation)
-- ----------------------------------------------------------------------------

-- ENUM: lecture_type_enum ('recorded', 'live')
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lecture_type_enum') THEN
        CREATE TYPE lecture_type_enum AS ENUM ('recorded', 'live');
    END IF;
END $$;

-- ENUM: access_grant_type_enum ('group_included', 'purchased', 'manual_grant')
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'access_grant_type_enum') THEN
        CREATE TYPE access_grant_type_enum AS ENUM ('group_included', 'purchased', 'manual_grant');
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Automatic Timestamp Update Trigger Function
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 4. Table: lectures
-- Represents HLS multi-bitrate video sessions & scheduled live interactive streams.
-- SRS Section 5.1, Section 6 (RFC 8216 HLS Multi-Bitrate Ladder: 360p, 480p, 720p, 1080p)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lectures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    lecture_type lecture_type_enum NOT NULL DEFAULT 'recorded',
    hls_master_url TEXT,                                -- Master M3U8 multi-bitrate adaptive playlist
    live_stream_url TEXT,                               -- Interactive live room / WebRTC / RTMP broadcast link
    live_scheduled_at TIMESTAMPTZ,                      -- Scheduled start timestamp for live broadcast
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    price NUMERIC(8, 2) NOT NULL DEFAULT 0.00,          -- EGP pay-per-session pricing model (e.g. 50.00 EGP)
    is_free_preview BOOLEAN NOT NULL DEFAULT false,     -- Public sample preview for unauthenticated/guest students
    max_allowed_views INTEGER DEFAULT NULL,             -- Flexible view policy: NULL = unlimited; capped (e.g. 5) upon abuse detection
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Check Constraints
    CONSTRAINT chk_lectures_duration_positive CHECK (duration_seconds >= 0),
    CONSTRAINT chk_lectures_price_non_negative CHECK (price >= 0.00),
    CONSTRAINT chk_lectures_max_views_positive CHECK (max_allowed_views IS NULL OR max_allowed_views > 0)
);

-- Comments on lectures table & columns
COMMENT ON TABLE lectures IS 'Course lectures supporting multi-bitrate HLS adaptive streaming and live broadcast sessions';
COMMENT ON COLUMN lectures.hls_master_url IS 'RFC 8216 Master M3U8 playlist URL pointing to 360p/480p/720p/1080p variant streams';
COMMENT ON COLUMN lectures.max_allowed_views IS 'Flexible abuse policy: NULL by default (unlimited), bounded dynamically upon multi-IP abuse detection';
COMMENT ON COLUMN lectures.price IS 'Single session unit price in Egyptian Pounds (EGP), 0.00 for free lectures';

-- Trigger: lectures updated_at
DROP TRIGGER IF EXISTS trg_lectures_updated_at ON lectures;
CREATE TRIGGER trg_lectures_updated_at
    BEFORE UPDATE ON lectures
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 5. Table: lecture_access
-- Enforces per-student access gating, purchase validation, and views quota tracking.
-- SRS Section 5.1 (Flexible View Policy & Abuse Monitoring), Section 10 (DDL Schema)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lecture_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    grant_type access_grant_type_enum NOT NULL,         -- 'group_included' (offline center), 'purchased' (online EGP), 'manual_grant' (admin)
    views_consumed INTEGER NOT NULL DEFAULT 0,          -- Count of full/substantial playback sessions consumed
    is_access_revoked BOOLEAN NOT NULL DEFAULT false,   -- Administrative or anti-fraud revocation flag
    granted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT unique_student_lecture_access UNIQUE (student_id, lecture_id),
    CONSTRAINT chk_lecture_access_views_consumed CHECK (views_consumed >= 0)
);

-- Comments on lecture_access table & columns
COMMENT ON TABLE lecture_access IS 'Student entitlement bridge table governing streaming access permissions and view quotas';
COMMENT ON COLUMN lecture_access.grant_type IS 'Access origin: group_included (center offline students), purchased (Vodafone Cash/InstaPay), manual_grant (super_admin)';
COMMENT ON CONSTRAINT unique_student_lecture_access ON lecture_access IS 'Strict prevention of duplicate access grants for the same student and lecture';

-- Trigger: lecture_access updated_at
DROP TRIGGER IF EXISTS trg_lecture_access_updated_at ON lecture_access;
CREATE TRIGGER trg_lecture_access_updated_at
    BEFORE UPDATE ON lecture_access
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 6. Table: lecture_watch_logs
-- Captures high-frequency playback heartbeats, telemetry pings, IP tracking & resume positions.
-- SRS Section 5.1, Section 6, Section 10 (Audit & View Duration Tracking)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lecture_watch_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    watch_duration_seconds INTEGER NOT NULL DEFAULT 0,   -- Cumulative playback seconds spent in current session
    last_playback_position INTEGER NOT NULL DEFAULT 0,   -- Playhead position in seconds for seamless resume
    ip_address INET,                                     -- Client IP address for anti-account-sharing fraud telemetry
    user_agent TEXT,                                     -- Browser / device fingerprint for concurrent session detection
    session_started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_ping_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Check Constraints
    CONSTRAINT chk_watch_logs_duration_positive CHECK (watch_duration_seconds >= 0),
    CONSTRAINT chk_watch_logs_position_positive CHECK (last_playback_position >= 0)
);

-- Comments on lecture_watch_logs table & columns
COMMENT ON TABLE lecture_watch_logs IS 'Real-time telemetry and heartbeat audit trail for playback progress, session resumption, and anti-fraud monitoring';
COMMENT ON COLUMN lecture_watch_logs.last_playback_position IS 'Exact timestamp in seconds where the student paused or sent last ping, used for resume feature';
COMMENT ON COLUMN lecture_watch_logs.ip_address IS 'Client IP used to calculate abuse metrics across distributed geolocations or proxy evasion';

-- ----------------------------------------------------------------------------
-- 7. High-Performance Relational Indexes
-- Sub-10ms query execution plan under 250+ concurrent streaming students
-- ----------------------------------------------------------------------------

-- 7.1 Indexes for `lectures`
CREATE INDEX IF NOT EXISTS idx_lectures_course_id
    ON lectures(course_id);

CREATE INDEX IF NOT EXISTS idx_lectures_published_course
    ON lectures(course_id, is_published, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lectures_lecture_type
    ON lectures(lecture_type);

-- 7.2 Indexes for `lecture_access`
-- Critical index: invoked on every signed media manifest & chunk validation request
CREATE INDEX IF NOT EXISTS idx_lecture_access_lookup
    ON lecture_access(student_id, lecture_id);

CREATE INDEX IF NOT EXISTS idx_lecture_access_student_active
    ON lecture_access(student_id, is_access_revoked)
    WHERE is_access_revoked = false;

CREATE INDEX IF NOT EXISTS idx_lecture_access_lecture_id
    ON lecture_access(lecture_id);

-- 7.3 Indexes for `lecture_watch_logs`
-- Telemetry queries: resume position lookup, session audit, and fraud analysis
CREATE INDEX IF NOT EXISTS idx_lecture_watch_logs_student_lecture
    ON lecture_watch_logs(student_id, lecture_id);

CREATE INDEX IF NOT EXISTS idx_lecture_watch_logs_last_ping
    ON lecture_watch_logs(last_ping_at DESC);

CREATE INDEX IF NOT EXISTS idx_lecture_watch_logs_ip
    ON lecture_watch_logs(ip_address);

CREATE INDEX IF NOT EXISTS idx_lecture_watch_logs_session_started
    ON lecture_watch_logs(session_started_at DESC);

COMMIT;
