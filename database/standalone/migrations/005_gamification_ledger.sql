-- ============================================================================
-- Project: Mr. Adel Mostafa EdTech Platform (Project Key: AG)
-- Jira Subtask: AG-16 (DB-07: DDL Migration 005 - Gamification Engine, Immutable
--               Points Ledger & Chess-Tier Ranking)
-- Parent Story: AG-9 (Database Elements & Relational Persistence Layer)
-- SRS Alignment: Section 5.3 (Quizzes & Gamification Engine - P4),
--                UC-03 (Take MCQ Quiz & Earn Gamification Points),
--                Story 3 (Interactive Native MCQ Quizzes & Chess-Tier Gamification),
--                & Section 10 (Full Relational Schema Specification)
-- Target Engine: PostgreSQL 15+ / 16+
-- Migration ID: 005_gamification_ledger (UP Migration)
-- ============================================================================

BEGIN;

-- Zero-downtime migration safety timeouts
SET lock_timeout = '5s';
SET statement_timeout = '30s';
SET client_encoding = 'UTF8';

-- ============================================================================
-- 1. Prerequisite Extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. Custom Domain ENUM: point_action_type_enum
-- ============================================================================
-- SRS Section 5.3 & Section 10:
-- Defines the exhaustive, auditable catalog of point transaction events:
--   * quiz_score        : Points awarded from scoring on interactive grammar/reading quizzes
--   * assignment_ontime : Bonus reward points for submitting homework sheets prior to deadline
--   * attendance_bonus  : Motivational points for center lecture attendance or completed video streaming
--   * manual_adjustment: Administrative correction (reward grants or academic violation deductions)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'point_action_type_enum') THEN
        CREATE TYPE point_action_type_enum AS ENUM (
            'quiz_score',
            'assignment_ontime',
            'attendance_bonus',
            'manual_adjustment'
        );
    END IF;
END
$$;

COMMENT ON TYPE point_action_type_enum IS 'Exhaustive categorization of gamification points transactions per SRS Section 5.3 & 10.';

-- ============================================================================
-- 3. Table: leaderboard_points_ledger (سجل تدقيق حركات التلعيب غير القابل للتعديل)
-- ============================================================================
-- Architecture: Append-Only Immutable Accounting Ledger
-- Business Rules:
--   * Points can be credited (positive) or debited (negative adjustment), but points_change cannot be zero.
--   * Never allows in-place UPDATE or DELETE (enforced by trigger).
--   * student_id references users(id) with ON DELETE CASCADE.
--   * reference_id provides polymorphic UUID linkage to source entities (quizzes, assignments, lectures).
CREATE TABLE IF NOT EXISTS leaderboard_points_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type point_action_type_enum NOT NULL,
    points_change INTEGER NOT NULL,
    reference_id UUID,
    description VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_points_change_nonzero CHECK (points_change <> 0),
    CONSTRAINT check_description_not_empty CHECK (description IS NULL OR char_length(trim(description)) > 0)
);

COMMENT ON TABLE leaderboard_points_ledger IS 'Append-only immutable audit ledger tracking all gamification point increments, bonuses, and penalties (SRS Sec 5.3 & 10).';
COMMENT ON COLUMN leaderboard_points_ledger.id IS 'Cryptographically unique transaction identifier (UUIDv4).';
COMMENT ON COLUMN leaderboard_points_ledger.student_id IS 'Foreign key referencing users(id) receiving or deducted points.';
COMMENT ON COLUMN leaderboard_points_ledger.action_type IS 'Point trigger event classification (quiz_score, assignment_ontime, attendance_bonus, manual_adjustment).';
COMMENT ON COLUMN leaderboard_points_ledger.points_change IS 'Delta applied to the student points balance; positive for rewards, negative for deductions; cannot be 0.';
COMMENT ON COLUMN leaderboard_points_ledger.reference_id IS 'Optional foreign entity UUID (quiz attempt ID, assignment submission ID, lecture ID, or audit ID).';
COMMENT ON COLUMN leaderboard_points_ledger.description IS 'Human-readable transaction description (e.g., "Full score bonus on Unit 1 Quiz", "Early homework submission").';
COMMENT ON COLUMN leaderboard_points_ledger.created_at IS 'Immutable UTC timestamp when the points transaction was committed.';

