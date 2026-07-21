"""Test sync-context API endpoints."""
from engine.db.models import AccountRow


def test_pending_and_run(client, session):
    session.add(AccountRow(domain="a.example", name="A", claimed=True, hubspot_id="111",
                           total=90, band="A", context_hash="STALE"))
    session.commit()
    assert client.get("/api/sync-context/pending").json()["pending"] == 1
    # dry HubSpot (conftest DRY_RUN=1) -> update_context returns False -> synced 0, still pending
    body = client.post("/api/sync-context").json()
    assert "synced" in body and "remaining" in body
