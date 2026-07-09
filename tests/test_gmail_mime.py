"""The Gmail MIME builder — correct headers, auto-BCC, base64url round-trip."""
import base64
import email

from engine.gmail.mime import build_raw


def _decode(raw: str):
    return email.message_from_bytes(base64.urlsafe_b64decode(raw))


def test_headers_and_bcc_present():
    msg = _decode(build_raw("rep@sixthcity.com", "jane@acme.com", "Hi Jane", "Body text",
                            bcc="3358054@bcc.hubspot.com"))
    assert msg["From"] == "rep@sixthcity.com"
    assert msg["To"] == "jane@acme.com"
    assert msg["Subject"] == "Hi Jane"
    assert msg["Bcc"] == "3358054@bcc.hubspot.com"   # HubSpot auto-logging
    assert "Body text" in msg.get_payload(decode=True).decode()


def test_bcc_omitted_when_absent():
    msg = _decode(build_raw("r@x.com", "j@a.com", "S", "B"))
    assert msg["Bcc"] is None                        # unset BCC → send without CRM log