-- ============================================================================
-- 4. High-Performance Indexes for Gamification & Leaderboard (SRS Section 10)
-- ============================================================================
-- Fast student history timeline lookup (student profile / activity feed)
CREATE INDEX IF NOT EXISTS idx_points_ledger_student_created
ON leaderboard_points_ledger(student_id, created_at DESC);

-- Aggregation & analytical auditing by event type
CREATE INDEX IF NOT EXISTS idx_points_ledger_action_type
ON leaderboard_points_ledger(action_type);

-- Fast lookup of source entities to prevent duplicate awarding (e.g. check if quiz attempt already credited)
CREATE INDEX IF NOT EXISTS idx_points_ledger_reference
ON leaderboard_points_ledger(reference_id)
WHERE reference_id IS NOT NULL;

-- Time-based window partitioning / weekly competition queries
CREATE INDEX IF NOT EXISTS idx_points_ledger_created_at
ON leaderboard_points_ledger(created_at);

-- Composite B-Tree index on users table for sub-5ms leaderboard podium ranking generation (Jira AG-16 & SRS Sec 10)
CREATE INDEX IF NOT EXISTS idx_users_leaderboard
ON users(total_points DESC, created_at ASC);

-- ============================================================================
-- 5. Points Audit Triggers & Immutability Enforcement
-- ============================================================================

-- 5.1 Immutability Enforcement Trigger Function
-- Blocks any UPDATE or DELETE statement against leaderboard_points_ledger.
CREATE OR REPLACE FUNCTION trg_enforce_immutable_points_ledger()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Security Violation: leaderboard_points_ledger is an immutable append-only ledger. UPDATE and DELETE operations are strictly prohibited (attempted operation on transaction ID: %)', OLD.id
        USING ERRCODE = '55000',
              HINT = 'To reverse points, insert a compensatory transaction with action_type = ''manual_adjustment''.';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION trg_enforce_immutable_points_ledger() IS 'Enforces strict append-only immutability on leaderboard_points_ledger, preventing ledger tampering.';

DROP TRIGGER IF EXISTS trg_points_ledger_prevent_modification ON leaderboard_points_ledger;
CREATE TRIGGER trg_points_ledger_prevent_modification
BEFORE UPDATE OR DELETE ON leaderboard_points_ledger
FOR EACH ROW
EXECUTE FUNCTION trg_enforce_immutable_points_ledger();

-- 5.2 Student Balance Synchronization Trigger Function
-- Automatically updates users.total_points atomically upon every inserted ledger entry.
-- Relies on users.total_points CHECK (total_points >= 0) to abort illegal overdraft deductions.
CREATE OR REPLACE FUNCTION trg_sync_student_points_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_user_role user_role_enum;
BEGIN
    -- Verify target user exists and is a student eligible for gamification
    SELECT role INTO v_user_role
    FROM users
    WHERE id = NEW.student_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Integrity Error: Target student user % does not exist in users table.', NEW.student_id
            USING ERRCODE = '23503';
    END IF;

    -- Atomically update student's cumulative total_points balance
    UPDATE users
    SET total_points = total_points + NEW.points_change,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.student_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION trg_sync_student_points_balance() IS 'Atomically updates users.total_points when points ledger rows are appended.';

DROP TRIGGER IF EXISTS trg_points_ledger_sync_user_points ON leaderboard_points_ledger;
CREATE TRIGGER trg_points_ledger_sync_user_points
AFTER INSERT ON leaderboard_points_ledger
FOR EACH ROW
EXECUTE FUNCTION trg_sync_student_points_balance();

-- ============================================================================
-- 6. Helper Function: Dynamic Chess-Tier Calculation Helper
-- ============================================================================
-- Calculates all Chess-tier metadata for any arbitrary points balance:
--   * Pawn   (بيدق) : 0 - 99 points
--   * Knight (حصان) : 100 - 249 points
--   * Bishop (فيل)  : 250 - 499 points
--   * Rook   (طابية): 500 - 799 points
--   * Queen  (وزير) : 800 - 1199 points
--   * King   (ملك)  : 1200+ points
CREATE OR REPLACE FUNCTION fn_calculate_chess_tier(p_points INTEGER)
RETURNS JSONB AS $$
DECLARE
    v_pts INTEGER := COALESCE(p_points, 0);
    v_tier_name VARCHAR(20);
    v_tier_ar VARCHAR(50);
    v_badge_symbol VARCHAR(10);
    v_next_tier VARCHAR(20);
    v_next_threshold INTEGER;
    v_points_needed INTEGER;
    v_progress_pct NUMERIC(5, 2);
