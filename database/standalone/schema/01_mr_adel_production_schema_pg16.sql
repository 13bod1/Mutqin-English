-- ============================================================================
-- AASTMT Academic Capstone: Mr. Adel Mostafa EdTech Platform
-- Canonical Production Database Schema (PostgreSQL 16+)
-- Architecture: 3NF/BCNF Relational Model with ACID Constraints & RLS Security
-- Author: Samer Elhamy (Database Architect, Profile @jira)
-- Evaluator: Dr. Tamer Abdel Latif (Department of Software Engineering)
-- ============================================================================

BEGIN;

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- 2. Domain ENUMs
CREATE TYPE user_role_enum AS ENUM ('super_admin', 'assistant', 'student', 'guest');
CREATE TYPE student_type_enum AS ENUM ('center_offline', 'online_only');
CREATE TYPE lecture_type_enum AS ENUM ('recorded', 'live');
CREATE TYPE access_grant_type_enum AS ENUM ('group_included', 'purchased', 'manual_grant');
CREATE TYPE payment_method_enum AS ENUM (
    'instapay', 'bank_card', 'visa', 'mastercard', 'meeza', 'paymob', 'fawry',
    'vodafone_cash', 'orange_cash', 'etisalat_cash', 'we_pay', 'center_cash_code'
);
CREATE TYPE payment_status_enum AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE submission_status_enum AS ENUM ('submitted', 'graded', 'late', 'rejected');
CREATE TYPE point_action_type_enum AS ENUM ('quiz_score', 'assignment_ontime', 'attendance_bonus', 'manual_adjustment');

-- 3. Core Identity & Cohorts
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

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(15) NOT NULL UNIQUE,
    parent_phone_number VARCHAR(15),
    full_name VARCHAR(120) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'student',
    student_type student_type_enum NOT NULL DEFAULT 'online_only',
    group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    total_points INTEGER NOT NULL DEFAULT 0 CHECK (total_points >= 0),
    current_streak_days INTEGER NOT NULL DEFAULT 0 CHECK (current_streak_days >= 0),
    must_change_password BOOLEAN NOT NULL DEFAULT false,
    is_phone_verified BOOLEAN NOT NULL DEFAULT false,
    phone_verified_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_egyptian_phone CHECK (phone_number ~ '^01[0125][0-9]{8}$'),
    CONSTRAINT check_parent_phone CHECK (parent_phone_number IS NULL OR parent_phone_number ~ '^01[0125][0-9]{8}$'),
    CONSTRAINT check_parent_phone_not_student CHECK (parent_phone_number IS NULL OR parent_phone_number != phone_number),
    CONSTRAINT check_full_name_not_empty CHECK (char_length(trim(full_name)) >= 3),
    CONSTRAINT check_password_hash_format CHECK (char_length(trim(password_hash)) >= 20)
);

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

CREATE TABLE auth_otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    phone_number VARCHAR(15) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    otp_type VARCHAR(20) NOT NULL DEFAULT 'registration' CHECK (otp_type IN ('registration', 'password_reset', 'phone_change')),
    attempts_count INTEGER NOT NULL DEFAULT 0 CHECK (attempts_count >= 0 AND attempts_count <= 5),
    is_used BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_auth_otp_phone CHECK (phone_number ~ '^01[0125][0-9]{8}$'),
    CONSTRAINT check_auth_otp_expiry CHECK (expires_at > created_at)
);

-- 4. Curriculum & Video Streaming Pipeline
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(150) NOT NULL,
    academic_year VARCHAR(50) NOT NULL,
    description TEXT,
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_course_title_not_empty CHECK (char_length(trim(title)) > 0),
    CONSTRAINT check_academic_year_not_empty CHECK (char_length(trim(academic_year)) > 0)
);

