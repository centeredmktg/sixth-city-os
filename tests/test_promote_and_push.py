from engine.hubspot.client import HubSpotClient, ENGINE_STATUS_PROPERTY
from engine.models import Account


def _live():
    c = HubSpotClient(); c._dry = False; return c


def test_promote_sets_working_on_existing_ours(monkeypatch):
    c = _live()
    monkeypatch.setattr(c, "find_company_id_by_domain", lambda d: "42")
    patched = {}
    monkeypatch.setattr(c, "_request",
                        lambda m, p, payload: patched.update(method=m, path=p, props=payload["properties"]) or {"id": "42"})
    a = Account(name="Buckeye", domain="buckeye.example")
    assert c.promote_to_working(a, owner_id="555") == "42"
    assert patched["method"] == "patch"
    assert patched["props"][ENGINE_STATUS_PROPERTY] == "working"


def test_promote_claims_when_not_yet_in_crm(monkeypatch):
    c = _live()
    monkeypatch.setattr(c, "find_company_id_by_domain", lambda d: None)
    made = {}
    def fake_post(path, payload):
        made["props"] = payload["properties"]; return {"id": "88"}
    monkeypatch.setattr(c, "_post", fake_post)
    a = Account(name="X", domain="x.example")
    a.__dict__["discovered_by"] = "clay"
    assert c.promote_to_working(a, owner_id="555") == "88"
    assert made["props"][ENGINE_STATUS_PROPERTY] == "working"
    assert made["props"]["hubspot_owner_id"] == "555"
