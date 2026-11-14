#!/usr/bin/env python3
"""
Sprint 3 Internal UAT Walkthrough Runner
Serves built Angular SPA (dist/mutqin-english/browser) on an ephemeral local HTTP port
and runs Playwright browser automation (browser_walkthrough.cjs) to capture actual UI evidence.
Boundary: Agent Internal Walkthrough Only — Not human PO sign-off.
"""
import os
import sys
import json
import shutil
import functools
import threading
import subprocess
import http.server
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[2]
DIST_DIR = REPO_ROOT / "dist" / "mutqin-english" / "browser"
SCRIPT_CJS = HERE / "browser_walkthrough.cjs"

if not DIST_DIR.exists():
    print(f"Error: Dist directory not found at {DIST_DIR}", file=sys.stderr)
    sys.exit(1)

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        p = Path(self.translate_path(self.path))
        if not p.is_file() and not p.suffix:
            self.path = '/index.html'
        return super().send_head()
    def log_message(self, *args):
        pass

def main():
    print(f"[UAT] Serving {DIST_DIR} on ephemeral local port...")
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(SPAHandler, directory=str(DIST_DIR)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    port = server.server_port
    base_url = f"http://127.0.0.1:{port}"
    print(f"[UAT] Server active at {base_url}")

    try:
        node_bin = shutil.which("node")
        if not node_bin:
            print("Error: node binary not found in PATH", file=sys.stderr)
            sys.exit(1)

        cmd = [node_bin, str(SCRIPT_CJS), base_url, str(HERE)]
        print(f"[UAT] Executing Playwright walkthrough: {' '.join(cmd)}")
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
        print("[UAT] Playwright stdout:", res.stdout.strip())
        if res.stderr:
            print("[UAT] Playwright stderr:", res.stderr.strip(), file=sys.stderr)

        if res.returncode == 0:
            print("[UAT] Walkthrough executed successfully. Receipt generated at capture_receipt.json")
        else:
            print(f"[UAT] Walkthrough failed with return code {res.returncode}", file=sys.stderr)
            sys.exit(res.returncode)
    finally:
        server.shutdown()
        server.server_close()
        print("[UAT] Server terminated.")

if __name__ == "__main__":
    main()
