# Sprint 3 delivery: actual implementation and acceptance boundaries

Project: Mr. Adel Mostafa. This document supersedes rejected agent-generated drafts. It records source inspection, not a human UAT sign-off. Jira Done is not treated as independent proof. Previous source lacked Sprint3; current team main03be993 supplies the actual client services described below. Integration preserves those features and strict server-session authentication.

| PBI | Jira | Current actual source | Required acceptance not yet proven |
|---|---|---|---|
|18|AG-46|native-live-streaming.service.ts; live-studio/session UI|startBroadcast toggles signals; latency is simulated, archive reuses a sample URL. Not real ingest,50viewers or recording proof.|
|19|AG-47|pwa-notification.service.ts; public/sw.js|Subscription record contains fake_token; local Notification is not background Web Push delivery to Android/iOS.|
|20|AG-48|payment-reconciliation.service.ts; admin/payments.page.ts|Local reconciliation/refund ledger is not a real gateway settlement/refund transaction.|
|21|AG-94|session-protection.service.ts; lecture-player.component.ts|Client simpleHash and embedded key are not cryptographic server authorization/DRM. Single-device localStorage is not cross-device enforcement.|
|22|AG-95|live-qna.service.ts; live-qna.component.ts|In-memory pending/filter/moderation/cooldown exists; cross-user persistence and server RBAC/rate-limiting remain unproven.|
|23|AG-96|guardian-report.service.ts; guardian-report.page.ts|Sample reports and localStorage token lookup exist; not a private server-generated weekly reporting job or cryptographic HMAC.|

## Assigned deliverables
Samer: AG123 bilingual content and five synthetic questions; AG135 actual screenshots of accepted finished stories; AG136 scope/schema/risks with Scrum Master review; AG98 review preparation. Sherry: AG119 PWA; AG124 moderation; AG132250-user staging playback; AG133security; AG97 QA summary. Owners of feature stories are listed from Jira below; no reassignment or invented human execution.

## Actual schema vs future data contracts
Current executable database artifacts: database/standalone/schema/01_mr_adel_production_schema_pg16.sql (20tables+oneview) and supabase/schema.sql plus supabase/migrations/20261024_002_announcements_settings_receipt_rpc.sql. These are separate schema scopes. New client TypeScript models are NOT new deployed database tables.
Required future server contracts: live_questions(session_id,student_id,body,status,created_at,moderated_by); refund_records(payment_id,amount,idempotency_key,audit_actor); push_subscriptions(user_id,endpoint,p256dh,auth); guardian_report_tokens(student_id,hashed_token,expires_at,revoked_at). These names/fields are proposals, NOT executable/deployed migrations. Require authenticated owner/staff policies, unique idempotency keys, transactional writes and minimization/encryption of guardian contacts before a backend is accepted.

## Risks and mitigations
- Video: raw public URLs and browser signatures can be copied/forged; obtain authenticated server-issued short-lived media authorization and licensed DRM integration. A phone filming the display cannot be universally prevented.
- Streaming: simulated latency is not4G measurement. Need ingest/CDN/staging, actual50-viewer scenario and250-user playback test with errors<1%.
- Guardian: browser storage and sample tokens are not privacy controls. Require server-side tokens, expiry/revocation, data minimization, access audit and separate student scopes.
- Q&A: client filtering/cooldown can be bypassed; require server RBAC, atomic rate limiting and real-time privacy tests.
- Push: simulated endpoints must not be labeled delivered notifications; require real PushManager subscription and server dispatcher, consent/revoke, physical-device checks.
- Service-worker safety hardening in this integration restricts caching to public allowlisted resources, bypasses authenticated/API/media, preserves other app caches and clamps notification targets to this origin. Source-level safety evidence is separate from full device/PWA acceptance.

## Human approval and source traceability
QA Lead, Scrum Master and Product Owner sign-off: PENDING, not filled by an agent. No staging load, real gateway, licensed DRM or external delivery metrics have been invented. No 0.16% error-rate or1.38sFCP claim from rejected drafts is valid evidence.

## Jira source requirements (retrieved snapshot, unchanged)

### AG-46 — PBI-18: As Mr. Adel, I want to broadcast live from inside the platform, so that I don't depend on an external streaming link
Owner: Mohammed Hamdy

Priority (MoSCoW): Should Have | SP: 8 | Sprint: 3
Replace the embedded stream link with native streaming (WebRTC or Low-Latency HLS), based on the result of the WebRTC vs LL-HLS research spike.
Acceptance criteria
The technology decision (WebRTC or LL-HLS) is written down before development starts

Given Mr. Adel opens the live page, When he presses "Go live", Then he broadcasts from the browser without using an external link

Students watch with a delay of under 10 seconds on 4G

Given the connection drops, Then the broadcaster can reconnect and viewers recover automatically

Given the session ends, Then the recording is saved and appears as a recorded lecture within 30 minutes

Only students with access can watch (same rules as PBI-13)

External-link mode (YouTube Unlisted) stays available as a backup

Definition of Done: code reviewed, tests pass, tested with at least 50 viewers, demoed on staging.