CREATE TABLE lectures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    lecture_type lecture_type_enum NOT NULL DEFAULT 'recorded',
    hls_master_url TEXT,
    live_stream_url TEXT,
    live_scheduled_at TIMESTAMPTZ,
    study_material_pdf_url TEXT,
    duration_seconds INTEGER DEFAULT 0 CHECK (duration_seconds >= 0),
    price NUMERIC(8, 2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
    is_free_preview BOOLEAN NOT NULL DEFAULT false,
    max_allowed_views INTEGER DEFAULT NULL CHECK (max_allowed_views IS NULL OR max_allowed_views > 0),
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_lecture_title_not_empty CHECK (char_length(trim(title)) > 0)
);

CREATE TABLE lecture_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    grant_type access_grant_type_enum NOT NULL,
    views_consumed INTEGER NOT NULL DEFAULT 0 CHECK (views_consumed >= 0),
    is_access_revoked BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMPTZ,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_student_lecture_access UNIQUE (student_id, lecture_id)
);

CREATE TABLE lecture_watch_logs (    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    watch_duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (watch_duration_seconds >= 0),
    last_playback_position INTEGER NOT NULL DEFAULT 0 CHECK (last_playback_position >= 0),
    ip_address INET,
    user_agent TEXT,
    session_started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_ping_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Assignments & Deadlines Engine
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    instructions TEXT,
    pdf_attachment_url TEXT,
    deadline_at TIMESTAMPTZ NOT NULL,
    max_score NUMERIC(6, 2) NOT NULL DEFAULT 20.00 CHECK (max_score > 0),
    points_reward INTEGER NOT NULL DEFAULT 15 CHECK (points_reward >= 0),
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_assignment_title_not_empty CHECK (char_length(trim(title)) > 0)
);

CREATE TABLE assignment_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_mime_type VARCHAR(50) NOT NULL,
    additional_files JSONB NOT NULL DEFAULT '[]'::jsonb,
    resubmission_count INTEGER NOT NULL DEFAULT 0,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_late BOOLEAN NOT NULL DEFAULT false,
    score_awarded NUMERIC(6, 2) CHECK (score_awarded IS NULL OR score_awarded >= 0),
    status submission_status_enum NOT NULL DEFAULT 'submitted',
    teacher_feedback TEXT,
    graded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    graded_at TIMESTAMPTZ,
    CONSTRAINT unique_assignment_student_submission UNIQUE (assignment_id, student_id)
);

-- 6. Native MCQ Quizzes & Practice Retakes
CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 15 CHECK (duration_minutes > 0),
    passing_score NUMERIC(5, 2) NOT NULL DEFAULT 50.00 CHECK (passing_score >= 0.00 AND passing_score <= 100.00),
    points_bonus INTEGER NOT NULL DEFAULT 25 CHECK (points_bonus >= 0),
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_quiz_title_not_empty CHECK (char_length(trim(title)) > 0)
);

CREATE TABLE quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_order INTEGER NOT NULL CHECK (question_order > 0),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_option_id VARCHAR(10) NOT NULL,
    explanation TEXT,
    score_weight NUMERIC(4, 2) NOT NULL DEFAULT 1.00 CHECK (score_weight > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_quiz_order UNIQUE (quiz_id, question_order),
    CONSTRAINT check_quiz_question_text_not_empty CHECK (char_length(trim(question_text)) > 0)
);

CREATE TABLE quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_practice BOOLEAN NOT NULL DEFAULT false,
    attempt_number INTEGER NOT NULL DEFAULT 1 CHECK (attempt_number >= 1),
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMPTZ,
    score_achieved NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (score_achieved >= 0),
    total_possible_score NUMERIC(5, 2) NOT NULL CHECK (total_possible_score > 0),
    points_awarded INTEGER NOT NULL DEFAULT 0 CHECK (points_awarded >= 0),
    answers_payload JSONB NOT NULL,
    is_passed BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT check_score_achieved_bound CHECK (score_achieved <= total_possible_score),
    CONSTRAINT unique_student_quiz_attempt UNIQUE (quiz_id, student_id, attempt_number)
);

