# Actual completion evidence — announcement edit and scheduled-date correction

## Original failures and actual cause
The previously reported concatenated announcement body was reproduced by the external test harness editing before Angular had written the existing record into its form controls. The revised harness waits for the exact existing DOM value, clears via keyboard, enters the replacement, asserts the DOM value before save, then checks the exact text in an independent student's browser. Two consecutive distinct replacements pass and neither prior body remains. This corrects a harness race; it is NOT described as a fictional product concatenation fix. No existing repository test assertion or fixture was changed.

A separate genuine product defect was found: editing a scheduled announcement did not restore its publication date, leaving a fixed October31 default. The actual source now restores the record's date using local calendar fields and rejects empty/invalid scheduled input before sending. The executed scheduled-record case verifies the restored local datetime2026-11-18T15:45 rather than the October31 default. It verifies restoration, not a full timezone/DST matrix or every invalid-input case.

## Genuine runtime verification
Fresh disposable PostgreSQL16.6 and official PostgREST16.5 applied the exact migration twice. All owned startup, browser and shutdown commands exited0; the audit CSV exported4rows. Eight browser cases passed:
1. Admin form creates an announcement, independent student360px browser sees it.
2. Two exact consecutive announcement edits replace old text.
3. Scheduled announcement edit restores the existing local date.
4. Admin deletes the announcement, student sees a friendly empty state.
5. KPI dashboard shows three reviewed/two pending, average30min, approval66.7%, rejection33.3%.
6. Fourth committed review changes the displayed values to four reviewed/one pending,25min,75%/25%.
7. Assistant opening the admin dashboard is redirected to/assistant; not an invented static403.
8. Actual student API announcement create returns HTTP403.

Identity boundary: PostgreSQL data, signed-JWT PostgREST authorization and browser REST transport are real. Supabase session/getUser uses a controlled test identity adapter. This is NOT a live GoTrue login, email delivery, external payment or production deployment.

## Fresh full regression
Production build PASS. Existing Unit136passed/2failed/0skipped of138; the two success fixtures omit the session required by secure AuthService. Existing E2E18passed/3failed/0skipped; all3 expect the old Mutqin title. Existing tests/fixtures unchanged and authentication/new branding not weakened. These immutable fixture conflicts remain blockers to green CI. Runner exit0 is not all-tests-pass.

## What this supersedes
PR9's announcement exact-edit FAIL is superseded ONLY for the exercised settled-input sequence. The new eight-case result supersedes that focused6/7 run; its old evidence remains historical. Earlier complete50-subtask GitHub delivery index is retained. Every relevant task receives exact source/evidence links without treating the link as blanket acceptance.

## Jira and remaining external gates
The user manually marked some tasks Done. This delivery preserves the live statuses, assignees, descriptions, parent/sprint/rank/points and estimates instead of reopening or rubber-stamping them. Human QA Lead/Scrum Master approvals, official social-account ownership, complete whole-site WCAG assessment, live GoTrue and production deployment are NOT inferred from user-setDone or this runtime proof. No worklogs/signatures invented. No PR automatically merged.
