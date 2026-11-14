> Parent acceptance correction: 19 executed checks PASS after correcting harness-only defects (wrong announcement field names previously yielded400; now schema-correct payload must403; actual assistant component positively asserted; browsercounts enforced and subprocess fails on cases). No applicationcode changed. Original strict pageHTTP403 criterion is NOT met by SPAredirect. This is verified accessdenial evidence, NOT full AG72 acceptance or Done authorization. ControlledgetUser/sessionidentityadapter,notactualGoTrue. Standards headings are reportformat labels, not an IEEE/OWASPcertification.

# IEEE Std 829-2008 RBAC Security & IDOR Retest Verification Report
## Task AG-72: Admin Portal, Role-Based Access Control (RBAC), and IDOR Prevention

**Issue Key:** AG-72  
**Parent Story:** AG-42 (PBI-14: Admin Portal)  
**Standard Authority:** IEEE Std 829-2008 / OWASP ASVS 5.0 (Access Control & Data Protection)  
**Target Git Source Hash:** `1cb9324be34aa627824154e41b3544d7d0ba33ca`  
**Execution Timestamp:** 2026-11-14  
**Receipt Evidence:** `merge_new_scope/real_backends/ag72_retest/ag72_retest_receipt.json`  
**Harness Path:** `merge_new_scope/real_backends/ag72_retest/run_ag72_retest.py`  
**Browser Contract Suite:** `merge_new_scope/real_backends/ag72_retest/browser_ag72_contracts.cjs`  
**Gherkin Feature:** `qa/sprint3/ag72-retest/AG72_RETEST.feature`  
**Executed check status:** **19/19 PASS; full original acceptance remains PARTIAL due to literal page403 requirement**

---

## 1. Scope & Execution Boundary

The retest was executed in strict adherence to SOL instructions and security boundary protocols:
1. **Isolated Disposable Database:** PostgreSQL 16.6 initialized in a disposable scratch directory with fresh roles (`anon`, `authenticated`, `service_role`, `authenticator`) and database migrations (002 through 006). Zero production credentials, connections, or side effects.
2. **Real PostgREST 16.5 REST/RPC Engine:** Real client-server HTTP transactions with cryptographic JWT verification (`auth.uid()`, `auth.role()`).
3. **Compiled Production Angular Bundle:** Production SPA (`dist/mutqin-english/browser`) served locally and driven by Playwright Chromium.
4. **Zero Production Code / Migration Tampering:** No changes made to production SQL migrations or Angular production source code.

---

## 2. Acceptance Criteria & Empirical Results

### Acceptance Criteria 1: Admin-Only API & Direct RPC Access Denial (HTTP 403)
- **Criterion:** Given student or assistant admin-only page or API access denied HTTP 403.
- **Verification & Findings:**
  - Direct calls to admin-only PostgreSQL RPC functions (`admin_financial_summary`, `issue_guardian_report`) by `studentA` or `assistant` fail role authorization (`public.current_platform_role() NOT IN ('admin', 'super_admin')`), raising PostgreSQL exception `42501` which PostgREST translates directly into **HTTP 403 Forbidden**.
  - Admin calling `admin_financial_summary` returns **HTTP 200 OK** with `{ total_revenue: 1250.00, approved_count: 2 }`.

### Acceptance Criteria 2: Assistant Financial Report Endpoint Privacy
- **Criterion:** Assistant financial report endpoint must NOT return total revenue.
- **Verification & Findings:**
  - Assistant calling `POST /rpc/admin_financial_summary` receives **HTTP 403 Forbidden**; the response body strictly withholds total revenue or financial aggregation figures.
  - In the browser UI, an assistant navigating to the `/assistant` portal accesses only operational metrics (receipt review queue, Q&A moderation, attendance), while platform total revenue, gross revenue, and profit metrics are completely absent from the DOM.

### Acceptance Criteria 3: Substitutions / Subscriptions Private User ID Segregation (IDOR)
- **Criterion:** Substitutions / subscriptions private userID not exposed.
- **Verification & Findings:**
  - When `studentA` queries `GET /push_subscriptions`, only their own subscription record is returned.
  - When `studentA` queries `GET /push_subscriptions?user_id=eq.{studentB_id}`, PostgreSQL Row Level Security (RLS) restricts row visibility to `auth.uid() = user_id`, returning **HTTP 200 `[]` (empty collection)**. Zero records or private identifiers belonging to `studentB` are leaked.
  - When `assistant` queries `GET /push_subscriptions`, RLS policy enforces that assistants are not owners or super_admins, returning **HTTP 200 `[]`**.
  - When `studentA` queries `GET /payments?student_id=eq.{studentB_id}`, RLS prevents cross-student access, returning **HTTP 200 `[]`**.

### Architectural Note on HTTP 403 vs RLS vs SPA Route Guards
- **Direct RPC Denial:** Returns genuine **HTTP 403 Forbidden** (PostgreSQL `42501`).
- **Row Level Security (RLS) Table Queries:** Returns **HTTP 200 `[]`** (empty array), cleanly segregating data without leaking row existence or triggering unhandled HTTP errors.
- **SPA Browser Route Navigation:** Angular Router guards (`adminGuard`, `staffGuard`) execute **client-side redirects** (`UrlTree`), routing unauthorized users away from admin paths before components are instantiated. SPA web servers do not issue HTTP 403 for client-side navigation.

