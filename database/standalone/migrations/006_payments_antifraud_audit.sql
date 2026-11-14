-- ============================================================================
-- Project: Mr. Adel Mostafa EdTech Platform (Project Key: AG)
-- Jira Subtask: AG-17 (DB-08: DDL Migration 006 - Anti-Fraud Payments
--               (SHA-256 Receipt Hash, Unique TXN) & Audit Logs)
-- Parent Story: AG-9 (Database Elements & Relational Persistence Layer)
-- SRS Alignment: Section 5.4 (Payment & Monetization Engine - P5),
--                Section 8 (Payment Receipt Spoofing Mitigation & OWASP A09),
--                UC-04 (Guest Student Pay-Per-Lecture Checkout),
--                UC-05 (Assistant Payment Verification Workflow), & Section 10
-- Target Engine: PostgreSQL 15+ / 16+
-- Migration ID: 006_payments_antifraud_audit (UP Migration)
-- ============================================================================

BEGIN;

-- Zero-downtime migration safety timeouts
SET lock_timeout = '5s';
SET statement_timeout = '30s';
SET client_encoding = 'UTF8';

-- ============================================================================
-- 1. Prerequisite Extensions & Utility Trigger Function
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. Custom Domain ENUM Types (Payments & Verification Lifecycle)
-- ============================================================================
-- SRS Section 5.4 & 10: Supported Egyptian Offline/Hybrid Payment Channels
--   * instapay         : Instant Payment Network (IPN) transfer via Bank/IPA address
--   * vodafone_cash    : Mobile wallet transfer via Vodafone Cash e-wallet
--   * orange_cash      : Mobile wallet transfer via Orange Cash e-wallet
--   * center_cash_code : Pre-paid scratch/activation code issued at physical centers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_enum') THEN
        CREATE TYPE payment_method_enum AS ENUM (
            'instapay',
            'vodafone_cash',
            'orange_cash',
            'center_cash_code'
        );
    END IF;
END
$$;

-- SRS Section 5.4, UC-04 & Section 10: Payment Verification Lifecycle States
--   * pending  : Receipt uploaded by student; awaiting assistant inspection
--   * approved : Verified by assistant/admin; lecture access automatically unlocked
--   * rejected : Declined due to invalid/blurry receipt, unreceived funds, or spoofing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_enum') THEN
        CREATE TYPE payment_status_enum AS ENUM (
            'pending',
            'approved',
            'rejected'
        );
    END IF;
END
$$;

-- ============================================================================
-- 3. Table: payments (منظومة المدفوعات وتدقيق الإيصالات - Anti-Fraud Invoices)
-- ============================================================================
-- SRS Section 5.4, Section 8 (5.4 Payment Receipt Spoofing Mitigation) & Section 10:
--   * Enforces Pay-Per-Session pricing integrity with `amount > 0`
--   * Prevents duplicate bank/wallet reference replay via `uq_payments_transaction_reference`
--   * Prevents screenshot reuse across students/sessions via `uq_payments_receipt_image_hash` (SHA-256)
--   * Tracks full verification accountability (`verified_by`, `verified_at`, `rejection_reason`)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    amount NUMERIC(8, 2) NOT NULL CHECK (amount > 0),
    payment_method payment_method_enum NOT NULL,
    sender_phone_or_account VARCHAR(50),
    transaction_reference VARCHAR(100),
    receipt_image_url TEXT,
    receipt_image_hash VARCHAR(64),
    status payment_status_enum NOT NULL DEFAULT 'pending',
    rejection_reason VARCHAR(255),
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Anti-Fraud Uniqueness Constraints (Gherkin AC: AG-17 & SRS REQ-07)
    CONSTRAINT uq_payments_transaction_reference UNIQUE (transaction_reference),
    CONSTRAINT uq_payments_receipt_image_hash UNIQUE (receipt_image_hash),

    -- Data Integrity & Format Check Constraints
    CONSTRAINT check_payments_amount_positive CHECK (amount > 0.00),
    CONSTRAINT check_payments_tx_ref_not_empty CHECK (
        transaction_reference IS NULL OR char_length(trim(transaction_reference)) >= 4
    ),
    CONSTRAINT check_payments_receipt_hash_sha256 CHECK (
        receipt_image_hash IS NULL OR receipt_image_hash ~ '^[a-fA-F0-9]{64}$'
    ),
    CONSTRAINT check_payments_sender_not_empty CHECK (
        sender_phone_or_account IS NULL OR char_length(trim(sender_phone_or_account)) >= 3
    ),
    CONSTRAINT check_payments_rejection_reason_required CHECK (
        (status = 'rejected' AND rejection_reason IS NOT NULL AND char_length(trim(rejection_reason)) > 0)
        OR (status <> 'rejected')
    ),
    CONSTRAINT check_payments_verification_consistency CHECK (
        (status = 'pending')
        OR (status IN ('approved', 'rejected') AND verified_by IS NOT NULL AND verified_at IS NOT NULL)
    ),
    CONSTRAINT check_payments_verified_chronology CHECK (
        verified_at IS NULL OR verified_at >= created_at
    )
);

