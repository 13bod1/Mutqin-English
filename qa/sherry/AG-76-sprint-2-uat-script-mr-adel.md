# 🎯 Sprint 2 Review & UAT Script: Product Owner Acceptance Runbook (AG-76)

**Issue Key:** AG-76
**Parent Task:** AG-71 (Sprint 2 Review & UAT Preparation)
**Assigned QA Role:** QA Engineer
**Target Product Owner / Reviewer:** Mr. Adel Mostafa
**Sprint Duration:** Sprint 2 (Release Review & Acceptance)
**PBI Coverage:** PBI-11 through PBI-17 (`AG-39`, `AG-40`, `AG-41`, `AG-42`, `AG-43`, `AG-44`, `AG-45`)
**Estimated Effort:** 4h (Original Estimate Recorded in Jira)
**Acceptance Sign-Off Status:** Authored; QA Lead and Scrum Master document reviews pending. PO session acceptance is separate.

---

## 1. Purpose, Governance & Non-Technical Executive Guidance

This User Acceptance Testing (UAT) runbook provides a structured, non-technical, step-by-step walkthrough specifically tailored for Mr. Adel Mostafa during the Sprint 2 Review session. No developer console access, code knowledge, or terminal commands are required.

### 1.1 Governance & Scope Boundaries
- **UAT Functional Scope:** This document defines business acceptance walkthrough flows for Sprint 2 user stories. It validates user-visible behavior and administrative workflows.
- **Accessibility & Security Claims Boundary:** Visual layout checks, high-contrast theme toggles, and client route guards included herein do **not** constitute formal certified compliance with WCAG 2.1 AA accessibility standards or security penetration certification. Formal compliance requires dedicated automated accessibility scanners and server-side penetration testing.
- **Production Payment Operations Prohibition:** Live payment gateway operations (e.g. real Fawry, live Vodafone Cash, or live credit card merchant charges) are strictly **FORBIDDEN** during UAT walkthroughs. All payment scenarios must execute in a local sandbox / mock checkout environment. If a sandbox environment is unavailable, the payment scenario must be recorded as **BLOCKED**.
- **Delivery Lifecycle State:** In accordance with agile governance, this document is an authored deliverable under active review. **AG-76 requires the QA Lead and Scrum Master document reviews before Sprint Review.** The Product Owner walkthrough and product acceptance are separate milestones; authoring this guide does not fabricate either approval.

### 1.2 Account & Role Prerequisites (Zero Real Credentials)
All scenarios must execute using dedicated, isolated synthetic demo accounts on the local/staging environment. **No real production accounts, customer phone numbers, or passwords may be used.**

| Role Profile | Demo Username / Identifier | Purpose & Scope |
| :--- | :--- | :--- |
| **Student** | `demo_student_omar` | Validates student catalog, checkout submission, countdown timer, and announcements. |
| **Teaching Assistant** | `demo_assistant_sarah` | Validates manual receipt verification queue and operational dashboard. Blended from admin revenue. |
| **Teacher / Admin** | `demo_teacher_adel` | Validates full platform management, theme customization, and announcement publishing. |

*Routing & Guard Assertion Note:* On the Angular single-page frontend, client navigation by unauthorized roles is handled by Angular route guards (`staffGuard`), which redirect unauthorized users (e.g. to `/login` or `/`). Testers must **not** assert HTTP 403 status codes on direct client-side URL navigations unless a backend REST API endpoint is directly invoked.

### 1.3 Timezone Reference & Test Scheduling (`Africa/Cairo`)
- All scheduled live sessions and countdown timers reference Egypt official time: **`Africa/Cairo`**.
- Egypt observes Daylight Saving Time (Eastern European Summer Time / EEST, **UTC+3**) from the last Friday of April until the last Thursday of October, and Eastern European Time (EET, **UTC+2**) during winter months.
- The facilitator prepares the Cairo local session time for the selected test date. Mr. Adel compares the displayed time with the clock on his phone; no code or terminal is required. Technical verification is in Appendix A.

---

## 2. Walkthrough Scenarios & Sign-Off Matrix

### Scenario 1: English Rebranding & Teacher Identity (PBI-11 / AG-39)
- **User Story:** As a visitor, I want the site named "Mr. Adel Mostafa" in English everywhere, so that the brand is clear.
- **Prerequisites & Test Data:** Clean browser session opened in Incognito mode; language preferences set to default.
- **Action Steps (Nominal Flow):**
  1. Open the platform homepage (`/`) in your web browser.
  2. Inspect the top header brand logo, hero headline, browser tab title, and footer copyright statement.
  3. Click the language toggle button in the navigation header to switch to Arabic (`ar`).
  4. Inspect the brand title, hero headline, and document layout direction.
  5. Click the language toggle button again to switch back to English (`en`).
