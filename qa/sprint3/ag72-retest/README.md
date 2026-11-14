> Parent acceptance correction: 19 executed checks PASS after correcting harness-only defects (wrong announcement field names previously yielded400; now schema-correct payload must403; actual assistant component positively asserted; browsercounts enforced and subprocess fails on cases). No applicationcode changed. Original strict pageHTTP403 criterion is NOT met by SPAredirect. This is verified accessdenial evidence, NOT full AG72 acceptance or Done authorization. ControlledgetUser/sessionidentityadapter,notactualGoTrue. Standards headings are reportformat labels, not an IEEE/OWASPcertification.

# AG-72 Security & RBAC Acceptance Retest Runner

## Boundary Specification
- **Database Engine:** Isolated PostgreSQL 16.6 (disposable scratch cluster, zero production connections).
- **REST/RPC Layer:** Real PostgREST 16.5 client-server architecture with JWT verification (`auth.uid()`, `auth.role()`).
- **Frontend Layer:** Real compiled Angular production distribution (`dist/mutqin-english/browser`) served locally.
- **Browser Automation:** Headless Chromium via Playwright executing real Angular route transitions.
- **Contract Honesty:**
  1. Direct RPC calls violating role prerequisites (`admin_financial_summary`, `issue_guardian_report`) return real **HTTP 403 Forbidden** (PostgreSQL `42501`).
  2. Data queries restricted by PostgreSQL Row Level Security (`push_subscriptions`, `payments`) return **HTTP 200 `[]`** (empty set) with zero data leakage. RLS row filtering does not generate HTTP 403.
  3. Client-side route guards (`adminGuard`, `staffGuard`) perform **Angular Router client-side redirection** (`UrlTree`), not HTTP 403 responses.

## Execution
Runner path: `C:/Users/Samer/AppData/Local/hermes/profiles/jira/workspace/samer_sherry_delivery/merge_new_scope/real_backends/ag72_retest/run_ag72_retest.py`
Command:
```bash
python run_ag72_retest.py
```