---

## 3. Detailed Empirical Test Execution Matrix

| Test ID | Test Category | Role | Resource / Action | Expected Result | Measured Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-RPC-01** | Direct API RPC | Student | `POST /rpc/admin_financial_summary` | HTTP 403 Forbidden (42501) | HTTP 403 Forbidden | **PASS** |
| **TC-RPC-02** | Direct API RPC | Assistant | `POST /rpc/admin_financial_summary` | HTTP 403 Forbidden (42501) | HTTP 403 Forbidden (Revenue Withheld) | **PASS** |
| **TC-RPC-03** | Direct API RPC | Admin | `POST /rpc/admin_financial_summary` | HTTP 200 OK + `total_revenue` | HTTP 200 OK (Revenue: 1250) | **PASS** |
| **TC-RPC-04** | Direct API RPC | Student | `POST /rpc/issue_guardian_report` | HTTP 403 Forbidden (42501) | HTTP 403 Forbidden | **PASS** |
| **TC-RPC-05** | Direct API RPC | Assistant | `POST /rpc/issue_guardian_report` | HTTP 403 Forbidden (42501) | HTTP 403 Forbidden | **PASS** |
| **TC-RLS-01** | Push Subscriptions | Student | `GET /push_subscriptions` | HTTP 200 with own subscription | HTTP 200 (Own userId only) | **PASS** |
| **TC-RLS-02** | Push Subscriptions | Student | `GET /push_subscriptions?user_id=eq.{studentB}` | HTTP 200 `[]` (RLS filter) | HTTP 200 `[]` (0 leaked) | **PASS** |
| **TC-RLS-03** | Push Subscriptions | Assistant | `GET /push_subscriptions` | HTTP 200 `[]` (RLS filter) | HTTP 200 `[]` (0 leaked) | **PASS** |
| **TC-RLS-04** | Payments Privacy | Student | `GET /payments?student_id=eq.{studentB}` | HTTP 200 `[]` (RLS filter) | HTTP 200 `[]` (0 leaked) | **PASS** |
| **TC-TAB-01** | Announcements Write | Student / Assistant | `POST /announcements` | Denied (HTTP 401/403/RLS) | Denied (HTTP 403/401) | **PASS** |
| **TC-TAB-02** | Settings Write | Student / Assistant | `PATCH /public_settings` | Write blocked by RLS | Unchanged (`initial` preserved) | **PASS** |
| **TC-UI-01** | Browser Guard | Student | Navigate `/admin` | Client redirect to `/` | Redirected to `/` (No admin shell) | **PASS** |
| **TC-UI-02** | Browser Guard | Student | Navigate `/admin/payments` | Client redirect to `/` | Redirected to `/` (No payments page) | **PASS** |
| **TC-UI-03** | Browser Guard | Student | Navigate `/assistant` | Client redirect to `/` | Redirected to `/` (No assistant portal) | **PASS** |
| **TC-UI-04** | Browser Guard | Assistant | Navigate `/admin` | Client redirect to `/assistant` | Redirected to `/assistant` | **PASS** |
| **TC-UI-05** | Browser Guard | Assistant | Navigate `/admin/payments` | Client redirect to `/assistant` | Redirected to `/assistant` | **PASS** |
| **TC-UI-06** | Browser Guard | Assistant | Navigate `/admin/settings` | Client redirect to `/assistant` | Redirected to `/assistant` | **PASS** |
| **TC-UI-07** | Browser UI | Assistant | Navigate `/assistant` | Assistant portal rendered; no revenue | Rendered without total revenue | **PASS** |
| **TC-UI-08** | Browser Guard | Admin | Navigate `/admin` | Allowed access to admin portal | Allowed (Admin shell rendered) | **PASS** |

---

## 4. Summary & Findings for Parent Agent

1. **Jira AG-72 Status:** The implementation in local HEAD `1cb9324be34aa627824154e41b3544d7d0ba33ca` passes the nineteen implemented checks; original literal pageHTTP403 acceptance remains unmet because SPA navigation redirects.
2. **Defect Status vs Historical Sherry Report:** The previous defect reported in `AG72_RBAC_VERIFICATION_RESULT.md` (where assistants were mistakenly allowed into `/admin` due to `staffGuard` covering the entire `/admin` tree) has been resolved: `/admin` and its sub-routes are guarded by `adminGuard` which redirects assistants to `/assistant`.
3. **No Code Edits Performed:** In compliance with explicit user instruction, no source modifications were made to production SQL or Angular files. All testing was executed using the external harness under `merge_new_scope/real_backends/ag72_retest/`.
4. **Artifacts Generated:**
   - External Runner: `merge_new_scope/real_backends/ag72_retest/run_ag72_retest.py`
   - External Browser Suite: `merge_new_scope/real_backends/ag72_retest/browser_ag72_contracts.cjs`
   - Verification Receipt: `merge_new_scope/real_backends/ag72_retest/ag72_retest_receipt.json`
   - Gherkin Feature File: `qa/sprint3/ag72-retest/AG72_RETEST.feature`
   - Boundary Readme: `qa/sprint3/ag72-retest/README.md`
   - Formal IEEE 829 Report: `qa/sprint3/ag72-retest/AG72_RETEST_REPORT.md`
