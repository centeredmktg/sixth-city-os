"""Native Gmail send: gated + degrading. Network seams (_access_token/_post_send) are
monkeypatched so no test ever hits Google."""
from cryptography.fernet import Fernet

from engine.gmail import send as gs
from engine.gmail import tokens


def _connect(session, monkeypatch, email="rep@sixthcity.com"):
    monkeypatch.setenv("TOKEN_ENC_KEY", Fernet.generate_key().decode())
    tokens.store_refresh_token(session, email, "rt-123")


def test_send_disabled_returns_none(session):
    # Default: flag off + conftest's DRY_RUN=1 → disabled, no send.
    assert gs.send(session, "rep@sixthcity.com", "j@a.com", "S", "B") is None


def test_send_none_when_rep_not_connected(session, monkeypatch):
    monkeypatch.setattr(gs, "send_enabled", lambda: True)
    assert gs.send(session, "rep@sixthcity.com", "j@a.com", "S", "B") is None


def test_send_success_returns_ids(session, monkeypatch):
    _connect(session, monkeypatch)
    monkeypatch.setattr(gs, "send_enabled", lambda: True)
    monkeypatch.setattr(gs, "_access_token", lambda rt: "access-123")
    monkeypatch.setattr(gs, "_post_send", lambda access, raw: {"id": "m1", "threadId": "t1"})
    assert gs.send(session, "rep@sixthcity.com", "jane@acme.com", "Hi", "Body") == {"id": "m1", "threadId": "t1"}


def test_send_degrades_on_api_failure(session, monkeypatch):
    _connect(session, monkeypatch)
    monkeypatch.setattr(gs, "send_enabled", lambda: True)
    monkeypatch.setattr(gs, "_access_token", lambda rt: "a")
    monkeypatch.setattr(gs, "_post_send", lambda access, raw: None)   # Gmail API errored
    assert gs.send(session, "rep@sixthcity.com", "j@a.com", "S", "B") is None
