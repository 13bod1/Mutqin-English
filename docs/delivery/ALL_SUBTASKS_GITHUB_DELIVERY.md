# All Jira subtasks — GitHub delivery index

Complete fetched project-AG subtask snapshot: **50 entries**. Source links pinned to commit `48886771b3e4fe53ab0c12791cdbaabb76f546be`.

## Submission boundary

This index supplies a separate delivery URL for EVERY fetched subtask, including unfinished tasks. It does NOT turn missing implementation or approvals into completion. Related-source links are explicitly labeled where the actual task-specific deliverable or acceptance could not be independently identified. Historical team Done states are preserved, not re-certified. No assignee/sprint/rank/description/estimate/worklog/status changes are made by this submission operation.

## Fresh verification

- Production build: exit 0.
- Unit: 135 passed / 3 failed / 0 skipped.
- E2E: 18 passed / 3 failed / 0 skipped.
- Browser behavioral checks: 25; all passed = True.
- Avatar contrast correction exercised in this revision. Measured theme rows: see linked machine-readable evidence. Gradients/media remain unmeasured; no full WCAG certification.
- Previously exercised real backend:27/27 assertions passed; no production Auth/payment/mail/deployment claim.

## Index

| Subtask | Jira snapshot | Assignee | Task-specific delivery |
|---|---|---|---|
| AG-6 | To Do | Unassigned | [Delivery](#ag-6) |
| AG-10 | Done | Samer Elhamy | [Delivery](#ag-10) |
| AG-11 | Done | Samer Elhamy | [Delivery](#ag-11) |
| AG-12 | Done | Samer Elhamy | [Delivery](#ag-12) |
| AG-20 | Done | Mohammed Ehab | [Delivery](#ag-20) |
| AG-21 | Done | Mohammed Ehab | [Delivery](#ag-21) |
| AG-22 | Done | Mohammed Ehab | [Delivery](#ag-22) |
| AG-23 | Done | Mohammed Ehab | [Delivery](#ag-23) |
| AG-24 | To Do | Unassigned | [Delivery](#ag-24) |
| AG-25 | Done | Mohammed Ehab | [Delivery](#ag-25) |
| AG-26 | Done | Mohammed Ehab | [Delivery](#ag-26) |
| AG-27 | Done | Mohammed Ehab | [Delivery](#ag-27) |
| AG-28 | Done | Mohammed Ehab | [Delivery](#ag-28) |
| AG-51 | Done | Mohammed Ehab | [Delivery](#ag-51) |
| AG-52 | Done | Mohammed Ehab | [Delivery](#ag-52) |
| AG-53 | Done | Mohammed Ehab | [Delivery](#ag-53) |
| AG-54 | Done | Mohammed Ehab | [Delivery](#ag-54) |
| AG-55 | Done | Mohammed Ehab | [Delivery](#ag-55) |
| AG-56 | Done | Mohammed Ehab | [Delivery](#ag-56) |
| AG-57 | Done | Mohammed Hamdy | [Delivery](#ag-57) |
| AG-58 | Done | Mohammed Hamdy | [Delivery](#ag-58) |
| AG-59 | Done | Mohammed Hamdy | [Delivery](#ag-59) |
| AG-60 | Done | Mohammed Hamdy | [Delivery](#ag-60) |
| AG-61 | Done | Abdullah Ahmed | [Delivery](#ag-61) |
| AG-62 | Done | Abdullah Ahmed | [Delivery](#ag-62) |
| AG-63 | Done | Abdullah Ahmed | [Delivery](#ag-63) |
| AG-64 | Done | Abdullah Ahmed | [Delivery](#ag-64) |
| AG-65 | Done | Abdullah Ahmed | [Delivery](#ag-65) |
| AG-66 | Done | Mohammed Hamdy | [Delivery](#ag-66) |
| AG-67 | Done | HAZEM AHMED | [Delivery](#ag-67) |
| AG-68 | Done | HAZEM AHMED | [Delivery](#ag-68) |
| AG-69 | Done | HAZEM AHMED | [Delivery](#ag-69) |
| AG-70 | Done | HAZEM AHMED | [Delivery](#ag-70) |
| AG-72 | In Progress | sherryhany | [Delivery](#ag-72) |
| AG-73 | In Progress | sherryhany | [Delivery](#ag-73) |
| AG-74 | In Progress | sherryhany | [Delivery](#ag-74) |
| AG-75 | In Progress | sherryhany | [Delivery](#ag-75) |
| AG-76 | In Progress | sherryhany | [Delivery](#ag-76) |
| AG-77 | Done | Samer Elhamy | [Delivery](#ag-77) |
| AG-78 | Done | Samer Elhamy | [Delivery](#ag-78) |
| AG-79 | In Progress | Samer Elhamy | [Delivery](#ag-79) |
| AG-80 | Done | Samer Elhamy | [Delivery](#ag-80) |
| AG-81 | Done | Gafar | [Delivery](#ag-81) |
| AG-82 | Done | Gafar | [Delivery](#ag-82) |
| AG-83 | Done | Gafar | [Delivery](#ag-83) |
| AG-84 | Done | Gafar | [Delivery](#ag-84) |
| AG-85 | To Do | KingKarmy | [Delivery](#ag-85) |
| AG-86 | To Do | KingKarmy | [Delivery](#ag-86) |
| AG-87 | Done | KingKarmy | [Delivery](#ag-87) |
| AG-88 | Done | KingKarmy | [Delivery](#ag-88) |

## AG-6

notification system for sending any new moodle content

- Parent: `AG-4`; assignee: Unassigned; Jira snapshot: `To Do`.
- Evidence classification: **RELATED SOURCE / ACCEPTANCE NOT CERTIFIED**.
- Boundary: Related public notification/settings source only; automatic Moodle ingestion/sending is NOT implemented or verified by this delivery.
- [src/app/core/services/public-settings.service.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/core/services/public-settings.service.ts)

## AG-10

DB-01: Full Relational ERD & Schemas (PG 20+1 View vs SQLite 21+1 View Mismatch Tracked)

- Parent: `AG-9`; assignee: Samer Elhamy; Jira snapshot: `Done`.
- Evidence classification: **TASK SOURCE ARTIFACT**.
- Boundary: Existing source artifact linked; Jira status is a snapshot, not a new acceptance decision.
- [database/standalone/schema/01_mr_adel_production_schema_pg16.sql](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/database/standalone/schema/01_mr_adel_production_schema_pg16.sql)
- [database/standalone/inventory/AG9_SCOPE_INVENTORY.md](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/database/standalone/inventory/AG9_SCOPE_INVENTORY.md)

## AG-11

DB-02: Dual-Engine Database Configuration & Harness (PostgreSQL 16.6 Runtime Probed; Docker Not Verified)

- Parent: `AG-9`; assignee: Samer Elhamy; Jira snapshot: `Done`.
- Evidence classification: **TASK SOURCE ARTIFACT**.
- Boundary: Existing source artifact linked; Jira status is a snapshot, not a new acceptance decision.
- [database/standalone/QUICKSTART.md](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/database/standalone/QUICKSTART.md)
- [docs/database/jira/evidence/pg-runtime-summary.md](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/docs/database/jira/evidence/pg-runtime-summary.md)

## AG-12

DB-03: Data Access Layer for Identity, Session & OTP Storage (Not Live WhatsApp / Hash Length Check Only)

- Parent: `AG-9`; assignee: Samer Elhamy; Jira snapshot: `Done`.
- Evidence classification: **TASK SOURCE ARTIFACT**.
- Boundary: Existing source artifact linked; Jira status is a snapshot, not a new acceptance decision.
- [database/standalone/adapter/db_adapter.py](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/database/standalone/adapter/db_adapter.py)
- [database/standalone/migrations/001_identity_rbac_courses.sql](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/database/standalone/migrations/001_identity_rbac_courses.sql)

## AG-20

Build Landing page

- Parent: `AG-3`; assignee: Mohammed Ehab; Jira snapshot: `Done`.
- Evidence classification: **TASK SOURCE ARTIFACT**.
- Boundary: Existing source artifact linked; Jira status is a snapshot, not a new acceptance decision.
- [src/app/features/landing/landing.page.html](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/features/landing/landing.page.html)

## AG-21

Build Login and Sign-up pages

- Parent: `AG-3`; assignee: Mohammed Ehab; Jira snapshot: `Done`.
- Evidence classification: **TASK SOURCE ARTIFACT**.
- Boundary: Existing source artifact linked; Jira status is a snapshot, not a new acceptance decision.
- [src/app/features/auth/login.page.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/features/auth/login.page.ts)
- [src/app/features/auth/signup.page.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/features/auth/signup.page.ts)

## AG-22

Set up project and routing

- Parent: `AG-3`; assignee: Mohammed Ehab; Jira snapshot: `Done`.
- Evidence classification: **TASK SOURCE ARTIFACT**.
- Boundary: Existing source artifact linked; Jira status is a snapshot, not a new acceptance decision.
- [src/app/app.routes.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/app.routes.ts)
- [package.json](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/package.json)

## AG-23

Build shared UI components

- Parent: `AG-3`; assignee: Mohammed Ehab; Jira snapshot: `Done`.
- Evidence classification: **TASK SOURCE ARTIFACT**.
- Boundary: Existing source artifact linked; Jira status is a snapshot, not a new acceptance decision.
- [src/app/shared/ui/avatar.component.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/shared/ui/avatar.component.ts)

## AG-24

progress tracking

- Parent: `AG-5`; assignee: Unassigned; Jira snapshot: `To Do`.
- Evidence classification: **RELATED SOURCE / ACCEPTANCE NOT CERTIFIED**.
- Boundary: Related progress implementation exists; unassigned To Do task acceptance is not verified.
- [src/app/core/data/progress.service.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/core/data/progress.service.ts)
- [src/app/features/progress/progress.page.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/features/progress/progress.page.ts)

## AG-25

Design Recorded Lectures page

- Parent: `AG-3`; assignee: Mohammed Ehab; Jira snapshot: `Done`.
- Evidence classification: **TASK SOURCE ARTIFACT**.
- Boundary: Existing source artifact linked; Jira status is a snapshot, not a new acceptance decision.
- [src/app/features/lectures/lectures.page.html](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/features/lectures/lectures.page.html)

## AG-26

Design Quizzes and Exercises pages

- Parent: `AG-3`; assignee: Mohammed Ehab; Jira snapshot: `Done`.
- Evidence classification: **TASK SOURCE ARTIFACT**.
- Boundary: Existing source artifact linked; Jira status is a snapshot, not a new acceptance decision.
- [src/app/features/quizzes/quizzes.page.html](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/features/quizzes/quizzes.page.html)

## AG-27

Design Track Your Progress page

- Parent: `AG-3`; assignee: Mohammed Ehab; Jira snapshot: `Done`.
- Evidence classification: **TASK SOURCE ARTIFACT**.
- Boundary: Existing source artifact linked; Jira status is a snapshot, not a new acceptance decision.
- [src/app/features/progress/progress.page.html](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/features/progress/progress.page.html)

## AG-28

Design Learn at Your Own Pace page

- Parent: `AG-3`; assignee: Mohammed Ehab; Jira snapshot: `Done`.
- Evidence classification: **TASK SOURCE ARTIFACT**.
- Boundary: Existing source artifact linked; Jira status is a snapshot, not a new acceptance decision.
- [src/app/features/landing/landing.page.html](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/features/landing/landing.page.html)

## AG-51

UI/UX: Payment checkout mockups [8h]

- Parent: `AG-40`; assignee: Mohammed Ehab; Jira snapshot: `Done`.
- Evidence classification: **RELATED SOURCE / ACCEPTANCE NOT CERTIFIED**.
- Boundary: Implemented UI link, not proof of original design-tool mockup approval.
- [src/app/features/checkout/checkout.page.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/features/checkout/checkout.page.ts)

## AG-52

UI/UX: Live page mockups [8h]

- Parent: `AG-41`; assignee: Mohammed Ehab; Jira snapshot: `Done`.
- Evidence classification: **RELATED SOURCE / ACCEPTANCE NOT CERTIFIED**.
- Boundary: Implemented UI link, not proof of original design-tool mockup approval.
- [src/app/features/live/live-list.page.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/features/live/live-list.page.ts)

## AG-53

UI/UX: Admin portal and dashboard layout [10h]

- Parent: `AG-42`; assignee: Mohammed Ehab; Jira snapshot: `Done`.
- Evidence classification: **RELATED SOURCE / ACCEPTANCE NOT CERTIFIED**.
- Boundary: Implemented UI link, not proof of original design-tool mockup approval.
- [src/app/features/admin/admin-shell.component.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/features/admin/admin-shell.component.ts)

## AG-54

UI/UX: Theme picker and popup design [6h]

- Parent: `AG-43`; assignee: Mohammed Ehab; Jira snapshot: `Done`.
- Evidence classification: **RELATED SOURCE / ACCEPTANCE NOT CERTIFIED**.
- Boundary: Implemented UI link, not proof of original design-tool mockup approval.
- [src/app/features/admin/settings.page.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/features/admin/settings.page.ts)
- [src/app/shared/layout/header.component.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/shared/layout/header.component.ts)

## AG-55

UI/UX: Announcements page and logo lockup [6h]

- Parent: `AG-44`; assignee: Mohammed Ehab; Jira snapshot: `Done`.
- Evidence classification: **RELATED SOURCE / ACCEPTANCE NOT CERTIFIED**.
- Boundary: Implemented UI link, not proof of original logo/design-tool mockup approval.
- [src/app/features/announcements/announcements.page.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/features/announcements/announcements.page.ts)

## AG-56

UI/UX: Assistant KPI dashboard mockup [4h]

- Parent: `AG-45`; assignee: Mohammed Ehab; Jira snapshot: `Done`.
- Evidence classification: **RELATED SOURCE / ACCEPTANCE NOT CERTIFIED**.
- Boundary: Implemented UI link, not proof of original design-tool mockup approval.
- [src/app/features/admin/metrics.page.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/features/admin/metrics.page.ts)

## AG-57

Frontend: Checkout UI with payment states [12h]

- Parent: `AG-40`; assignee: Mohammed Hamdy; Jira snapshot: `Done`.
- Evidence classification: **TASK SOURCE ARTIFACT**.
- Boundary: Existing source artifact linked; Jira status is a snapshot, not a new acceptance decision.
- [src/app/features/checkout/checkout.page.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/features/checkout/checkout.page.ts)
- [src/app/features/checkout/payment-result.page.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/features/checkout/payment-result.page.ts)

## AG-58

Frontend: Live page UI [12h]

- Parent: `AG-41`; assignee: Mohammed Hamdy; Jira snapshot: `Done`.
- Evidence classification: **TASK SOURCE ARTIFACT**.
- Boundary: Existing source artifact linked; Jira status is a snapshot, not a new acceptance decision.
- [src/app/features/live/live-session.page.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/features/live/live-session.page.ts)

## AG-59

Frontend: Admin shell, theme settings UI and main-page popup [14h]

- Parent: `AG-42`; assignee: Mohammed Hamdy; Jira snapshot: `Done`.
- Evidence classification: **TASK SOURCE ARTIFACT**.
- Boundary: Existing source artifact linked; Jira status is a snapshot, not a new acceptance decision.
- [src/app/features/admin/admin-shell.component.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/features/admin/admin-shell.component.ts)
- [src/app/features/admin/settings.page.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/features/admin/settings.page.ts)
- [src/app/core/services/public-settings.service.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/core/services/public-settings.service.ts)

## AG-60

Frontend: Announcements page UI [6h]

- Parent: `AG-44`; assignee: Mohammed Hamdy; Jira snapshot: `Done`.
- Evidence classification: **TASK SOURCE ARTIFACT**.
- Boundary: Existing source artifact linked; Jira status is a snapshot, not a new acceptance decision.
- [src/app/features/announcements/announcements.page.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/features/announcements/announcements.page.ts)

## AG-61

Backend: Payment gateway integration, webhook and payments table [16h]

- Parent: `AG-40`; assignee: Abdullah Ahmed; Jira snapshot: `Done`.
- Evidence classification: **RELATED SOURCE / ACCEPTANCE NOT CERTIFIED**.
- Boundary: Related payment service/schema only. Actual external gateway webhook/production integration is not certified here.
- [src/app/core/services/payment.service.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/core/services/payment.service.ts)
- [database/standalone/migrations/006_payments_antifraud_audit.sql](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/database/standalone/migrations/006_payments_antifraud_audit.sql)

## AG-62

Backend: Live sessions API [10h]

- Parent: `AG-41`; assignee: Abdullah Ahmed; Jira snapshot: `Done`.
- Evidence classification: **TASK SOURCE ARTIFACT**.
- Boundary: Existing source artifact linked; Jira status is a snapshot, not a new acceptance decision.
- [src/app/core/services/live-session.service.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/core/services/live-session.service.ts)

## AG-63

Backend: Admin API, RBAC admin role and theme/popup settings endpoint [10h]

- Parent: `AG-42`; assignee: Abdullah Ahmed; Jira snapshot: `Done`.
- Evidence classification: **TASK SOURCE ARTIFACT**.
- Boundary: Existing source artifact linked; Jira status is a snapshot, not a new acceptance decision.
- [supabase/migrations/20261024_002_announcements_settings_receipt_rpc.sql](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/supabase/migrations/20261024_002_announcements_settings_receipt_rpc.sql)
- [src/app/core/auth/staff.guard.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/core/auth/staff.guard.ts)

## AG-64

Backend: Announcements CRUD API [5h]

- Parent: `AG-44`; assignee: Abdullah Ahmed; Jira snapshot: `Done`.
- Evidence classification: **TASK SOURCE ARTIFACT**.
- Boundary: Existing source artifact linked; Jira status is a snapshot, not a new acceptance decision.
- [supabase/migrations/20261024_002_announcements_settings_receipt_rpc.sql](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/supabase/migrations/20261024_002_announcements_settings_receipt_rpc.sql)
- [src/app/core/services/public-settings.service.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/core/services/public-settings.service.ts)

## AG-65

Backend: Assistant activity logging and metrics API [8h]

- Parent: `AG-45`; assignee: Abdullah Ahmed; Jira snapshot: `Done`.
- Evidence classification: **TASK SOURCE ARTIFACT**.
- Boundary: Existing source artifact linked; Jira status is a snapshot, not a new acceptance decision.
- [supabase/migrations/20261024_002_announcements_settings_receipt_rpc.sql](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/supabase/migrations/20261024_002_announcements_settings_receipt_rpc.sql)
- [src/app/core/data/admin.service.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/core/data/admin.service.ts)

## AG-66

Frontend: Assistant KPI dashboard UI [6h]

- Parent: `AG-45`; assignee: Mohammed Hamdy; Jira snapshot: `Done`.
- Evidence classification: **TASK SOURCE ARTIFACT**.
- Boundary: Existing source artifact linked; Jira status is a snapshot, not a new acceptance decision.
- [src/app/features/admin/metrics.page.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/features/admin/metrics.page.ts)

## AG-67

QA: Payment test plan and Gherkin test cases [8h]

- Parent: `AG-40`; assignee: HAZEM AHMED; Jira snapshot: `Done`.
- Evidence classification: **TASK SOURCE ARTIFACT**.
- Boundary: Existing source artifact linked; Jira status is a snapshot, not a new acceptance decision.
- [qa/test-plans/AG-67-payment-test-plan.md](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/qa/test-plans/AG-67-payment-test-plan.md)
- [qa/features/AG-67-payment.feature](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/qa/features/AG-67-payment.feature)

## AG-68

QA: Execute payment tests and security checks [8h]

- Parent: `AG-40`; assignee: HAZEM AHMED; Jira snapshot: `Done`.
- Evidence classification: **RELATED SOURCE / ACCEPTANCE NOT CERTIFIED**.
- Boundary: Existing team report/test source only; this index does not independently certify its historical results.
- [qa/reports/sprint-2-qa-execution-report.md](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/qa/reports/sprint-2-qa-execution-report.md)
- [src/app/core/services/payment.service.spec.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/core/services/payment.service.spec.ts)

## AG-69

QA: Live page tests (access, start/end, mobile) [8h]

- Parent: `AG-41`; assignee: HAZEM AHMED; Jira snapshot: `Done`.
- Evidence classification: **RELATED SOURCE / ACCEPTANCE NOT CERTIFIED**.
- Boundary: Existing team test source only; this index does not independently certify live provider start/end acceptance.
- [qa/features/AG-69-live-streaming.feature](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/qa/features/AG-69-live-streaming.feature)
- [src/app/core/services/live-session.service.spec.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/core/services/live-session.service.spec.ts)

## AG-70

QA: Regression of Sprint 1 features after rebrand [6h]

- Parent: `AG-39`; assignee: HAZEM AHMED; Jira snapshot: `Done`.
- Evidence classification: **RELATED SOURCE / ACCEPTANCE NOT CERTIFIED**.
- Boundary: Fresh regression suites are not fully green; historical Done is preserved, not independently re-approved.
- [src/app/core/services/rebrand-regression.spec.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/core/services/rebrand-regression.spec.ts)
- [qa/features/AG-70-rebrand-regression.feature](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/qa/features/AG-70-rebrand-regression.feature)

## AG-72

QA: Admin portal and RBAC tests (incl. IDOR) [10h]

- Parent: `AG-42`; assignee: sherryhany; Jira snapshot: `In Progress`.
- Evidence classification: **RELATED SOURCE / ACCEPTANCE NOT CERTIFIED**.
- Boundary: Real isolated PostgREST RBAC cases27/27 passed; complete browser-route acceptance/defect workflow remains open.
- [qa/sherry/AG-72-admin-rbac-security-test-plan.md](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/qa/sherry/AG-72-admin-rbac-security-test-plan.md)
- [qa/sherry/real-backend-acceptance.feature](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/qa/sherry/real-backend-acceptance.feature)

## AG-73

QA: Theme and popup tests (cross-browser, mobile, WCAG) [6h]

- Parent: `AG-43`; assignee: sherryhany; Jira snapshot: `In Progress`.
- Evidence classification: **RELATED SOURCE / ACCEPTANCE NOT CERTIFIED**.
- Boundary: Fresh browser/theme sample results linked below; gradients/media and full cross-client everywhere/WCAG acceptance unverified.
- [qa/sherry/AG-73-theme-popup-test-plan.md](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/qa/sherry/AG-73-theme-popup-test-plan.md)
- [src/styles.scss](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/styles.scss)

## AG-74

QA: Announcements tests [4h]

- Parent: `AG-44`; assignee: sherryhany; Jira snapshot: `In Progress`.
- Evidence classification: **RELATED SOURCE / ACCEPTANCE NOT CERTIFIED**.
- Boundary: Actual backend CRUD/blocked student writes and browser empty/mobile checks passed separately; combined authenticated browser CRUD still unverified.
- [qa/sherry/AG-74-announcements-test-plan.md](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/qa/sherry/AG-74-announcements-test-plan.md)
- [src/app/features/admin/announcements.page.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/features/admin/announcements.page.ts)

## AG-75

QA: Validate assistant KPI accuracy against raw logs [6h]

- Parent: `AG-45`; assignee: sherryhany; Jira snapshot: `In Progress`.
- Evidence classification: **RELATED SOURCE / ACCEPTANCE NOT CERTIFIED**.
- Boundary: Real audit CSV and manual comparison are available; complete dashboard-to-raw-event reconciliation remains unverified.
- [qa/sherry/AG-75-assistant-kpi-verification-matrix.md](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/qa/sherry/AG-75-assistant-kpi-verification-matrix.md)
- [src/app/features/admin/metrics.page.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/features/admin/metrics.page.ts)

## AG-76

QA: UAT script for the Sprint 2 Review [4h]

- Parent: `AG-71`; assignee: sherryhany; Jira snapshot: `In Progress`.
- Evidence classification: **RELATED SOURCE / ACCEPTANCE NOT CERTIFIED**.
- Boundary: Authored script delivered; QA Lead and Scrum Master approvals remain pending. No human signatures inferred.
- [qa/sherry/AG-76-sprint-2-uat-script-mr-adel.md](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/qa/sherry/AG-76-sprint-2-uat-script-mr-adel.md)

## AG-77

Branding: Replace site name with "Mr. Adel Mostafa" in all UI text and emails [6h]

- Parent: `AG-39`; assignee: Samer Elhamy; Jira snapshot: `Done`.
- Evidence classification: **TASK SOURCE ARTIFACT**.
- Boundary: Existing source artifact linked; Jira status is a snapshot, not a new acceptance decision.
- [email-templates/render_templates.py](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/email-templates/render_templates.py)
- [email-templates/rendered_samples/sample_confirmation.html](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/email-templates/rendered_samples/sample_confirmation.html)
- [src/index.html](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/index.html)

## AG-78

Branding: Update favicon, page titles, meta tags and manifest name [3h]

- Parent: `AG-39`; assignee: Samer Elhamy; Jira snapshot: `Done`.
- Evidence classification: **TASK SOURCE ARTIFACT**.
- Boundary: Existing source artifact linked; Jira status is a snapshot, not a new acceptance decision.
- [src/index.html](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/index.html)
- [public/manifest.webmanifest](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/public/manifest.webmanifest)
- [public/favicon.svg](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/public/favicon.svg)

## AG-79

Branding: Update footer and social icon labels [2h]

- Parent: `AG-39`; assignee: Samer Elhamy; Jira snapshot: `In Progress`.
- Evidence classification: **RELATED SOURCE / ACCEPTANCE NOT CERTIFIED**.
- Boundary: Footer labels/source available; official social-account ownership/URLs not independently confirmed.
- [src/app/shared/layout/footer.component.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/shared/layout/footer.component.ts)

## AG-80

Docs: Update README and documentation with the new name [2h]

- Parent: `AG-39`; assignee: Samer Elhamy; Jira snapshot: `Done`.
- Evidence classification: **TASK SOURCE ARTIFACT**.
- Boundary: Existing source artifact linked; Jira status is a snapshot, not a new acceptance decision.
- [README.md](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/README.md)
- [database/standalone/README.md](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/database/standalone/README.md)

## AG-81

Content: Arabic/English payment step texts and error messages [4h]

- Parent: `AG-40`; assignee: Gafar; Jira snapshot: `Done`.
- Evidence classification: **TASK SOURCE ARTIFACT**.
- Boundary: Existing source artifact linked; Jira status is a snapshot, not a new acceptance decision.
- [src/app/core/i18n/i18n.s2.ar.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/core/i18n/i18n.s2.ar.ts)
- [src/app/core/i18n/i18n.s2.en.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/core/i18n/i18n.s2.en.ts)

## AG-82

Content: Help text for the live and payment pages [4h]

- Parent: `AG-41`; assignee: Gafar; Jira snapshot: `Done`.
- Evidence classification: **TASK SOURCE ARTIFACT**.
- Boundary: Existing source artifact linked; Jira status is a snapshot, not a new acceptance decision.
- [src/app/core/i18n/i18n.s2.ar.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/core/i18n/i18n.s2.ar.ts)
- [src/app/core/i18n/i18n.s2.en.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/core/i18n/i18n.s2.en.ts)

## AG-83

Content: Three sample announcements for testing and demo [2h]

- Parent: `AG-44`; assignee: Gafar; Jira snapshot: `Done`.
- Evidence classification: **RELATED SOURCE / ACCEPTANCE NOT CERTIFIED**.
- Boundary: Explicit sample announcement fixtures, not live announcements or delivery evidence.
- [src/app/core/mock/admin.mock.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/core/mock/admin.mock.ts)

## AG-84

Content: Update the guide-video script [3h]

- Parent: `AG-39`; assignee: Gafar; Jira snapshot: `Done`.
- Evidence classification: **RELATED SOURCE / ACCEPTANCE NOT CERTIFIED**.
- Boundary: Related video metadata/content only; original guide-video script artifact not independently identified.
- [src/app/core/mock/content.mock.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/core/mock/content.mock.ts)

## AG-85

Frontend (small): Announcement card, LIVE badge and empty-state components [8h]

- Parent: `AG-44`; assignee: KingKarmy; Jira snapshot: `To Do`.
- Evidence classification: **RELATED SOURCE / ACCEPTANCE NOT CERTIFIED**.
- Boundary: Related existing announcement components found; original To Do acceptance is not independently approved.
- [src/app/features/announcements/announcements.page.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/features/announcements/announcements.page.ts)
- [src/app/features/landing/landing.page.html](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/features/landing/landing.page.html)

## AG-86

Frontend (small): "Live now" badge in the navbar [3h]

- Parent: `AG-41`; assignee: KingKarmy; Jira snapshot: `To Do`.
- Evidence classification: **RELATED SOURCE / ACCEPTANCE NOT CERTIFIED**.
- Boundary: Related header source found; dynamic Live now badge acceptance is not independently verified.
- [src/app/shared/layout/header.component.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/shared/layout/header.component.ts)

## AG-87

Frontend (small): Responsive fixes on the main page [4h]

- Parent: `AG-43`; assignee: KingKarmy; Jira snapshot: `Done`.
- Evidence classification: **TASK SOURCE ARTIFACT**.
- Boundary: Existing source artifact linked; Jira status is a snapshot, not a new acceptance decision.
- [src/app/shared/layout/header.component.ts](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/shared/layout/header.component.ts)
- [src/app/features/landing/landing.page.html](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/src/app/features/landing/landing.page.html)

## AG-88

Docs: Demo screenshots for the Sprint 2 Review [2h]

- Parent: `AG-71`; assignee: KingKarmy; Jira snapshot: `Done`.
- Evidence classification: **RELATED SOURCE / ACCEPTANCE NOT CERTIFIED**.
- Boundary: Existing team screenshots available; capture provenance/approval not independently established by index generation.
- [docs/screenshots/01_landing_hero.webp](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/docs/screenshots/01_landing_hero.webp)
- [docs/screenshots/07_mobile_responsive_ar.webp](https://github.com/13bod1/Mutqin-English/blob/48886771b3e4fe53ab0c12791cdbaabb76f546be/docs/screenshots/07_mobile_responsive_ar.webp)