- **Expected Result (Nominal Flow):**
  - In English mode, the platform consistently displays "Mr. Adel Mostafa" across the header brand title, hero section, browser title, and footer.
  - In Arabic mode, the platform switches cleanly to "أ. عادل مصطفى" with right-to-left (RTL) layout alignment.
  - No leftover legacy branding ("Mutqin") appears in customer-facing titles or footers.
- **Observed Result (Nominal):** `[PENDING EXECUTION]`
- **Action Steps (Edge / Boundary Flow):**
  1. In the browser address bar, attempt to navigate directly to legacy/unmapped URLs (e.g., `/mutqin-courses` or `/legacy-home`).
- **Expected Result (Edge / Boundary):**
  - *Legacy Redirect Clarification:* Because no legacy redirect routing table is currently configured in the application router (`app.routes.ts` defaults all unmapped routes to the 404 NotFound page), legacy URL redirects are designated **UNVERIFIED / OUT OF SCOPE** until an approved legacy route mapping list is formally provided by the Product Owner. Unmapped URLs should render the standard 404 page without runtime crashes.
- **Observed Result (Edge):** `[PENDING EXECUTION]`
- **Evidence Capture Procedure:** Take full-page desktop screenshots in English and Arabic modes showing header, hero, and footer. Note browser tab titles.
- **Cleanup / Reset Procedure:** Clear browser cookies and reset language toggle to English.
- **Outcome Status:**
  ```text
  Status: PENDING REVIEW
  [ ] ACCEPTED    [ ] REJECTED    [ ] BLOCKED
  ```
- **Review Notes / Feedback:** ____________________________________________________

---

### Scenario 2: In-Site Payment & Receipt Proof Upload (PBI-12 / AG-40)
- **User Story:** As a student or guardian, I want to pay for a session inside the website itself, so that I don't leave the platform.
- **Prerequisites & Test Data:**
  - Student logged in as `demo_student_omar`.
  - Assistant logged in as `demo_assistant_sarah` (in a separate browser profile).
  - Prepared synthetic test image: `synthetic_test_receipt.png` (a clearly synthetic dummy mockup image, 150KB PNG, strictly under the 5MB limit).
  - Environment: Local Sandbox / Mock Payment Gateway only. Real payment operations are strictly **FORBIDDEN**.
- **Action Steps (Nominal Flow - Upload & Multi-Stage Lifecycle):**
  1. As `demo_student_omar`, navigate to the course catalog (`/lectures`) and select a Thanawya Amma revision lecture.
  2. Click "Enroll / Pay Now" to navigate to the on-platform checkout page (`/checkout/:kind/:id`), then select manual payment to proceed to the receipt upload page (`/checkout/:kind/:id/manual`).
  3. Enter a valid synthetic Egyptian mobile wallet number (`01012345678`).
  4. Click the file upload control and select the synthetic receipt proof file (`synthetic_test_receipt.png`).
  5. Click "Submit Receipt Proof" to transmit the payment verification request.
  6. **Verify Immediate State:** Verify that immediate lecture access is **NOT** granted upon phone number or receipt submission. The student screen displays a confirmation banner: *"Receipt Uploaded Successfully — Pending Assistant Review"* along with a unique reference number.
  7. In the assistant session (`demo_assistant_sarah`), navigate to the assistant queue (`/assistant`). The facilitator uses `/admin/payments` only with the admin account.
  8. Locate the submitted synthetic transaction row with status `pending`.
  9. Click "Review Receipt", inspect the synthetic image, and click the visible "Approve / قبول" action in the isolated test environment. If it is unavailable, record BLOCKED; there is no assumed button named "Sandbox Approve".
  10. Return to the student session (`demo_student_omar`) and refresh the lecture page.
  11. Verify that lecture access is now unlocked and available for streaming.
- **Expected Result (Nominal Flow):**
  - Receipt file uploads smoothly within platform limits (< 5MB, JPG/PNG/PDF).
  - Payment lifecycle adheres to the two-stage model: submission places enrollment into `pending` review; lecture access is gated until assistant sandbox approval.
  - No external messaging app (e.g. WhatsApp redirection) is required.
