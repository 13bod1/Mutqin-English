-- ============================================================================
-- Project: Mr. Adel Mostafa EdTech Platform (Project Key: AG)
-- Jira Subtask: AG-16 (DB-07: DDL Migration 005 - Gamification Engine, Immutable
--               Points Ledger & Chess-Tier Ranking)
-- Parent Story: AG-9 (Database Elements & Relational Persistence Layer)
-- Migration ID: 005_rollback (DOWN / Rollback Migration)
-- Description: Safely tears down Migration 005 objects in strict reverse
--              dependency order (Views -> Functions -> Triggers -> Indexes -> Tables -> ENUMs).
-- Target Engine: PostgreSQL 15+ / 16+
-- ============================================================================

BEGIN;

-- Zero-downtime migration safety timeouts
SET lock_timeout = '5s';
SET statement_timeout = '30s';

-- ============================================================================
-- 1. Drop SQL Views (Dependent on Tables & Functions)
-- ============================================================================
DROP VIEW IF EXISTS v_weekly_points_leaderboard CASCADE;
DROP VIEW IF EXISTS v_leaderboard_podium_top10 CASCADE;
DROP VIEW IF EXISTS v_student_leaderboard_tiers CASCADE;

-- ============================================================================
-- 2. Drop Stored Helper Functions
-- ============================================================================
DROP FUNCTION IF EXISTS fn_record_point_transaction(UUID, point_action_type_enum, INTEGER, UUID, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS fn_calculate_chess_tier(INTEGER) CASCADE;

-- ============================================================================
-- 3. Drop Triggers from leaderboard_points_ledger
-- ============================================================================
DROP TRIGGER IF EXISTS trg_points_ledger_sync_user_points ON leaderboard_points_ledger;
DROP TRIGGER IF EXISTS trg_points_ledger_prevent_modification ON leaderboard_points_ledger;

-- ============================================================================
-- 4. Drop Trigger Functions
-- ============================================================================
DROP FUNCTION IF EXISTS trg_sync_student_points_balance() CASCADE;
DROP FUNCTION IF EXISTS trg_enforce_immutable_points_ledger() CASCADE;

-- ============================================================================
-- 5. Drop Performance & Leaderboard Indexes
-- ============================================================================
DROP INDEX IF EXISTS idx_users_leaderboard;
DROP INDEX IF EXISTS idx_points_ledger_created_at;
DROP INDEX IF EXISTS idx_points_ledger_reference;
DROP INDEX IF EXISTS idx_points_ledger_action_type;
DROP INDEX IF EXISTS idx_points_ledger_student_created;

-- ============================================================================
-- 6. Drop Table: leaderboard_points_ledger
-- ============================================================================
DROP TABLE IF EXISTS leaderboard_points_ledger CASCADE;

-- ============================================================================
-- 7. Drop Custom Domain ENUM: point_action_type_enum
-- ============================================================================
DROP TYPE IF EXISTS point_action_type_enum CASCADE;

COMMIT;
