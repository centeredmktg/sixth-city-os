"""
Pure MIME builder for the Gmail send API.

`build_raw(...)` produces the base64url-encoded RFC-2822 message the Gmail
`users.messages.send` endpoint wants (as `{"raw": ...}`). No network, no side effects —
so the message assembly (headers, the auto-BCC to HubSpot) is unit-testable without
mocking the SDK.
"""

from __future__ import annotations

import base64
from email.mime.text import MIMEText


def build_raw(from_email: str, to_email: str, subject: str, body: str,
              bcc: str | None = None) -> str:
    """base64url of a plain-text email. `bcc` (the HubSpot log address) is included only
    when non-empty, so an unset BCC just sends without CRM logging rather than breaking."""
    msg = MIMEText(body or "", "plain", "utf-8")
    msg["From"] = from_email
    msg["To"] = to_email
    msg["Subject"] = subject or ""
    if bcc:
        msg["Bcc"] = bcc
    return base64.urlsafe_b64encode(msg.as_bytes()).decode()