- **Observed Result (Nominal):** `[PENDING EXECUTION]`
- **Action Steps (Edge / Boundary Flow - Validation & Rejection Lifecycle):**
  1. Open the manual checkout page again for another module.
  2. Enter an invalid mobile prefix (e.g., `01812345678`) or an invalid string and attempt submission.
  3. Attempt to upload a non-image disallowed file (e.g., `test_payload.txt`) or a synthetic file exceeding 5MB.
  4. Correct the fields and upload a valid synthetic receipt image with note "Invalid Test".
  5. In the assistant session, review the receipt and click the visible "Reject / رفض" action with reason "Illegible receipt proof".
  6. In the student session, verify that the lecture remains locked and an alert explains the rejection with options to re-upload.
- **Expected Result (Edge / Boundary):**
  - Form displays immediate inline validation errors for invalid mobile prefixes and rejects non-supported / oversized files.
  - Rejected payments strictly maintain lecture access gates, prevent duplicate charge entries, and provide clear student feedback.
- **Observed Result (Edge):** `[PENDING EXECUTION]`
- **Evidence Capture Procedure:** Capture screenshots of: (a) student receipt submission form with selected file, (b) student pending review notice, (c) assistant review drawer with synthetic image, and (d) unlocked lecture state following approval.
- **Cleanup / Reset Procedure:** Ask the facilitator to clean up the synthetic record after evidence capture (Appendix A); the stakeholder does not access a database.
- **Outcome Status:**
  ```text
  Status: PENDING REVIEW
  [ ] ACCEPTED    [ ] REJECTED    [ ] BLOCKED
  ```
- **Review Notes / Feedback:** ____________________________________________________

---

### Scenario 3: Live Session Stream & Cairo Countdown (PBI-13 / AG-41)
- **User Story:** As Mr. Adel, I want a live page where I can schedule and run live videos, so that students can watch live sessions.
- **Prerequisites & Test Data:**
  - Enrolled student account (`demo_student_omar`).
  - Unauthenticated guest session.
  - Scheduled live session fixture set to 15 minutes in the future, with scheduled datetime anchored to `Africa/Cairo` timezone.
- **Action Steps (Nominal Flow):**
  1. As `demo_student_omar`, navigate to the live stream page (`/live`).
  2. Inspect the countdown timer display (Hours : Minutes : Seconds).
  3. Verify that the countdown aligns with Egypt local time (`Africa/Cairo` offset derived for the scheduled date, accounting for daylight saving/standard time transitions).
  4. When session start time is reached, observe the live video container activation.
- **Expected Result (Nominal Flow):**
  - Students see an active, synchronized countdown to the scheduled session.
  - At start time, the unlisted stream container activates smoothly with a prominent "Live Now" badge.
  - Embedded stream parameters prevent exposure of raw streaming keys or unlisted management links.
- **Observed Result (Nominal):** `[PENDING EXECUTION]`
- **Action Steps (Edge / Boundary Flow):**
  1. In an unauthenticated incognito browser window, attempt to navigate directly to the live session URL (`/live/:id`).
  2. Simulate a delayed or concluded live session stream.
- **Expected Result (Edge / Boundary):**
  - Unauthenticated visitors are intercepted by the login/enrollment gate; stream embed URLs are never rendered in client DOM.
  - Concluded or delayed streams render a courteous informational status message rather than a broken player or infinite spinner.
- **Observed Result (Edge):** `[PENDING EXECUTION]`
- **Evidence Capture Procedure:** Screenshot countdown timer with Cairo local clock in view; screenshot active stream player; screenshot unauthenticated gate redirection.
- **Cleanup / Reset Procedure:** Deactivate test live stream fixture in admin console.
- **Outcome Status:**
  ```text
  Status: PENDING REVIEW
  [ ] ACCEPTED    [ ] REJECTED    [ ] BLOCKED
  ```
- **Review Notes / Feedback:** ____________________________________________________

---

### Scenario 4: Admin Portal & Management RBAC Security (PBI-14 / AG-42)
- **User Story:** As an admin, I want an admin page to manage users, lectures and site settings, so that I can run the platform.
- **Prerequisites & Test Data:**
  - Teacher / Admin account: `demo_teacher_adel`
  - Assistant account: `demo_assistant_sarah`
  - Student account: `demo_student_omar`
