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
