"""Test the owner config API endpoints."""


def test_owner_config_roundtrip(client):
    """GET returns None initially; PUT saves; GET returns saved value."""
    assert client.get("/api/owner-config").json()["default_owner_id"] is None
    r = client.put("/api/owner-config", json={"owner_id": "555"})
    assert r.status_code == 200
    assert r.json()["default_owner_id"] == "555"
    assert client.get("/api/owner-config").json()["default_owner_id"] == "555"


def test_owner_config_rejects_blank(client):
    """PUT with blank owner_id returns 400."""
    r = client.put("/api/owner-config", json={"owner_id": ""})
    assert r.status_code == 400


def test_owners_list_dry_is_empty(client):
    """DRY_RUN=1 in conftest -> HubSpot dry -> empty owners list, no crash."""
    assert client.get("/api/owners").json() == {"owners": []}