- **Action Steps (Nominal Flow):**
  1. Log into the platform with teacher / admin account (`demo_teacher_adel`).
  2. Click on the "Admin Portal" link in the user navigation menu (`/admin`).
  3. Walk through the administrative navigation tabs: Dashboard, Users, Lectures, Live, Payments, Announcements, Metrics, and Settings.
- **Expected Result (Nominal Flow):**
  - The Admin Portal loads cleanly with the approved Café au Lait palette.
  - Full management controls, student rosters, lecture schedules, and administrative configurations render without errors.
- **Observed Result (Nominal):** `[PENDING EXECUTION]`
- **Action Steps (Edge / Boundary Flow - Role Denial & Privilege Separation):**
  1. Log out, then log in as student (`demo_student_omar`).
  2. In the browser address bar, type `/admin` and press Enter.
  3. Verify that the client route guard (`staffGuard`) intercepts the request and redirects the student to `/login` or `/` without rendering administrative controls. *(Note: Do not assert HTTP 403 on client navigation unless an API request is made).*
  4. Log out, then log in as assistant (`demo_assistant_sarah`).
  5. In the browser address bar, type `/admin/settings` or navigate to `/admin/metrics`.
  6. Verify that administrative system settings are denied and total aggregate platform revenue figures remain blinded/hidden from assistant view.
  7. Attempt to modify user identifier parameters in URL paths (IDOR check) to access another user's private data.
- **Expected Result (Edge / Boundary):**
  - Strict role-based isolation is maintained across all roles.
  - Student and assistant accounts cannot access teacher administrative settings or view unauthorized financial aggregates.
- **Observed Result (Edge):** `[PENDING EXECUTION]`
- **Evidence Capture Procedure:** Screenshot admin dashboard as teacher; screenshot route guard redirect when attempting `/admin` as student; screenshot assistant view showing blinded financial revenue.
- **Cleanup / Reset Procedure:** Log out of all demo accounts and return to the home screen.
- **Outcome Status:**
  ```text
  Status: PENDING REVIEW
  [ ] ACCEPTED    [ ] REJECTED    [ ] BLOCKED
  ```
- **Review Notes / Feedback:** ____________________________________________________

---

### Scenario 5: Site Theme Options & Main Page Popup (PBI-15 / AG-43)
- **User Story:** As an admin, I want theme options and a popup I control on the main page, so that I can change the site look and share messages.
- **Prerequisites & Test Data:** Teacher / Admin credentials (`demo_teacher_adel`).
- **Action Steps (Nominal Flow):**
  1. In the Admin Portal, open the "Settings" panel (`/admin/settings`).
  2. Locate the "Theme & Appearance" options and select a theme preset (e.g., Default Café au Lait or High Contrast).
  3. Under the Popup Management section, compose a test banner (Headline: *"Thanawya Amma Final Revision Week"*, Message: *"Sessions start this Saturday at 6:00 PM"*).
  4. Toggle popup display to **ON** and click "Save Settings".
  5. Open the platform homepage (`/`) in a new browser tab.
- **Expected Result (Nominal Flow):**
  - Selected theme preset applies site-wide across headers, buttons, cards, and backgrounds.
  - The announcement popup appears on the homepage with high visual clarity and appropriate contrast.
  - *Disclaimer:* Walkthrough confirms visual application and contrast; this does **not** constitute formal WCAG 2.1 AA certification.
- **Observed Result (Nominal):** `[PENDING EXECUTION]`
- **Action Steps (Edge / Boundary Flow - Responsiveness & Dismissal):**
  1. Use the mobile phone or 360px test view already prepared by the facilitator (Appendix A). Do not open developer tools during the stakeholder walkthrough.
  2. Verify that the popup container scales responsively without horizontal overflow or clipping navigation bars.
  3. Click the "Dismiss" (X) button on the popup.
  4. Refresh the homepage and navigate between pages (`/lectures`, `/live`).
  5. Verify that the dismissed popup remains closed throughout the user session and does not repeatedly interrupt the user.
- **Expected Result (Edge / Boundary):**
  - Popup layout is responsive on mobile screens.
  - Dismissal state persists in session storage for the duration of the visit.
- **Observed Result (Edge):** `[PENDING EXECUTION]`
- **Evidence Capture Procedure:** Screenshot desktop homepage with popup visible; screenshot mobile 360px viewport showing responsive fit; screenshot after dismissal showing clean homepage.
- **Cleanup / Reset Procedure:** Return to `/admin/settings`, toggle popup display to **OFF**, and restore default theme preset.
- **Outcome Status:**
  ```text
  Status: PENDING REVIEW
  [ ] ACCEPTED    [ ] REJECTED    [ ] BLOCKED
  ```
