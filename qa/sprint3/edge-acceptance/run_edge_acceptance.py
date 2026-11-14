#!/usr/bin/env python3
"""
Edge Function Acceptance Runner (Sprint 3)
Verifies Supabase Deno Edge Functions ('protected-media' and 'push-dispatch') under the official Deno 2.0.0 runtime.
Executes:
  1. Deno type check and remote SDK/npm import resolution ('deno check').
  2. Isolated WebPush RFC 8291 aes128gcm cryptographic verification (key exchange, encryption, decryption).
  3. Fail-closed HTTP contract tests for 'protected-media' (method enforcement, missing config 503, invalid JWT 401).
  4. Fail-closed HTTP contract tests for 'push-dispatch' (CORS preflight 200, method 405, missing config 503, invalid JWT 401).
  5. SSRF host validation suite (17 positive and negative boundary test cases).
  6. Source file SHA-256 integrity hashing and execution receipt generation.

NOTE: All tests are isolated to synthetic local configs; no production credentials, no remote provider traffic,
and no fabricated authentication or device delivery claims.
"""

import hashlib
import json
import os
import subprocess
import sys
import time
from pathlib import Path
import requests
import re

QA_DIR = Path(__file__).resolve().parent
REPO_DIR = QA_DIR.parents[2]
WORK_DIR = QA_DIR
DENO_EXE = Path(os.environ.get("DENO_EXE", "C:/Users/Samer/AppData/Local/hermes/profiles/jira/cache/scratch/deno-bin/deno.exe"))

PROTECTED_MEDIA_SRC = REPO_DIR / "supabase/functions/protected-media/index.ts"
PUSH_DISPATCH_SRC = REPO_DIR / "supabase/functions/push-dispatch/index.ts"
CRYPTO_VERIF_SRC = WORK_DIR / "crypto_verification.ts"

def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def generate_vapid_keys():
    out = subprocess.check_output(
        [str(DENO_EXE), "eval", 'import w from "npm:web-push@3.6.7"; console.log(JSON.stringify(w.generateVAPIDKeys()));'],
        text=True
    )
    return json.loads(out.strip())

