# Edge Acceptance: Deno Edge Functions & WebPush Crypto

Sprint 3 acceptance report for Supabase Edge Functions under official Deno runtime.

## Executive Summary
This directory contains verified execution evidence for the two Supabase Edge Functions:
1. `protected-media` (`supabase/functions/protected-media/index.ts`)
2. `push-dispatch` (`supabase/functions/push-dispatch/index.ts`)

All verification runs execute directly against the official **Deno 2.0.0** binary with pinned dependencies (`npm:web-push@3.6.7`, `npm:http_ece@1.2.0`, `npm:@supabase/supabase-js@2.57.4`, `https://esm.sh/@supabase/supabase-js@2.39.0`).

---

## Verifications Executed

### 1. SDK Import & Type Checking (`deno check`)
- Both function source trees were verified using `deno check` without errors or missing modules.
- Remote NPM packages (`@supabase/supabase-js`, `web-push`, `http_ece`) and Deno std packages resolve cleanly.

### 2. WebPush RFC 8291 Cryptographic Conformance
- Executed synthetic P-256 ECDH key exchange with 16-byte random authentication secrets.
- Encrypted notification payload using `webpush.generateRequestDetails(...)` producing `Content-Encoding: aes128gcm` and VAPID `Authorization` headers.
- Decrypted the encrypted binary buffer using `http_ece.decrypt(...)` and asserted 100% byte-for-byte fidelity with the plaintext.
- Asserted fail-closed behavior when tampered authentication secrets are supplied.

### 3. Fail-Closed Runtime Verification
Conducted across isolated local ports (`8831`, `8832`) using a tracked Python process manager:
- **`protected-media`**:
  - Missing Server Config: `GET` returns `405 POST required`; `POST` returns `503 Protected media service is not configured` (pre-auth gate).
  - Configured with Synthetic Loopback: `POST` with missing auth returns `401 Authentication required`; `POST` with malformed auth scheme returns `401`; `POST` with invalid JWT returns `401 Invalid session` fail-closed; server remains alive and responsive.
- **`push-dispatch`**:
  - Missing Server Config: `OPTIONS` returns `200 ok` (CORS preflight); `GET`/`PUT` return `405 Method not allowed`; `POST` returns `503 Server misconfigured: missing Supabase credentials`.
  - Missing VAPID Config: `POST` returns `503 VAPID credentials not configured on server`.
  - Configured with Synthetic Loopback & Valid VAPID Keys: `OPTIONS` returns `200 ok`; `POST` with missing auth returns `401 Missing Authorization header`; `POST` with invalid JWT returns `401 Unauthorized: invalid JWT` fail-closed; server remains alive and responsive.

### 4. SSRF Gateway Filtering Matrix (source-derived policy evaluation)
Tested 17 vectors against `ALLOWED_PUSH_HOST_PATTERN` and `PRIVATE_HOST_PATTERN`:
- **Allowed**: `fcm.googleapis.com`, `updates.push.services.mozilla.com`, `notify.windows.com`, `web.push.apple.com`, `push.apple.com`.
- **Blocked**: `localhost`, `127.0.0.1`, `[::1]`, `10.0.0.5`, `192.168.1.100`, `172.16.0.1`, `169.254.169.254` (cloud metadata), `0.0.0.0`, credential injection (`user:pass@fcm.googleapis.com`), attacker path/subdomain spoofing, and unencrypted `http://`.

---

## Explicit Boundaries & External Gates
Per SOL Plan and sprint standards, no credentials or delivery outcomes are simulated or faked:
1. **No Fake Delivery**: Local cryptographic verification does NOT imply remote push gateway delivery or physical handset arrival.
2. **Push Gateways**: Communication with external push gateways (Google FCM, Apple APNs, Mozilla WebPush) requires live external gateway endpoints and network access.
3. **Physical Hardware**: Real device wake-up and service worker notification displays on Android/iOS devices require physical mobile device fleets and registered push tokens.
4. **Production GoTrue**: Successful session authorization needs an authorized real Auth environment and test users; production signing secrets must not be copied to a test harness.
5. **Licensed DRM**: Widevine/FairPlay/PlayReady DRM licensing servers are separate infrastructure and not simulated.
## Reproduce locally
Set DENO_EXE to an official local Deno executable, then run `python qa/sprint3/edge-acceptance/run_edge_acceptance.py`. Test configuration removes inherited SUPABASE_/VAPID_ values and uses synthetic loopback targets. Dependencies must be cached or obtainable. No provider send occurs.

Parent reran all19groups successfully with strict401 invalidJWT assertions, compared currentsourcehashes, and replaced copied SSRFregex declarations with declarations extracted from the actual function. SSRFpolicy evaluation is not an authenticated dispatch integration test. Malformed/nullbodyhandling changes were source-reviewed; the authenticated malformedbody branch has NOT been exercised by the invalidJWT tests. Crypto validation is a local library interoperability roundtrip, not an independent exhaustive RFC certification.