BEGIN
    IF v_pts >= 1200 THEN
        v_tier_name      := 'King';
        v_tier_ar        := 'ملك (King)';
        v_badge_symbol   := '👑';
        v_next_tier      := NULL;
        v_next_threshold := NULL;
        v_points_needed  := 0;
        v_progress_pct   := 100.00;
    ELSIF v_pts >= 800 THEN
        v_tier_name      := 'Queen';
        v_tier_ar        := 'وزير (Queen)';
        v_badge_symbol   := '♕';
        v_next_tier      := 'King';
        v_next_threshold := 1200;
        v_points_needed  := 1200 - v_pts;
        v_progress_pct   := ROUND(((v_pts - 800)::NUMERIC / 400.0) * 100.0, 2);
    ELSIF v_pts >= 500 THEN
        v_tier_name      := 'Rook';
        v_tier_ar        := 'طابية / قلعة (Rook)';
        v_badge_symbol   := '♖';
        v_next_tier      := 'Queen';
        v_next_threshold := 800;
        v_points_needed  := 800 - v_pts;
        v_progress_pct   := ROUND(((v_pts - 500)::NUMERIC / 300.0) * 100.0, 2);
    ELSIF v_pts >= 250 THEN
        v_tier_name      := 'Bishop';
        v_tier_ar        := 'فيل (Bishop)';
        v_badge_symbol   := '♗';
        v_next_tier      := 'Rook';
        v_next_threshold := 500;
        v_points_needed  := 500 - v_pts;
        v_progress_pct   := ROUND(((v_pts - 250)::NUMERIC / 250.0) * 100.0, 2);
    ELSIF v_pts >= 100 THEN
        v_tier_name      := 'Knight';
        v_tier_ar        := 'حصان (Knight)';
        v_badge_symbol   := '♘';
        v_next_tier      := 'Bishop';
        v_next_threshold := 250;
        v_points_needed  := 250 - v_pts;
        v_progress_pct   := ROUND(((v_pts - 100)::NUMERIC / 150.0) * 100.0, 2);
    ELSE
        v_tier_name      := 'Pawn';
        v_tier_ar        := 'بيدق (Pawn)';
        v_badge_symbol   := '♙';
        v_next_tier      := 'Knight';
        v_next_threshold := 100;
        v_points_needed  := 100 - v_pts;
        v_progress_pct   := ROUND((v_pts::NUMERIC / 100.0) * 100.0, 2);
    END IF;

    RETURN jsonb_build_object(
        'current_tier', v_tier_name,
        'current_tier_ar', v_tier_ar,
        'badge_symbol', v_badge_symbol,
        'current_points', v_pts,
        'next_tier', v_next_tier,
        'next_threshold', v_next_threshold,
        'points_needed', v_points_needed,
        'progress_percentage', v_progress_pct
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION fn_calculate_chess_tier(INTEGER) IS 'Returns comprehensive Chess-tier metadata as JSONB for a given point value (SRS Sec 5.3 & 10).';

-- ============================================================================
-- 6b. Decoupled Configuration Tables: leaderboard_tiers & system_settings
-- ============================================================================
CREATE TABLE IF NOT EXISTS leaderboard_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tier_key VARCHAR(50) NOT NULL UNIQUE,
    tier_name VARCHAR(100) NOT NULL,
    tier_name_ar VARCHAR(100) NOT NULL,
    min_points INTEGER NOT NULL CHECK (min_points >= 0),
    max_points INTEGER CHECK (max_points IS NULL OR max_points >= min_points),
    badge_icon VARCHAR(50) NOT NULL DEFAULT '🏅',
    badge_color VARCHAR(20) NOT NULL DEFAULT '#8D6E63',
    sort_order INTEGER NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO leaderboard_tiers (tier_key, tier_name, tier_name_ar, min_points, max_points, badge_icon, badge_color, sort_order)
VALUES
    ('tier_bronze',   'Bronze',   'برونزي',           0,    99,   '🥉', '#CD7F32', 1),
    ('tier_silver',   'Silver',   'فضي',              100,  249,  '🥈', '#C0C0C0', 2),
    ('tier_gold',     'Gold',     'ذهبي',             250,  499,  '🥇', '#FFD700', 3),
    ('tier_platinum', 'Platinum', 'بلاتينيوم',        500,  799,  '💠', '#00CED1', 4),
    ('tier_diamond',  'Diamond',  'دايموند',          800,  1199, '💎', '#B9F2FF', 5),
    ('tier_master',   'Master',   'ماستر / الأساطير', 1200, NULL, '👑', '#8A2BE2', 6)
ON CONFLICT (tier_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    value_type VARCHAR(20) NOT NULL DEFAULT 'string',
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    description VARCHAR(255),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_settings (key, value, value_type, category, description)
VALUES
    ('payment.instapay_address', 'adel_english@instapay', 'string', 'payment', 'InstaPay payment receiver handle'),
    ('payment.vodafone_cash_numbers', '["01012345678", "01098765432"]', 'json', 'payment', 'Active Vodafone Cash receiver numbers'),
    ('assignment.grace_period_seconds', '60', 'integer', 'assignments', 'Network latency tolerance cutoff window'),
    ('watermark.interval_seconds', '15', 'integer', 'streaming', 'Dynamic canvas watermark hop interval'),
    ('lecture.default_data_saver_bitrate', '380k', 'string', 'streaming', 'Default HLS profile for 360p Data Saver mode')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 7. SQL View: v_student_leaderboard_tiers (لوحة شرف الطلاب والرتب التنافسية المرنة)
-- ============================================================================
CREATE OR REPLACE VIEW v_student_leaderboard_tiers AS
WITH student_ranks AS (
    SELECT
        u.id AS student_id,
        u.full_name,
        u.phone_number,
        CASE
            WHEN char_length(u.phone_number) >= 11 THEN
                SUBSTRING(u.phone_number FROM 1 FOR 3) || '****' || SUBSTRING(u.phone_number FROM 8 FOR 4)
            ELSE
                '01*********'
        END AS masked_phone,
        u.role,
        u.student_type,
        u.group_id,
        g.name AS group_name,
        g.is_offline AS is_group_offline,
        u.total_points,
        u.created_at AS registered_at,
        DENSE_RANK() OVER (ORDER BY u.total_points DESC, u.created_at ASC) AS rank_position,
        ROW_NUMBER() OVER (ORDER BY u.total_points DESC, u.created_at ASC) AS podium_order
    FROM users u
    LEFT JOIN groups g ON u.group_id = g.id
    WHERE u.role = 'student'
      AND u.is_active = true
)
SELECT
    sr.student_id,
    sr.full_name,
    sr.masked_phone,
    sr.student_type,
    sr.group_id,
    sr.group_name,
    sr.is_group_offline,
    sr.total_points,
    sr.rank_position,
    sr.podium_order,
    CASE WHEN sr.rank_position <= 3 THEN true ELSE false END AS is_podium,
    CASE
        WHEN sr.rank_position = 1 THEN '🥇 الأول (Gold Medal)'
        WHEN sr.rank_position = 2 THEN '🥈 الثاني (Silver Medal)'
        WHEN sr.rank_position = 3 THEN '🥉 الثالث (Bronze Medal)'
        ELSE NULL
    END AS podium_badge,
    COALESCE(t.tier_name, 'Unranked') AS tier_name,
    COALESCE(t.tier_name_ar, 'بدون رتبة') AS tier_name_ar,
    COALESCE(t.badge_icon, '🏅') AS badge_icon,
    COALESCE(t.badge_color, '#8D6E63') AS badge_color,
    t.sort_order AS tier_level,
    sr.registered_at
FROM student_ranks sr
LEFT JOIN leaderboard_tiers t
  ON sr.total_points >= t.min_points
 AND (t.max_points IS NULL OR sr.total_points <= t.max_points);

COMMENT ON VIEW v_student_leaderboard_tiers IS 'Dynamic table-driven leaderboard view joining leaderboard_tiers (SRS Sec 5.3 & 10).';

-- ============================================================================
-- 8. Complementary Leaderboard Views & API Helpers
-- ============================================================================

-- 8.1 Top-10 Leaderboard & Podium Display View (Optimized for Frontend Dashboard)
CREATE OR REPLACE VIEW v_leaderboard_podium_top10 AS
SELECT
    rank_position,
    student_id,
    full_name,
    masked_phone,
    student_type,
    group_name,
    total_points,
    is_podium,
    podium_badge,
    chess_tier,
    chess_tier_ar,
    chess_piece_symbol,
    tier_progress_pct
FROM v_student_leaderboard_tiers
WHERE rank_position <= 10
ORDER BY rank_position ASC, registered_at ASC;

COMMENT ON VIEW v_leaderboard_podium_top10 IS 'Lightweight Top 10 leaderboard with podium medals and chess tiers for mobile widgets and landing pages.';

-- 8.2 Weekly Points Activity Leaderboard View (Sprint 4 / Weekly Honors Board)
-- Evaluates performance strictly earned in the current rolling calendar week.
CREATE OR REPLACE VIEW v_weekly_points_leaderboard AS
WITH weekly_ledger AS (
    SELECT
        student_id,
        SUM(points_change) AS weekly_points,
        COUNT(id) AS activity_count
    FROM leaderboard_points_ledger
    WHERE created_at >= date_trunc('week', CURRENT_TIMESTAMP)
    GROUP BY student_id
)
SELECT
    DENSE_RANK() OVER (ORDER BY COALESCE(wl.weekly_points, 0) DESC, u.created_at ASC) AS weekly_rank,
    u.id AS student_id,
    u.full_name,
    CASE
        WHEN char_length(u.phone_number) >= 11 THEN
            SUBSTRING(u.phone_number FROM 1 FOR 3) || '****' || SUBSTRING(u.phone_number FROM 8 FOR 4)
        ELSE '01*********'
    END AS masked_phone,
    u.student_type,
    g.name AS group_name,
    COALESCE(wl.weekly_points, 0) AS weekly_points,
    COALESCE(wl.activity_count, 0) AS weekly_activities_count,
    u.total_points AS all_time_points,
    CASE
        WHEN DENSE_RANK() OVER (ORDER BY COALESCE(wl.weekly_points, 0) DESC, u.created_at ASC) = 1 THEN '👑 الملك الأسبوعي (Weekly King)'
        WHEN DENSE_RANK() OVER (ORDER BY COALESCE(wl.weekly_points, 0) DESC, u.created_at ASC) = 2 THEN '🥈 وصيف أول (First Runner-up)'
        WHEN DENSE_RANK() OVER (ORDER BY COALESCE(wl.weekly_points, 0) DESC, u.created_at ASC) = 3 THEN '🥉 وصيف ثان (Second Runner-up)'
        ELSE NULL
    END AS weekly_badge
FROM users u
LEFT JOIN weekly_ledger wl ON u.id = wl.student_id
LEFT JOIN groups g ON u.group_id = g.id
WHERE u.role = 'student'
  AND u.is_active = true
ORDER BY weekly_rank ASC;

COMMENT ON VIEW v_weekly_points_leaderboard IS 'Weekly leaderboard computing current calendar week point velocity and weekly honors podium (SRS Sec 5.3).';

-- ============================================================================
-- 9. Transactional API Function: fn_record_point_transaction
-- ============================================================================
-- Safe stored function for application services to record points with
-- strict parameter validation and atomic ledger generation.
CREATE OR REPLACE FUNCTION fn_record_point_transaction(
    p_student_id UUID,
    p_action_type point_action_type_enum,
    p_points_change INTEGER,
    p_reference_id UUID DEFAULT NULL,
    p_description VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_new_ledger_id UUID;
BEGIN
    -- Validate points_change is non-zero
    IF p_points_change IS NULL OR p_points_change = 0 THEN
        RAISE EXCEPTION 'Invalid Parameter: points_change cannot be null or zero.'
            USING ERRCODE = '22023';
    END IF;

    -- Ensure student exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_student_id AND role = 'student') THEN
        RAISE EXCEPTION 'Student user % not found or is not an active student.', p_student_id
            USING ERRCODE = '23503';
    END IF;

    -- Insert into append-only ledger (trigger will sync users.total_points)
    INSERT INTO leaderboard_points_ledger (
        student_id,
        action_type,
        points_change,
        reference_id,
        description
    ) VALUES (
        p_student_id,
        p_action_type,
        p_points_change,
        p_reference_id,
        COALESCE(trim(p_description), 'Gamification points adjustment')
    )
    RETURNING id INTO v_new_ledger_id;

    RETURN v_new_ledger_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_record_point_transaction(UUID, point_action_type_enum, INTEGER, UUID, VARCHAR) IS
'Encapsulated business transaction function for issuing gamification awards or adjustments atomically (SRS Sec 5.3).';

COMMIT;
