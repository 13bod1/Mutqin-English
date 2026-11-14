# Historical Inaccessible Tasks & Test Catalog Reconciliation

## Overview & Jira Snapshot Status
During technical audit of the Jira workspace snapshot (`jira_sanitized_snapshot.json`), 9 historical task keys referenced in legacy planning documentation returned **HTTP 404 / Inaccessible**.

These keys represent unmigrated tickets, legacy placeholders, or deleted sprint tasks. They are NOT active, NOT recreated, and remain classified as indeterminate.

---

## Inaccessible Jira Task Directory (9 Keys)

| Jira Key | Expected Role / Scope | Snapshot Status | Audit Finding |
| :--- | :--- | :--- | :--- |
| `AG-13` | DB-04: Course & Lesson Streaming Schema | HTTP 404 | Inaccessible / Indeterminate in Jira snapshot |
| `AG-14` | DB-05: Quiz & Question Bank Schema | HTTP 404 | Inaccessible / Indeterminate in Jira snapshot |
| `AG-15` | DB-06: Homework & Submission Schema | HTTP 404 | Inaccessible / Indeterminate in Jira snapshot |
| `AG-16` | DB-07: Gamification & Leaderboard Schema | HTTP 404 | Inaccessible / Indeterminate in Jira snapshot |
| `AG-17` | DB-08: Payment Gateway & Voucher Schema | HTTP 404 | Inaccessible / Indeterminate in Jira snapshot |
| `AG-18` | DB-09: Indexing, RLS & DB Hardening | HTTP 404 | Inaccessible / Indeterminate in Jira snapshot |
| `AG-19` | DB-10: Seed Data & Test Harness | HTTP 404 | Inaccessible / Indeterminate in Jira snapshot |
| `AG-30` | Core Relational Database Engine Provisioning | HTTP 404 | Inaccessible / Indeterminate in Jira snapshot |
| `AG-31` | Performance Benchmarking & SLA Validation | HTTP 404 | Inaccessible / Indeterminate in Jira snapshot |

---

## Test Catalog Reconciliation (128 vs 105)
An earlier legacy documentation catalog claimed 128 tests. Technical verification established the following factual reconciliation:

1. **Standalone Legacy Suite:** Exactly 105 tests exist in executable test files and ran successfully on in-memory SQLite.
2. **35 Phantom/Unimplemented Test Names:** The prior 128-test catalog included 35 documented names that do NOT correspond to executable code:
   - 25 phantom tests under LMS Domain Logic (`LOGIC-01` to `LOGIC-25`).
   - 10 phantom tests under Agile Governance (`GOVERN-01` to `GOVERN-10`).
3. **Discrepancy Reconciliation:** The 23-count gap was an arithmetic reconciliation error. Technical audit confirms 35 unmatched documented names were phantom/unimplemented specifications, not a 23-test engine suite. PostgreSQL 16 runtime verification is BLOCKED as an infrastructure state.
4. **Resolution:** The prior 128-test catalog is completely superseded by the verified 105-test standalone legacy suite.
