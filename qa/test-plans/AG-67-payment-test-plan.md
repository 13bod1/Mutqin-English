# 📋 Test Plan: In-Site Payment Checkout & Security Verification (AG-67 & AG-68)
**Parent Story:** [AG-40] PBI-12: As a student or guardian, I want to pay for a session inside the website itself  
**QA Lead:** Hazem Ahmed (`Hazem20wosis`)  
**Sprint:** Sprint 2 (Active)  
**Standard:** IEEE 829 Test Documentation / Gherkin BDD  
**Status:** Approved & Executed (100% Pass)

---

## 1. Scope and Objectives
The objective of this test plan is to thoroughly validate the end-to-end payment lifecycle for Thanawya Amma lectures and live sessions inside the platform without external redirects.

### In Scope
- Payment checkout initialization and 15-minute expiration window.
- Successful payment transaction and immediate session activation.
- Failure handling: declined cards, 3DS timeouts, and retry logic.
- User cancellation handling with clean state restoration.
- Idempotency & Duplicate payment protection: preventing duplicate charges and activations.
- Secure webhook signature verification (HMAC-SHA256).
- Security audit: absolute prevention of secret gateway key leakage (`sk_live_...`, webhook secrets) in client code, bundles, storage, or browser network logs.
- Fallback payment flow: manual InstaPay and Cash receipt submission with Egyptian mobile validation (`^01[0125][0-9]{8}$`).

### Out of Scope
- Direct physical ATM integration.
- Assistant revenue visibility (assistant RBAC must remain blinded to financial totals).

---

## 2. Test Approach & Architecture
- **Unit / Integration Level:** Jasmine + Karma headless runner (`ChromeHeadlessCI`) with `karma-junit-reporter` exporting standard JUnit XML.
- **BDD Gherkin Layer:** Executable Gherkin scenarios linking business acceptance criteria to unit assertions.
- **Security Penetration Level:** Automated scan of localStorage, sessionStorage, and window globals for secret key exposure.

---

## 3. Test Cases Specification

| ID | Title | Method | Expected Result | Priority |
|---|---|---|---|---|
| TC-PAY-01 | Create Checkout Session | Automated (Unit) | Returns session with `pending` status, 15m expiration, 250 EGP | High |
| TC-PAY-02 | Successful Checkout | Automated (Unit) | Status becomes `success`, lecture marked active for student | Critical |
| TC-PAY-03 | Declined Card / Failed Checkout | Automated (Unit) | Status becomes `failed`, retry count increments, user can retry | High |
| TC-PAY-04 | User Cancelled Payment | Automated (Unit) | Status becomes `cancelled`, friendly message displayed | Medium |
| TC-PAY-05 | Expired Session Checkout | Automated (Unit) | Status becomes `expired`, requires initiating fresh session | High |
| TC-PAY-06 | Duplicate Prevention | Automated (Unit) | Returns `duplicate` status if student already owns active session | Critical |
| TC-SEC-01 | Tampered Webhook Rejection | Automated (Security) | HTTP 401 Unauthorized, signature mismatch, session NOT activated | Critical |
| TC-SEC-02 | Valid Signed Webhook Processing | Automated (Security) | HTTP 200 OK, valid HMAC signature, session activated | Critical |
| TC-SEC-03 | Webhook Idempotency Check | Automated (Security) | Duplicate event processed once only, second request safely ignored | Critical |
| TC-SEC-04 | Gateway Secret Key Audit | Automated (Security) | No `sk_live` or `whsec` keys present in client bundles or storage | Critical |
| TC-RCP-01 | Valid InstaPay Receipt Upload | Automated (Integration) | Receipt registered with status `pending_review` | High |
| TC-RCP-02 | Invalid Phone Format Rejection | Automated (Integration) | Rejects non-Egyptian phone format with descriptive validation error | High |
| TC-RCP-03 | Malicious File Extension Rejection| Automated (Security) | Rejects `.exe`, `.sh`, `.bat`; only `.jpg`, `.png`, `.pdf` allowed | Critical |

---

## 4. Entry and Exit Criteria
- **Entry Criteria:** PaymentService and LiveSessionService implemented with Jasmine specs.
- **Exit Criteria:** 100% of test cases executed; 0 Open Critical or High bugs; JUnit XML report generated.
