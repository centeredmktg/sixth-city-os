"""Hold/Nurture/Reject persist, clear the card, and never write to a foreign record."""
from engine.db.models import AccountRow
from engine.db import repo


def _account(session, domain):
    session.add(AccountRow(domain=domain, name=domain))
    session.commit()


def test_decide_persists_and_clears_the_card(client, session, monkeypatch):
    import web.server as server
    monkeypatch.setattr(server.HubSpotClient, "set_engine_status",
                        lambda self, domain, status: True)
    _account(session, "buckeye.example")

    r = client.post("/api/decide",
                    json={"domains": ["buckeye.example"], "decision": "hold"})
    assert r.status_code == 200
    body = r.json()
    assert body["decided"] == 1
    assert body["results"][0]["status"] == "decided"
    assert body["results"][0]["hubspot_synced"] is True

    row = session.get(AccountRow, "buckeye.example")
    assert row.route_confirmed is True
    assert row.route_confirmed_route == "hold"
    assert row.route_confirmed_by == "operator"
    assert row.decided_at is not None
    assert repo.get_candidates(session) == []


def test_decision_survives_a_reload(client, session, monkeypatch):
    """The defect that motivated this work: the click used to live only in React state."""
    import web.server as server
    monkeypatch.setattr(server.HubSpotClient, "set_engine_status",
                        lambda self, domain, status: True)
    _account(session, "buckeye.example")
    client.post("/api/decide", json={"domains": ["buckeye.example"], "decision": "nurture"})

    shown = {c["domain"] for c in client.get("/api/candidates").json()["candidates"]}
    assert "buckeye.example" not in shown


def test_reject_maps_to_the_rejected_option(client, session, monkeypatch):
    import web.server as server
    seen = {}
    monkeypatch.setattr(server.HubSpotClient, "set_engine_status",
                        lambda self, domain, status: seen.setdefault(domain, status) or True)
    _account(session, "buckeye.example")
    client.post("/api/decide", json={"domains": ["buckeye.example"], "decision": "reject"})
    assert seen["buckeye.example"] == "rejected"


def test_hubspot_failure_still_persists_the_decision(client, session, monkeypatch):
    """A HubSpot outage must not block the operator from clearing their board."""
    import web.server as server
    monkeypatch.setattr(server.HubSpotClient, "set_engine_status",
                        lambda self, domain, status: False)
    _account(session, "buckeye.example")

    body = client.post("/api/decide",
                       json={"domains": ["buckeye.example"], "decision": "hold"}).json()
    assert body["results"][0]["status"] == "decided"
    assert body["results"][0]["hubspot_synced"] is False
    assert session.get(AccountRow, "buckeye.example").route_confirmed is True


def test_unknown_domain_reports_not_found(client, session):
    body = client.post("/api/decide",
                       json={"domains": ["ghost.example"], "decision": "hold"}).json()
    assert body["decided"] == 0
    assert body["results"][0]["status"] == "not_found"


def test_unknown_decision_is_rejected(client, session):
    assert client.post("/api/decide",
                       json={"domains": ["x.example"], "decision": "banana"}).status_code == 400


def test_closer_is_not_a_decision(client, session):
    """LFG goes through /api/push — it's a promote, not a decide."""
    assert client.post("/api/decide",
                       json={"domains": ["x.example"], "decision": "closer"}).status_code == 400


def test_undecide_returns_the_firm_to_triage(client, session, monkeypatch):
    import web.server as server
    monkeypatch.setattr(server.HubSpotClient, "set_engine_status",
                        lambda self, domain, status: True)
    _account(session, "buckeye.example")
    client.post("/api/decide", json={"domains": ["buckeye.example"], "decision": "hold"})

    body = client.post("/api/undecide", json={"domains": ["buckeye.example"]}).json()
    assert body["undecided"] == 1

    row = session.get(AccountRow, "buckeye.example")
    assert row.route_confirmed is False
    assert row.decided_at is None
    assert row.route_confirmed_by == ""  # undo must clear attribution, not just the route
    assert {a.domain for a in repo.get_candidates(session)} == {"buckeye.example"}
