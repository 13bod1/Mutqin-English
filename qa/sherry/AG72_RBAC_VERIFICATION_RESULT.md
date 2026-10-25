# IEEE Std 829-2008 Test Execution & RBAC Security Verification Report
## Task AG-72: QA Admin Portal, Role-Based Access Control (RBAC) & IDOR Verification

**Issue Key:** AG-72  
**Parent Story:** AG-42 (PBI-14: Admin Portal)  
**Assigned QA:** Sherry Hany (`sherryhany`)  
**Standard Authority:** IEEE Std 829-2008 / OWASP ASVS 5.0 (Access Control Verification)  
**Execution Environment:** Production Build (`ng build` — `isDevMode() = false`) served via isolated local server (Port 52988)  
**Verification Harness:** Playwright Chromium Standalone Runtime Probe (`runtime/sherry_probe_runner.mjs`)  
**Receipt Evidence:** `runtime/sherry_security_kpi_receipt.json`  
**Final Verification Status:** **DEFECT CONFIRMED — ACCEPTANCE CRITERIA UNMET (IN PROGRESS)**  

---

## 1. Scope & Execution Preconditions
- **Production Build Enforcement:** Development mode (`isDevMode() = true`) contains an intentional bypass in `staffGuard` (`if (isDevMode() || auth.isStaff()) return true;`) for developer convenience. Per audit mandate, verification was executed strictly against the production bundle to validate real guard enforcement.
- **Isolation Policy:** No live production mutations, no live authentication calls to production Supabase, and zero external payment triggers.
- **Fixture Environment Qualification:** The assistant session probing was executed using a local synthetic fixture session (`localStorage.setItem('user', JSON.stringify({role: 'assistant'}))`), NOT an authenticated production Supabase session. While the architectural vulnerability is genuine and source-confirmed (`staffGuard` allows any staff role), testing was conducted via local fixture.

---

## 2. Test Execution & Empirical Results

| Test ID | Role / Subject | Target Route / Resource | Expected AC Behavior | Actual Measured Behavior | Protocol Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-RBAC-01** | Anonymous / Unauthenticated | `/admin` | Denied; redirected to login | HTTP 200 SPA delivery; Angular Router `staffGuard` redirects to `/login?redirect=%2Fadmin` | **PASS (Client Redirect)** |
| **TC-RBAC-02** | Anonymous / Unauthenticated | `/admin/payments` | Denied; redirected to login | HTTP 200 SPA delivery; Angular Router `staffGuard` redirects to `/login?redirect=%2Fadmin%2Fpayments` | **PASS (Client Redirect)** |
| **TC-RBAC-03** | Anonymous / Unauthenticated | `/assistant` | Denied; redirected to login | HTTP 200 SPA delivery; Angular Router `staffGuard` redirects to `/login?redirect=%2Fassistant` | **PASS (Client Redirect)** |
| **TC-RBAC-04** | Student (`role: 'student'`) | `/admin` | Denied (HTTP 403 or redirect) | Angular Router `staffGuard` intercepts session and redirects to home `['/']` | **PASS (Client Redirect)** |
| **TC-RBAC-05** | Student (`role: 'student'`) | `/admin/payments` | Denied (HTTP 403 or redirect) | Angular Router redirects to home `['/']` | **PASS (Client Redirect)** |
| **TC-RBAC-06** | Student (`role: 'student'`) | `/assistant` | Denied (HTTP 403 or redirect) | Angular Router redirects to home `['/']` | **PASS (Client Redirect)** |
| **TC-RBAC-07** | Assistant (`role: 'assistant'`) | `/assistant` | Allowed access to assistant portal | Allowed; Assistant portal UI renders with operational tabs (receipts, attendance, Q&A) | **PASS** |
| **TC-RBAC-08** | Assistant (`role: 'assistant'`) | `/admin` | Denied (Assistant restricted from admin portal) | **UNAUTHORIZED ACCESS ALLOWED:** Route opens; Admin Dashboard renders (tested via local injected fixture session, not production auth) | **FAIL (DEFECT)** |
| **TC-RBAC-09** | Assistant (`role: 'assistant'`) | `/admin/payments` | Denied (Financial privacy boundary) | **UNAUTHORIZED ACCESS ALLOWED:** Route opens; Full payments table, EGP revenue totals visible | **FAIL (DEFECT)** |
| **TC-RBAC-10** | Assistant (`role: 'assistant'`) | `/admin/settings` | Denied (Admin settings restricted) | **UNAUTHORIZED ACCESS ALLOWED:** Route opens; Academy settings form editable | **FAIL (DEFECT)** |
| **TC-RBAC-11** | Backend RLS Verification | Supabase `payments` & `settings` | HTTP 403 on unauthorized queries | **NO RLS IMPLEMENTED:** Tables not in `supabase/schema.sql`; managed via client mock store | **FAIL (DEFECT)** |
| **TC-RBAC-12** | IDOR Probing | Row-level backend ID manipulation | Backend rejects foreign record IDs | Production probe **BLOCKED** by safety isolation rules; client mock has no row ownership checks | **BLOCKED / DEFECT** |

---

## 3. Defect Analysis & Root Cause

1. **Privilege Escalation on Admin Routes:**
   - In `src/app/core/auth/staff.guard.ts`:
     ```typescript
     export const staffGuard: CanMatchFn = (_route, segments) => {
       const auth = inject(AuthService);
       if (isDevMode() || auth.isStaff()) return true;
       ...
     };
     ```
   - In `src/app/core/data/auth.service.ts`:
     ```typescript
     readonly isStaff = computed(() => {
       const role = this.user()?.role;
       return role === 'admin' || role === 'assistant';
     });
     ```
   - In `src/app/app.routes.ts`:
     The entire `/admin` tree is guarded solely by `canMatch: [staffGuard]`. Because `auth.isStaff()` returns `true` for `role === 'assistant'`, any assistant account can access the full admin portal, review financial revenue figures, and modify site settings.
   - **Remediation Required:** Introduce a distinct `adminOnlyGuard` (`auth.user()?.role === 'admin'`) for `/admin`, `/admin/payments`, and `/admin/settings`, restricting assistants exclusively to `/assistant`.

2. **Frontend Redirect vs. HTTP 403 Backend Distinction:**
   - All access denials are client-side Angular Router UrlTree redirects. The web server serves the production SPA index bundle with HTTP 200.
   - Backend HTTP 403 does not exist because payments, settings, and staff operations are implemented using in-memory mock signals (`AdminService`), with no backend Supabase RLS policies defined in `supabase/schema.sql`.

---

## 4. Verification Gate Conclusion
- AG-72 Acceptance Criteria specifically mandate that:
  _"Given the assistant role, When they view receipts or live sessions, Then they cannot see or modify admin settings, financial totals or other staff data."_
- Because assistant accounts currently have unhindered access to `/admin`, `/admin/payments`, and `/admin/settings`, AG-72 **cannot be transitioned to Done**.
- Task AG-72 remains **In Progress** pending engineering remediation.
