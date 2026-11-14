> Parent verification: reran actual Angular bundle using Node v24.15.0 on loopback8091. Raw CSV has300rows (250media +25liveHTML +25checkoutHTML), eachmediaresponse65536bytes withvalidatedhash. CurrentFCP1904ms FAILED1.8sthreshold; earliercorrectedworker2064ms alsoFAILED. Old1508msmockHTMLresultREJECTED. Do notclaimperformanceacceptance.
>
> Concurrency boundary:250clientpromises/outstandingrequests, but HTTPAgentmaxSockets=150 queuesremainingrequests. This is NOT250simultaneousserverconnections, sustainedwatching, decodedvideo, JWTlogins, livebroadcast, or paymentfunctionality. HTMLroutesonlytestSPAfiledelivery. AuthphaseBLOCKED. No stagingcapacity criterion accepted.
>
> This driver is currently LOCAL SMOKE ONLY. Remote HTTPS media phases have not been validated and must not be advertised as a completed reusable staging journey. Onlytwoenvironmentfilesweresearched; unknownstagingelsewhereisnotprovedabsent.

# AG-132 / AG-97 Load Acceptance Runner

> **WARNING / CORRECTION RECORD (SOL REVISED)**:
> The previous ~1508ms FCP benchmark reported by earlier runs is **INVALID** and **STRICTLY EXCLUDED**.
> Root cause: the earlier driver resolved `SPA_DIR` with `../../dist` (pointing to non-existent `qa/dist`), triggering a tiny mock HTML fallback that was benchmarked instead of the Angular app.
> This corrected runner points to the actual compiled Angular bundle (`../../../dist/mutqin-english/browser`), asserts genuine `index.html` and `main*.js`, removes all minimal HTML fallbacks, and executes CDP 4G + 4x CPU throttle benchmarks against the real Angular app.

## Honest Verification Summary
- **Overall Verdict**: **FAILED**
- **Local Synthetic Media Smoke (250 Concurrency)**: **PASSED** (HTTP 206, 65536 bytes, verified prefix SHA-256).
- **Actual /live SPA Route HTML Delivery**: **PASSED** (25 requests, <app-root> verified).
- **Actual /checkout/lecture-id SPA Delivery**: **PASSED** (25 requests, strictly read-only, 0 writes/refunds).
- **Actual Angular CDP 4G FCP**: **1904 ms (FAILED (> 1.8s threshold: 1904ms))**
- **Staging Student / Auth / DRM Acceptance**: **BLOCKED** (No authorized staging URL or test credentials configured).
- **Hard Denial**: Production domains (`lbzphsipfsvhfrareqky.supabase.co`, `mutqin-english-amber.vercel.app`) are strictly forbidden.

## Artifacts Generated
- `synthetic_lecture_test.mp4` (115 KB real H.264/AAC media fixture)
- `load_driver.cjs` (Corrected standalone load driver)
- `raw_timings.csv` (Actual micro-timings for all requests)
- `load_acceptance_report.json` (Machine-readable test results and percentiles)
- `latency_percentiles.svg` (Vector chart of Phase 2 response times)
- `concurrency_timeline.svg` (Concurrent dispatch timeline)

## Exact CLI Rerun Commands
```bash
# Standard local 250-concurrency synthetic smoke with CDP 4G FCP measurement
node qa/sprint3/load-acceptance/load_driver.cjs --users=250 --port=8088

# With custom staging target (requires explicit authorization flag & host allowlist; bearer token read from LOAD_AUTH_TOKEN env)
LOAD_AUTH_TOKEN="your_token" node qa/sprint3/load-acceptance/load_driver.cjs --target-url=http://staging.example.com --authorized-staging --allow-host=staging.example.com --auth-endpoint=http://staging.example.com/auth
```
