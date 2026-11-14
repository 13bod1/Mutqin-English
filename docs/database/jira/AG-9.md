# AG-9: Core Identity, Relational Foundations & Course Catalog

## Task Metadata
- **Jira Key:** AG-9
- **Issue Type:** Story
- **Parent Epic:** [AG-29](./AG-29.md)
- **Raw Summary from Jira:** `Core Identity & Relational Database Architecture Design (PostgreSQL 16.6 Runtime Probed; Docker Not Verified)`
- **Persona User Story:**
  > As a Prospective Student & Platform Admin, I want a robust PostgreSQL 16 & SQLite relational identity schema, so that student accounts, cohorts, and courses are reliably persisted with Egyptian phone validation.
- **Historical Jira Status:** `Done`
- **Technical Verification Status:** `VERIFIED_STANDALONE` (SQLite: 105 tests verified in-memory; PostgreSQL 16.6: 14/14 runtime probes passed on standalone portable cluster port 5433; Docker/production not verified)
- **Original Estimate:** 0h direct, 11h aggregate (AG-10: 4h, AG-11: 3h, AG-12: 4h = 11h total / 39,600s)
- **Worklog History:** 11h logged (historical worklog preserved; provenance unverified)
- **Delivered Artifacts:** External standalone (not shipped in repo): `01_mr_adel_production_schema_pg16.sql`, `02_mr_adel_local_dev.db`, `03_db_adapter.py`.
- **Runtime Evidence Document:** [pg-runtime-summary.md](./evidence/pg-runtime-summary.md)

---

## Technical Scope & Architecture Invariants
- Dual-engine relational architecture targeting PostgreSQL 16 canonical schema and SQLite local development adapter.
- Scope delivers data persistence definitions (users, groups, courses, refresh_tokens, auth_otps); does NOT deliver frontend login UI, auth controllers, or WhatsApp gateway integration.
- Egyptian phone format regex enforced at schema/adapter level (`^01[0125][0-9]{8}$`).
- UUID primary keys across tables using native `uuid_generate_v4()` (PG) and Python UDF registration (SQLite).

---

## Proposed Acceptance Criteria (BDD / Gherkin)

### Scenario (Nominal): Egyptian phone format validation and account persistence
```gherkin
Given valid student registration attributes and Egyptian mobile number matching "^01[0125][0-9]{8}$"
When identity, role, and cohort records are inserted into "users" and "groups" tables
Then records persist successfully with UUID primary keys, valid "user_role_enum", and active status.
```

### Scenario (Edge): Phone format violation and duplicate phone rejection
```gherkin
Given an invalid Egyptian mobile number format or duplicate phone number
When persistence is attempted in "users" table
Then database constraint check rejects the transaction cleanly with a constraint violation error.
```

---

## Known Disclosures & Invariant Policies
1. **Schema Parity & Legacy Table Deviation:** Canonical PostgreSQL 16 contains 20 base tables + 1 view (`v_student_leaderboard_tiers`) and 8 domain ENUMs. Development SQLite contains 21 base tables + 1 view due to the legacy `password_reset_otps` table. This extra table is a backward compatibility deviation observed from 5 immutable tests in external `test_security_and_hardening.py` (AST-verified: `test_sec_16_otp_expiry_enforcement`, `test_sec_17_otp_single_use_replay_prevention`, `test_sec_18_otp_brute_force_max_attempts_blocked`, `test_sec_19_otp_phone_sanitization`, `test_sec_27_otp_rate_limiting_and_chronological_ttl_invariant`); this is an observed legacy fixture dependency, not proof of an intentional business decision, and no full 1:1 table count parity is claimed.
2. **Password Validation Boundary:** The data access layer performs string length check (`len >= 20`) only; true cryptographic hash algorithm validation (e.g. bcrypt/Argon2id) is an application and crypto service tier boundary responsibility, not an automatic standalone database engine vulnerability.
3. **Engine Runtime Status (Blocker Resolved):** The prior PostgreSQL 16 runtime blocker is RESOLVED via standalone verification against portable PostgreSQL 16.6 on isolated port 5433 (14/14 automated SQL probes passed, 238.41ms total runtime). Docker daemon, containerized bridges, production cluster, and repository-wide tests remain unverified. See [evidence/pg-runtime-summary.md](./evidence/pg-runtime-summary.md).
4. **Strict Verification Accounting:** Verification evidence comprises two strictly separated baselines: 105 passed tests in-memory SQLite (standalone legacy database test suite) and 14 passed standalone SQL probes on PostgreSQL 16.6. These must NOT be combined into an unqualified total.
5. **Forensic WORM Policy & Admin Deletion Veto:** In `admin_audit_logs`, the OWASP A09 trigger `fn_prevent_audit_log_modification()` strictly prevents DELETE and UPDATE. In practice, this trigger acts as a veto against cascade hard-deletion of administrator user records that have audit logs, raising `SECURITY_VIOLATION`. The forensic policy is preserved without weakening. A future proposal to change cascading deletes to `ON DELETE RESTRICT` is not implemented in current DDL.