Tasks: AG-104: Backend: Streaming decision, ingest and low-latency delivery [14h], AG-105: Frontend: Browser broadcaster screen and low-latency viewer player [14h], AG-106: UI/UX: Broadcaster controls and viewer states design [4h], AG-107: Backend: Auto-save and publish the recording after a live session [6h], AG-108: QA: Live broadcast tests (delay, reconnect, access, recording) [6h]

### AG-47 — PBI-19: As a student, I want a notification when a new announcement is posted, so that I don't miss news
Owner: KingKarmy

Priority (MoSCoW): Could Have | SP: 3 | Sprint: 3
Send a push notification to students when a new announcement is published (depends on the PWA, PBI-09).
Acceptance criteria
Given a student allowed notifications, When an admin publishes an announcement, Then the student gets a push notification within 1 minute

Tapping the notification opens the announcement page

Given a student denied notifications, Then nothing is sent and the site still works

Students can turn notifications off from their profile

Notification texts are available in Arabic and English

Definition of Done: code reviewed, tests pass, tested on Android and iOS, demoed on staging.

Tasks: AG-109: Backend: Web Push API for new announcements [5h], AG-110: Frontend (small): Notification permission prompt and profile switch [4h], AG-111: Content: Notification text templates in Arabic and English [2h]

### AG-94 — PBI-21: As Mr. Adel, I want my sessions to be protected from recording, so that students cannot copy or leak my paid content
Owner: Abdullah Ahmed

Priority (MoSCoW): Must Have | SP: 8 | Sprint: 3 | Source: Product Owner request
Important note: no website can fully stop someone filming a screen with another phone. This story makes recording hard and traceable using several layers, instead of promising 100% protection.
Acceptance criteria
Given a student plays a session, When the player requests the video, Then it uses a signed link that expires within minutes and is tied to that student

Given a copied or shared link, When it is opened by someone else or after expiry, Then playback is refused

Given a supported browser or device, When the student starts a screen recording, Then the video is blocked or shown black (DRM-protected playback)

Download button, right-click save and picture-in-picture are disabled in the player

The dynamic watermark (student ID + masked phone) stays visible during playback

Given one account is used on more than one device at the same time, Then the extra session is stopped and flagged

Students see a clear Arabic/English message when playback is blocked

Limits that cannot be blocked (such as a phone camera) are documented for the Product Owner

Definition of Done: code reviewed, security tests pass on Android, iOS, Chrome and Windows, documented, demoed on staging.

Tasks: AG-99: Backend: Signed short-lived video links with automatic refresh [8h], AG-100: Backend: DRM encryption and license server integration [14h], AG-101: Frontend: Hardened DRM-ready video player [8h], AG-102: UI/UX: Blocked-playback screens and messages [3h], AG-103: QA: Recording-attempt, link and account-sharing tests [8h], AG-127: Backend: Single active session and suspicious-activity flagging [6h]

### AG-95 — PBI-22: As a student, I want to ask questions during a live session that the assistant moderates, so that I get answers without disturbing the class
Owner: Gafar

Priority (MoSCoW): Should Have | SP: 5 | Sprint: 3 | Source: team idea (new feature)
Why: during a live session students need a way to ask questions without interrupting, and the teacher should not be flooded.
Acceptance criteria
Given a live session is running, When a student writes a question, Then it appears in the Q&A panel for the teacher and assistant

Assistant or teacher can approve, hide or mark a question as answered

Only approved questions are visible to other students

Given a student sends too many questions quickly, Then a short rate limit applies

Only students with access to the session can use the panel

Panel works on 360px screens and desktop

Definition of Done: code reviewed, tests pass, moderation tested, demoed on staging.

Tasks: AG-120: Backend: Live Q&A API with moderation and real-time updates [8h], AG-121: Frontend: Q&A panel in the live page [8h], AG-122: UI/UX: Live Q&A panel design [4h], AG-123: Content: Q&A house rules and sample questions [2h], AG-124: QA: Q&A moderation and abuse tests [4h]

### AG-96 — PBI-23: As a guardian, I want a weekly progress report about my child, so that I can follow attendance, quiz scores and deadlines
Owner: HAZEM AHMED

Priority (MoSCoW): Should Have | SP: 5 | Sprint: 3 | Source: team idea (new feature)
Why: guardians pay for the sessions and want to know the student is attending and doing the homework, without asking every week.
Acceptance criteria
Given a guardian link or contact is saved, When the week ends, Then a progress report is generated for each student

Report shows sessions attended, quiz scores, missed deadlines and points/rank

Report contains no data of other students

Guardian receives a link to the report (page or message); the link is private and expires after 7 days

Admin can turn the weekly report on or off

Report page works on 360px screens and desktop

Definition of Done: code reviewed, numbers verified against raw data, tests pass, demoed on staging.

Tasks: AG-125: Backend: Weekly progress queries and guardian contact field [8h], AG-126: Backend: Weekly report job, private expiring links and admin switch [6h], AG-128: UI/UX: Guardian weekly report page design [5h], AG-129: Frontend (small): Guardian weekly report page [6h], AG-130: Content: Guardian report wording in Arabic [3h], AG-131: QA: Guardian report number and link-security checks [4h]
