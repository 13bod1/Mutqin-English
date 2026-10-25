"""Offline, strict email samples for Mr. Adel Mostafa. No delivery credentials."""
import html
import re
from pathlib import Path
from urllib.parse import urlparse

TEMPLATES_DIR = Path(__file__).resolve().parent
RENDERED_DIR = TEMPLATES_DIR / "rendered_samples"
SAFE_URL_SCHEMES = {"https", "http", "mailto", "tel"}
TOKEN = re.compile(r"\{\{\s*(\w+)\s*\}\}")

def is_safe_url(url: str) -> bool:
    if not isinstance(url, str) or not url or any(ord(c) < 32 for c in url) or "\\" in url:
        return False
    try:
        parsed = urlparse(url.strip())
        if parsed.scheme.lower() in {"https", "http"}:
            return bool(parsed.hostname) and not parsed.username and not parsed.password
        return parsed.scheme.lower() in {"mailto", "tel"} and bool(parsed.path)
    except (ValueError, TypeError):
        return False

def sanitize_url(url: str, fallback: str = "#") -> str:
    return html.escape(url.strip(), quote=True) if is_safe_url(url) else fallback

def render_string_template(template_text: str, context: dict, is_html: bool = True) -> str:
    """One substitution pass: inserted user data is never evaluated as a template."""
    missing = sorted(set(TOKEN.findall(template_text)) - set(context))
    if missing:
        raise ValueError("Missing required email variables: " + ", ".join(missing))
    def replace(match):
        key = match.group(1)
        value = "" if context[key] is None else str(context[key])
        if "url" in key.lower() or "link" in key.lower():
            value = value.strip() if is_safe_url(value) else "#"
        return html.escape(value, quote=True) if is_html else value
    return TOKEN.sub(replace, template_text)

def render_all_samples():
    """Synthetic samples only: example.invalid is deliberately not a live academy."""
    RENDERED_DIR.mkdir(parents=True, exist_ok=True)
    common = {"student_name": "طالب تجريبي / Demo Student", "support_email": "support@example.invalid",
              "support_phone": "[demo support number]", "year": "2026"}
    contexts = {
        "confirmation": {**common, "otp_code": "123456", "expiry_minutes": 15,
                         "confirmation_url": "https://example.invalid/confirm?demo=1"},
        "reset": {**common, "otp_code": "654321", "expiry_minutes": 30,
                  "reset_url": "https://example.invalid/reset?demo=1"},
        "receipt": {**common, "order_reference": "DEMO-ORDER-001", "transaction_date": "2026-10-25 12:00 Africa/Cairo",
                    "course_title": "Demo English lecture", "amount_egp": "450.00", "payment_method": "Sandbox only",
                    "lecture_access_url": "https://example.invalid/lectures/demo"},
    }
    outputs = []
    for name, context in contexts.items():
        for extension in ("html", "txt"):
            source = (TEMPLATES_DIR / (name + "." + extension)).read_text(encoding="utf-8")
            rendered = render_string_template(source, context, is_html=extension == "html")
            if TOKEN.search(rendered):
                raise ValueError("Unresolved variable in rendered sample " + name + "." + extension)
            destination = RENDERED_DIR / ("sample_" + name + "." + extension)
            destination.write_text(rendered, encoding="utf-8")
            outputs.append(destination.name)
    attack = render_string_template('<h1>{{student_name}}</h1><a href="{{confirmation_url}}">x</a>',
                                    {"student_name": "<script>alert(1)</script>", "confirmation_url": "javascript:alert(1)"})
    assert "<script>" not in attack and "&lt;script&gt;" in attack and "javascript:" not in attack
    for url in ["javascript:alert(1)", "data:text/html,x", "https://", "/\\evil.example", "https://user:pass@example.invalid/"]:
        assert not is_safe_url(url), url
    assert is_safe_url("https://example.invalid/path?a=1&b=2")
    try:
        render_string_template("{{missing}}", {})
    except ValueError:
        pass
    else:
        raise AssertionError("Required variables must not be silently left unresolved")
    # A template-looking string in user input is data, not a second evaluation pass.
    assert render_string_template("{{student_name}}", {"student_name": "{{year}}", "year": "2026"}) == "{{year}}"
    print("EMAIL_RENDERING_VERIFIED: 6 outputs; zero missing variables; escaping and safe URL cases passed")
    return outputs

if __name__ == "__main__":
    render_all_samples()
# End of the strict offline sample renderer.
