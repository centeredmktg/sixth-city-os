"""The enroll deep-link must reach the frontend: contacts carry a contact-record link
when they're in HubSpot, and every candidate carries a company-record fallback link."""
from web.server import _contact_dict
from engine.models import Contact
from engine.modules import hubspot_links as hl


def test_contact_dict_builds_contact_link_when_in_hubspot():
    c = Contact(name="Jane Rivera", company_domain="x.com", title="CMO", email="jane@x.com",
                seniority="exec", hubspot_id="777")
    d = _contact_dict(c)
    assert d["hubspot_id"] == "777"
    assert d["hubspot_url"] == f"https://app.hubspot.com/contacts/{hl.PORTAL_ID}/record/0-1/777"


def test_contact_dict_no_link_when_not_in_hubspot():
    c = Contact(name="Jane", company_domain="x.com", title="CMO", email="jane@x.com")
    d = _contact_dict(c)
    assert d["hubspot_id"] == ""
    assert d["hubspot_url"] is None   # frontend falls back to the company link


def test_candidate_exposes_company_fallback_link(client, session):
    from engine.db.models import AccountRow
    session.add(AccountRow(domain="buckeye.example", name="Buckeye", stage="scored",
                           band="A", total=90, net_new=True, claimed=True, pushed=False,
                           hubspot_id="56660000001", vertical="industrial_manufacturing"))
    session.commit()
    cand = next(c for c in client.get("/api/candidates").json()["candidates"]
                if c["domain"] == "buckeye.example")
    assert cand["hubspot_id"] == "56660000001"
    assert cand["hubspot_url"] == f"https://app.hubspot.com/contacts/{hl.PORTAL_ID}/record/0-2/56660000001"
