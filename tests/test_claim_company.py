import pytest
from engine.hubspot.client import HubSpotClient, MACHINE_SOURCED_PROPERTY, ENGINE_STATUS_PROPERTY
from engine.models import Account


def _live_client(monkeypatch):
    c = HubSpotClient()
    c._dry = False  # exercise the real code path with stubbed HTTP
    return c


def test_claim_company_creates_net_new_with_owner_and_status(monkeypatch):
    c = _live_client(monkeypatch)
    monkeypatch.setattr(c, "_find_company_ours", lambda d: (None, False))  # net-new
    captured = {}
    def fake_post(path, payload):
        captured["path"] = path
        captured["props"] = payload["properties"]
        return {"id": "77"}
    monkeypatch.setattr(c, "_post", fake_post)

    a = Account(name="Buckeye", domain="buckeye.example")
    a.__dict__["discovered_by"] = "clay_lookalike"
    new_id = c.claim_company(a, owner_id="555")

    assert new_id == "77"
    assert captured["props"][MACHINE_SOURCED_PROPERTY] == "true"
    assert captured["props"][ENGINE_STATUS_PROPERTY] == "discovered"
    assert captured["props"]["hubspot_owner_id"] == "555"


def test_claim_company_refuses_blank_owner(monkeypatch):
    c = _live_client(monkeypatch)
    a = Account(name="X", domain="x.example")
    with pytest.raises(ValueError):
        c.claim_company(a, owner_id="")


def test_claim_company_existing_and_ours_returns_id_no_write(monkeypatch):
    c = _live_client(monkeypatch)
    monkeypatch.setattr(c, "_find_company_ours", lambda d: ("42", True))  # our own prior claim
    def boom(path, payload):
        raise AssertionError("must not write when re-adopting our own existing claim")
    monkeypatch.setattr(c, "_post", boom)
    a = Account(name="X", domain="x.example")
    assert c.claim_company(a, owner_id="555") == "42"


def test_claim_company_existing_and_johns_returns_none_no_write(monkeypatch):
    c = _live_client(monkeypatch)
    monkeypatch.setattr(c, "_find_company_ours", lambda d: ("99", False))  # John's pre-existing record
    def boom(path, payload):
        raise AssertionError("must not claim/write onto John's pre-existing book")
    monkeypatch.setattr(c, "_post", boom)
    a = Account(name="X", domain="x.example")
    assert c.claim_company(a, owner_id="555") is None
