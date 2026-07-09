"""
Native Gmail send — send AS a connected rep, auto-BCC'ing the HubSpot log address.

Follows intellitext's service-layer shape: the frontend never touches Google; it calls
our API, which calls this. Everything degrades to None (never raises): if send is
disabled, the rep isn't connected, or any call fails, the caller reports "couldn't send"
instead of crashing. Send is GATED by GMAIL_SEND_ENABLED so the feature stays dark until
the gmail.send scope is live in GCP.
"""

from __future__ import annotations

import os

import requests
from sqlalchemy.orm import Session

from engine.config import CONFIG
from engine.gmail import tokens
from engine.gmail.mime import build_raw

_TOKEN_URL = "https://oauth2.googleapis.com/token"
_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"


def send_enabled() -> bool:
    """Flag on, not dry-run, and Google client creds present. Monkeypatchable seam."""
    return (CONFIG.gmail_send_enabled and not CONFIG.dry_run
            and bool(os.getenv("GOOGLE_CLIENT_ID")) and bool(os.getenv("GOOGLE_CLIENT_SECRET")))


def _access_token(refresh_token: str) -> str | None:
    """Exchange a refresh token for a short-lived access token. None on any failure."""
    try:
        r = requests.post(_TOKEN_URL, timeout=20, data={
            "client_id": os.getenv("GOOGLE_CLIENT_ID"),
            "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        })
        if r.ok:
            return r.json().get("access_token")
        print(f"  [gmail] token refresh HTTP {r.status_code}")
    except Exception as e:
        print(f"  [gmail] token refresh failed: {type(e).__name__}")
    return None


def _post_send(access_token: str, raw: str) -> dict | None:
    """POST the message to Gmail. Returns {'id','threadId'} or None."""
    try:
        r = requests.post(_SEND_URL, timeout=30,
                          headers={"Authorization": f"Bearer {access_token}"},
                          json={"raw": raw})
        if r.ok:
            d = r.json()
            return {"id": d.get("id", ""), "threadId": d.get("threadId", "")}
        print(f"  [gmail] send HTTP {r.status_code}")
    except Exception as e:
        print(f"  [gmail] send failed: {type(e).__name__}")
    return None


def send(session: Session, rep_email: str, to_email: str, subject: str, body: str) -> dict | None:
    """Send `subject`/`body` from `rep_email` to `to_email`, auto-BCC'ing the HubSpot log
    address so the engagement logs itself. Returns {'id','threadId'} on success, else None
    (disabled / rep not connected / token or API failure)."""
    if not send_enabled():
        return None
    refresh = tokens.get_refresh_token(session, rep_email)
    if not refresh:
        return None
    access = _access_token(refresh)
    if not access:
        return None
    raw = build_raw(rep_email, to_email, subject, body, bcc=CONFIG.hubspot_bcc_address or None)
    return _post_send(access, raw)
