"""The allowlist is the security boundary — only verified emails on the Sixth City
domain (or explicit extras) get in. Pure-function tests; defaults come from env
(ALLOWED_EMAIL_DOMAINS=sixthcitymarketing.com, ALLOWED_EMAILS=dcox@centeredmktg.com)."""
from web.auth import is_allowed


def test_allows_workspace_domain():
    assert is_allowed("john@sixthcitymarketing.com") is True
    assert is_allowed("JOHN@SixthCityMarketing.com") is True   # case-insensitive


def test_allows_explicit_extra_email():
    assert is_allowed("dcox@centeredmktg.com") is True


def test_rejects_outsiders_and_junk():
    assert is_allowed("someone@gmail.com") is False
    assert is_allowed("attacker@sixthcitymarketing.com.evil.com") is False
    assert is_allowed("") is False
    assert is_allowed("notanemail") is False
    assert is_allowed(None) is False


# --- gmail.send scope gating + token capture (native send) -------------------
def test_google_scope_excludes_gmail_by_default(monkeypatch):
    monkeypatch.delenv("GMAIL_SEND_ENABLED", raising=False)
    from web import auth
    assert "gmail.send" not in auth._google_scope()


def test_google_scope_includes_gmail_when_enabled(monkeypatch):
    monkeypatch.setenv("GMAIL_SEND_ENABLED", "1")
    from web import auth
    assert "gmail.send" in auth._google_scope()


def test_store_gmail_refresh_noop_when_disabled(monkeypatch):
    monkeypatch.delenv("GMAIL_SEND_ENABLED", raising=False)
    from web import auth
    assert auth._store_gmail_refresh("rep@sixthcity.com", {"refresh_token": "rt"}) is False


def test_store_gmail_refresh_noop_without_token(monkeypatch):
    monkeypatch.setenv("GMAIL_SEND_ENABLED", "1")
    from web import auth
    auth.set_session_factory(None)   # enabled, but nothing to store / no factory
    assert auth._store_gmail_refresh("rep@sixthcity.com", {}) is False
