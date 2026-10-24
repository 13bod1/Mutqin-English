-- ============================================================================
-- Project: Mr. Adel Mostafa EdTech Platform (Project Key: AG)
-- Jira Subtask: AG-17 (DB-08: DDL Migration 006 - Anti-Fraud Payments
--               (SHA-256 Receipt Hash, Unique TXN) & Audit Logs)
-- Parent Story: AG-9 (Database Elements & Relational Persistence Layer)
-- Migration ID: 006_rollback (DOWN / Rollback Migration)
-- Description: Safely tears down Migration 006 objects in strict reverse
--              dependency order (Indexes -> Triggers -> Functions -> Tables -> ENUMs).
-- ============================================================================

BEGIN;

SET lock_timeout = '5s';
SET statement_timeout = '30s';

-- ============================================================================
-- 1. Drop Indexes on `admin_audit_logs` and `payments`
-- ============================================================================
DROP INDEX IF EXISTS idx_admin_audit_logs_details_gin;
DROP INDEX IF EXISTS idx_admin_audit_logs_created_at;
DROP INDEX IF EXISTS idx_admin_audit_logs_action;
DROP INDEX IF EXISTS idx_admin_audit_logs_target;
DROP INDEX IF EXISTS idx_admin_audit_logs_performed_by;

DROP INDEX IF EXISTS idx_payments_verified_by;
DROP INDEX IF EXISTS idx_payments_sender_account;
DROP INDEX IF EXISTS idx_payments_lecture_id;
DROP INDEX IF EXISTS idx_payments_student_id;
DROP INDEX IF EXISTS idx_payments_tx_ref;
DROP INDEX IF EXISTS idx_payments_receipt_hash;
DROP INDEX IF EXISTS idx_payments_pending_verification;

-- ============================================================================
-- 2. Drop Triggers
-- ============================================================================
DROP TRIGGER IF EXISTS trg_admin_audit_logs_immutable ON admin_audit_logs;
DROP TRIGGER IF EXISTS trg_payments_anti_fraud_guard ON payments;
DROP TRIGGER IF EXISTS trg_payments_updated_at ON payments;

-- ============================================================================
-- 3. Drop Anti-Fraud Validation & Audit SQL Functions
-- ============================================================================
DROP FUNCTION IF EXISTS fn_redeem_center_cash_code(UUID, UUID, VARCHAR, NUMERIC, INET);
DROP FUNCTION IF EXISTS fn_verify_and_settle_payment(UUID, UUID, payment_status_enum, VARCHAR, INET);
DROP FUNCTION IF EXISTS fn_evaluate_payment_fraud_risk(UUID);
DROP FUNCTION IF EXISTS fn_admin_audit_logs_immutable();
DROP FUNCTION IF EXISTS fn_payments_anti_fraud_guard();

-- ============================================================================
-- 4. Drop Tables in Reverse Dependency Order
-- ============================================================================
DROP TABLE IF EXISTS admin_audit_logs CASCADE;
DROP TABLE IF EXISTS payments CASCADE;

-- ============================================================================
-- 5. Drop Custom Domain ENUM Types
-- ============================================================================
DROP TYPE IF EXISTS payment_status_enum;
DROP TYPE IF EXISTS payment_method_enum;

COMMIT;
