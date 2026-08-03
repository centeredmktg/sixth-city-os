"""The activity endpoint — one screen's worth of 'did we actually do this'."""
from datetime import datetime, timezone

from engine.db.models import AccountRow, MessageRow


def _seed(session):
    session.add(AccountRow(domain="acme.example", name="Acme", claimed=True,
                           claimed_at=datetime(2026, 7, 22, tzinfo=timezone.utc)))
    session.add(MessageRow(company_domain="acme.example", contact_email="jane@acme.example",
                           status="sent", sent_at=datetime(2026, 7, 29, tzinfo=timezone.utc)))
    session.add(AccountRow(domain="quiet.example", name="Quiet", claimed=True,
                           claimed_at=datetime(2026, 7, 20, tzinfo=timezone.utc)))
    session.commit()


def test_defaults_to_touched_companies(client, session):
    _seed(session)
    body = client.get("/api/activity").json()
    assert [c["domain"] for c in body["companies"]] == ["acme.example"]


def test_totals_cover_everything_not_just_the_page(client, session):
    _seed(session)
    body = client.get("/api/activity").json()
    assert body["totals"]["saved"] == 2
    assert body["totals"]["emailed"] == 1


def test_include_widens_the_view(client, session):
    _seed(session)
    body = client.get("/api/activity?include=saved").json()
    assert {c["domain"] for c in body["companies"]} == {"acme.example", "quiet.example"}


def test_limit_caps_companies(client, session):
    _seed(session)
    body = client.get("/api/activity?include=saved&limit=1").json()
    assert len(body["companies"]) == 1
    assert body["count"] == 2


def test_empty_workspace_returns_zeroes_not_an_error(client, session):
    body = client.get("/api/activity").json()
    assert body["companies"] == []
    assert body["totals"]["emailed"] == 0
