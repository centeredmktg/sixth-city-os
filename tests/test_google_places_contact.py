"""lookup_contact: company phone/address from Places, dry-safe + match-gated."""
from types import SimpleNamespace

import engine.sources.google_places as gp


def _key(monkeypatch, value):
    # CONFIG is a frozen dataclass; rebind the module ref to a stub (lookup_contact only
    # reads google_places_key, and the network fetchers are monkeypatched per-test).
    monkeypatch.setattr(gp, "CONFIG", SimpleNamespace(google_places_key=value))


def test_dry_returns_none(monkeypatch):
    _key(monkeypatch, "")
    assert gp.lookup_contact("Acme", "Cleveland", "OH", "acme.com") is None


def test_match_returns_phone_and_address(monkeypatch):
    _key(monkeypatch, "KEY")
    monkeypatch.setattr(gp, "find_place_id", lambda q: "pid1")
    monkeypatch.setattr(gp, "place_details", lambda pid: {
        "nationalPhoneNumber": "(216) 555-0100",
        "formattedAddress": "1 Main St, Cleveland, OH",
        "websiteUri": "https://acme.com",
    })
    monkeypatch.setattr(gp, "_match_ok", lambda d, n, listing: True)
    got = gp.lookup_contact("Acme", "Cleveland", "OH", "acme.com")
    assert got == {"phone": "(216) 555-0100", "address": "1 Main St, Cleveland, OH"}


def test_wrong_domain_match_returns_none(monkeypatch):
    _key(monkeypatch, "KEY")
    monkeypatch.setattr(gp, "find_place_id", lambda q: "pid1")
    monkeypatch.setattr(gp, "place_details", lambda pid: {"nationalPhoneNumber": "x"})
    monkeypatch.setattr(gp, "_match_ok", lambda d, n, listing: False)
    assert gp.lookup_contact("Acme", "Cleveland", "OH", "acme.com") is None


def test_network_error_returns_none(monkeypatch):
    import requests
    _key(monkeypatch, "KEY")
    def boom(q): raise requests.RequestException("down")
    monkeypatch.setattr(gp, "find_place_id", boom)
    assert gp.lookup_contact("Acme", "Cleveland", "OH", "acme.com") is None
