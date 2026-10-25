"""
Database Engine Adapter for Mr. Adel Mostafa EdTech Platform
Unified dual-engine support for PostgreSQL 15+/16+ and SQLite 3.35+
Provides ACID constraint checking, regex functions, FK cascading, and DDL transpilation.
"""

import os
import re
import uuid
import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple, Union


from pathlib import Path as _Path

def get_canonical_schema_path() -> _Path:
    """Returns canonical PostgreSQL 16 production schema path relative to package root."""
    base = _Path(__file__).resolve().parent.parent
    return base / "schema" / "01_mr_adel_production_schema_pg16.sql"

def get_migrations_dir() -> _Path:
    """Returns migrations directory path relative to package root."""
    base = _Path(__file__).resolve().parent.parent
    return base / "migrations"

def get_rollback_dir() -> _Path:
    """Returns rollback directory path relative to package root."""
    base = _Path(__file__).resolve().parent.parent
    return base / "rollback"

def get_migration_files() -> List[_Path]:
    """Returns ordered list of forward SQL migration files (001 -> 007)."""
    mdir = get_migrations_dir()
    if not mdir.exists():
        return []
    return sorted(list(mdir.glob("*.sql")))

def get_rollback_files() -> List[_Path]:
    """Returns ordered list of rollback SQL files (007 -> 001)."""
    rdir = get_rollback_dir()
    if not rdir.exists():
        return []
    return sorted(list(rdir.glob("*.sql")), reverse=True)


