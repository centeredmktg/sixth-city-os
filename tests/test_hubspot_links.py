"""The HubSpot record deep-link builder — the unblocked fallback for #5 (manual
sequence enrollment). Auto-enroll is API-gated; this link drops the operator on the
right HubSpot record where they click Enroll by hand."""
from engine.modules import hubspot_links as hl


def test_contact_link_preferred_when_contact_id_present():
    url = hl.record_url(contact_hubspot_id="555", company_hubspot_id="999")
    assert url == f"https://app.hubspot.com/contacts/{hl.PORTAL_ID}/record/0-1/555"


def test_company_fallback_when_no_contact_id():
    url = hl.record_url(contact_hubspot_id=None, company_hubspot_id="999")
    assert url == f"https://app.hubspot.com/contacts/{hl.PORTAL_ID}/record/0-2/999"


def test_none_when_neither_id():
    assert hl.record_url(contact_hubspot_id=None, company_hubspot_id=None) is None


def test_blank_ids_treated_as_absent():
    # empty strings (the DB default for an un-pushed contact) must not build a broken link
    assert hl.record_url(contact_hubspot_id="", company_hubspot_id="") is None
    assert hl.record_url(contact_hubspot_id="", company_hubspot_id="999") \
        == f"https://app.hubspot.com/contacts/{hl.PORTAL_ID}/record/0-2/999"


def test_portal_id_is_the_live_portal():
    assert hl.PORTAL_ID == "3358054"
