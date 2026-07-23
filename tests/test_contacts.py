"""Pursue flow: find/store contacts on a company, list them, flag it pursued."""
import io
from engine.models import Contact

CSV = ("company,domain,vertical,city,pagespeed_mobile,ads_active\n"
       "Buckeye Industrial,buckeye.example,industrial_manufacturing,Cleveland,34,3\n")


def test_pursue_stores_lists_and_flags(client, monkeypatch):
    client.post("/api/ingest", files={"file": ("c.csv", io.BytesIO(CSV.encode()), "text/csv")})
    monkeypatch.setattr(
        "engine.apollo.client.ApolloClient.find_contacts",
        lambda self, domain, limit=5: [
            Contact(name="Jane Doe", company_domain=domain, title="CMO", email="jane@" + domain)],
    )
    # Pursue now also scrapes the homepage — stub it so the test stays hermetic (no DNS).
    monkeypatch.setattr("engine.sources.site_audit.fetch", lambda d, **k: ("", {}))
    r = client.post("/api/pursue", json={"domains": ["buckeye.example"]})
    assert r.status_code == 200
    assert r.json()["pursued"][0]["contacts_found"] == 1

    g = client.get("/api/contacts?domain=buckeye.example").json()
    assert g["contacts"][0]["name"] == "Jane Doe" and g["contacts"][0]["title"] == "CMO"

    cands = {c["domain"]: c for c in client.get("/api/candidates").json()["candidates"]}
    assert cands["buckeye.example"]["pursued"] is True


def test_contact_hubspot_id_roundtrips(session):
    # Contact is now first-class with a HubSpot id (nullable) so the person syncs to CRM.
    from engine.db import repo
    from engine.models import Account, Contact, Vertical
    repo.upsert_accounts(session, [Account(name="Acme", domain="acme.com", vertical=Vertical.UNKNOWN)])
    repo.store_contacts(session, "acme.com", [
        Contact(name="Jane", company_domain="acme.com", email="jane@acme.com", hubspot_id="55"),
    ])
    got = repo.get_contacts(session, "acme.com")
    assert len(got) == 1 and got[0].hubspot_id == "55"


def test_pursue_merges_scraped_inbox_and_phone(client, monkeypatch):
    client.post("/api/ingest", files={"file": ("c.csv", io.BytesIO(CSV.encode()), "text/csv")})
    # Apollo returns nothing (thin SMB coverage); the free scrape carries the pursue.
    monkeypatch.setattr("engine.apollo.client.ApolloClient.find_contacts",
                        lambda self, domain, limit=5: [])
    monkeypatch.setattr("engine.sources.site_audit.fetch",
                        lambda d, **k: ("email info@buckeye.example call (216) 555-0100", {}))
    r = client.post("/api/pursue", json={"domains": ["buckeye.example"]})
    row = r.json()["pursued"][0]
    assert any(c["email"] == "info@buckeye.example" for c in row["contacts"])
    assert row["general_phone"] == "(216) 555-0100" and row["phone_source"] == "site"

    g = client.get("/api/contacts?domain=buckeye.example").json()
    assert g["general_phone"] == "(216) 555-0100" and g["phone_source"] == "site"


def test_pursue_phone_only_promotes(client, monkeypatch):
    client.post("/api/ingest", files={"file": ("c.csv", io.BytesIO(CSV.encode()), "text/csv")})
    monkeypatch.setattr("engine.apollo.client.ApolloClient.find_contacts",
                        lambda self, domain, limit=5: [])
    monkeypatch.setattr("engine.sources.site_audit.fetch", lambda d, **k: ("nothing", {}))
    monkeypatch.setattr("engine.sources.google_places.lookup_contact",
                        lambda name, city, state, domain: {"phone": "(216) 555-1200", "address": "1 Main"})
    r = client.post("/api/pursue", json={"domains": ["buckeye.example"]})
    row = r.json()["pursued"][0]
    assert row["contacts"] == [] and row["general_phone"] == "(216) 555-1200"
    assert row["phone_source"] == "places" and row["general_address"] == "1 Main"


def test_pursue_survives_apollo_error(client, monkeypatch):
    # Configured Apollo raising (429/timeout) must not 500 /api/pursue — the scrape tier
    # still delivers a phone and the endpoint returns 200.
    import requests
    client.post("/api/ingest", files={"file": ("c.csv", io.BytesIO(CSV.encode()), "text/csv")})
    def boom(self, domain, limit=5):
        raise requests.RequestException("429")
    monkeypatch.setattr("engine.apollo.client.ApolloClient.find_contacts", boom)
    monkeypatch.setattr("engine.sources.site_audit.fetch",
                        lambda d, **k: ("call (216) 555-0100", {}))
    r = client.post("/api/pursue", json={"domains": ["buckeye.example"]})
    assert r.status_code == 200
    row = r.json()["pursued"][0]
    assert row["contacts"] == [] and row["general_phone"] == "(216) 555-0100"