- **Review Notes / Feedback:** ____________________________________________________

---

### Scenario 6: Announcements Notice Board (PBI-16 / AG-44)
- **User Story:** As Mr. Adel, I want an announcements page, so that students see news in one place.
- **Prerequisites & Test Data:**
  - Teacher / Admin account (`demo_teacher_adel`).
  - Student account (`demo_student_omar`).
- **Action Steps (Nominal Flow):**
  1. In the Admin Portal (`/admin/announcements`), create a new announcement item with Title: *"Exam Schedule Announcement"*, Category: *"Important"*, and Body text in Arabic and English.
  2. Click "Publish Announcement".
  3. Log in as student (`demo_student_omar`) and observe the announcements notice banner on the landing page (`/`), or log in as administrator to manage announcements via `/admin/announcements`.
  4. Inspect the card presentation, timestamps, and category badge.
- **Expected Result (Nominal Flow):**
  - Announcements appear ordered newest first on a clean notice board.
  - Arabic and English text renders legibly with correct typography following Café au Lait palette guidelines.
- **Observed Result (Nominal):** `[PENDING EXECUTION]`
- **Action Steps (Edge / Boundary Flow - Zero State & Responsiveness):**
  1. In the admin console, unpublish or archive all announcements so the list count is zero.
  2. Refresh the student homepage (`/`).
  3. View the page on both desktop and mobile viewports.
- **Expected Result (Edge / Boundary):**
  - When no announcements exist, the page renders a polite empty-state banner (*"No announcements at this time"*) rather than a blank container or error state.
  - Cards stack cleanly on small mobile viewports without horizontal scrolling.
- **Observed Result (Edge):** `[PENDING EXECUTION]`
- **Evidence Capture Procedure:** Screenshot newly published announcement card; screenshot empty-state container when no announcements are published.
- **Cleanup / Reset Procedure:** Re-enable standard welcome announcement or delete test announcement.
- **Outcome Status:**
  ```text
  Status: PENDING REVIEW
  [ ] ACCEPTED    [ ] REJECTED    [ ] BLOCKED
  ```
- **Review Notes / Feedback:** ____________________________________________________

---

### Scenario 7: Assistant Operational Performance & Review Oversight (PBI-17 / AG-45)
- **User Story:** As Mr. Adel, I want to measure my assistant's performance, so that I know how well operations are running.
- **Prerequisites & Test Data:**
  - Teacher / Admin account (`demo_teacher_adel`).
  - Assistant account (`demo_assistant_sarah`).
  - Seeded synthetic operational dataset:
    * **Total submitted receipts:** 5 receipts.
    * **Reviewed receipts:** 3 receipts (2 Approved, 1 Rejected).
    * **Pending receipts:** 2 receipts.
    * **Recorded review turnaround times:** Receipt #1: 20 min, Receipt #2: 30 min, Receipt #3: 40 min.
- **Action Steps (Nominal Flow - Statistical Verification):**
  1. As `demo_teacher_adel`, navigate to the operational metrics dashboard at `/admin/metrics`.
  2. Inspect the assistant performance summary cards for `demo_assistant_sarah`.
  3. Verify the calculated statistical figures against the synthetic dataset:
     - **Total Reviewed:** `3`
     - **Pending Reviews:** `2`
     - **Approval Rate:** $\frac{2}{3} = 66.7\%$ (or $66.67\%$)
     - **Rejection Rate:** $\frac{1}{3} = 33.3\%$ (or $33.33\%$)
     - **Average Review Turnaround Time:** $\frac{20 + 30 + 40}{3} = \frac{90}{3} = 30.0\text{ minutes}$
  4. Inspect the daily activity timeline log for chronological consistency.
- **Expected Result (Nominal Flow):**
  - Operational metrics update dynamically and accurately reflect underlying audit log events.
  - Percentages and average turnaround calculations match deterministic mathematical verification via formula.
- **Observed Result (Nominal):** `[PENDING EXECUTION]`
- **Action Steps (Edge / Boundary Flow - Zero Denominator & Read-Only Integrity):**
  1. In the metrics dashboard, select a newly created assistant profile with zero review history (`demo_assistant_new`, 0 reviews).
  2. Verify that the dashboard renders clean zero-state indicators (`0 reviews / -- min avg / 0% approval`) without division-by-zero, `NaN`, or application runtime errors.
  3. Log in as assistant (`demo_assistant_sarah`) and try to open `/admin/metrics` in the address bar; access must be denied. Ask the facilitator to present the separate recorded API/audit-integrity test (Appendix A).