class SQLiteDatabaseAdapter:
    """High-performance SQLite database adapter with full PostgreSQL feature emulation."""

    def __init__(self, db_path: str = ":memory:"):
        self.db_path = db_path
        self.engine_name = "sqlite"
        self._init_connection()

    def _init_connection(self):
        self.conn = sqlite3.connect(
            self.db_path,
            detect_types=sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES,
            timeout=30.0,
        )
        self.conn.row_factory = sqlite3.Row
        self.cursor = self.conn.cursor()

        # Strict relational enforcement
        self.cursor.execute("PRAGMA foreign_keys = ON;")
        if self.db_path != ":memory:":
            self.cursor.execute("PRAGMA journal_mode = WAL;")
            self.cursor.execute("PRAGMA synchronous = NORMAL;")

        # Custom SQL functions for Postgres compatibility
        def sqlite_regexp(pattern: Any, value: Any) -> bool:
            if value is None or pattern is None:
                return False
            try:
                return bool(re.search(str(pattern), str(value)))
            except Exception:
                return False

        self.conn.create_function("REGEXP", 2, sqlite_regexp)
        self.conn.create_function("uuid_generate_v4", 0, lambda: str(uuid.uuid4()))
        self.conn.create_function("gen_random_uuid", 0, lambda: str(uuid.uuid4()))
        self.conn.create_function("char_length", 1, lambda s: len(str(s)) if s is not None else 0)
        self.conn.create_function("now", 0, lambda: datetime.now(timezone.utc).isoformat())

    def execute(self, query: str, params: Optional[Union[Tuple, List, Dict]] = None) -> sqlite3.Cursor:
        if params is None:
            return self.cursor.execute(query)
        return self.cursor.execute(query, params)

    def executemany(self, query: str, seq_of_params: List[Union[Tuple, Dict]]) -> sqlite3.Cursor:
        return self.cursor.executemany(query, seq_of_params)

    def fetchone(self, query: str, params: Optional[Union[Tuple, List, Dict]] = None) -> Optional[sqlite3.Row]:
        self.execute(query, params)
        return self.cursor.fetchone()

    def fetchall(self, query: str, params: Optional[Union[Tuple, List, Dict]] = None) -> List[sqlite3.Row]:
        self.execute(query, params)
        return self.cursor.fetchall()

    def commit(self):
        self.conn.commit()

    def rollback(self):
        self.conn.rollback()

    def close(self):
        try:
            self.conn.close()
        except Exception:
            pass

    def get_table_names(self) -> List[str]:
        rows = self.fetchall("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;")
        return [r["name"] for r in rows]

    def get_row_count(self, table_name: str) -> int:
        if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", table_name):
            raise ValueError(f"Invalid table name identifier: {table_name}")
        row = self.fetchone(f"SELECT COUNT(*) as cnt FROM {table_name};")
        return row["cnt"] if row else 0

    def get_all_counts(self) -> Dict[str, int]:
        counts = {}
        for table in self.get_table_names():
            counts[table] = self.get_row_count(table)
        return counts

    def initialize_schema_sqlite(self):
        """Initializes the complete 15 tables, triggers, and views in SQLite."""
        ddl = """
        -- Groups
        CREATE TABLE IF NOT EXISTS groups (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            is_offline INTEGER NOT NULL DEFAULT 1,
            center_location TEXT,
            schedule_description TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_group_name_not_empty CHECK (char_length(trim(name)) > 0)
        );

        -- Users (with Egyptian phone validation regex, parent contact, streak, password flag and total_points >= 0)
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            phone_number TEXT NOT NULL UNIQUE,
            parent_phone_number TEXT,
            full_name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('super_admin', 'assistant', 'student', 'guest')),
            student_type TEXT NOT NULL DEFAULT 'online_only' CHECK(student_type IN ('center_offline', 'online_only')),
            group_id TEXT REFERENCES groups(id) ON DELETE SET NULL,
            total_points INTEGER NOT NULL DEFAULT 0 CHECK (total_points >= 0),
            current_streak_days INTEGER NOT NULL DEFAULT 0 CHECK (current_streak_days >= 0),
            must_change_password INTEGER NOT NULL DEFAULT 0,
            is_phone_verified INTEGER NOT NULL DEFAULT 0,
            phone_verified_at TIMESTAMP,
            is_active INTEGER NOT NULL DEFAULT 1,
            last_login_at TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_egyptian_phone CHECK (phone_number REGEXP '^01[0125][0-9]{8}$'),
            CONSTRAINT check_parent_phone CHECK (parent_phone_number IS NULL OR parent_phone_number REGEXP '^01[0125][0-9]{8}$'),
            CONSTRAINT check_parent_phone_not_student CHECK (parent_phone_number IS NULL OR parent_phone_number != phone_number),
            CONSTRAINT check_full_name_not_empty CHECK (char_length(trim(full_name)) >= 3),
            CONSTRAINT check_password_hash_format CHECK (char_length(trim(password_hash)) >= 20)
        );

        -- Password Reset OTPs (WhatsApp Verification & Self-Service Recovery)
        CREATE TABLE IF NOT EXISTS password_reset_otps (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            phone_number TEXT NOT NULL,
            otp_hash TEXT NOT NULL,
            attempts_count INTEGER NOT NULL DEFAULT 0 CHECK (attempts_count >= 0 AND attempts_count <= 5),
            is_used INTEGER NOT NULL DEFAULT 0,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_otp_phone CHECK (phone_number REGEXP '^01[0125][0-9]{8}$'),
            CONSTRAINT check_otp_expiry CHECK (expires_at > created_at)
        );

        -- Unified Authentication & Registration OTPs (Phone Ownership Proof)
        CREATE TABLE IF NOT EXISTS auth_otps (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            phone_number TEXT NOT NULL,
            otp_hash TEXT NOT NULL,
            otp_type TEXT NOT NULL DEFAULT 'registration' CHECK(otp_type IN ('registration', 'password_reset', 'phone_change')),
            attempts_count INTEGER NOT NULL DEFAULT 0 CHECK (attempts_count >= 0 AND attempts_count <= 5),
            is_used INTEGER NOT NULL DEFAULT 0,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_auth_otp_phone CHECK (phone_number REGEXP '^01[0125][0-9]{8}$'),
            CONSTRAINT check_auth_otp_expiry CHECK (expires_at > created_at)
        );

        -- Refresh Tokens
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash TEXT NOT NULL UNIQUE,
            device_info TEXT,
            ip_address TEXT,
            expires_at TIMESTAMP NOT NULL,
            is_revoked INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_token_hash_not_empty CHECK (char_length(trim(token_hash)) >= 32),
            CONSTRAINT check_refresh_token_expiry CHECK (expires_at > created_at)
        );

        -- Courses
        CREATE TABLE IF NOT EXISTS courses (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            academic_year TEXT NOT NULL,
            description TEXT,
            is_published INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_course_title_not_empty CHECK (char_length(trim(title)) > 0),
            CONSTRAINT check_academic_year_not_empty CHECK (char_length(trim(academic_year)) > 0)
        );

        -- Lectures
        CREATE TABLE IF NOT EXISTS lectures (
            id TEXT PRIMARY KEY,
            course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            description TEXT,
            lecture_type TEXT NOT NULL DEFAULT 'recorded' CHECK(lecture_type IN ('recorded', 'live')),
            hls_master_url TEXT,
            live_stream_url TEXT,
            live_scheduled_at TIMESTAMP,
            study_material_pdf_url TEXT,
            duration_seconds INTEGER DEFAULT 0 CHECK (duration_seconds >= 0),
            price REAL NOT NULL DEFAULT 0.00 CHECK (price >= 0),
            is_free_preview INTEGER NOT NULL DEFAULT 0,
            max_allowed_views INTEGER DEFAULT NULL CHECK (max_allowed_views IS NULL OR max_allowed_views > 0),
            is_published INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_lecture_title_not_empty CHECK (char_length(trim(title)) > 0)
        );

        -- Lecture Access
        CREATE TABLE IF NOT EXISTS lecture_access (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            lecture_id TEXT NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
            grant_type TEXT NOT NULL CHECK(grant_type IN ('group_included', 'purchased', 'manual_grant')),
            views_consumed INTEGER NOT NULL DEFAULT 0 CHECK (views_consumed >= 0),
            is_access_revoked INTEGER NOT NULL DEFAULT 0,
            expires_at TIMESTAMP,
            granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_student_lecture_access UNIQUE (student_id, lecture_id)
        );

        -- Lecture Watch Logs
        CREATE TABLE IF NOT EXISTS lecture_watch_logs (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            lecture_id TEXT NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
            watch_duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (watch_duration_seconds >= 0),
            last_playback_position INTEGER NOT NULL DEFAULT 0 CHECK (last_playback_position >= 0),
            ip_address TEXT,
            user_agent TEXT,
            session_started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_ping_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- Assignments
        CREATE TABLE IF NOT EXISTS assignments (
            id TEXT PRIMARY KEY,
            lecture_id TEXT NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            instructions TEXT,
            pdf_attachment_url TEXT,
            deadline_at TIMESTAMP NOT NULL,
            max_score REAL NOT NULL DEFAULT 20.00 CHECK (max_score > 0),
            points_reward INTEGER NOT NULL DEFAULT 15 CHECK (points_reward >= 0),
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_assignment_title_not_empty CHECK (char_length(trim(title)) > 0)
        );

        -- Assignment Submissions
        CREATE TABLE IF NOT EXISTS assignment_submissions (
            id TEXT PRIMARY KEY,
            assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
            student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            file_url TEXT NOT NULL,
            file_mime_type TEXT NOT NULL,
            additional_files TEXT NOT NULL DEFAULT '[]',
            resubmission_count INTEGER NOT NULL DEFAULT 0,
            submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            is_late INTEGER NOT NULL DEFAULT 0,
            score_awarded REAL CHECK (score_awarded IS NULL OR score_awarded >= 0),
            status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted', 'graded', 'late', 'rejected')),
            teacher_feedback TEXT,
            graded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
            graded_at TIMESTAMP,
            CONSTRAINT unique_assignment_student_submission UNIQUE (assignment_id, student_id)
        );

        -- Quizzes
        CREATE TABLE IF NOT EXISTS quizzes (
            id TEXT PRIMARY KEY,
            lecture_id TEXT NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            duration_minutes INTEGER NOT NULL DEFAULT 15 CHECK (duration_minutes > 0),
            passing_score REAL NOT NULL DEFAULT 50.00 CHECK (passing_score >= 0.00 AND passing_score <= 100.00),
            points_bonus INTEGER NOT NULL DEFAULT 25 CHECK (points_bonus >= 0),
            is_published INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_quiz_title_not_empty CHECK (char_length(trim(title)) > 0)
        );

        -- Quiz Questions
        CREATE TABLE IF NOT EXISTS quiz_questions (
            id TEXT PRIMARY KEY,
            quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
            question_order INTEGER NOT NULL CHECK (question_order > 0),
            question_text TEXT NOT NULL,
            options TEXT NOT NULL, -- JSON formatted array
            correct_option_id TEXT NOT NULL,
            explanation TEXT,
            score_weight REAL NOT NULL DEFAULT 1.00 CHECK (score_weight > 0),
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_quiz_order UNIQUE (quiz_id, question_order),
            CONSTRAINT check_quiz_question_text_not_empty CHECK (char_length(trim(question_text)) > 0)
        );

        -- Quiz Attempts (Supporting Practice Mode & Multi-attempts per SRS UC-03 AF-03.1)
        CREATE TABLE IF NOT EXISTS quiz_attempts (
            id TEXT PRIMARY KEY,
            quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
            student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            is_practice INTEGER NOT NULL DEFAULT 0,
            attempt_number INTEGER NOT NULL DEFAULT 1 CHECK (attempt_number >= 1),
            started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            submitted_at TIMESTAMP,
            score_achieved REAL NOT NULL DEFAULT 0.00 CHECK (score_achieved >= 0),
            total_possible_score REAL NOT NULL CHECK (total_possible_score > 0),
            points_awarded INTEGER NOT NULL DEFAULT 0 CHECK (points_awarded >= 0),
            answers_payload TEXT NOT NULL, -- JSON formatted answers
            is_passed INTEGER NOT NULL DEFAULT 0,
            CONSTRAINT check_score_achieved_bound CHECK (score_achieved <= total_possible_score),
            CONSTRAINT unique_student_quiz_attempt UNIQUE (quiz_id, student_id, attempt_number)
        );

        -- Points Ledger (Append-only immutable)
        CREATE TABLE IF NOT EXISTS leaderboard_points_ledger (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            action_type TEXT NOT NULL CHECK(action_type IN ('quiz_score', 'assignment_ontime', 'attendance_bonus', 'manual_adjustment')),
            points_change INTEGER NOT NULL CHECK (points_change != 0),
            reference_id TEXT,
            description TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- Payments (Anti-fraud unique hash and reference + InstaPay + All Bank Cards: Visa, Mastercard, Meeza, Paymob, Fawry)
        CREATE TABLE IF NOT EXISTS payments (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            lecture_id TEXT NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
            amount REAL NOT NULL CHECK (amount > 0),
            amount_received REAL CHECK (amount_received IS NULL OR amount_received >= 0),
            payment_method TEXT NOT NULL CHECK(payment_method IN ('instapay', 'bank_card', 'visa', 'mastercard', 'meeza', 'paymob', 'fawry', 'vodafone_cash', 'orange_cash', 'etisalat_cash', 'we_pay', 'center_cash_code')),
            sender_phone_or_account TEXT,
            transaction_reference TEXT UNIQUE,
            receipt_image_url TEXT,
            receipt_image_hash TEXT UNIQUE,
            -- Bank Card Attributes (PCI-DSS Compliant: Never stores PAN/CVV, only last4 and brand)
            card_brand TEXT CHECK(card_brand IS NULL OR card_brand IN ('visa', 'mastercard', 'meeza', 'amex')),
            card_last4 TEXT CHECK(card_last4 IS NULL OR (char_length(card_last4) = 4 AND card_last4 REGEXP '^[0-9]{4}$')),
            gateway_provider TEXT CHECK(gateway_provider IS NULL OR gateway_provider IN ('paymob', 'fawry', 'kashier', 'stripe', 'manual_offline')),
            gateway_transaction_id TEXT UNIQUE,
            is_auto_verified INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
            rejection_reason TEXT,
            verified_by TEXT REFERENCES users(id) ON DELETE SET NULL,
            verified_at TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- Admin Audit Logs (WORM Immutable Forensic Log)
        CREATE TABLE IF NOT EXISTS admin_audit_logs (
            id TEXT PRIMARY KEY,
            performed_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            action TEXT NOT NULL,
            target_entity TEXT NOT NULL,
            target_id TEXT,
            details TEXT,
            ip_address TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- Notifications (In-App Notification Hub - AG-6 / KingKarmy compatibility)
        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            notification_type TEXT NOT NULL DEFAULT 'system',
            reference_id TEXT,
            is_read INTEGER NOT NULL DEFAULT 0,
            read_at TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- Vouchers & Scratch Codes (Leaderboard Rewards & Center Instant Codes)
        CREATE TABLE IF NOT EXISTS vouchers (
            id TEXT PRIMARY KEY,
            code TEXT NOT NULL UNIQUE,
            voucher_type TEXT NOT NULL DEFAULT 'center_scratch_card' CHECK(voucher_type IN ('center_scratch_card', 'leaderboard_reward', 'discount_promo')),
            lecture_id TEXT REFERENCES lectures(id) ON DELETE SET NULL,
            discount_amount REAL NOT NULL DEFAULT 50.00 CHECK (discount_amount > 0),
            is_redeemed INTEGER NOT NULL DEFAULT 0,
            redeemed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
            redeemed_at TIMESTAMP,
            expires_at TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- TRIGGERS: Points sync & Immutable Ledger
        CREATE TRIGGER IF NOT EXISTS trg_sync_user_total_points
        AFTER INSERT ON leaderboard_points_ledger
        FOR EACH ROW
        BEGIN
            UPDATE users
            SET total_points = total_points + NEW.points_change,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.student_id;
        END;

        CREATE TRIGGER IF NOT EXISTS trg_prevent_points_ledger_update
        BEFORE UPDATE ON leaderboard_points_ledger
        FOR EACH ROW
        BEGIN
            SELECT RAISE(ABORT, 'Mutation forbidden: leaderboard_points_ledger is an immutable append-only ledger');
        END;

        CREATE TRIGGER IF NOT EXISTS trg_prevent_audit_log_update
        BEFORE UPDATE ON admin_audit_logs
        FOR EACH ROW
        BEGIN
            SELECT RAISE(ABORT, 'Mutation forbidden: admin_audit_logs is an immutable forensic WORM log');
        END;

        CREATE TRIGGER IF NOT EXISTS trg_prevent_audit_log_delete
        BEFORE DELETE ON admin_audit_logs
        FOR EACH ROW
        BEGIN
            SELECT RAISE(ABORT, 'Mutation forbidden: admin_audit_logs is an immutable forensic WORM log');
        END;

        -- Leaderboard Tiers Configuration (Decoupled & Table-Driven per AG-5 / Gafar collaboration)
        CREATE TABLE IF NOT EXISTS leaderboard_tiers (
            id TEXT PRIMARY KEY,
            tier_key TEXT NOT NULL UNIQUE,
            tier_name TEXT NOT NULL,
            tier_name_ar TEXT NOT NULL,
            min_points INTEGER NOT NULL CHECK (min_points >= 0),
            max_points INTEGER CHECK (max_points IS NULL OR max_points >= min_points),
            badge_icon TEXT NOT NULL DEFAULT '🏅',
            badge_color TEXT NOT NULL DEFAULT '#8D6E63',
            sort_order INTEGER NOT NULL UNIQUE,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- System Settings & Operational Configuration (Decoupled Platform Parameters)
        CREATE TABLE IF NOT EXISTS system_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            value_type TEXT NOT NULL DEFAULT 'string',
            category TEXT NOT NULL DEFAULT 'general',
            description TEXT,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- VIEW: Dynamic Configurable Leaderboard (SRS Section 5.3 & 10)
        CREATE VIEW IF NOT EXISTS v_student_leaderboard_tiers AS
        SELECT
            u.id AS student_id,
            u.full_name,
            u.phone_number,
            CASE
                WHEN length(u.phone_number) >= 11 THEN
                    substr(u.phone_number, 1, 3) || '****' || substr(u.phone_number, 8, 4)
                ELSE '01*********'
            END AS masked_phone,
            u.student_type,
            g.name AS group_name,
            u.total_points,
            DENSE_RANK() OVER (ORDER BY u.total_points DESC, u.created_at ASC) AS podium_rank,
            COALESCE(t.tier_name, 'Unranked') AS tier_name,
            COALESCE(t.tier_name_ar, 'بدون رتبة') AS tier_name_ar,
            COALESCE(t.badge_icon, '🏅') AS badge_icon,
            COALESCE(t.badge_color, '#8D6E63') AS badge_color,
            t.sort_order AS tier_level
        FROM users u
        LEFT JOIN groups g ON u.group_id = g.id
        LEFT JOIN leaderboard_tiers t
          ON u.total_points >= t.min_points
         AND (t.max_points IS NULL OR u.total_points <= t.max_points)
        WHERE u.role = 'student' AND u.is_active = 1;

        -- INDEXES: Performance & Verification (SRS Section 10)
        CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        CREATE INDEX IF NOT EXISTS idx_users_group ON users(group_id);
        CREATE INDEX IF NOT EXISTS idx_lecture_access_lookup ON lecture_access(student_id, lecture_id);
        CREATE INDEX IF NOT EXISTS idx_assignments_deadline ON assignments(deadline_at);
        CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON assignment_submissions(assignment_id);
        CREATE INDEX IF NOT EXISTS idx_otp_lookup ON password_reset_otps(user_id, is_used, expires_at);
        CREATE INDEX IF NOT EXISTS idx_auth_otps_lookup ON auth_otps(phone_number, otp_type, is_used, expires_at);
        CREATE INDEX IF NOT EXISTS idx_payments_pending_verification ON payments(status, created_at);
        CREATE INDEX IF NOT EXISTS idx_payments_receipt_hash ON payments(receipt_image_hash);
        CREATE INDEX IF NOT EXISTS idx_payments_tx_ref ON payments(transaction_reference);
        CREATE INDEX IF NOT EXISTS idx_users_leaderboard ON users(total_points DESC, created_at ASC);
        """
        self.conn.executescript(ddl)

        # Populate Default Configurable Leaderboard Tiers (Gafar / AG-5 can customize anytime)
        self.cursor.execute("SELECT COUNT(*) FROM leaderboard_tiers;")
        if self.cursor.fetchone()[0] == 0:
            default_tiers = [
                ("tier_bronze", "Bronze", "برونزي", 0, 99, "🥉", "#CD7F32", 1),
                ("tier_silver", "Silver", "فضي", 100, 249, "🥈", "#C0C0C0", 2),
                ("tier_gold", "Gold", "ذهبي", 250, 499, "🥇", "#FFD700", 3),
                ("tier_platinum", "Platinum", "بلاتينيوم", 500, 799, "💠", "#00CED1", 4),
                ("tier_diamond", "Diamond", "دايموند", 800, 1199, "💎", "#B9F2FF", 5),
                ("tier_master", "Master", "ماستر / الأساطير", 1200, None, "👑", "#8A2BE2", 6)
            ]
            for key, name, name_ar, min_p, max_p, icon, color, sort_o in default_tiers:
                self.cursor.execute(
                    "INSERT INTO leaderboard_tiers (id, tier_key, tier_name, tier_name_ar, min_points, max_points, badge_icon, badge_color, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);",
                    (str(uuid.uuid4()), key, name, name_ar, min_p, max_p, icon, color, sort_o)
                )

        # Populate Default System Settings (Decoupled Platform Parameters)
        self.cursor.execute("SELECT COUNT(*) FROM system_settings;")
        if self.cursor.fetchone()[0] == 0:
            default_settings = [
                ("payment.instapay_address", "adel_english@instapay", "string", "payment", "InstaPay payment receiver handle"),
                ("payment.vodafone_cash_numbers", "[\"01012345678\", \"01098765432\"]", "json", "payment", "Active Vodafone Cash receiver numbers"),
                ("assignment.grace_period_seconds", "60", "integer", "assignments", "Network latency tolerance cutoff window"),
                ("watermark.interval_seconds", "15", "integer", "streaming", "Dynamic canvas watermark hop interval"),
                ("lecture.default_data_saver_bitrate", "380k", "string", "streaming", "Default HLS profile for 360p Data Saver mode")
            ]
            for k, val, vtype, cat, desc in default_settings:
                self.cursor.execute(
                    "INSERT INTO system_settings (key, value, value_type, category, description) VALUES (?, ?, ?, ?, ?);",
                    (k, val, vtype, cat, desc)
                )
        self.conn.commit()


