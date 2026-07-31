"""Hold/Nurture/Reject persist, clear the card, and never write to a foreign record."""
from engine.db.models import AccountRow, MessageRow
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


def test_pushed_row_is_skipped_not_mutated(client, session, monkeypatch):
    """C1: a stale tab reject on an already-pushed (client-active in HubSpot) row must
    not demote it — /api/decide has to enforce the same exit as /api/push, on its own,
    since it loads rows directly rather than through repo.get_candidates."""
    import web.server as server
    calls = []
    monkeypatch.setattr(server.HubSpotClient, "set_engine_status",
                        lambda self, domain, status: calls.append(domain) or True)
    session.add(AccountRow(domain="buckeye.example", name="buckeye.example",
                           pushed=True, hubspot_id="hs-1"))
    session.commit()

    body = client.post("/api/decide",
                       json={"domains": ["buckeye.example"], "decision": "reject"}).json()
    assert body["decided"] == 0
    assert body["results"][0]["status"] == "skipped"
    assert calls == []   # set_engine_status never called for it

    row = session.get(AccountRow, "buckeye.example")
    assert row.pushed is True
    assert row.route_confirmed is False
    assert row.route_confirmed_route is None


def test_emailed_row_is_skipped_not_mutated(client, session, monkeypatch):
    """C1: same guard for the emailed exit — a sent MessageRow means the row already
    left the finding surface."""
    import web.server as server
    calls = []
    monkeypatch.setattr(server.HubSpotClient, "set_engine_status",
                        lambda self, domain, status: calls.append(domain) or True)
    _account(session, "touched.example")
    session.add(MessageRow(company_domain="touched.example",
                           contact_email="jane@touched.example", status="sent"))
    session.commit()

    body = client.post("/api/decide",
                       json={"domains": ["touched.example"], "decision": "hold"}).json()
    assert body["decided"] == 0
    assert body["results"][0]["status"] == "skipped"
    assert calls == []

    row = session.get(AccountRow, "touched.example")
    assert row.route_confirmed is False


def test_partial_batch_still_decides_the_eligible_row(client, session, monkeypatch):
    """C1: an ineligible row in the same request must not block an eligible one."""
    import web.server as server
    monkeypatch.setattr(server.HubSpotClient, "set_engine_status",
                        lambda self, domain, status: True)
    session.add(AccountRow(domain="pushed.example", name="pushed.example", pushed=True))
    _account(session, "open.example")
    session.commit()

    body = client.post("/api/decide",
                       json={"domains": ["pushed.example", "open.example"],
                             "decision": "hold"}).json()
    assert body["decided"] == 1
    by_domain = {r["domain"]: r for r in body["results"]}
    assert by_domain["pushed.example"]["status"] == "skipped"
    assert by_domain["open.example"]["status"] == "decided"
    assert session.get(AccountRow, "open.example").route_confirmed is True


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
