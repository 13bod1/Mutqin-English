# QA & UAT Deliverables Ledger: Sherry Scope (Sprint 2)

This directory contains the verified test plans, Cucumber/Gherkin specification features, and Product Owner UAT acceptance runbooks authored for Sherry Hany's assigned scope in Jira Project AG (Mr. Adel Mostafa EdTech Platform).

---

## 1. Confirmed Scope: 7-Task Status Checklist

In accordance with strict verification rules, status entries reflect **only known evidence**. Tasks requiring live pipeline execution or stakeholder sign-off default to **Awaiting Runtime / Execution Evidence**.

| # | Jira Key | Issue Type | Summary | Estimate / SP | Current Jira Status | Verified Evidence Status |
| :-: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **AG-8** | Story | System testing | 5.0 SP | `Done` | **Historical Baseline Audited** (105 Executable DB Tests on SQLite :memory: NOT WAL NOT PG 105; PG 14 separate portable not production; 138 Frontend Specs pass in latest run 2026-10-23T21:26:48 vs prior 136/137; Historic Status Preserved) |
| 2 | **AG-43** | Story | PBI-15: Theme options & admin main page popup | 5.0 SP | `In Progress` | **Awaiting Runtime / Execution Evidence** (Child subtasks AG-54 UI/UX & AG-87 Frontend in progress) |
| 3 | **AG-72** | Subtask | QA: Admin portal and RBAC tests (incl. IDOR) | 10h | `In Progress` | **Authored & Awaiting Runtime** (Test plan & Cucumber feature delivered in `qa/sherry/`) |
| 4 | **AG-73** | Subtask | QA: Theme and popup tests across viewports + WCAG | 6h | `In Progress` | **Authored & Awaiting Runtime** (Test plan & Cucumber feature delivered in `qa/sherry/`) |
| 5 | **AG-74** | Subtask | QA: Announcements tests (incl. empty state and mobile) | 4h | `In Progress` | **Authored & Awaiting Runtime** (Test plan & Cucumber feature delivered in `qa/sherry/`) |
| 6 | **AG-75** | Subtask | QA: Assistant operational KPI accuracy vs. raw logs | 6h | `In Progress` | **Authored & Awaiting Runtime** (Verification matrix delivered in `qa/sherry/`) |
| 7 | **AG-76** | Subtask | QA: Sprint 2 Review & UAT acceptance runbook for PO | 4h | `In Progress` | **Runbook Authored & Ready for QA Lead Review** (`AG-76-sprint-2-uat-script-mr-adel.md` complete; timetracking 4h set; sign-offs PENDING) |

---

## 2. Inventory of Authored Deliverables

| Deliverable File | Target Task | Description |
| :--- | :--- | :--- |
| `AG-72-admin-rbac-security-test-plan.md` | AG-72 | Admin Portal RBAC, Staff Guard, and IDOR boundary test plan |
| `AG-72-admin-rbac.feature` | AG-72 | Executable Gherkin feature specification for RBAC security |
| `AG-73-theme-popup-test-plan.md` | AG-73 | Theme switcher, WCAG 2.1 AA contrast, and popup modal test plan |
| `AG-73-theme-popup.feature` | AG-73 | Gherkin feature specification for theme persistence & popup dismissal |
| `AG-74-announcements-test-plan.md` | AG-74 | Announcements CRUD, ordering, empty state, and 360px mobile test plan |
| `AG-74-announcements.feature` | AG-74 | Gherkin feature specification for announcement lifecycle |
| `AG-75-assistant-kpi-verification-matrix.md` | AG-75 | Assistant review speed and accuracy KPI verification matrix vs raw logs |
| `AG-76-sprint-2-uat-script-mr-adel.md` | AG-76 | Step-by-step non-technical UAT runbook for Mr. Adel Mostafa covering PBIs 11–17 |
| `SHERRY_QA_SPRINT_2_VERIFIED_REPORT.md` | All | Master IEEE Std 829-2008 audit report and verified metrics ledger |
| `README.md` | All | This scope index and execution status ledger |

---

## 3. Workstream Boundaries & Governance Rules

1. **Immutable Tests Law:** All existing automated test files (`*.spec.ts`, `tests/**`) are strictly immutable. No tests are modified, bypassed, or mocked.
2. **Teammate Subtask Isolation:** Child subtasks under `AG-43` owned by other team members (`AG-54` UI/UX and `AG-87` Frontend) are preserved without mutation.
3. **No Premature Sign-Offs:** All UAT acceptance fields in `AG-76` remain explicitly `PENDING REVIEW`. `AG-76` will not be transitioned to `Done` until the formal live review session with the QA Lead, Scrum Master, and Mr. Adel Mostafa.
4. **Historical Traceability:** `AG-8` remains in its historical `Done` state, with its factual engineering audit recorded via formal comment to rectify legacy documentation inaccuracies without altering project history.
