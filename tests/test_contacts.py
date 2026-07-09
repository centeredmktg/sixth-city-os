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