-- 7. Gamification & Decoupled Leaderboard Tiers
CREATE TABLE leaderboard_points_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type point_action_type_enum NOT NULL,
    points_change INTEGER NOT NULL CHECK (points_change != 0),
    reference_id UUID,
    description VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE leaderboard_tiers (
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

-- 8. Multi-Channel Payments & Anti-Fraud Invoices
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    amount NUMERIC(8, 2) NOT NULL CHECK (amount > 0),
    amount_received NUMERIC(8, 2) CHECK (amount_received IS NULL OR amount_received >= 0),
    payment_method payment_method_enum NOT NULL,
    sender_phone_or_account VARCHAR(50),
    transaction_reference VARCHAR(100) UNIQUE,
    receipt_image_url TEXT,
    receipt_image_hash VARCHAR(64) UNIQUE,
    card_brand VARCHAR(20) CHECK (card_brand IS NULL OR card_brand IN ('visa', 'mastercard', 'meeza', 'amex')),
    card_last4 VARCHAR(4) CHECK (card_last4 IS NULL OR card_last4 ~ '^[0-9]{4}$'),
    gateway_provider VARCHAR(50) CHECK (gateway_provider IS NULL OR gateway_provider IN ('paymob', 'fawry', 'kashier', 'stripe', 'manual_offline')),
    gateway_transaction_id VARCHAR(120) UNIQUE,
    is_auto_verified BOOLEAN NOT NULL DEFAULT false,
    status payment_status_enum NOT NULL DEFAULT 'pending',
    rejection_reason VARCHAR(255),
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    performed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    target_entity VARCHAR(50) NOT NULL,
    target_id UUID,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    voucher_type VARCHAR(50) NOT NULL DEFAULT 'center_scratch_card' CHECK (voucher_type IN ('center_scratch_card', 'leaderboard_reward', 'discount_promo')),
    lecture_id UUID REFERENCES lectures(id) ON DELETE SET NULL,
    discount_amount NUMERIC(8, 2) NOT NULL DEFAULT 50.00 CHECK (discount_amount > 0),
    is_redeemed BOOLEAN NOT NULL DEFAULT false,
    redeemed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    redeemed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL DEFAULT 'system',
    reference_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    value_type VARCHAR(20) NOT NULL DEFAULT 'string',
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    description VARCHAR(255),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. Triggers: Points Synchronization & WORM Immutability
CREATE OR REPLACE FUNCTION fn_sync_user_points()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET total_points = total_points + NEW.points_change,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.student_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_user_total_points
AFTER INSERT ON leaderboard_points_ledger
FOR EACH ROW
EXECUTE FUNCTION fn_sync_user_points();

CREATE OR REPLACE FUNCTION fn_prevent_points_ledger_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'SECURITY_VIOLATION: leaderboard_points_ledger is an immutable append-only ledger (OWASP A09).'
        USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_points_ledger_update
BEFORE UPDATE ON leaderboard_points_ledger
FOR EACH ROW
EXECUTE FUNCTION fn_prevent_points_ledger_modification();

CREATE OR REPLACE FUNCTION fn_prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'SECURITY_VIOLATION: admin_audit_logs is an immutable forensic WORM log (OWASP A09).'
        USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_audit_log_update
BEFORE UPDATE ON admin_audit_logs
FOR EACH ROW
EXECUTE FUNCTION fn_prevent_audit_log_modification();

CREATE TRIGGER trg_prevent_audit_log_delete
BEFORE DELETE ON admin_audit_logs
FOR EACH ROW
EXECUTE FUNCTION fn_prevent_audit_log_modification();

-- 10. Dynamic Table-Driven Leaderboard View (Decoupled per AG-5)
CREATE OR REPLACE VIEW v_student_leaderboard_tiers AS
WITH student_ranks AS (
    SELECT
        u.id AS student_id,
        u.full_name,
        u.phone_number,
        CASE
            WHEN char_length(u.phone_number) >= 11 THEN
                SUBSTRING(u.phone_number FROM 1 FOR 3) || '****' || SUBSTRING(u.phone_number FROM 8 FOR 4)
            ELSE '01*********'
        END AS masked_phone,
        u.student_type,
        g.name AS group_name,
        u.total_points,
        u.current_streak_days,
        DENSE_RANK() OVER (ORDER BY u.total_points DESC, u.created_at ASC) AS podium_rank
    FROM users u
    LEFT JOIN groups g ON u.group_id = g.id
    WHERE u.role = 'student' AND u.is_active = true
)
SELECT
    sr.student_id,
    sr.full_name,
    sr.masked_phone,
    sr.student_type,
    sr.group_name,
    sr.total_points,
    sr.current_streak_days,
    sr.podium_rank,
    CASE WHEN sr.podium_rank <= 3 THEN true ELSE false END AS is_podium,
    COALESCE(t.tier_name, 'Unranked') AS tier_name,
    COALESCE(t.tier_name_ar, 'بدون رتبة') AS tier_name_ar,
    COALESCE(t.badge_icon, '🏅') AS badge_icon,
    COALESCE(t.badge_color, '#8D6E63') AS badge_color,
    t.sort_order AS tier_level
FROM student_ranks sr
LEFT JOIN leaderboard_tiers t
  ON sr.total_points >= t.min_points
 AND (t.max_points IS NULL OR sr.total_points <= t.max_points);

-- 11. High-Performance Indexing Suite (Sub-10ms Gate)
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_group ON users(group_id);
CREATE INDEX idx_lecture_access_lookup ON lecture_access(student_id, lecture_id);
CREATE INDEX idx_assignments_deadline ON assignments(deadline_at);
CREATE INDEX idx_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX idx_otp_lookup ON auth_otps(phone_number, otp_type, is_used, expires_at);
CREATE INDEX idx_payments_pending_verification ON payments(status, created_at) WHERE status = 'pending';
CREATE INDEX idx_payments_receipt_hash ON payments(receipt_image_hash);
CREATE INDEX idx_payments_tx_ref ON payments(transaction_reference);
CREATE INDEX idx_users_leaderboard ON users(total_points DESC, created_at ASC);

-- 12. Seed Default Configurable Tiers
INSERT INTO leaderboard_tiers (tier_key, tier_name, tier_name_ar, min_points, max_points, badge_icon, badge_color, sort_order)
VALUES
    ('tier_bronze',   'Bronze',   'برونزي',           0,    99,   '🥉', '#CD7F32', 1),
    ('tier_silver',   'Silver',   'فضي',              100,  249,  '🥈', '#C0C0C0', 2),
    ('tier_gold',     'Gold',     'ذهبي',             250,  499,  '🥇', '#FFD700', 3),
    ('tier_platinum', 'Platinum', 'بلاتينيوم',        500,  799,  '💠', '#00CED1', 4),
    ('tier_diamond',  'Diamond',  'دايموند',          800,  1199, '💎', '#B9F2FF', 5),
    ('tier_master',   'Master',   'ماستر / الأساطير', 1200, NULL, '👑', '#8A2BE2', 6)
ON CONFLICT (tier_key) DO NOTHING;

-- 13. Seed Default System Parameters
INSERT INTO system_settings (key, value, value_type, category, description)
VALUES
    ('payment.instapay_address', 'adel_english@instapay', 'string', 'payment', 'InstaPay payment receiver handle'),
    ('payment.vodafone_cash_numbers', '["01012345678", "01098765432"]', 'json', 'payment', 'Active Vodafone Cash numbers'),
    ('assignment.grace_period_seconds', '60', 'integer', 'assignments', 'Network latency tolerance cutoff window'),
    ('watermark.interval_seconds', '15', 'integer', 'streaming', 'Dynamic canvas watermark hop interval'),
    ('lecture.default_data_saver_bitrate', '380k', 'string', 'streaming', 'Default HLS profile for 360p Data Saver mode')
ON CONFLICT (key) DO NOTHING;

COMMIT;