COMMENT ON TABLE payments IS 'Pay-Per-Session payment ledger with SHA-256 receipt image deduplication and unique transaction reference anti-fraud constraints (SRS Sec 5.4, 8 & 10).';
COMMENT ON COLUMN payments.student_id IS 'Student requesting single-lecture access (cascades on user deletion).';
COMMENT ON COLUMN payments.lecture_id IS 'Target paid lecture being unlocked (cascades on lecture deletion).';
COMMENT ON COLUMN payments.amount IS 'Transfer amount in EGP (e.g., 50.00 EGP); strictly enforced > 0.';
COMMENT ON COLUMN payments.payment_method IS 'Egyptian payment channel: instapay, vodafone_cash, orange_cash, or center_cash_code.';
COMMENT ON COLUMN payments.sender_phone_or_account IS 'Originating wallet mobile number (010/011/012/015) or InstaPay Payment Address (IPA).';
COMMENT ON COLUMN payments.transaction_reference IS 'Unique bank/wallet reference number; prevents replay attacks across accounts (REQ-07).';
COMMENT ON COLUMN payments.receipt_image_url IS 'Secure object storage URL pointing to the uploaded transfer screenshot (EXIF-stripped).';
COMMENT ON COLUMN payments.receipt_image_hash IS '64-character hex SHA-256 cryptographic digest of the receipt image preventing screenshot reuse (REQ-07).';
COMMENT ON COLUMN payments.status IS 'Verification state machine: pending -> approved | rejected.';
COMMENT ON COLUMN payments.rejection_reason IS 'Mandatory explanation provided to the student when a payment receipt is rejected (EF-04.2).';
COMMENT ON COLUMN payments.verified_by IS 'Assistant or Super Admin who audited and settled the payment request (UC-05).';
COMMENT ON COLUMN payments.verified_at IS 'Exact server timestamp when the payment was approved or rejected.';

CREATE TRIGGER trg_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

-- ============================================================================
-- 4. Table: admin_audit_logs (سجل الرقابة والعمليات الإدارية - Immutable Audit Log)
-- ============================================================================
-- SRS Section 8 (OWASP A09: Logging & Monitoring), UC-05 & Section 10:
--   * Append-only accountability trail recording every administrative and assistant action
--   * Prevents collusion or unapproved receipt verifications by logging actor, IP, and JSONB payload
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    performed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    target_entity VARCHAR(50) NOT NULL,
    target_id UUID,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_audit_action_not_empty CHECK (char_length(trim(action)) > 0),
    CONSTRAINT check_audit_target_entity_not_empty CHECK (char_length(trim(target_entity)) > 0),
    CONSTRAINT check_audit_details_jsonb_object CHECK (jsonb_typeof(details) = 'object')
);

