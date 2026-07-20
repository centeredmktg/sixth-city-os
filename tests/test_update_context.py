from engine.hubspot.client import HubSpotClient
from engine.modules import hubspot_context as hc
from engine.models import Account, Score, RouteDecision, Route


def _live():
    c = HubSpotClient(); c._dry = False; return c


def test_update_context_patches_and_returns_true(monkeypatch):
    c = _live()
    seen = {}
    monkeypatch.setattr(c, "_patch", lambda path, payload: seen.update(path=path, props=payload["properties"]) or {})
    ok = c.update_context("42", {"engine_score": "62", "engine_band": "A"})
    assert ok is True
    assert seen["path"] == "/crm/v3/objects/companies/42"
    assert seen["props"]["engine_band"] == "A"


def test_update_context_dry_writes_nothing(monkeypatch):
    c = HubSpotClient()  # DRY_RUN=1 in conftest -> dry
    monkeypatch.setattr(c, "_patch", lambda *a, **k: (_ for _ in ()).throw(AssertionError("must not write in dry")))
    assert c.update_context("42", {"engine_score": "1"}) is False


def test_update_context_degrades_on_error(monkeypatch):
    c = _live()
    monkeypatch.setattr(c, "_patch", lambda *a, **k: (_ for _ in ()).throw(RuntimeError("boom")))
    assert c.update_context("42", {"engine_score": "1"}) is False


def test_claim_payload_includes_context(monkeypatch):
    c = _live()
    monkeypatch.setattr(c, "find_company_id_by_domain", lambda d: None)
    made = {}
    monkeypatch.setattr(c, "_post", lambda path, payload: made.update(payload["properties"]) or {"id": "9"})
    a = Account(name="Buckeye", domain="buckeye.example")
    a.score = Score(fit=1, timing=1, total=61.6, band="A")
    a.__dict__["discovered_by"] = "clay"
    c.claim_company(a, owner_id="555")
    assert made["engine_score"] == "62" and made["engine_band"] == "A"
