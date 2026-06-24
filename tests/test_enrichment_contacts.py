"""enrich_contacts: surface the REAL site-crawled email/phone (from site_audit's
account.extra) to sales, instead of a hardcoded info@domain placeholder.

Contract decisions (Danny, sales-ops):
 - Prefer a named person (john@) over generic role inboxes (info@/sales@); keep the
   rest as a ranked fallback list.
 - No real email found -> leave it BLANK. Never surface an unverified guess.
"""
from engine.models import Account
from engine.modules.enrichment import enrich_contacts


def _acct(**extra) -> Account:
    return Account(name="Acme Fab", domain="acmefab.com", extra=extra)


def test_uses_real_site_data_and_prefers_named_person_over_role_inbox():
    acct = _acct(
        site_emails=["info@acmefab.com", "john@acmefab.com", "sales@acmefab.com"],
        site_phones=["(216) 555-1234"],
    )
    out = enrich_contacts(acct)
    assert out["contact_email"] == "john@acmefab.com"          # named person wins
    assert out["contact_email_source"] == "site"               # verified, scraped
    assert out["contact_emails"] == [                          # ranked: named, then role
        "john@acmefab.com", "info@acmefab.com", "sales@acmefab.com"]
    assert out["contact_phone"] == "(216) 555-1234"


def test_email_blank_when_only_role_inboxes_are_present_is_still_surfaced():
    # Role inboxes ARE real domain emails -> surface the best one; not a guess.
    acct = _acct(site_emails=["sales@acmefab.com", "info@acmefab.com"])
    out = enrich_contacts(acct)
    assert out["contact_email"] == "info@acmefab.com"          # alpha within role group
    assert out["contact_email_source"] == "site"


def test_email_blank_when_no_site_email_found_no_info_at_domain_guess():
    acct = _acct(site_phones=["(330) 555-9876"])
    out = enrich_contacts(acct)
    assert out["contact_email"] == ""                          # NO info@domain guess
    assert out["contact_email_source"] == ""
    assert out["contact_phone"] == "(330) 555-9876"            # phone still surfaced


def test_no_site_data_returns_all_blanks_no_placeholder():
    out = enrich_contacts(_acct())
    assert out["contact_email"] == ""
    assert out["contact_phone"] == ""
    assert out["contact_name"] == ""                           # dropped the "TBD" placeholder
    assert out["contact_emails"] == []


def test_contact_phone_prefers_places_phone_over_site_phone():
    acct = _acct(places_phone="(216) 555-1234", site_phones=["(330) 555-9876"],
                 places_address="1 Main St, Cleveland OH")
    out = enrich_contacts(acct)
    assert out["contact_phone"] == "(216) 555-1234"   # GBP line wins
    assert out["contact_address"] == "1 Main St, Cleveland OH"


def test_contact_phone_falls_back_to_site_phone_when_no_places():
    acct = _acct(site_phones=["(330) 555-9876"])
    out = enrich_contacts(acct)
    assert out["contact_phone"] == "(330) 555-9876"
    assert out["contact_address"] == ""
