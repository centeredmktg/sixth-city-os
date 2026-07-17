import pytest
from engine.hubspot.client import HubSpotClient, MACHINE_SOURCED_PROPERTY, ENGINE_STATUS_PROPERTY
from engine.models import Account


def _live_client(monkeypatch):
    c = HubSpotClient()
    c._dry = False  # exercise the real code path with stubbed HTTP
    return c


def test_claim_company_creates_net_new_with_owner_and_status(monkeypatch):
    c = _live_client(monkeypatch)
    monkeypatch.setattr(c, "find_company_id_by_domain", lambda d: None)  # net-new
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


def test_claim_company_never_claims_existing_book(monkeypatch):
    c = _live_client(monkeypatch)
    monkeypatch.setattr(c, "find_company_id_by_domain", lambda d: "999")  # already in book
    def boom(path, payload):
        raise AssertionError("must not create when the domain already exists")
    monkeypatch.setattr(c, "_post", boom)
    a = Account(name="X", domain="x.example")
    assert c.claim_company(a, owner_id="555") == "999"
