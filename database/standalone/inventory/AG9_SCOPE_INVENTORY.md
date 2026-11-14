# AG-9 Scope Relational Inventory & Database Architecture Specification

**Project:** Mr. Adel Mostafa EdTech Platform (`ag_edtech_db` / Key: `AG`)
**Parent Story:** `AG-9` (*Database Architecture & Relational Persistence Layer*)
**Architect:** Samer Elhamy (Database Architect, Profile: `@jira`)
**Target Engines:** PostgreSQL 16 (Production) & SQLite 3.35+ (Local Isolated Development)
**Standard:** IEEE 830 / ISO/IEC/IEEE 29148 / OWASP ASVS Database Security

---

## 1. Executive Summary: Relational Object Count Truth

A forensic review across both database engines establishes the definitive relational object counts:
- **Canonical PostgreSQL 16 (`schema/01_mr_adel_production_schema_pg16.sql`):**
  - **20 Base Tables** (`CREATE TABLE`)
  - **1 Analytical View** (`CREATE OR REPLACE VIEW v_student_leaderboard_tiers`)
  - **8 Domain ENUM Types** (`CREATE TYPE ... AS ENUM`)
  - **11 Performance B-Tree Indexes** (including 1 partial index on pending payments)
  - **4 Triggers & 3 Stored Functions** (ACID sync and OWASP A09 WORM immutability)
  - **Total PostgreSQL Relations:** **21 relational objects** (20 base tables + 1 view).

- **SQLite Development Engine (`adapter/db_adapter.py`):**
  - **21 Base Tables** (`CREATE TABLE`)
  - **1 Analytical View** (`CREATE VIEW v_student_leaderboard_tiers`)
  - **12 B-Tree Indexes**
  - **4 SQLite Triggers** (`BEFORE UPDATE / DELETE` using `RAISE(ABORT, ...)`)
  - **Reason for Table Count Variance (+1 in SQLite):**
    SQLite retains the legacy `password_reset_otps` table alongside `auth_otps`. This table is strictly required by 5 existing security test suites in `test_security_and_hardening.py` (`test_sec_16..20`). In the canonical PostgreSQL 16 production schema, OTP handling was consolidated into `auth_otps` with an `otp_type` discriminator. **No artificial normalization or false parity claims are made.**

---

## 2. Comprehensive Domain Inventory & Invariant Constraints

### 2.1 Identity & Access Management (IAM)
| Table | Primary Key | Key Columns & Types | Enforced Constraints & Invariants |
| :--- | :--- | :--- | :--- |
| `groups` | `id (UUID)` | `name (VARCHAR)`, `description (TEXT)`, `schedule_info (TEXT)`, `is_active (BOOLEAN)` | `CHECK (char_length(trim(name)) > 0)` |
| `users` | `id (UUID)` | `phone_number (VARCHAR UNIQUE)`, `parent_phone_number (VARCHAR)`, `full_name (VARCHAR)`, `password_hash (TEXT)`, `role (user_role_enum)`, `student_type (student_type_enum)`, `group_id (UUID FK)` | `CHECK (phone_number ~ '^01[0125][0-9]{8}$')`<br>`CHECK (parent_phone_number IS NULL OR parent_phone_number ~ '^01[0125][0-9]{8}$')`<br>`CHECK (parent_phone_number IS NULL OR parent_phone_number != phone_number)`<br>`CHECK (char_length(trim(password_hash)) >= 20)`<br>`CHECK (total_points >= 0)` |
| `refresh_tokens` | `id (UUID)` | `user_id (UUID FK)`, `token_hash (VARCHAR UNIQUE)`, `expires_at (TIMESTAMPTZ)`, `is_revoked (BOOLEAN)` | `ON DELETE CASCADE`<br>`CHECK (expires_at > created_at)` |
| `auth_otps` | `id (UUID)` | `user_id (UUID FK)`, `phone_number (VARCHAR)`, `otp_hash (VARCHAR)`, `otp_type (VARCHAR)`, `attempts_count (INT)`, `is_used (BOOLEAN)`, `expires_at (TIMESTAMPTZ)` | `ON DELETE CASCADE`<br>`CHECK (attempts_count >= 0 AND attempts_count <= 5)`<br>`CHECK (expires_at > created_at)` |
| `password_reset_otps` *(SQLite only)* | `id (UUID)` | `user_id (UUID FK)`, `phone_number (VARCHAR)`, `otp_hash (VARCHAR)`, `attempts_count (INT)`, `is_used (BOOLEAN)`, `expires_at (DATETIME)` | Preserved explicitly for legacy security test suite compatibility. |