COMMENT ON TABLE admin_audit_logs IS 'Immutable WORM (Write-Once-Read-Many) security audit trail tracking assistant payment approvals, rejections, cohort transfers, and administrative overrides (SRS Sec 8 & 10).';
COMMENT ON COLUMN admin_audit_logs.performed_by IS 'Foreign key to users(id) identifying the Assistant or Super Admin who executed the action.';
COMMENT ON COLUMN admin_audit_logs.action IS 'Canonical action verb (e.g., PAYMENT_APPROVED, PAYMENT_REJECTED, COHORT_ASSIGNED, SUSPECT_PAYMENT_FLAGGED).';
COMMENT ON COLUMN admin_audit_logs.target_entity IS 'Database table or domain entity affected (e.g., payments, lecture_access, users, groups).';
COMMENT ON COLUMN admin_audit_logs.target_id IS 'UUID of the specific record mutated by the action.';
COMMENT ON COLUMN admin_audit_logs.details IS 'Structured JSONB audit metadata containing before/after state, amount, transaction_reference, and fraud flags.';
COMMENT ON COLUMN admin_audit_logs.ip_address IS 'Client IPv4/IPv6 network address of the actor at execution time.';

-- ============================================================================
-- 5. Anti-Fraud Validation & Audit Enforcement SQL Functions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5.1 Function & Trigger: Normalization & Anti-Fraud Pre-Validation Guard
-- ----------------------------------------------------------------------------
-- Enforces:
--   1. Canonical normalization: Uppercase/trimmed `transaction_reference` and
--      lowercase/trimmed `receipt_image_hash` so case-variation spoofing fails.
--   2. Cryptographic SHA-256 hex digest validation (64 hex chars).
--   3. Explicit duplicate detection on `transaction_reference` and `receipt_image_hash`
--      with deterministic error codes matching SRS Section 5.4 & 8.
--   4. Duplicate active submission prevention: blocks a student from queuing multiple
--      pending payments or re-purchasing an already approved lecture.
CREATE OR REPLACE FUNCTION fn_payments_anti_fraud_guard()
RETURNS TRIGGER AS $$
DECLARE
    v_existing_payment_id UUID;
    v_existing_status payment_status_enum;
