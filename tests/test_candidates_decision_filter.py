"""Decided firms are reachable by filter — they feed the Activity screen."""
from engine.db.models import AccountRow


def _decided(session, domain, route):
    from datetime import datetime, timezone
    session.add(AccountRow(domain=domain, name=domain, route_confirmed=True,
                           route_confirmed_route=route,
                           decided_at=datetime(2026, 7, 29, tzinfo=timezone.utc)))
    session.commit()


def test_no_param_returns_only_undecided(client, session):
    session.add(AccountRow(domain="open.example", name="Open"))
    session.commit()
    _decided(session, "held.example", "hold")
    shown = {c["domain"] for c in client.get("/api/candidates").json()["candidates"]}
    assert shown == {"open.example"}


def test_filter_returns_only_that_decision(client, session):
    _decided(session, "held.example", "hold")
    _decided(session, "nurtured.example", "nurture")
    body = client.get("/api/candidates?decision=hold").json()
    assert {c["domain"] for c in body["candidates"]} == {"held.example"}


def test_filtered_rows_carry_decided_at(client, session):
    _decided(session, "held.example", "hold")
    row = client.get("/api/candidates?decision=hold").json()["candidates"][0]
    assert row["decided_at"].startswith("2026-07-29")


def test_unknown_decision_is_rejected(client, session):
    assert client.get("/api/candidates?decision=banana").status_code == 400
