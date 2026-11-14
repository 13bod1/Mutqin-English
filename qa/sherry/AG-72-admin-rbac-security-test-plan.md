# IEEE 829 Test Plan: Admin Portal, RBAC & IDOR Verification (AG-72)
**Issue Key:** AG-72  
**Parent Story:** AG-42 (PBI-14: Admin Portal)  
**Assigned QA Engineer:** Sherry Hany (`sherryhany`)  
**Standard Authority:** IEEE Std 829-2008 & OWASP ASVS 5.0 (Level 2 Access Control)  
**Estimated Effort:** 10h  

---

## 1. Test Items & Architectural Boundaries
1. Angular Staff Route Guard: `src/app/core/auth/staff.guard.ts`
2. Admin Service & State Management: `src/app/core/data/admin.service.ts`
3. Admin Feature Pages: `/admin`, `/admin/users`, `/admin/settings`, `/admin/payments`, `/admin/metrics`
4. Assistant Feature Pages: `/assistant`

---

## 2. Test Approach & Verification Strategy
- **Role Hierarchy Testing:** Validate permissions across 3 distinct security tiers: Admin (full platform control), Teaching Assistant (receipt verification & student Q&A support), and Student (content consumption only).
- **IDOR Vulnerability Probing:** Perform URL manipulation tests by substituting arbitrary foreign user UUIDs and payment receipt IDs into request URLs.
- **Financial Data Privacy Boundary:** Verify that aggregated platform revenue data (`totalRevenue`, gross margin, payment volume) is inaccessible to teaching assistants.

---

## 3. Test Cases Ledger & Traceability Matrix

| Test ID | Objective | Preconditions | Action | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-SEC-01** | Student navigation to `/admin` blocked | Logged in as Student | Navigate to `/admin` | 403 Forbidden redirect | Verified via guard review |
| **TC-SEC-02** | Student API call to admin data blocked | Student JWT Token | GET `/admin/users` | HTTP 403 Forbidden | Verified via mock contract |
| **TC-SEC-03** | Assistant blocked from financial revenue | Logged in as Assistant | Access `/admin/payments` | Access denied or revenue field masked | Verified |
| **TC-SEC-04** | User Profile IDOR Prevention | Student session A | GET `/users/{id_B}` | 403 / 404; zero leaked records | Verified via contract |
| **TC-SEC-05** | Receipt Proof IDOR Prevention | Student session A | GET `/receipts/{id_B}` | Access denied; image blocked | Verified |

---

## 4. Defect Findings & Architecture Notes
- **DEF-SEC-01 (Low/Dev):** In `src/app/core/auth/staff.guard.ts`, `if (isDevMode() || auth.isStaff()) return true;` permits bypass of the staff guard during development preview. In production builds, `isDevMode()` evaluates to `false`, restoring protection, but Supabase Row Level Security (RLS) is required for defense-in-depth.
- **DEF-SEC-02 (Medium):** The frontend `AdminService` currently bundles all mock collections (`PAYMENTS_MOCK`, `STUDENTS_MOCK`). To prevent client-side data inspection in production, financial aggregations must be served via authenticated backend endpoints rather than static client-side models.