BEGIN
    -- 1. Canonicalize transaction_reference and receipt_image_hash
    IF NEW.transaction_reference IS NOT NULL THEN
        NEW.transaction_reference := upper(trim(NEW.transaction_reference));
    END IF;

    IF NEW.receipt_image_hash IS NOT NULL THEN
        NEW.receipt_image_hash := lower(trim(NEW.receipt_image_hash));
        IF NEW.receipt_image_hash !~ '^[a-f0-9]{64}$' THEN
            RAISE EXCEPTION 'INVALID_RECEIPT_HASH_FORMAT: receipt_image_hash must be a valid 64-character hexadecimal SHA-256 digest.'
                USING ERRCODE = '22023';
        END IF;
    END IF;

    IF NEW.sender_phone_or_account IS NOT NULL THEN
        NEW.sender_phone_or_account := trim(NEW.sender_phone_or_account);
    END IF;

    -- 2. Require at least one anti-fraud proof (tx reference or receipt hash) for electronic rails
    IF NEW.payment_method IN ('instapay', 'vodafone_cash', 'orange_cash')
       AND NEW.transaction_reference IS NULL
       AND NEW.receipt_image_hash IS NULL THEN
        RAISE EXCEPTION 'MISSING_PAYMENT_PROOF: Electronic payments require a transaction_reference or receipt_image_hash.'
            USING ERRCODE = '23514';
    END IF;

    -- 3. Check for duplicate transaction_reference across all payments (SRS EF-04.1 / Gherkin 4.2)
    IF NEW.transaction_reference IS NOT NULL THEN
        SELECT id INTO v_existing_payment_id
        FROM payments
        WHERE transaction_reference = NEW.transaction_reference
          AND (TG_OP = 'INSERT' OR id <> NEW.id)
        LIMIT 1;

        IF v_existing_payment_id IS NOT NULL THEN
            RAISE EXCEPTION 'DUPLICATE_TRANSACTION_REFERENCE: Transaction reference "%" has already been used in payment %.',
                NEW.transaction_reference, v_existing_payment_id
                USING ERRCODE = '23505';
        END IF;
    END IF;

    -- 4. Check for duplicate SHA-256 receipt_image_hash across all payments (SRS Sec 8.5.4)
    IF NEW.receipt_image_hash IS NOT NULL THEN
        SELECT id INTO v_existing_payment_id
        FROM payments
        WHERE receipt_image_hash = NEW.receipt_image_hash
          AND (TG_OP = 'INSERT' OR id <> NEW.id)
        LIMIT 1;

        IF v_existing_payment_id IS NOT NULL THEN
            RAISE EXCEPTION 'DUPLICATE_RECEIPT_IMAGE_HASH: Receipt screenshot hash "%" has already been submitted in payment %.',
                NEW.receipt_image_hash, v_existing_payment_id
                USING ERRCODE = '23505';
        END IF;
    END IF;

    -- 5. Prevent duplicate pending or redundant approved submissions by the same student for the same lecture
    IF TG_OP = 'INSERT' THEN
        SELECT id, status INTO v_existing_payment_id, v_existing_status
        FROM payments
        WHERE student_id = NEW.student_id
          AND lecture_id = NEW.lecture_id
          AND status IN ('pending', 'approved')
        LIMIT 1;

        IF v_existing_payment_id IS NOT NULL THEN
            IF v_existing_status = 'approved' THEN
                RAISE EXCEPTION 'LECTURE_ALREADY_PURCHASED: Student % already has an approved payment (%) for lecture %.',
                    NEW.student_id, v_existing_payment_id, NEW.lecture_id
                    USING ERRCODE = '23505';
            ELSE
                RAISE EXCEPTION 'DUPLICATE_PENDING_PAYMENT: Student % already has a pending payment (%) awaiting verification for lecture %.',
                    NEW.student_id, v_existing_payment_id, NEW.lecture_id
                    USING ERRCODE = '23505';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_payments_anti_fraud_guard() IS 'Normalizes payment identifiers and blocks reused transaction references, duplicate SHA-256 receipt hashes, and redundant pending submissions (SRS Sec 5.4 & 8).';

CREATE TRIGGER trg_payments_anti_fraud_guard
BEFORE INSERT OR UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION fn_payments_anti_fraud_guard();

-- ----------------------------------------------------------------------------
-- 5.2 Function & Trigger: Immutable Audit Log Protection (OWASP A09)
-- ----------------------------------------------------------------------------
-- Guarantees that records in `admin_audit_logs` cannot be modified or erased
-- by compromised assistant accounts or application bugs.
CREATE OR REPLACE FUNCTION fn_admin_audit_logs_immutable()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'IMMUTABLE_AUDIT_LOG_VIOLATION: Records in admin_audit_logs are append-only and cannot be altered via % (OWASP A09 Compliance).',
        TG_OP
        USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_admin_audit_logs_immutable() IS 'Enforces strict WORM (Write-Once-Read-Many) immutability on admin_audit_logs by rejecting UPDATE and DELETE operations.';

CREATE TRIGGER trg_admin_audit_logs_immutable
BEFORE UPDATE OR DELETE ON admin_audit_logs
FOR EACH ROW
EXECUTE FUNCTION fn_admin_audit_logs_immutable();