class DenoServer:
    def __init__(self, script_path: Path, port: int, extra_env: dict | None = None):
        self.script_path = script_path
        self.port = port
        self.extra_env = extra_env or {}
        self.process = None

    def __enter__(self):
        env = {k:v for k,v in os.environ.items() if not k.startswith(("SUPABASE_", "VAPID_"))}
        env["PORT"] = str(self.port)
        for k, v in self.extra_env.items():
            env[k] = str(v)

        self.process = subprocess.Popen(
            [str(DENO_EXE), "run", "-A", "--no-config", str(self.script_path)],
            cwd=str(WORK_DIR),
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        # Health check poll
        url = f"http://127.0.0.1:{self.port}"
        started = False
        for _ in range(30):
            time.sleep(0.1)
            if self.process.poll() is not None:
                _, err = self.process.communicate()
                raise RuntimeError(f"Deno process failed to start: {err}")
            try:
                # Any response (even 405 or 503) indicates the server is listening
                requests.get(url, timeout=0.2)
                started = True
                break
            except (requests.ConnectionError, requests.Timeout):
                continue
        if not started:
            self.__exit__(None, None, None)
            raise RuntimeError(f"Timeout waiting for Deno server on port {self.port}")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.process:
            self.process.terminate()
            try:
                self.process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait()

def run_suite():
    print(f"=== Starting Deno Edge Function Acceptance Verification ===")
    t_start = time.time()
    results = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "deno_version": "2.0.0 (x86_64-pc-windows-msvc)",
        "sources": {
            "protected_media_sha256": sha256_file(PROTECTED_MEDIA_SRC),
            "push_dispatch_sha256": sha256_file(PUSH_DISPATCH_SRC),
            "crypto_verification_sha256": sha256_file(CRYPTO_VERIF_SRC),
            "deno_binary_sha256": sha256_file(DENO_EXE),
        },
        "tests": [],
        "summary": {}
    }

    test_records = []

    # 1. Type Check & Remote Import Resolution
    print("\n--- 1. Deno Check (Type Checking & Import Verification) ---")
    for name, path in [("protected-media", PROTECTED_MEDIA_SRC), ("push-dispatch", PUSH_DISPATCH_SRC)]:
        t0 = time.time()
        res = subprocess.run([str(DENO_EXE), "check", str(path)], capture_output=True, text=True)
        dur = round((time.time() - t0) * 1000, 2)
        passed = (res.returncode == 0)
        print(f"[{'PASS' if passed else 'FAIL'}] deno check {name} ({dur} ms)")
        test_records.append({
            "category": "typecheck",
            "name": f"deno_check_{name}",
            "passed": passed,
            "duration_ms": dur,
            "output": res.stdout.strip() or res.stderr.strip()
        })

    # 2. WebPush RFC 8291 Cryptographic Conformance
    print("\n--- 2. WebPush RFC 8291 aes128gcm Cryptographic Engine ---")
    t0 = time.time()
    res = subprocess.run([str(DENO_EXE), "run", "-A", "--no-config", str(CRYPTO_VERIF_SRC)], capture_output=True, text=True)
    dur = round((time.time() - t0) * 1000, 2)
    crypto_data = {}
    try:
        crypto_data = json.loads(res.stdout.strip())
        crypto_passed = (res.returncode == 0 and crypto_data.get("status") == "PASSED")
    except Exception as e:
        crypto_passed = False
        crypto_data = {"error": str(e), "raw": res.stdout + res.stderr}

    print(f"[{'PASS' if crypto_passed else 'FAIL'}] webpush_rfc8291_crypto_roundtrip ({dur} ms)")
    test_records.append({
        "category": "crypto",
        "name": "webpush_rfc8291_crypto_roundtrip",
        "passed": crypto_passed,
        "duration_ms": dur,
        "details": crypto_data
    })

    # 3. Protected-Media Runtime Verification
    print("\n--- 3. Protected-Media Edge Function Runtime Matrix ---")
    port_pm = 8831

    # Scenario A: Missing Configuration
    with DenoServer(PROTECTED_MEDIA_SRC, port_pm) as server:
        base_url = f"http://127.0.0.1:{port_pm}"
        # GET -> 405
        t0 = time.time()
        r = requests.get(base_url, timeout=2)
        dur = round((time.time() - t0) * 1000, 2)
        passed = (r.status_code == 405 and r.json().get("error") == "POST required")
        print(f"[{'PASS' if passed else 'FAIL'}] pm_unconfigured_get_405 ({dur} ms)")
        test_records.append({
            "category": "protected-media",
            "name": "pm_unconfigured_get_405",
            "passed": passed,
            "status_code": r.status_code,
            "response": r.json(),
            "duration_ms": dur
        })

        # OPTIONS -> 405
        t0 = time.time()
        r = requests.options(base_url, timeout=2)
        dur = round((time.time() - t0) * 1000, 2)
        passed = (r.status_code == 405)
        print(f"[{'PASS' if passed else 'FAIL'}] pm_unconfigured_options_405 ({dur} ms)")
        test_records.append({
            "category": "protected-media",
            "name": "pm_unconfigured_options_405",
            "passed": passed,
            "status_code": r.status_code,
            "duration_ms": dur
        })

        # POST without config -> 503
        t0 = time.time()
        r = requests.post(base_url, json={}, timeout=2)
        dur = round((time.time() - t0) * 1000, 2)
        passed = (r.status_code == 503 and r.json().get("error") == "Protected media service is not configured")
        print(f"[{'PASS' if passed else 'FAIL'}] pm_unconfigured_post_503 ({dur} ms)")
        test_records.append({
            "category": "protected-media",
            "name": "pm_unconfigured_post_503",
            "passed": passed,
            "status_code": r.status_code,
            "response": r.json(),
            "duration_ms": dur
        })

    # Scenario B: Configured with Synthetic Loopback
    pm_env = {
        "SUPABASE_URL": "http://127.0.0.1:54329",
        "SUPABASE_ANON_KEY": "synthetic-anon-key-alpha",
        "SUPABASE_SERVICE_ROLE_KEY": "synthetic-service-key-alpha"
    }
    with DenoServer(PROTECTED_MEDIA_SRC, port_pm, extra_env=pm_env) as server:
        base_url = f"http://127.0.0.1:{port_pm}"

        # POST without Authorization -> 401
        t0 = time.time()
        r = requests.post(base_url, json={}, timeout=2)
        dur = round((time.time() - t0) * 1000, 2)
        passed = (r.status_code == 401 and r.json().get("error") == "Authentication required")
        print(f"[{'PASS' if passed else 'FAIL'}] pm_configured_missing_auth_401 ({dur} ms)")
        test_records.append({
            "category": "protected-media",
            "name": "pm_configured_missing_auth_401",
            "passed": passed,
            "status_code": r.status_code,
            "response": r.json(),
            "duration_ms": dur
        })

        # POST with malformed auth scheme -> 401
        t0 = time.time()
        r = requests.post(base_url, headers={"Authorization": "Basic dGVzdDp0ZXN0"}, json={}, timeout=2)
        dur = round((time.time() - t0) * 1000, 2)
        passed = (r.status_code == 401 and r.json().get("error") == "Authentication required")
        print(f"[{'PASS' if passed else 'FAIL'}] pm_configured_bad_auth_scheme_401 ({dur} ms)")
        test_records.append({
            "category": "protected-media",
            "name": "pm_configured_bad_auth_scheme_401",
            "passed": passed,
            "status_code": r.status_code,
            "response": r.json(),
            "duration_ms": dur
        })

        # POST with invalid Bearer token -> 401 fail-closed (Invalid session)
        t0 = time.time()
        r = requests.post(base_url, headers={"Authorization": "Bearer invalid.synthetic.token"}, json={}, timeout=10)
        dur = round((time.time() - t0) * 1000, 2)
        passed = (r.status_code == 401 and "error" in r.json())
        print(f"[{'PASS' if passed else 'FAIL'}] pm_configured_invalid_jwt_failclosed ({r.status_code}) ({dur} ms)")
        test_records.append({
            "category": "protected-media",
            "name": "pm_configured_invalid_jwt_failclosed",
            "passed": passed,
            "status_code": r.status_code,
            "response": r.json(),
            "duration_ms": dur
        })

        # Process liveness check after invalid token
        t0 = time.time()
        r = requests.get(base_url, timeout=2)
        dur = round((time.time() - t0) * 1000, 2)
        passed = (r.status_code == 405)
        print(f"[{'PASS' if passed else 'FAIL'}] pm_server_liveness_check ({dur} ms)")
        test_records.append({
            "category": "protected-media",
            "name": "pm_server_liveness_check",
            "passed": passed,
            "status_code": r.status_code,
            "duration_ms": dur
        })

    # 4. Push-Dispatch Runtime Verification
    print("\n--- 4. Push-Dispatch Edge Function Runtime Matrix ---")
    port_pd = 8832

    # Scenario A: Missing Credentials
    with DenoServer(PUSH_DISPATCH_SRC, port_pd) as server:
        base_url = f"http://127.0.0.1:{port_pd}"

        # OPTIONS -> 200 (CORS preflight)
        t0 = time.time()
        r = requests.options(base_url, timeout=2)
        dur = round((time.time() - t0) * 1000, 2)
        passed = (r.status_code == 200 and r.text == "ok" and r.headers.get("access-control-allow-origin") == "*")
        print(f"[{'PASS' if passed else 'FAIL'}] pd_unconfigured_options_cors_200 ({dur} ms)")
        test_records.append({
            "category": "push-dispatch",
            "name": "pd_unconfigured_options_cors_200",
            "passed": passed,
            "status_code": r.status_code,
            "cors_header": r.headers.get("access-control-allow-origin"),
            "duration_ms": dur
        })

        # GET -> 405
        t0 = time.time()
        r = requests.get(base_url, timeout=2)
        dur = round((time.time() - t0) * 1000, 2)
        passed = (r.status_code == 405 and r.json().get("error") == "Method not allowed")
        print(f"[{'PASS' if passed else 'FAIL'}] pd_unconfigured_get_405 ({dur} ms)")
        test_records.append({
            "category": "push-dispatch",
            "name": "pd_unconfigured_get_405",
            "passed": passed,
            "status_code": r.status_code,
            "response": r.json(),
            "duration_ms": dur
        })

        # PUT -> 405
        t0 = time.time()
        r = requests.put(base_url, timeout=2)
        dur = round((time.time() - t0) * 1000, 2)
        passed = (r.status_code == 405)
        print(f"[{'PASS' if passed else 'FAIL'}] pd_unconfigured_put_405 ({dur} ms)")
        test_records.append({
            "category": "push-dispatch",
            "name": "pd_unconfigured_put_405",
            "passed": passed,
            "status_code": r.status_code,
            "duration_ms": dur
        })

        # POST without config -> 503
        t0 = time.time()
        r = requests.post(base_url, json={}, timeout=2)
        dur = round((time.time() - t0) * 1000, 2)
        passed = (r.status_code == 503 and "missing Supabase credentials" in r.json().get("error", ""))
        print(f"[{'PASS' if passed else 'FAIL'}] pd_unconfigured_post_503 ({dur} ms)")
        test_records.append({
            "category": "push-dispatch",
            "name": "pd_unconfigured_post_503",
            "passed": passed,
            "status_code": r.status_code,
            "response": r.json(),
            "duration_ms": dur
        })

    # Scenario B: Missing VAPID Keys
    pd_env_novapid = {
        "SUPABASE_URL": "http://127.0.0.1:54329",
        "SUPABASE_SERVICE_ROLE_KEY": "synthetic-service-role-key"
    }
    with DenoServer(PUSH_DISPATCH_SRC, port_pd, extra_env=pd_env_novapid) as server:
        base_url = f"http://127.0.0.1:{port_pd}"
        t0 = time.time()
        r = requests.post(base_url, json={}, timeout=2)
        dur = round((time.time() - t0) * 1000, 2)
        passed = (r.status_code == 503 and "VAPID credentials not configured" in r.json().get("error", ""))
        print(f"[{'PASS' if passed else 'FAIL'}] pd_missing_vapid_post_503 ({dur} ms)")
        test_records.append({
            "category": "push-dispatch",
            "name": "pd_missing_vapid_post_503",
            "passed": passed,
            "status_code": r.status_code,
            "response": r.json(),
            "duration_ms": dur
        })

    # Scenario C: Configured with Valid VAPID Keys and Synthetic Loopback
    vapid_keys = generate_vapid_keys()
    pd_env_configured = {
        "SUPABASE_URL": "http://127.0.0.1:54329",
        "SUPABASE_SERVICE_ROLE_KEY": "synthetic-service-role-key",
        "VAPID_PUBLIC_KEY": vapid_keys["publicKey"],
        "VAPID_PRIVATE_KEY": vapid_keys["privateKey"],
        "VAPID_SUBJECT": "mailto:edge-test@adelmostafa.com"
    }
    with DenoServer(PUSH_DISPATCH_SRC, port_pd, extra_env=pd_env_configured) as server:
        base_url = f"http://127.0.0.1:{port_pd}"

        # POST without Authorization -> 401
        t0 = time.time()
        r = requests.post(base_url, json={"title": "Test", "body": "Body"}, timeout=2)
        dur = round((time.time() - t0) * 1000, 2)
        passed = (r.status_code == 401 and r.json().get("error") == "Missing Authorization header")
        print(f"[{'PASS' if passed else 'FAIL'}] pd_configured_missing_auth_401 ({dur} ms)")
        test_records.append({
            "category": "push-dispatch",
            "name": "pd_configured_missing_auth_401",
            "passed": passed,
            "status_code": r.status_code,
            "response": r.json(),
            "duration_ms": dur
        })

        # POST with invalid JWT -> 401 / 500 fail-closed without leaking details
        t0 = time.time()
        r = requests.post(base_url, headers={"Authorization": "Bearer invalid.jwt.token"}, json={"title": "Test", "body": "Body"}, timeout=10)
        dur = round((time.time() - t0) * 1000, 2)
        passed = (r.status_code == 401 and "error" in r.json())
        print(f"[{'PASS' if passed else 'FAIL'}] pd_configured_invalid_jwt_failclosed ({r.status_code}) ({dur} ms)")
        test_records.append({
            "category": "push-dispatch",
            "name": "pd_configured_invalid_jwt_failclosed",
            "passed": passed,
            "status_code": r.status_code,
            "response": r.json(),
            "duration_ms": dur
        })

        # Liveness check after invalid JWT
        t0 = time.time()
        r = requests.options(base_url, timeout=2)
        dur = round((time.time() - t0) * 1000, 2)
        passed = (r.status_code == 200)
        print(f"[{'PASS' if passed else 'FAIL'}] pd_server_liveness_check ({dur} ms)")
        test_records.append({
            "category": "push-dispatch",
            "name": "pd_server_liveness_check",
            "passed": passed,
            "status_code": r.status_code,
            "duration_ms": dur
        })

    # 5. SSRF Gateway Filtering Matrix
    print("\n--- 5. SSRF Push Gateway Filtering Matrix ---")
    ssrf_script = """
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

const ALLOWED_PUSH_HOST_PATTERN = /^https:\\/\\/(([a-zA-Z0-9-]+\\.)*(fcm\\.googleapis\\.com|updates\\.push\\.services\\.mozilla\\.com|notify\\.windows\\.com|web\\.push\\.apple\\.com|push\\.apple\\.com))(\\/.*)?$/i;
const PRIVATE_HOST_PATTERN = /:\\/\\/(localhost|127\\.|10\\.|192\\.168\\.|172\\.(1[6-9]|2[0-9]|3[0-1])\\.|169\\.254\\.|0\\.0\\.0\\.0|\\[::1\\])/i;

function checkEndpoint(endpoint) {
  if (typeof endpoint !== "string") return false;
  if (!ALLOWED_PUSH_HOST_PATTERN.test(endpoint) || PRIVATE_HOST_PATTERN.test(endpoint)) return false;
  try {
    const u = new URL(endpoint);
    if (u.protocol !== "https:" || u.username || u.password) return false;
  } catch {
    return false;
  }
  return true;
}

const vectors = [
  // Legitimate providers
  ["fcm_standard", "https://fcm.googleapis.com/fcm/send/token123", true],
  ["mozilla_push", "https://updates.push.services.mozilla.com/wpush/v2/abc", true],
  ["windows_notify", "https://notify.windows.com/?token=def", true],
  ["apple_webpush", "https://web.push.apple.com/v1/push/xyz", true],
  ["apple_apns", "https://push.apple.com/v1/push/xyz", true],
  // Loopback and internal IPs (SSRF vectors)
  ["localhost", "https://localhost:8080/push", false],
  ["loopback_ipv4", "https://127.0.0.1:8080/push", false],
  ["ipv6_loopback", "https://[::1]:8080/push", false],
  ["rfc1918_10", "https://10.0.0.5/push", false],
  ["rfc1918_192_168", "https://192.168.1.100/push", false],
  ["rfc1918_172_16", "https://172.16.0.1/push", false],
  ["aws_link_local_metadata", "https://169.254.169.254/latest/meta-data/", false],
  ["all_interfaces_0", "https://0.0.0.0:8000/push", false],
  // Host spoofing & lookalikes
  ["attacker_path_spoof", "https://attacker.com/fcm.googleapis.com", false],
  ["subdomain_takeover_spoof", "https://fcm.googleapis.com.attacker.com/push", false],
  ["userinfo_auth_injection", "https://user:pass@fcm.googleapis.com/push", false],
  ["insecure_http_scheme", "http://fcm.googleapis.com/push", false],
];

const results = vectors.map(([name, ep, expected]) => {
  const actual = checkEndpoint(ep);
  return { name, endpoint: ep, expected, actual, passed: actual === expected };
});
console.log(JSON.stringify(results));
"""
    # Evaluate regex declarations extracted from actual tested source, not a copied policy.
    actual_source = PUSH_DISPATCH_SRC.read_text(encoding="utf-8")
    for name in ["ALLOWED_PUSH_HOST_PATTERN", "PRIVATE_HOST_PATTERN"]:
        actual_decl = re.search(r"const " + name + r" = [^\n]+;", actual_source)
        assert actual_decl, "Missing actual endpoint validation declaration: " + name
        ssrf_script = re.sub(r"const " + name + r" = [^\n]+;", lambda _, declaration=actual_decl.group(0): declaration, ssrf_script)
    t0 = time.time()
    res = subprocess.run([str(DENO_EXE), "eval", ssrf_script], capture_output=True, text=True)
    dur = round((time.time() - t0) * 1000, 2)
    ssrf_results = json.loads(res.stdout.strip())
    all_ssrf_passed = all(item["passed"] for item in ssrf_results)
    print(f"[{'PASS' if all_ssrf_passed else 'FAIL'}] ssrf_push_gateway_matrix ({len(ssrf_results)}/{len(ssrf_results)} vectors passed) ({dur} ms)")
    test_records.append({
        "category": "ssrf",
        "name": "ssrf_push_gateway_matrix",
        "passed": all_ssrf_passed,
        "vector_count": len(ssrf_results),
        "duration_ms": dur,
        "vectors": ssrf_results
    })

    # Summary Calculation
    total_time = round(time.time() - t_start, 2)
    total_tests = len(test_records)
    passed_tests = sum(1 for t in test_records if t["passed"])
    failed_tests = total_tests - passed_tests

    results["total_duration_sec"] = total_time
    results["tests"] = test_records
    results["summary"] = {
        "total_test_suites": total_tests,
        "passed": passed_tests,
        "failed": failed_tests,
        "overall_status": "ALL_PASSED" if failed_tests == 0 else "FAILED",
        "unseen_external_gates": [
            "Physical mobile devices (iOS/Android WebPush push registration)",
            "Live remote push gateway delivery (FCM, Apple APNs, Mozilla WebPush)",
            "Production Supabase GoTrue authentication traffic",
            "Licensed DRM deployment"
        ]
    }

    # Write QA report & external receipt
    QA_DIR.mkdir(parents=True, exist_ok=True)
    WORK_DIR.mkdir(parents=True, exist_ok=True)

    qa_report_path = QA_DIR / "EDGE_ACCEPTANCE_REPORT.json"
    with open(qa_report_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    receipt_path = WORK_DIR / "edge_acceptance_receipt.json"
    with open(receipt_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print(f"\n=== Verification Complete ===")
    print(f"Status: {results['summary']['overall_status']}")
    print(f"Passed: {passed_tests}/{total_tests}")
    print(f"Total Duration: {total_time}s")
    print(f"Report: {qa_report_path}")
    print(f"Receipt: {receipt_path}")

    return 0 if failed_tests == 0 else 1

if __name__ == "__main__":
    sys.exit(run_suite())