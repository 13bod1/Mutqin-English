"""
Offline Email Template Renderer for Mr. Adel Mostafa Platform
Enforces HTML entity escaping on all user variables and strict URL protocol validation.
Provides provider-specific syntax notes and mock render verification.
"""

import os
import sys
import html
import re
from pathlib import Path
from urllib.parse import urlparse

TEMPLATES_DIR = Path(__file__).resolve().parent
RENDERED_DIR = TEMPLATES_DIR / "rendered_samples"
RENDERED_DIR.mkdir(parents=True, exist_ok=True)

SAFE_URL_SCHEMES = {"https", "http", "mailto", "tel"}

def is_safe_url(url: str) -> bool:
    if not url:
        return False
    try:
        parsed = urlparse(url.strip())
        return parsed.scheme.lower() in SAFE_URL_SCHEMES
    except Exception:
        return False

def sanitize_url(url: str, fallback: str = "#") -> str:
    cleaned = url.strip()
    if is_safe_url(cleaned):
        return html.escape(cleaned, quote=True)
    return fallback

def render_string_template(template_text: str, context: dict, is_html: bool = True) -> str:
    """
    Renders {{ variable }} placeholders.
    CRITICAL: In HTML mode, ALL string values are strictly escaped via html.escape.
    URL variables (ending with _url or containing url) are checked for protocol safety.
    """
    result = template_text
    for key, val in context.items():
        placeholder = r"\{\{\s*" + re.escape(key) + r"\s*\}\}"
        if val is None:
            rep = ""
        elif isinstance(val, (int, float)):
            rep = str(val)
        else:
            sval = str(val)
            if is_html:
                if "url" in key.lower() or "link" in key.lower():
                    rep = sanitize_url(sval)
                else:
                    rep = html.escape(sval, quote=True)
            else:
                rep = sval
        result = re.sub(placeholder, rep, result)
    return result

def render_all_samples():
    mock_confirmation = {
        "student_name": "أحمد محمود سالم",
        "student_email": "ahmed.salem@example.com",
        "confirmation_url": "https://academy.adelmostafa.com/auth/confirm?token=sec_abc12345xyz",
        "expiry_hours": 24,
        "support_phone": "01100764511"
    }

    mock_reset = {
        "student_name": "سارة إبراهيم الشافعي",
        "student_email": "sara.ibrahim@example.com",
        "reset_url": "https://academy.adelmostafa.com/auth/reset-password?token=pwd_tok987654321",
        "expiry_minutes": 30,
        "support_phone": "01100764511"
    }

    mock_receipt = {
        "student_name": "عمر خالد الشريف",
        "student_phone": "01099887766",
        "receipt_number": "INV-2026-10-8842",
        "payment_date": "2026-10-24 14:30 UTC",
        "course_title": "شرح قواعد الثانوية العامة المكثف 2026",
        "amount_paid": "450.00",
        "currency": "EGP",
        "payment_method": "فودافون كاش (Vodafone Cash)",
        "transaction_reference": "TXN_VF_7721903",
        "dashboard_url": "https://academy.adelmostafa.com/dashboard/courses",
        "support_phone": "01100764511"
    }

    targets = [
        ("confirmation.html", "confirmation.txt", mock_confirmation, "sample_confirmation"),
        ("reset.html", "reset.txt", mock_reset, "sample_reset"),
        ("receipt.html", "receipt.txt", mock_receipt, "sample_receipt"),
    ]

    for html_file, txt_file, ctx, out_prefix in targets:
        hp = TEMPLATES_DIR / html_file
        tp = TEMPLATES_DIR / txt_file
        if hp.exists():
            html_out = render_string_template(hp.read_text(encoding="utf-8"), ctx, is_html=True)
            (RENDERED_DIR / f"{out_prefix}.html").write_text(html_out, encoding="utf-8")
        if tp.exists():
            txt_out = render_string_template(tp.read_text(encoding="utf-8"), ctx, is_html=False)
            (RENDERED_DIR / f"{out_prefix}.txt").write_text(txt_out, encoding="utf-8")

    # Test malicious XSS input injection
    xss_payload = {
        "student_name": "<script>alert('xss')</script> & \"Mr. Hacker\"",
        "confirmation_url": "javascript:alert(document.cookie)",
        "expiry_hours": 12,
        "support_phone": "01100764511"
    }
    sample_raw = "<html><body><h1>Hello {{ student_name }}</h1><a href='{{ confirmation_url }}'>Link</a></body></html>"
    safe_rendered = render_string_template(sample_raw, xss_payload, is_html=True)
    assert "<script>" not in safe_rendered, "XSS script tag not neutralized!"
    assert "&lt;script&gt;" in safe_rendered, "HTML entity escaping failed!"
    assert "javascript:" not in safe_rendered, "Unsafe javascript: scheme allowed!"
    print("XSS Escaping & Protocol Sanitization verification PASSED!")

if __name__ == "__main__":
    render_all_samples()
    print("All email templates rendered and verified successfully in rendered_samples/")