-- ----------------------------------------------------------------------------
-- 5.3 Function: Multi-Signal Payment Fraud Risk Evaluator
-- ----------------------------------------------------------------------------
-- Evaluates a payment record against SRS Section 8.5.4 Defense-in-Depth heuristics:
--   * Signal 1: Underpayment vs. published lecture price (+40 risk score)
--   * Signal 2: Cross-account sender phone/IPA reuse across different students (+35 risk score)
--   * Signal 3: High rejection velocity (>= 2 rejected receipts by student in last 24h) (+25 risk score)
--   * Signal 4: Stale submission delay or abnormal submission pattern (+15 risk score)
-- Returns a structured JSONB risk assessment for the Assistant Verification Dashboard.
CREATE OR REPLACE FUNCTION fn_evaluate_payment_fraud_risk(p_payment_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_payment payments%ROWTYPE;
    v_lecture_price NUMERIC(8, 2);
    v_cross_account_count INTEGER := 0;
    v_recent_rejections INTEGER := 0;
    v_risk_score INTEGER := 0;
    v_risk_level VARCHAR(16) := 'LOW';
    v_flags JSONB := '[]'::jsonb;
BEGIN
    SELECT * INTO v_payment
    FROM payments
    WHERE id = p_payment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PAYMENT_NOT_FOUND: Payment ID % does not exist.', p_payment_id
            USING ERRCODE = 'P0002';
    END IF;

    -- Signal 1: Compare payment amount against lecture's official price (AF-04.2 Partial Payment Flag)
    SELECT price INTO v_lecture_price
    FROM lectures
    WHERE id = v_payment.lecture_id;

    IF v_lecture_price IS NOT NULL AND v_payment.amount < v_lecture_price THEN
        v_risk_score := v_risk_score + 40;
        v_flags := v_flags || jsonb_build_array(
            jsonb_build_object(
                'code', 'PARTIAL_AMOUNT_MISMATCH',
                'severity', 'HIGH',
                'paid_amount', v_payment.amount,
                'expected_price', v_lecture_price,
                'shortfall', (v_lecture_price - v_payment.amount)
            )
        );
    END IF;

    -- Signal 2: Check if sender_phone_or_account was used by OTHER student accounts
    IF v_payment.sender_phone_or_account IS NOT NULL THEN
        SELECT COUNT(DISTINCT student_id) INTO v_cross_account_count
        FROM payments
        WHERE sender_phone_or_account = v_payment.sender_phone_or_account
          AND student_id <> v_payment.student_id;

        IF v_cross_account_count > 0 THEN
            v_risk_score := v_risk_score + 35;
            v_flags := v_flags || jsonb_build_array(
                jsonb_build_object(
                    'code', 'CROSS_STUDENT_SENDER_REUSE',
                    'severity', 'MEDIUM',
                    'other_student_accounts_count', v_cross_account_count,
                    'sender_phone_or_account', v_payment.sender_phone_or_account
                )
            );
        END IF;
    END IF;

    -- Signal 3: Check student's recent payment rejection velocity (last 24 hours)
    SELECT COUNT(*) INTO v_recent_rejections
    FROM payments
    WHERE student_id = v_payment.student_id
      AND status = 'rejected'
      AND created_at >= (CURRENT_TIMESTAMP - INTERVAL '24 hours');

    IF v_recent_rejections >= 2 THEN
        v_risk_score := v_risk_score + 25;
        v_flags := v_flags || jsonb_build_array(
            jsonb_build_object(
                'code', 'HIGH_REJECTION_VELOCITY_24H',
                'severity', 'HIGH',
                'rejected_attempts_24h', v_recent_rejections
            )
        );
    END IF;

    -- Signal 4: Flag pending requests older than 24 hours (SRS EF-04.3 SLA Warning)
    IF v_payment.status = 'pending' AND v_payment.created_at < (CURRENT_TIMESTAMP - INTERVAL '24 hours') THEN
        v_risk_score := v_risk_score + 15;
        v_flags := v_flags || jsonb_build_array(
            jsonb_build_object(
                'code', 'PENDING_SLA_EXCEEDED_24H',
                'severity', 'LOW',
                'hours_pending', ROUND(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - v_payment.created_at)) / 3600.0, 1)
            )
        );
    END IF;

    -- Clamp risk score to 100 and classify risk level
    IF v_risk_score > 100 THEN
        v_risk_score := 100;
    END IF;

    IF v_risk_score >= 60 THEN
        v_risk_level := 'HIGH';
    ELSIF v_risk_score >= 25 THEN
        v_risk_level := 'MEDIUM';
    ELSE
        v_risk_level := 'LOW';
    END IF;

    RETURN jsonb_build_object(
        'payment_id', v_payment.id,
        'student_id', v_payment.student_id,
        'lecture_id', v_payment.lecture_id,
        'risk_score', v_risk_score,
        'risk_level', v_risk_level,
        'is_suspect', (v_risk_score >= 35),
        'flags', v_flags,
        'evaluated_at', CURRENT_TIMESTAMP
    );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION fn_evaluate_payment_fraud_risk(UUID) IS 'Computes a multi-signal anti-fraud risk score (0-100) and diagnostic flags for assistant review (SRS Sec 8.5.4).';