class PostgresDatabaseAdapter:
    """PostgreSQL 15+/16+ adapter using psycopg3 or asyncpg/psycopg2."""

    def __init__(self, connection_url: str):
        self.connection_url = connection_url
        self.engine_name = "postgres"
        self._init_connection()

    def _init_connection(self):
        try:
            import psycopg
            self.conn = psycopg.connect(self.connection_url, autocommit=False)
            self.cursor = self.conn.cursor()
        except ImportError:
            try:
                import psycopg2
                import psycopg2.extras
                self.conn = psycopg2.connect(self.connection_url)
                self.conn.autocommit = False
                self.cursor = self.conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
            except ImportError:
                raise RuntimeError("Neither psycopg (v3) nor psycopg2 is installed for PostgreSQL connectivity.")

    def execute(self, query: str, params: Optional[Union[Tuple, List, Dict]] = None):
        if params is None:
            return self.cursor.execute(query)
        return self.cursor.execute(query, params)

    def executemany(self, query: str, seq_of_params: List[Union[Tuple, Dict]]):
        return self.cursor.executemany(query, seq_of_params)

    def fetchone(self, query: str, params: Optional[Union[Tuple, List, Dict]] = None):
        self.execute(query, params)
        return self.cursor.fetchone()

    def fetchall(self, query: str, params: Optional[Union[Tuple, List, Dict]] = None):
        self.execute(query, params)
        return self.cursor.fetchall()

    def commit(self):
        self.conn.commit()

    def rollback(self):
        self.conn.rollback()

    def close(self):
        try:
            self.conn.close()
        except Exception:
            pass

    def get_table_names(self) -> List[str]:
        rows = self.fetchall("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;")
        return [r[0] if isinstance(r, tuple) else r["tablename"] for r in rows]

    def get_row_count(self, table_name: str) -> int:
        if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", table_name):
            raise ValueError(f"Invalid table name identifier: {table_name}")
        row = self.fetchone(f"SELECT COUNT(*) as cnt FROM {table_name};")
        return row[0] if isinstance(row, tuple) else row["cnt"]

    def get_all_counts(self) -> Dict[str, int]:
        counts = {}
        for table in self.get_table_names():
            counts[table] = self.get_row_count(table)
        return counts

    def initialize_schema_postgres(self, canonical_sql_path: Optional[str] = None):
        if canonical_sql_path is None:
            p = get_canonical_schema_path()
            if not p.exists():
                raise FileNotFoundError(f"Canonical schema not found at {p}")
            canonical_sql_path = str(p)
        with open(canonical_sql_path, "r", encoding="utf-8") as f:
            sql = f.read()
        self.execute(sql)
        self.commit()

    def apply_migrations(self, migrations_dir: Optional[str] = None) -> List[str]:
        """Applies all migrations in numerical order."""
        from pathlib import Path as _P
        mdir = _P(migrations_dir) if migrations_dir else get_migrations_dir()
        applied = []
        for mf in sorted(mdir.glob("*.sql")):
            with open(mf, "r", encoding="utf-8") as f:
                sql = f.read()
            self.execute(sql)
            self.commit()
            applied.append(mf.name)
        return applied

    def apply_rollback(self, rollback_dir: Optional[str] = None) -> List[str]:
        """Applies rollback scripts in reverse numerical order."""
        from pathlib import Path as _P
        rdir = _P(rollback_dir) if rollback_dir else get_rollback_dir()
        rolled_back = []
        for rf in sorted(rdir.glob("*.sql"), reverse=True):
            with open(rf, "r", encoding="utf-8") as f:
                sql = f.read()
            self.execute(sql)
            self.commit()
            rolled_back.append(rf.name)
        return rolled_back


def get_adapter(engine: str = "sqlite", db_path: Optional[str] = None, pg_url: Optional[str] = None) -> Union[SQLiteDatabaseAdapter, PostgresDatabaseAdapter]:
    """Factory creating the appropriate database adapter."""
    if engine.lower() in ("postgres", "postgresql"):
        url = pg_url or os.environ.get("DATABASE_URL")
        if not url:
            raise ValueError("PostgreSQL connection URL must be provided via pg_url or DATABASE_URL environment variable.")
        return PostgresDatabaseAdapter(url)
    else:
        path = db_path or os.environ.get("SQLITE_DB_PATH", "adel_edtech.db")
        adapter = SQLiteDatabaseAdapter(path)
        adapter.initialize_schema_sqlite()
        return adapter


# Universal adapter alias for standalone consumers
DatabaseAdapter = SQLiteDatabaseAdapter
