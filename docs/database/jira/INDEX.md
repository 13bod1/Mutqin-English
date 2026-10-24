# Technical Documentation Index: Jira Tasks & Database Architecture

## Overview & Scope Boundary
This directory (`docs/database/jira/`) contains grounded, audited technical specifications and audit summaries for the **Mr. Adel Mostafa EdTech Platform**.

The delivered and audited scope encompasses:
1. **Relational Database Architecture:** Epic [AG-29](./AG-29.md) and child tasks [AG-9](./AG-9.md), [AG-10](./AG-10.md), [AG-11](./AG-11.md), [AG-12](./AG-12.md).
2. **Platform Rebranding:** Story [AG-39](./AG-39.md) and owned subtasks [AG-77](./AG-77.md), [AG-78](./AG-78.md), [AG-79](./AG-79.md), [AG-80](./AG-80.md).

---

## Task Specifications (10 Tasks)

| Jira Key | Issue Type | Task Summary | Historical Jira Status | Technical Verification Status |
| :--- | :--- | :--- | :--- | :--- |
| [AG-29](./AG-29.md) | Epic | Relational Persistence, Data Security & Dual-Engine Architecture | To Do | VERIFIED_STANDALONE |
| [AG-9](./AG-9.md) | Story | Core Identity & Relational Database Architecture Design | Done | VERIFIED_STANDALONE |
| [AG-10](./AG-10.md) | Subtask | DB-01: Full Relational ERD & Schemas (PG 20+1 View vs SQLite 21+1 View) | Done | VERIFIED_STANDALONE |
| [AG-11](./AG-11.md) | Subtask | DB-02: Dual-Engine Database Configuration & Harness | Done | VERIFIED_STANDALONE |
| [AG-12](./AG-12.md) | Subtask | DB-03: Data Access Layer for Identity, Session & OTP Storage | Done | VERIFIED_STANDALONE |
| [AG-39](./AG-39.md) | Story | PBI-11: Site Rebranding Context to "Mr. Adel Mostafa" | Done | PARTIAL / SHARED CONTEXT |
| [AG-77](./AG-77.md) | Subtask | Replace site name with "Mr. Adel Mostafa" in all UI text and emails | Done | STATIC_ONLY_UNVERIFIED |
| [AG-78](./AG-78.md) | Subtask | Update favicon, page titles, meta tags and manifest name | Done | STATIC_ONLY_UNVERIFIED |
| [AG-79](./AG-79.md) | Subtask | Update footer and social icon labels | Done | STATIC_ONLY_UNVERIFIED |
| [AG-80](./AG-80.md) | Subtask | Update README and documentation with the new name | Done | STATIC_ONLY_UNVERIFIED |

---

## Technical Audit Reports & Evidence (5 Reports)

| Document | Description |
| :--- | :--- |
| [VERIFIED_AUDIT.md](./VERIFIED_AUDIT.md) | Comprehensive audit report covering 105 SQLite test results, 14 PostgreSQL 16.6 runtime probes, and verification boundaries. |
| [evidence/pg-runtime-summary.md](./evidence/pg-runtime-summary.md) | Detailed verification ledger of 14 standalone runtime probes against portable PostgreSQL 16.6. |
| [LEGACY_TASKS.md](./LEGACY_TASKS.md) | Catalog of 9 historical inaccessible tasks (AG-13..19, AG-30, AG-31) returning HTTP 404 in Jira snapshot. |
| [README.md](./README.md) | Documentation bundle guide, test execution facts, and open defect disclosures. |
| [INDEX.md](./INDEX.md) | Master navigation index and status summary (this document). |

---

## Grounded Architecture Invariants
- **Schema Parity & Backward Compatibility Deviation:** Canonical PostgreSQL 16 schema contains 20 base tables and 1 analytical view (`v_student_leaderboard_tiers`). Development SQLite contains 21 base tables and 1 view (`v_student_leaderboard_tiers`) due to extra legacy `password_reset_otps` table. This extra table is a backward compatibility deviation observed from 5 immutable tests in external `test_security_and_hardening.py` (AST-verified: `test_sec_16`, `test_sec_17`, `test_sec_18`, `test_sec_19`, `test_sec_27`); this reflects an observed legacy fixture requirement, not proof of an intentional business decision, and no full parity is claimed.
- **Test Evidence (Strictly Separated):**
  - Exactly 105 tests passed in standalone legacy database test suite on in-memory SQLite (JUnit time: 0.816s, wall time: 7.52s). These are NOT repository-wide Angular tests.
  - Exactly 14 automated runtime probes passed on portable PostgreSQL 16.6 (port 5433, duration 238.41ms).
  - Baselines are distinct and must not be combined into an unqualified total.
- **PostgreSQL 16 Status:** Prior blocker RESOLVED via standalone portable PostgreSQL 16.6 verification (port 5433). Docker daemon, containerized networking, and production cluster remain unverified.
- **Forensic WORM Policy:** `admin_audit_logs` prevents DELETE/UPDATE via trigger (OWASP A09), which vetoes admin cascade hard deletion. Future proposal CASCADE -> RESTRICT is not implemented in current DDL.
- **Password Hash Boundary:** Data access length check (`len >= 20`) is an application/crypto layer responsibility, not a standalone database engine flaw.
- **Application Context:** Angular web app uses Supabase services; non-integration applies strictly to standalone legacy test suite.
