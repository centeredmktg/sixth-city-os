"""
Encrypted storage for reps' Gmail refresh tokens.

A refresh token is long-lived mailbox access, so it's encrypted at rest with Fernet
(symmetric, key = TOKEN_ENC_KEY). Everything degrades to None/False when no key is set
(local/dev without the env) so the rest of the app never crashes — it just can't send.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from engine.config import CONFIG
from engine.db.models import GmailAccountRow


def _fernet():
    """A Fernet from TOKEN_ENC_KEY, or None when unset/invalid (→ send stays disabled)."""
    key = CONFIG.token_enc_key or os.getenv("TOKEN_ENC_KEY", "")
    if not key:
        return None
    try:
        from cryptography.fernet import Fernet
        return Fernet(key.encode() if isinstance(key, str) else key)
    except Exception:
        return None


def encrypt(plaintext: str) -> str | None:
    f = _fernet()
    if f is None or not plaintext:
        return None
    return f.encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str | None:
    f = _fernet()
    if f is None or not ciphertext:
        return None
    try:
        return f.decrypt(ciphertext.encode()).decode()
    except Exception:      # InvalidToken / wrong key / corrupt → no token
        return None


def store_refresh_token(session: Session, email: str, refresh_token: str) -> bool:
    """Encrypt + upsert a rep's refresh token. False when encryption is unavailable
    (no key) or there's nothing to store."""
    enc = encrypt(refresh_token)
    if enc is None:
        return False
    row = session.get(GmailAccountRow, email)
    if row is None:
        session.add(GmailAccountRow(email=email, enc_refresh_token=enc,
                                    created_at=datetime.now(timezone.utc)))
    else:
        row.enc_refresh_token = enc
    session.commit()
    return True


def get_refresh_token(session: Session, email: str) -> str | None:
    """The rep's decrypted refresh token, or None if not connected / undecryptable."""
    row = session.get(GmailAccountRow, email)
    if row is None:
        return None
    return decrypt(row.enc_refresh_token)


def is_connected(session: Session, email: str) -> bool:
    return get_refresh_token(session, email) is not None
