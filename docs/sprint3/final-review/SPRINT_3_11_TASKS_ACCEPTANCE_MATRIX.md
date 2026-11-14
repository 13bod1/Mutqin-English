# Eleven-task delivery acceptance matrix

PR-only: [PR13](https://github.com/13bod1/Mutqin-English/pull/13). No merge or production migrations authorized. This replaces the rejected child matrix which altered original criteria and stale statuses. Existing JiraDone is recorded separately from verifiedacceptance. AG76 is separate historical debt, not a twelfth item hidden inside the eleven.

| Task | Recorded Jira state | Actual acceptance |
|---|---|---|
|AG-74|Done|VERIFIED / Done|
|AG-75|Done|VERIFIED / Done|
|AG-97|Done|PARTIAL — full DoD not met|
|AG-98|Done|PREPARATION + INTERNAL WALKTHROUGH EXECUTED; human Review pending|
|AG-119|Done|PARTIAL — physical install/push/Lighthouse not verified|
|AG-123|Done|VERIFIED CONTENT|
|AG-124|Done|REAL SERVER CONTRACTS VERIFIED; full QA DoD still open|
|AG-132|Done|BLOCKED / NOT EXECUTED ON AUTHORIZED STAGING|
|AG-133|Done|PARTIAL — SQL authorization verified, provider/player gaps remain|
|AG-135|Done|REAL WIP CAPTURES PROVIDED; finished-story requirement not overstated|
|AG-136|Done|DOCUMENTED; Scrum Master review pending|

## AG-74 — QA: Announcements tests [4h]

### Original Jira description (verbatim text extraction)

Estimate: 4h
Description: Test creating, editing, deleting and viewing announcements.
Acceptance criteria
Given an admin, When they create an announcement, Then students see it at the top of the page

Given a student, When they try to create or delete an announcement, Then the action is blocked

Given no announcements exist, Then a friendly empty state is shown

The page is usable on a 360px-wide screen

Definition of Done: results logged, defects raised, retest done.

### Verified delivery and remaining gate
Merged scoped evidence PR11: real announcementsCRUD, exacteditreplacements, studentwriteblocked/undeletable,360px, friendlyempty. Jira closed with readback. No production backendDDL claim.

## AG-75 — QA: Validate assistant KPI accuracy against raw logs [6h]

### Original Jira description (verbatim text extraction)

Estimate: 6h
Description: Verify that the assistant KPI numbers shown to Mr. Adel match the raw activity logs.
Acceptance criteria
Given a known set of reviewed receipts, When the dashboard loads, Then the counts, average review time and approval/rejection rate match a manual calculation

Given the assistant role, When they open the dashboard URL, Then access is denied

Dashboard values update after new reviews are made

Definition of Done: comparison sheet attached to the story, defects raised.

### Verified delivery and remaining gate
Real dashboard/rawreviewlog3reviews30min66.7/33.3then4reviews25min75/25;assistantadminroute denied;CSVattachedAG75/AG45; Jira closed with readback.

## AG-97 — Sprint 3 QA: Load and security testing (enabler)

### Original Jira description (verbatim text extraction)

Type: Enabler story (no story points, not counted in velocity)
Sprint 3 adds heavy features (DRM, live streaming, PWA). This story checks that the platform stays fast and safe.
Acceptance criteria
Given 250 students watching at the same time, When the load test runs, Then playback and the live page stay stable (no outage, errors under 1%)

First paint stays under 1.8s on 4G for the main pages

New endpoints and the DRM/signed-link flow are checked for IDOR, XSS and expired-link bypass

Every defect is raised as a Bug in Jira and retested

A short test report is attached for the Sprint Review

Definition of Done: report delivered, zero open critical or high bugs.

### Verified delivery and remaining gate
Full localBuild173Unit/21E2E/25browser and50HTTPdatabaseassertions+3newbrowsercasesPASS. 250stagingvideo andlicensedDRM/providerphysicalgatesremain;zeroopenhighBugconditionnotmet.

## AG-98 — Sprint 3 Review & UAT preparation (enabler)

### Original Jira description (verbatim text extraction)

Type: Enabler story (no story points, not counted in velocity)
Prepare and run the Sprint 3 Review with Mr. Adel (Product Owner): UAT script, demo material and documentation update.
Acceptance criteria
A UAT script covers every Sprint 3 story

Demo screenshots or recordings exist for each finished story

Only stories that meet the Definition of Done are shown as finished

Documentation is updated with the Sprint 3 changes

Product Owner feedback is captured as new backlog items

Definition of Done: UAT script reviewed by QA, demo run once internally before the review.

### Verified delivery and remaining gate
Script coversPBI18–23; actualagent6stepinternalbrowserwalkthrough recorded. NoPOmeetingfeedbackorhumanQAreviewforged. No24-houragendacriterionadded.

## AG-119 — QA: PWA install, offline and push notification tests [6h]

### Original Jira description (verbatim text extraction)

Estimate: 6h
Description: Test installation, offline behaviour and push notifications of the PWA.
Acceptance criteria
The app installs on Android Chrome and iOS Safari with the right name and icon

The offline screen appears when the connection is off; protected video is never available offline

Push notification arrives within 1 minute of publishing an announcement and opens the right page

Lighthouse PWA check passes and performance is 90 or higher

Every defect is raised as a Bug in Jira and retested

Definition of Done: test report added to the story, zero open critical or high bugs.

### Verified delivery and remaining gate
RealSW/offlinefallback;192/512PNG180appleicon; actualPushManagersubscribe/serverownershipcode. ProviderfunctionsnotDenoexecuted/deployed,realpushwithin1minuteandAndroid/iOSinstallandperformance90notproven.

## AG-123 — Content: Q&A house rules and sample questions [2h]

### Original Jira description (verbatim text extraction)

Estimate: 2h (easy task)
Description: Write the short house rules shown above the Q&A panel and 5 sample questions for testing and the demo.
Acceptance criteria
House rules (respect, on-topic, no personal data) in Arabic and English, under 60 words

Five sample questions that match English-lesson topics

No real student names or data are used

### Verified delivery and remaining gate
Actualsource-extractedEnglish52words/Arabic51words,exactly5lessonquestionprompts,norealstudentdataintheprovidedcontent. NoextraPOapprovalcriterionadded.

## AG-124 — QA: Q&A moderation and abuse tests [4h]

### Original Jira description (verbatim text extraction)

Estimate: 4h
Description: Test the Q&A moderation flow and abuse cases.
Acceptance criteria
Pending questions are visible only to the teacher and assistant until approved

A student cannot approve, hide or read pending questions of others

Rate limit blocks spam (more than one question every 15 seconds)

Script injection in the question text is not executed

Every defect is raised as a Bug in Jira and retested

Definition of Done: test report added to the story, zero open critical or high bugs.

### Verified delivery and remaining gate
ActualPostgreSQLRLS hidespendingevenfromauthor; staffmoderation+serverJWT15satomicconcurrency verified; actualstudent/assistantbrowserapproveflow3cases. XSSnewinputcaseandallBugretestsnotfullyaccepted;AG143notclosedautomatically.

## AG-132 — QA: Load test with 250 concurrent students [10h]

### Original Jira description (verbatim text extraction)

Estimate: 10h
Description: Run a load test with 250 students watching and using the site at the same time (JMeter or similar) on staging.
Acceptance criteria
Test scenario covers login, lecture playback, the live page and payment pages

With 250 concurrent users, errors stay under 1% and no outage happens

First paint of main pages stays under 1.8s on a 4G profile

Results (graphs and numbers) are attached to the story

Bottlenecks found are raised as Bugs in Jira

Definition of Done: test report added to the story.

### Verified delivery and remaining gate
No250studentstaginglogin/video/live/paymentcapacityreport. LocalFCPmeasurementsarelocalhostonly. Do notclaim0.16%or1.38s inventedresults; noacceptedstagingmetrics.

## AG-133 — QA: Security checks on new endpoints and protected video [8h]

### Original Jira description (verbatim text extraction)

Estimate: 8h
Description: Check the new Sprint 3 endpoints and the protected-video flow for common security problems.
Acceptance criteria
IDOR: changing IDs in URLs or API calls never exposes another student's data (reports, Q&A, refunds)

Expired, copied or tampered video links and DRM licenses are refused

XSS and injection attempts in Q&A and announcements are not executed

Admin, refund and report endpoints reject students and the assistant

Every defect is raised as a Bug in Jira and retested

Definition of Done: security checklist with results attached to the story, zero open critical or high bugs.

### Verified delivery and remaining gate
50actualHTTPassertionsincludeprivateguardianexpiry/revoke/tamper/adminrefundidempotency/serverviewingsessioncopy/expiry/replacement. protected-media/pushfunctionsnotexecutedinDeno;playernotwired; noactualDRMlicenseorallendpointauditcompletion.

## AG-135 — Docs: Demo screenshots for the Sprint 3 Review [2h]

### Original Jira description (verbatim text extraction)

Estimate: 2h (easy task)
Description: Collect screenshots or a short screen recording of each finished Sprint 3 story for the review demo.
Acceptance criteria
One screenshot or clip per finished story

Only stories that meet the Definition of Done are included

Files are saved in one shared folder with clear names

### Verified delivery and remaining gate
Fiveactualbrowsercapturesinonesharedfolder,receipted. NoWIPmockliveplayerrepresentedasa finishedstory. AcceptedfinishedstorygalleryonlyafteroriginalDoDverified.

## AG-136 — Docs: Update documentation with Sprint 3 changes [4h]

### Original Jira description (verbatim text extraction)

Estimate: 4h (easy task)
Description: Update the project documentation with the Sprint 3 backlog, tasks, new database tables and risks.
Acceptance criteria
Documentation lists PBI-18 to PBI-23 with owners, tasks and acceptance criteria

New tables (live Q&A, refunds, push subscriptions, report links) are added to the schema section

Risks for DRM, streaming and guardian data privacy are added to the risk table

Reviewed by the Scrum Master before the review

### Verified delivery and remaining gate
Schema003live_questions,004push_subscriptions,005guardian_reports/refund_records,006playback_assets/playback_sessions and risks documented; localonlynotproductionapplied. FormalScrumMasterreviewnotrecorded.

## Evidence
- [50HTTPassertions +3realbrowsercases](../../../qa/sprint3/real-backends/VERIFICATION.json)
- [Actual six-step walkthrough receipt](../../../qa/sprint3/final-review/capture_receipt.json)
- [Source and integration limits](../../delivery/REAL_BACKENDS_PR_ONLY.md)

Jira AG74/75 closure evidence comment IDs10406/10407. AG76 human QA Lead/ScrumMasterreview remains pending. AG48 latest directlookup404 is unresolved permission/existence, NOT proof of reorganization. No unsupported blacklist/200char/HDMI/screenblackening criterion added.
