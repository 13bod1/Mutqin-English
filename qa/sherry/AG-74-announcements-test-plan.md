# IEEE 829 Test Plan: Announcements Feed & CRUD Operations (AG-74)
**Issue Key:** AG-74  
**Parent Story:** AG-44 (PBI-16: Announcements Page)  
**Assigned QA Engineer:** Sherry Hany (`sherryhany`)  
**Standard Authority:** IEEE Std 829-2008  
**Estimated Effort:** 4h  

---

## 1. Test Scope & Component Overview
1. Admin Announcements Controller: `src/app/features/admin/announcements.page.ts`
2. Data Service Layer: `src/app/core/data/admin.service.ts` (`announcements()` signal, `createAnnouncement()`, `deleteAnnouncement()`)
3. Mock Fixtures: `src/app/core/mock/admin.mock.ts` (`ANNOUNCEMENTS_MOCK`)
4. Mobile Viewport: 360px width standard for Thanawya Amma student smartphones.

---

## 2. Test Approach & Verification Matrix
- **Production Server & Browser Matrix:** Production Angular build served locally on free port 4285. Audited across Chromium 156.0.8078.4, Firefox 157.0, and WebKit 27.2 (Playwright Windows WebKit engine build, with explicit disclosure that it is not Apple Safari on macOS/iOS).
- **Functional CRUD & Storage Isolation:** Verified announcement creation, newest-first ordering (index 0), status tagging ('sent', 'scheduled', 'draft'), and deletion. Confirmed local isolation in `localStorage` (`mutqin_admin_announcements`) with zero external writes to Supabase.
- **Security & RBAC Enforcement:** Verified `staffGuard` prevents student / guest accounts from accessing `/admin/announcements`.
- **Student View Route Verification:** Audited routing to public announcements feed (`/announcements`) for students.
- **Empty State & UI Usability:** Verified visual empty state rendering when announcements list is cleared (`[]`).
- **Mobile Responsive Layout:** Verified rendering and zero horizontal scrolling on 360px x 740px mobile viewport across all three browser engines.

---

## 3. Test Cases Ledger & Executed Findings

| Test ID | Objective | Input Data | Expected Output | Real Verification Evidence | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-ANN-01** | Admin creates announcement | Title: "Crucial Revision", Audience: "sec3" | Appears at index 0 (top of feed) | Notice rendered at index 0; persisted to `mutqin_admin_announcements` in `localStorage`; zero Supabase writes. | PASS |
| **TC-ANN-02** | Student modification & panel access blocked | Non-staff session (`role: 'student'`) | 403 / route guard redirect | Navigating to `/admin/announcements` blocked by `staffGuard` and redirected to `/`. | PASS |
| **TC-ANN-03** | Student Announcement Delivery Integration | Student visiting landing / shell | Announcements visible at top of page | Admin announcements CRUD operates correctly, but students do not see active announcements at top of page (integration gap). Note: No AC requires a standalone route `/announcements` specifically. | BLOCKED / DEFECT |
| **TC-ANN-04** | Empty state rendering | Empty array `[]` in store | Friendly empty notice displayed | Verified on admin view: renders localized empty state notice ("Nothing matches your filters"). | PASS |
| **TC-ANN-05** | Mobile 360px Viewport Rendering | 360px width screen | Zero overflow, controls accessible | Verified on 360px viewport across Chromium, Firefox, WebKit. No horizontal scroll (`scrollWidth <= clientWidth`). | PASS |

---

## 4. Defect Report & Jira Synchronization
- **Jira Defect Key:** **AG-91** (Adjudicated & Updated)  
  **Summary:** BUG: Unverified student announcement delivery integration gap in student landing/shell [AG-74]  
  **Type:** Bug (Issue Type ID 10041) | **Link:** Relates to AG-74  
  **Finding Details (Authoritative Adjudication):**
  1. Student Delivery Integration Gap: Admin announcements CRUD works in `/admin/announcements`, but students do not see active announcements at the top of the main student view (landing page / shell header).
  2. Invented Requirement Clarification: AG-74 AC specifies: 'Given an admin, When they create an announcement, Then students see it at the top of the page'. No AC requires a standalone route `/announcements` specifically. Demanding a dedicated `/announcements` feed route was an invented requirement / spec overreach; a separate announcements feed page is tracked under future story AG-44 (subtasks AG-55 UI, AG-60 Frontend, AG-85 Components in 'To Do'). No forced new route in AG-74.
- **Status & Tracking:** Issue AG-74 remains strictly **In Progress** (per Immutable Tests Law, cannot transition to Done while student announcements route is missing). Original estimate filled in Jira: **4h** (zero worklogs added).
- **Execution Receipt & Screenshots:** Saved to `sherry/runtime/theme_announcements_receipt.json` and `sherry/runtime/screenshots/` (15 browser captures).
