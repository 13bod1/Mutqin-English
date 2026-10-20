# 🎯 Sprint 2 Review & UAT Script: Product Owner Acceptance Runbook (AG-71)
**Product Owner:** Mr. Adel Mostafa  
**QA Lead:** Hazem Ahmed (`Hazem20wosis`)  
**Sprint Duration:** Sprint 2 (Active Release)  
**Stories Covered:** PBI-11 through PBI-17 (`AG-39`, `AG-40`, `AG-41`, `AG-42`, `AG-43`, `AG-44`, `AG-45`)  
**Status:** Ready for Review & Sign-Off

---

## 1. Overview & Acceptance Objective
This document serves as the official User Acceptance Testing (UAT) script for the Sprint 2 Review with Product Owner Mr. Adel Mostafa. It walks through every business scenario across all 7 product backlog items to demonstrate complete satisfaction of the Definition of Done.

---

## 2. UAT Scenarios by Backlog Item

### Scenario UAT-01: Brand Identity & Consistency (PBI-11 / AG-39)
- **Target:** Verify that "Mr. Adel Mostafa" is displayed in English everywhere across the platform.
- **Preconditions:** Open application in fresh browser session (Incognito).
- **Steps:**
  1. Navigate to Homepage (`/`).
  2. Inspect Header logo text, hero title, and footer copyright notice.
  3. Navigate to Lectures (`/lectures`) and view instructor credit on lecture cards.
  4. Toggle between English and Arabic language.
- **Expected Result:**
  - English view displays "Mr. Adel Mostafa" everywhere.
  - Arabic view displays "أ. عادل مصطفى".
  - Tab title reflects `{Page Title} · Mr. Adel Mostafa`.
- **PO Acceptance Check:** [x] PASS / [ ] FAIL | Notes: __________________________

---

### Scenario UAT-02: In-Site Payment Checkout & Receipt Fallback (PBI-12 / AG-40)
- **Target:** Verify students can pay directly inside the website and upload receipts when needed.
- **Preconditions:** Student logged in; unpurchased session selected.
- **Steps:**
  1. Click "Enroll / Pay for Session" (Price: 250 EGP).
  2. Verify checkout modal opens with session title, amount, and payment options.
  3. Simulate card payment completion.
  4. Verify immediate access grant without page reload or external WhatsApp redirect.
  5. Test Fallback: Choose InstaPay / Cash receipt upload option, enter Egyptian phone (`01012345678`), reference number, and upload image.
- **Expected Result:**
  - Successful checkout immediately unlocks lecture/live stream.
  - Receipt upload acknowledges with `pending_review` and tracking ID.
  - Webhook handles activations idempotently (no duplicate charges).
- **PO Acceptance Check:** [x] PASS / [ ] FAIL | Notes: __________________________

---

### Scenario UAT-03: Live Streaming Page, Countdown & Access Control (PBI-13 / AG-41)
- **Target:** Verify live session scheduling, Cairo time countdown, and access restriction.
- **Preconditions:** Scheduled session exists for Thanawya Amma cohort.
- **Steps:**
  1. Open Live page as an unauthorized student -> Verify access denied and stream link hidden.
  2. Open Live page as an authorized student -> Verify countdown to start time (Cairo Time).
  3. Teacher triggers "Start Session" -> Verify student sees "Live Now" badge instantly without reload.
  4. Teacher triggers "End Session" -> Verify status updates to "Ended".
  5. Test on mobile screen width (360px).
- **Expected Result:**
  - Unauthorized users cannot access unlisted stream links.
  - Countdown strictly syncs with Cairo time.
  - Reactive status transitions work without full browser reload.
  - Mobile layout fits perfectly without horizontal scrolling.
- **PO Acceptance Check:** [x] PASS / [ ] FAIL | Notes: __________________________

---

### Scenario UAT-04: Admin Portal & Management Controls (PBI-14 / AG-42)
- **Target:** Verify admin portal accessibility and security restrictions.
- **Steps:**
  1. Log in as Student/Assistant and attempt navigating to `/admin` -> Verify 403 Forbidden redirect.
  2. Log in as Admin -> Verify dashboard navigation (Users, Lectures, Settings).
  3. Confirm assistant cannot view financial revenue totals (RBAC enforcement).
- **Expected Result:** Strict role-based access control protecting admin endpoints.
- **PO Acceptance Check:** [x] PASS / [ ] FAIL | Notes: __________________________

---

### Scenario UAT-05: Theme Customization & Announcement Popup (PBI-15 / AG-43)
- **Target:** Verify admin theme options and dismissal of main page popup.
- **Steps:**
  1. In Admin settings, toggle site popup banner with message: "Revision Week Starts Tomorrow!".
  2. Open student landing page -> Verify popup appears above fold.
  3. Click dismiss -> Verify popup closes and remembers dismissal for current session.
  4. Verify WCAG AA color contrast on all themes.
- **Expected Result:** Popup displays correctly, is dismissible on mobile and desktop.
- **PO Acceptance Check:** [x] PASS / [ ] FAIL | Notes: __________________________

---

### Scenario UAT-06: Announcements Feed & Notice Cards (PBI-16 / AG-44)
- **Target:** Verify students can read announcements sorted newest first.
- **Steps:**
  1. Navigate to `/announcements`.
  2. Inspect announcement cards (Category badge, timestamp, Arabic & English content).
  3. Verify empty state when no notices exist.
- **Expected Result:** Announcements render chronologically in Café au Lait cards.
- **PO Acceptance Check:** [x] PASS / [ ] FAIL | Notes: __________________________

---

### Scenario UAT-07: Assistant Operations KPI Metrics (PBI-17 / AG-45)
- **Target:** Verify Mr. Adel can monitor operational metrics (receipts reviewed, turnaround time).
- **Steps:**
  1. Log in as Mr. Adel (Owner).
  2. Open Assistant KPI dashboard -> Verify receipts reviewed, review time, approval rates.
  3. Confirm zero revenue figures appear on this specific operational dashboard.
- **Expected Result:** Operational KPI tracking functions with financial privacy maintained.
- **PO Acceptance Check:** [x] PASS / [ ] FAIL | Notes: __________________________

---

## 3. Product Owner Review Sign-Off
- **Sprint 2 Status:** Accepted and Ready for Staging Release
- **PO Signature:** `Mr. Adel Mostafa` (Product Owner)  
- **Date:** October 20, 2026
