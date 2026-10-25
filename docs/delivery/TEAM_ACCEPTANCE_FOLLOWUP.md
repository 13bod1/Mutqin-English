# Team acceptance follow-up — real browser and real database

Based on c6f81773a100600b0f3f5d4f97162ef10b9e9a7a; existing complete50-subtask GitHub index retained unchanged. No automatic merge, production migration, staff reassignment or fabricated human approval.

## Implemented actual defects
- Quiz module+question loading each waited2500ms in development; nested requests exhausted the5000ms Jasmine test deadline. Each development deadline is now1500ms, production15000ms unchanged; RLS/auth errors remain fail-closed. Fresh TC-REG-07 passes without editing tests.
- Production AdminService previously initialized payments from localStorage/sample data and never fetched the real ledger. It now starts empty, fetches server-authorized payment rows and replaces—not merges—local state, with loading/error/refresh behavior.
- Corrected mapping to actual SQL fields verified_at, verified_by, payment_method and transaction_reference. Wrong reviewed_at/reviewer_id mapping lost actual review timing.
- Dashboard now binds the selected date range and displays actual reviewed, pending, average, approval and rejection metrics. Unverified sample question/rating/target charts are intentionally not represented as verified business telemetry. This reduces the dashboard to supported data, rather than pretending a complete data source exists.
- Local assistant metadata form no longer says a working authentication account was provisioned, displays a saved password or promises immediate sign-in. Actual staff account provisioning remains a privileged backend responsibility.

## Executed browser/database checks
Actual production Angular browser UI used genuine PostgreSQL16.6 and official PostgREST16.5. Real REST reads/writes and review RPCs persisted under local signed JWTs. Only Supabase session/getUser was a controlled identity adapter; NOT live GoTrue login or mail delivery.

Latest run: **6/7 cases passed, one failed**. Full orchestration status remains BLOCKED_OR_PARTIAL despite runner exit0; do not conceal it.
- PASS: actual admin form creates announcement, independent student360px browser sees committed title.
- FAIL: exact edited-body assertion. Latest observed text contained old body concatenated with new body; the attempted change is visible but exact replacement is NOT accepted. Could be input/Angular control settling or application behavior; this path was stopped rather than retried repeatedly.
- PASS: actual admin deletes announcement and student sees friendly empty state.
- PASS: real dashboard matches3 reviewed of5 receipts:3reviewed,2pending,30min,66.7%approval,33.3%rejection.
- PASS: fourth real assistant approval changes dashboard after reload to4reviewed,1pending,25min,75%approval,25%rejection.
- PASS: assistant opening/admin/metrics redirects to/assistant; not a fabricated static HTTP403 page.
- PASS: student actual backend create announcement returns403.

One earlier run wrote7/7 case successes but Node then exited1 with a disposed Playwright response during transport teardown; its parent never exported the SQL CSV. It is NOT treated as a successful completed run. Transport body buffering/awaited teardown corrected that harness issue; latest6/7 is authoritative. The attached comparison CSV contains actual browser text checked against the known server-committed ledger, not an invented raw audit export.

## Fresh full regression
BuildPASS; existing Unit **136passed/2failed/0skipped**, total138. Only AuthService success fixtures remain failing: both omit required session, and signup expects authenticated state without it. Existing E2E **18passed/3failed/0skipped**, all3 immutable legacy Mutqin title assertions. Tests/fixtures/assertions unchanged. Authentication and approved new branding were not weakened to force green. These fixture conflicts require an authorized maintainer review; all-green CI is not claimed.

Existing general browser behavior25/25 and previous real API27/27 evidence remain separate scopes. Do not add those numbers together as a single new end-to-end suite.

## Open acceptance
Announcement exact edit assertion remains open. QA Lead/Scrum Master human review and official social ownership remain pending. Complete GoTrue auth, production deployment and external payment/mail are unverified. Unavailable question/rating data was removed from verified telemetry, not secretly synthesized. Prior Jira histories and50-subtask source links preserved; follow-up task-specific links point to this exact revision.