### 2.2 Academic Content & Streaming Access
| Table | Primary Key | Key Columns & Types | Enforced Constraints & Invariants |
| :--- | :--- | :--- | :--- |
| `courses` | `id (UUID)` | `title (VARCHAR NOT NULL)`, `description (TEXT)`, `academic_year (VARCHAR)`, `is_published (BOOLEAN)` | `CHECK (char_length(trim(title)) > 0)` |
| `lectures` | `id (UUID)` | `course_id (UUID FK)`, `title (VARCHAR)`, `video_provider (VARCHAR)`, `video_id (VARCHAR)`, `price (NUMERIC)`, `lecture_type (lecture_type_enum)` | `ON DELETE CASCADE`<br>`CHECK (price >= 0)` |
| `lecture_access` | `id (UUID)` | `student_id (UUID FK)`, `lecture_id (UUID FK)`, `access_grant_type (access_grant_type_enum)`, `max_views (INT)`, `views_count (INT)`, `is_revoked (BOOLEAN)` | `UNIQUE(student_id, lecture_id)`<br>`ON DELETE CASCADE`<br>`CHECK (views_count >= 0)` |
| `lecture_watch_logs` | `id (UUID)` | `student_id (UUID FK)`, `lecture_id (UUID FK)`, `watch_seconds (INT)`, `completed (BOOLEAN)`, `last_position_seconds (INT)` | `ON DELETE CASCADE`<br>`CHECK (watch_seconds >= 0)` |

### 2.3 Assignments & Assessments
| Table | Primary Key | Key Columns & Types | Enforced Constraints & Invariants |
| :--- | :--- | :--- | :--- |
| `assignments` | `id (UUID)` | `lecture_id (UUID FK)`, `title (VARCHAR)`, `max_score (INT)`, `deadline_at (TIMESTAMPTZ)` | `ON DELETE CASCADE`<br>`CHECK (max_score > 0)` |
| `assignment_submissions` | `id (UUID)` | `assignment_id (UUID FK)`, `student_id (UUID FK)`, `status (submission_status_enum)`, `score_achieved (INT)`, `graded_by (UUID FK)` | `UNIQUE(assignment_id, student_id)`<br>`ON DELETE CASCADE`<br>`CHECK (score_achieved >= 0)` |
| `quizzes` | `id (UUID)` | `lecture_id (UUID FK)`, `title (VARCHAR)`, `time_limit_minutes (INT)`, `passing_score (INT)` | `ON DELETE CASCADE`<br>`CHECK (passing_score BETWEEN 0 AND 100)` |
| `quiz_questions` | `id (UUID)` | `quiz_id (UUID FK)`, `question_order (INT)`, `question_text (TEXT)`, `options (JSONB)`, `correct_option_index (INT)` | `UNIQUE(quiz_id, question_order)`<br>`ON DELETE CASCADE` |
| `quiz_attempts` | `id (UUID)` | `quiz_id (UUID FK)`, `student_id (UUID FK)`, `attempt_number (INT)`, `score_achieved (INT)`, `total_possible_score (INT)` | `UNIQUE(quiz_id, student_id, attempt_number)`<br>`ON DELETE CASCADE`<br>`CHECK (score_achieved >= 0)`<br>`CHECK (score_achieved <= total_possible_score)` |

