# Integrated delivery — real backend verification

## Source integration
Current team main `ac585bfb72e1da595274cd2f421c3efdcbe52b35` was merged into the delivery in merge commit `d9b36ac579d706678a53ade15aae6b1451015609`. All 49 checked test source files match upstream main exactly after line-ending normalization. Team thumbnails, announcements route, forgot-password UI, WhatsApp support and theme features were retained. Unsafe static staff/password-cache login and email-only password resets were not reinstated.

## Real backend, not a fabricated HTTP server
Official PostgREST 16.5 + a fresh PostgreSQL16.6 instance ran on loopback. The missing libpq runtime was supplied process-locally from the installed psycopg2 wheel; no system DLL or registry changes. Exact candidate SQL migration applied twice. **27/27 actual assertions passed**, including signed-JWT authorization, student/assistant financial HTTP403, profile/payment ID substitution returning no rows, self-elevation HTTP403, audit-bypass UPDATE HTTP403, non-NULL lecture approval, rejection, duplicate review rejection, preserved views_consumed=3, and real shared announcement create/read/update/delete with student writes blocked. Owned services shut down cleanly.

Boundary: the local auth schema implements claim binding for real PostgREST JWT verification. It is NOT Supabase GoTrue login/SMTP or a production deployment. Browser route denial is a redirect, not an invented HTTP403 response from a static host.

## Auth/recovery implementation
Provider-acknowledged recovery request has generic non-enumerating results. An email alone cannot reset a password. Password update requires PASSWORD_RECOVERY event, matching server-verified getUser identity, minimum12 characters, and provider acknowledgement. Recovery-specific UI added. **5/5 actual imported AuthService controlled-adapter assertions passed**. These do not claim an actual recovery email was delivered.

## Browser and regression evidence
Latest actual production build PASS. Browser behavior **25/25 PASS** across Chromium/Firefox/WebKit, including mobile360/390 contexts, empty announcements and popup flows. The public announcements page now uses PublicSettingsService rather than injecting private AdminService and exposes only sent/due notices.

Contrast probe now waits for theme CSS transitions, after a separate actual DOM ancestor probe disproved the earlier supposed Ivy failure. Light themes and dark classic/navy have zero measured failures. Dark emerald/purple/gold each retain one sampled avatar-text contrast failure (4.39 rather than4.5). Gradients/media remain unmeasured; do not claim all WCAG AA criteria pass.

Catalogue/quiz network waits now have bounded request deadlines, retain production fail-closed behavior and never turn permission errors into fixtures. Existing Unit improved to **135 passed /3 failed /0 skipped**, total138: two auth fixtures still omit required validated sessions; quiz grading regression still fails its async gate. Existing E2E remains **18 passed /3 failed /0 skipped**, all failures legacy old-brand title expectations. No assertions, fixtures, test skips or login security were changed to force green.

## Real audit comparison
Five synthetic receipts, four real committed review events: approved3, rejected1, pending1, approval75%, rejection25%, average25min. Earlier three-event checkpoint was20/30/40min (66.7% approval, average30min). Raw audit CSV and comparison attached to AG-75/AG-45. This is actual database audit data, but the complete browser dashboard reconciliation remains unverified and AG-75 is not declared Done from a CSV alone.

## Open gates
No production migration/deployment/GoTrue recovery; remaining Unit/E2E failures; three dark avatar contrast combinations; complete browser admin CRUD/KPI and cross-client theme acceptance; human QA Lead/Scrum Master review for AG-76; official social-account ownership. The fresh Jira read showed AG-87 already Done (external state): do not overwrite/reopen it or change assignee. AG-77 remains previously accepted. Other tickets remain open unless original acceptance is individually met.

This PR targets main and includes its inspected current baseline. No PR is auto-merged. Prior PRs4/5/6 remain untouched. Runner exit0 is not all-tests-pass or all-task completion.