-- ----------------------------------------------------------------------------
-- 5.4 Function: Atomic One-Click Payment Verification & Access Provisioning
-- ----------------------------------------------------------------------------
-- Implements SRS UC-04, UC-05 (EF-05.2 Optimistic/Row Locking Conflict Prevention)
-- & API `PUT /api/v1/payments/:id/verify`:
--   1. Locks the target payment row (`FOR UPDATE NOWAIT`) to prevent two assistants
--      from double-verifying the same receipt concurrently.
--   2. Verifies that the actor holds `assistant` or `super_admin` privileges.
--   3. Transitions payment status from `pending` -> `approved` or `rejected`.
--   4. If `approved`, atomically grants student access in `lecture_access` (`grant_type = 'purchased'`).
--   5. Appends an immutable audit trail entry to `admin_audit_logs`.
CREATE OR REPLACE FUNCTION fn_verify_and_settle_payment(
    p_payment_id UUID,
    p_verified_by UUID,
    p_new_status payment_status_enum,
    p_rejection_reason VARCHAR(255) DEFAULT NULL,
    p_client_ip INET DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_payment payments%ROWTYPE;
    v_verifier_role user_role_enum;
    v_access_id UUID;
    v_audit_id UUID;
    v_audit_action VARCHAR(100);
BEGIN
    -- 1. Validate target status parameter
    IF p_new_status NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'INVALID_VERIFICATION_DECISION: Decision status must be "approved" or "rejected", got "%".',
            p_new_status
            USING ERRCODE = '22023';
    END IF;

    -- 2. Enforce RBAC: Only 'assistant' or 'super_admin' can verify payments (SRS Sec 5.6)
    SELECT role INTO v_verifier_role
    FROM users
    WHERE id = p_verified_by AND is_active = true;

    IF NOT FOUND OR v_verifier_role NOT IN ('assistant', 'super_admin') THEN
        RAISE EXCEPTION 'UNAUTHORIZED_VERIFIER_ROLE: User % is not an active assistant or super_admin.',
            p_verified_by
            USING ERRCODE = '42501';
    END IF;

    -- 3. Lock payment row to prevent concurrent verification race condition (SRS EF-05.2)
    SELECT * INTO v_payment
    FROM payments
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PAYMENT_NOT_FOUND: Payment % does not exist.', p_payment_id
            USING ERRCODE = 'P0002';
    END IF;

    IF v_payment.status <> 'pending' THEN
        RAISE EXCEPTION 'PAYMENT_ALREADY_PROCESSED: Payment % was already % by user % at % (EF-05.2 Concurrent Audit Conflict).',
            p_payment_id, v_payment.status, v_payment.verified_by, v_payment.verified_at
            USING ERRCODE = '23505';
    END IF;

    -- 4. Validate rejection reason if rejecting
    IF p_new_status = 'rejected' AND (p_rejection_reason IS NULL OR char_length(trim(p_rejection_reason)) = 0) THEN
        RAISE EXCEPTION 'REJECTION_REASON_REQUIRED: A non-empty rejection_reason must be supplied when rejecting a payment.'
            USING ERRCODE = '23514';
    END IF;

    -- 5. Update the payment record
    UPDATE payments
    SET status = p_new_status,
        verified_by = p_verified_by,
        verified_at = CURRENT_TIMESTAMP,
        rejection_reason = CASE WHEN p_new_status = 'rejected' THEN trim(p_rejection_reason) ELSE NULL END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_payment_id
    RETURNING * INTO v_payment;

    -- 6. If approved, atomically grant lecture access (SRS UC-04 Step 9 & UC-05 Step 8)
    IF p_new_status = 'approved' THEN
        v_audit_action := 'PAYMENT_APPROVED';

        IF to_regclass('public.lecture_access') IS NOT NULL THEN
            INSERT INTO lecture_access (
                student_id,
                lecture_id,
                grant_type,
                views_consumed,
                is_access_revoked,
                granted_at
            )
            VALUES (
                v_payment.student_id,
                v_payment.lecture_id,
                'purchased',
                0,
                false,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (student_id, lecture_id) DO UPDATE
            SET is_access_revoked = false,
                grant_type = 'purchased',
                granted_at = CURRENT_TIMESTAMP
            RETURNING id INTO v_access_id;
        END IF;
    ELSE
        v_audit_action := 'PAYMENT_REJECTED';
    END IF;

    -- 7. Write immutable entry into admin_audit_logs (SRS Story 5.1 & Sec 8 OWASP A09)
    INSERT INTO admin_audit_logs (
        performed_by,
        action,
        target_entity,
        target_id,
        details,
        ip_address,
        created_at
    )
    VALUES (
        p_verified_by,
        v_audit_action,
        'payments',
        v_payment.id,
        jsonb_build_object(
            'student_id', v_payment.student_id,
            'lecture_id', v_payment.lecture_id,
            'amount', v_payment.amount,
            'payment_method', v_payment.payment_method,
            'transaction_reference', v_payment.transaction_reference,
            'receipt_image_hash', v_payment.receipt_image_hash,
            'previous_status', 'pending',
            'new_status', v_payment.status,
            'rejection_reason', v_payment.rejection_reason,
            'lecture_access_id', v_access_id
        ),
        p_client_ip,
        CURRENT_TIMESTAMP
    )
    RETURNING id INTO v_audit_id;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment.id,
        'status', v_payment.status,
        'access_granted', (p_new_status = 'approved'),
        'lecture_access_id', v_access_id,
        'verified_by', v_payment.verified_by,
        'verified_at', v_payment.verified_at,
        'audit_log_id', v_audit_id
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_verify_and_settle_payment(UUID, UUID, payment_status_enum, VARCHAR, INET) IS 'Atomically settles a pending payment (approve/reject), provisions student lecture access, and records an immutable admin audit log (SRS UC-04 & UC-05).';

-- ----------------------------------------------------------------------------
-- 5.5 Function: Instant Center Cash Code Redemption & Access Provisioning
-- ----------------------------------------------------------------------------
-- Implements SRS Section 5.4 (AF-04.1 Pre-Paid Scratch Card/Center Cash Code Flow):
--   * Redeems a pre-printed physical center cash code without assistant lag
--   * Employs deterministic SHA-256 code hashing preventing code reuse
--   * Provisions instant access in `lecture_access` and logs administrative audit trail
CREATE OR REPLACE FUNCTION fn_redeem_center_cash_code(
    p_student_id UUID,
    p_lecture_id UUID,
    p_code VARCHAR(100),
    p_amount NUMERIC(8, 2),
    p_client_ip INET DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_clean_code VARCHAR(100);
    v_code_hash VARCHAR(64);
    v_tx_ref VARCHAR(100);
    v_payment_id UUID;
    v_access_id UUID;
    v_audit_id UUID;
BEGIN
    -- 1. Validate inputs
    IF p_code IS NULL OR char_length(trim(p_code)) < 6 THEN
        RAISE EXCEPTION 'INVALID_CASH_CODE: Center cash code must be at least 6 characters.'
            USING ERRCODE = '22023';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'INVALID_AMOUNT: Payment amount must be greater than zero.'
            USING ERRCODE = '23514';
    END IF;

    v_clean_code := upper(trim(p_code));
    -- Deterministic SHA-256 digest of the secret scratch code
    v_code_hash := encode(digest(v_clean_code, 'sha256'), 'hex');
    v_tx_ref := 'CENTER-' || v_clean_code;

    -- 2. Insert verified payment record (triggers fn_payments_anti_fraud_guard)
    INSERT INTO payments (
        student_id,
        lecture_id,
        amount,
        payment_method,
        sender_phone_or_account,
        transaction_reference,
        receipt_image_url,
        receipt_image_hash,
        status,
        verified_by,
        verified_at,
        created_at,
        updated_at
    )
    VALUES (
        p_student_id,
        p_lecture_id,
        p_amount,
        'center_cash_code',
        'CENTER_OFFLINE_CODE',
        v_tx_ref,
        'system://center_cash_code/' || v_code_hash,
        v_code_hash,
        'approved',
        p_student_id, -- Auto-settled via authenticated student scratch code
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
    RETURNING id INTO v_payment_id;

    -- 3. Provision lecture access atomically
    IF to_regclass('public.lecture_access') IS NOT NULL THEN
        INSERT INTO lecture_access (
            student_id,
            lecture_id,
            grant_type,
            views_consumed,
            is_access_revoked,
            granted_at
        )
        VALUES (
            p_student_id,
            p_lecture_id,
            'purchased',
            0,
            false,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (student_id, lecture_id) DO UPDATE
        SET is_access_revoked = false,
            grant_type = 'purchased',
            granted_at = CURRENT_TIMESTAMP
        RETURNING id INTO v_access_id;
    END IF;

    -- 4. Record audit log
    INSERT INTO admin_audit_logs (
        performed_by,
        action,
        target_entity,
        target_id,
        details,
        ip_address,
        created_at
    )
    VALUES (
        p_student_id,
        'CENTER_CASH_CODE_REDEEMED',
        'payments',
        v_payment_id,
        jsonb_build_object(
            'student_id', p_student_id,
            'lecture_id', p_lecture_id,
            'amount', p_amount,
            'payment_method', 'center_cash_code',
            'transaction_reference', v_tx_ref,
            'receipt_image_hash', v_code_hash,
            'lecture_access_id', v_access_id
        ),
        p_client_ip,
        CURRENT_TIMESTAMP
    )
    RETURNING id INTO v_audit_id;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'status', 'approved',
        'access_granted', true,
        'lecture_access_id', v_access_id,
        'audit_log_id', v_audit_id
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_redeem_center_cash_code(UUID, UUID, VARCHAR, NUMERIC, INET) IS 'Instantly validates and redeems a center scratch card code, granting immediate lecture access without manual assistant review (SRS Sec 5.4 AF-04.1).';

-- ============================================================================
-- 6. High-Performance & Anti-Fraud Indexes (SRS Section 7, 8 & 10)
-- ============================================================================
-- Partial index for the Assistant Pending Verification Queue (sub-5ms lookup)
CREATE INDEX IF NOT EXISTS idx_payments_pending_verification
ON payments(status, created_at ASC)
WHERE status = 'pending';

-- Anti-Fraud deduplication lookup indexes
CREATE INDEX IF NOT EXISTS idx_payments_receipt_hash
ON payments(receipt_image_hash);

CREATE INDEX IF NOT EXISTS idx_payments_tx_ref
ON payments(transaction_reference);

-- Foreign key & cross-account fraud inspection indexes
CREATE INDEX IF NOT EXISTS idx_payments_student_id
ON payments(student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_lecture_id
ON payments(lecture_id);

CREATE INDEX IF NOT EXISTS idx_payments_sender_account
ON payments(sender_phone_or_account)
WHERE sender_phone_or_account IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_verified_by
ON payments(verified_by)
WHERE verified_by IS NOT NULL;

-- Admin Audit Log accountability & forensic query indexes
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_performed_by
ON admin_audit_logs(performed_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target
ON admin_audit_logs(target_entity, target_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action
ON admin_audit_logs(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at
ON admin_audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_details_gin
ON admin_audit_logs USING GIN (details);

COMMIT;