### 2.4 Gamification & Points Ledger
| Table | Primary Key | Key Columns & Types | Enforced Constraints & Invariants |
| :--- | :--- | :--- | :--- |
| `leaderboard_points_ledger` | `id (UUID)` | `student_id (UUID FK)`, `action_type (point_action_type_enum)`, `points_change (INT)`, `reference_id (UUID)` | `ON DELETE CASCADE`<br>`CHECK (points_change != 0)`<br>**WORM Trigger:** `BEFORE UPDATE` raises SQLSTATE `55000`<br>**Sync Trigger:** `AFTER INSERT` increments `users.total_points` |
| `leaderboard_tiers` | `id (UUID)` | `tier_key (VARCHAR UNIQUE)`, `tier_name (VARCHAR)`, `min_points (INT)`, `max_points (INT)`, `sort_order (INT UNIQUE)` | `CHECK (min_points >= 0)`<br>`UNIQUE(sort_order)` |
| `v_student_leaderboard_tiers` *(View)* | `N/A` | Computes dynamic podium rank (`DENSE_RANK()`), applies phone masking (`010****5678`), joins tier badges. | Analytical SQL View (Security Masked). |

### 2.5 Payments, Anti-Fraud, Audit & Configuration
| Table | Primary Key | Key Columns & Types | Enforced Constraints & Invariants |
| :--- | :--- | :--- | :--- |
| `payments` | `id (UUID)` | `student_id (UUID FK)`, `lecture_id (UUID FK)`, `amount (NUMERIC)`, `payment_method (payment_method_enum)`, `status (payment_status_enum)`, `receipt_image_hash (VARCHAR UNIQUE)`, `transaction_reference (VARCHAR UNIQUE)` | `UNIQUE(receipt_image_hash)` (SHA-256)<br>`UNIQUE(transaction_reference)`<br>`CHECK (amount >= 0)`<br>Partial Index on `WHERE status = 'pending'` |
| `admin_audit_logs` | `id (UUID)` | `performed_by (UUID FK)`, `action (VARCHAR)`, `target_table (VARCHAR)`, `details (JSONB)`, `ip_address (VARCHAR)` | **Strict WORM Triggers:** `BEFORE UPDATE` and `BEFORE DELETE` raise SQLSTATE `55000` (tamper-proof audit trail) |
| `vouchers` | `id (UUID)` | `code (VARCHAR UNIQUE)`, `discount_percent (INT)`, `max_uses (INT)`, `current_uses (INT)`, `expires_at (TIMESTAMPTZ)` | `UNIQUE(code)`<br>`CHECK (current_uses <= max_uses)` |
| `notifications` | `id (UUID)` | `user_id (UUID FK)`, `title (VARCHAR)`, `body (TEXT)`, `is_read (BOOLEAN)` | `ON DELETE CASCADE` |
| `system_settings` | `key (VARCHAR)` | `key (PRIMARY KEY)`, `value (TEXT)`, `value_type (VARCHAR)`, `category (VARCHAR)`, `is_public (BOOLEAN)` | Key-value application config store. |

---

## 3. Security Roles & Row-Level Security (RLS)

PostgreSQL 16 enforces least-privilege role separation:
1. **`migration_admin`**: Full DDL schema owner, executes migrations and schema modifications.
2. **`web_app`**: Restricted DML operations (`SELECT`, `INSERT`, `UPDATE`), zero DDL execution rights, subject to RLS policies.
3. **`read_only_analytics`**: Strictly `SELECT` privileges across base tables and analytical views; zero mutation authority.

### Row Level Security (RLS) Enforcement
Activated on student-sensitive tables:
- `assignment_submissions`: Non-owner students can only view and insert their own submissions (`student_id = current_setting('app.current_user_id')`). Admins and assistants bypass via role check.
- `lecture_watch_logs`: Non-owner students can only view/insert their own watch history.
- `quiz_attempts`: Student isolation enforced.
- `payments`: Students can only read their own receipts and payment status.