- **Expected Result (Edge / Boundary):**
  - Zero-denominator states render gracefully with placeholder dashes or zeros without mathematical errors.
  - Metrics and audit logs are strictly **read-only** for assistant roles; unauthorized modifications are blocked.
- **Observed Result (Edge):** `[PENDING EXECUTION]`
- **Evidence Capture Procedure:** Screenshot metrics dashboard displaying exact 66.7% / 33.3% / 30 min values; screenshot zero-state display for assistant with 0 reviews.
- **Cleanup / Reset Procedure:** Reset operational mock metrics to baseline test fixtures.
- **Outcome Status:**
  ```text
  Status: PENDING REVIEW
  [ ] ACCEPTED    [ ] REJECTED    [ ] BLOCKED
  ```
- **Review Notes / Feedback:** ____________________________________________________

---


### 3.1 Human Review & Governance Law
> **Immutable Signature Policy:** In accordance with agile review rules, artificial intelligence subagents or automated scripts **CANNOT fake, simulate, or auto-sign** stakeholder approval signatures. Document review requires attributable decisions from the QA Lead and Scrum Master. Product acceptance is recorded separately during the live review with Mr. Adel. This file never signs on behalf of a person; actual agent reviews must be labeled as agent reviews.

## 3. Executive Review & Formal Approval Signatures

> **Mandatory Review Note:** In accordance with agile governance and AG-76 acceptance criteria, this document is an authored deliverable under active review. The AG-76 authored-script subtask can be accepted only after its actual required QA Lead and Scrum Master reviews; the Product Owner live walkthrough is a separate acceptance event. All signature checkboxes remain unticked to prevent premature sign-off.

| Role | Designee / Stakeholder | Verification Status | Formal Signature | Sign-Off Date |
| :--- | :--- | :---: | :--- | :--- |
| **QA Engineer** | Assigned author (`sherryhany`) | Document prepared with agent assistance; author confirmation pending | `[PENDING AUTHOR CONFIRMATION]` | `[PENDING]` |
| **QA Lead** | Assigned QA Lead | Pending Review | `[PENDING REVIEW]` | `[PENDING]` |
| **Scrum Master** | Assigned Scrum Master | Pending Review | `[PENDING REVIEW]` | `[PENDING]` |
| **Product Owner** | Mr. Adel Mostafa | Pending Acceptance | `[PENDING SPRINT 2 REVIEW]` | `[PENDING]` |

**Current Lifecycle State:** `IN PROGRESS (Awaiting QA Lead & Scrum Master Review — AG-76 NOT DONE)`

## Appendix A — Facilitator and QA preparation only (not stakeholder actions)

The facilitator must prepare these prerequisites before inviting Mr. Adel. If unavailable, mark the affected walkthrough BLOCKED rather than asking him to execute technical commands.

1. Confirm the exact review environment and commit. Provision isolated synthetic student/assistant/admin accounts through the approved authentication service; never place production credentials in this guide.
2. Verify the displayed Cairo time for the chosen date using an IANA-aware clock. Technical QA may use `zoneinfo.ZoneInfo("Africa/Cairo")`; the stakeholder only compares the prepared time.
3. Prepare a physical phone or a 360×640 browser viewport. QA may use developer tools before the meeting; keep those steps out of the stakeholder script. Record browser/version and viewport.
4. Prepare the clearly synthetic receipt, isolated pending/rejected/approved examples and the raw KPI comparison dataset. Confirm that the actual controls are Approve/قبول and Reject/رفض for the logged-in role; do not claim unavailable controls exist.
5. Run HTTP authorization/IDOR and audit mutation checks separately with sanctioned test identities. Redact tokens and personal data from evidence. A client redirect is not proof of HTTP 403. The stakeholder sees the recorded result rather than inspecting APIs.
6. Only an authorized facilitator performs synthetic-data cleanup in the disposable sandbox, after retaining evidence. Never delete live payment/audit records or production data.
7. Attach the actual QA Lead and Scrum Master document-review records with identity, date, reviewed commit and accepted/changes-required verdict. Agent review must be named as agent review; no human signature is inferred.

End of the stakeholder guide and facilitator appendix.