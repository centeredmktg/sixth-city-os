import requests

import engine.sources.google_places as gp
from engine.models import Account, SignalKind


def _acct():
    return Account(name="Acme Fab", domain="acmefab.com", city="Cleveland", state="OH")


def test_dry_mode_returns_no_signals_and_makes_no_calls(monkeypatch):
    src = gp.GooglePlacesSource()
    src._dry = True
    called = {"n": 0}
    monkeypatch.setattr(gp, "find_place_id", lambda q: called.__setitem__("n", called["n"] + 1))
    out = src.enrich(_acct())
    assert out == [] and called["n"] == 0


def test_enrich_stashes_contact_and_emits_no_signal_for_strong_gbp(monkeypatch):
    src = gp.GooglePlacesSource()
    src._dry = False
    monkeypatch.setattr(gp, "find_place_id", lambda q: "PLACE1")
    monkeypatch.setattr(gp, "place_details", lambda pid: {
        "nationalPhoneNumber": "(216) 555-1234", "formattedAddress": "1 Main St, Cleveland OH",
        "rating": 4.8, "userRatingCount": 90, "websiteUri": "https://www.acmefab.com",
        "displayName": {"text": "Acme Fab"}})
    acct = _acct()
    out = src.enrich(acct)
    assert acct.extra["places_phone"] == "(216) 555-1234"
    assert acct.extra["places_address"] == "1 Main St, Cleveland OH"
    assert out == []          # strong GBP -> no gap signal


def test_enrich_wrong_domain_match_attaches_no_contact_and_strong_gap(monkeypatch):
    src = gp.GooglePlacesSource()
    src._dry = False
    monkeypatch.setattr(gp, "find_place_id", lambda q: "PLACE1")
    monkeypatch.setattr(gp, "place_details", lambda pid: {
        "nationalPhoneNumber": "(800) 555-0000", "websiteUri": "https://someoneelse.com",
        "displayName": {"text": "Other Co"}})
    acct = _acct()
    out = src.enrich(acct)
    assert "places_phone" not in acct.extra            # never attach a stranger's line
    assert len(out) == 1 and out[0].kind == SignalKind.LOCAL_SEO_GAP and out[0].value == 1.0


def test_enrich_no_listing_found_emits_strong_gap(monkeypatch):
    src = gp.GooglePlacesSource()
    src._dry = False
    monkeypatch.setattr(gp, "find_place_id", lambda q: None)
    out = src.enrich(_acct())
    assert len(out) == 1 and out[0].value == 1.0


def test_enrich_swallows_network_error_returns_empty(monkeypatch):
    src = gp.GooglePlacesSource()
    src._dry = False

    def boom(q):
        raise requests.ConnectionError("net down")

    monkeypatch.setattr(gp, "find_place_id", boom)
    assert src.enrich(_acct()) == []   # network failure -> skip, no crash
