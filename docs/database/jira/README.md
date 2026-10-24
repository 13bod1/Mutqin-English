# Mr. Adel Mostafa Platform — Verified Task Documentation Bundle

## Executive Overview & Audit Baseline
This documentation bundle (`docs/database/jira/`) provides factual specifications and audit findings for the **Relational Persistence Architecture** and **Platform Branding** tasks.

Prior audit status recorded PostgreSQL 16 runtime execution as blocked. This blocker is now **RESOLVED** via standalone runtime verification on portable PostgreSQL 16.6 (port 5433, 14/14 automated SQL probes passed).

---

## Delivered Scope Boundaries
1. **Relational Persistence Architecture ([AG-29](./AG-29.md)):**
   - Live delivered issues: [AG-9](./AG-9.md) (Story), [AG-10](./AG-10.md) (DB-01), [AG-11](./AG-11.md) (DB-02), [AG-12](./AG-12.md) (DB-03).
   - Inaccessible legacy issues: AG-13..AG-19, AG-30, AG-31 (HTTP 404 in Jira snapshot, indeterminate).
2. **Platform Branding ([AG-39](./AG-39.md)):**
   - Audited subtasks: [AG-77](./AG-77.md) (UI text), [AG-78](./AG-78.md) (meta/favicon), [AG-79](./AG-79.md) (footer), [AG-80](./AG-80.md) (docs).

---

## Automated Test & Probe Execution Facts
- **SQLite In-Memory Test Suite:** Standalone legacy database test suite; NOT repository-wide Angular tests.
  - **Execution Engine:** Python 3.11.16, pytest-9.1.1, pluggy-1.6.0.
  - **Database Engine:** In-memory SQLite (`:memory:`), actual SQLite runtime version 3.53.1 (Python sqlite3 module 2.6.0).
  - **Test Results:** Exactly 105 tests collected, 105 passed, 0 failures, 0 errors.
  - **Execution Timing:** 0.816 seconds execution time (JUnit report `time="0.816"`), wall-clock time 7.52s.
  - **WAL Journal Mode Disclaimer:** Tests execute against `:memory:` instances; this does NOT constitute proof of disk WAL journal mode performance under concurrent load.
- **PostgreSQL 16.6 Standalone Probe Suite:**
  - **Execution Engine:** PostgreSQL 16.6 (x86_64, Windows), port 5433, `psycopg2-binary 2.9.13`.
  - **Probe Results:** 14 probes executed, 14 passed, 0 failures (duration 238.41 ms).
  - **Blocker Resolution:** Prior PostgreSQL blocked status RESOLVED on portable standalone cluster.
  - **Disclaimers:** NOT Docker verification, NOT a run of the 105 SQLite tests on PG, and NOT production verification.
  - **Full Evidence:** Detailed in [evidence/pg-runtime-summary.md](./evidence/pg-runtime-summary.md).
- **Strict Evidence Separation:** The 105 passed SQLite in-memory tests and the 14 passed PostgreSQL 16.6 runtime probes are distinct baselines and must NEVER be combined into an unqualified total.

---

## Schema Parity & Forensic Immutability
- **Canonical PostgreSQL 16:** 20 base tables + 1 analytical view (`v_student_leaderboard_tiers`), 8 ENUMs.
- **Packaged SQLite Dev:** 21 base tables + 1 analytical view (`v_student_leaderboard_tiers`). Disparity: extra legacy `password_reset_otps` table. This is a backward compatibility deviation observed from 5 immutable tests in external `test_security_and_hardening.py` (AST-verified: `test_sec_16`, `test_sec_17`, `test_sec_18`, `test_sec_19`, `test_sec_27`); this reflects an observed legacy fixture requirement rather than proof of an intentional business decision, and no full 1:1 table count parity is claimed.
- **Forensic Audit WORM:** `admin_audit_logs` is present in both engines. DELETE and UPDATE operations are blocked via database triggers (`fn_prevent_audit_log_modification()`, OWASP A09). This trigger acts as a veto against cascade hard-deletion of administrator user records, protecting forensic integrity. Forensic policy is strictly maintained without weakening.
- **Future FK Proposal:** Proposal to convert CASCADE to RESTRICT is NOT implemented in current source DDL; existing condition is documented factually.

---

## Disclosed Boundaries & Policies
1. **Schema Mismatch:** SQLite retains legacy `password_reset_otps` table (21 tables vs 20 tables in PG) due to backward compatibility requirements observed in 5 immutable tests in external `test_security_and_hardening.py`.
2. **Password Validation:** Data layer checks string length only (`len >= 20`). Cryptographic hash validation (Argon2id/bcrypt) is an application and crypto service tier boundary responsibility, not an automatic standalone database vulnerability.
3. **PostgreSQL 16 Status:** Resolved on standalone portable PG 16.6 (14/14 probes passed). Docker container and production cluster remain unverified.
4. **External Artifacts:** Standalone schema files (`01_mr_adel_production_schema_pg16.sql`, `02_mr_adel_local_dev.db`, `03_db_adapter.py`) are local non-public files, not shipped in repository.


---

## Dated Governance Audit Supersession Addendum (2026-10-24)

> **Authority & Status:** Authoritative audit correction superseding any previous automated 'all complete' declarations.

1. **Labor Accounting Transparency (AG-9 11h Actual):** The 11h actual worklog on parent story `AG-9` was historically recorded as the exact mathematical sum of its child subtask hour estimates (`AG-10`: 4h, `AG-11`: 3h, `AG-12`: 4h) on October 12, rather than via real-time stopwatch time tracking.
2. **Test Infrastructure Clarification:**
   - Standalone SQLite test verification covers exactly **105 pytest specs** running exclusively in-memory (`:memory:`). Persistent WAL file mode was not engaged during test runs.
   - Standalone PostgreSQL test verification covers exactly **14 Python probes** running against local portable PostgreSQL 14 (port 5433). Docker containerization and production cluster deployment remain unverified.
3. **No Unqualified 'All Complete' Status:** Standalone database artifacts are verified within their local dev-database boundary; full end-to-end multi-tier integration with live backend RLS and frontend remains In Progress.
