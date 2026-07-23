"""Scraped inboxes greet neutrally; real people still greet by first name."""
from engine.models import Account, Contact, Vertical
from engine.modules import draft_cold_email


def _acct():
    return Account(name="Acme", domain="acme.com", vertical=Vertical.UNKNOWN)


def test_scraped_inbox_greets_neutrally():
    inbox = Contact(name="Info", company_domain="acme.com", title="General inbox",
                    email="info@acme.com", source="site_scrape")
    body = draft_cold_email.draft(_acct(), contact=inbox).body
    assert body.startswith("Hi —") and "Hi Info" not in body


def test_named_person_still_greets_by_first_name():
    person = Contact(name="Jane Doe", company_domain="acme.com", title="CMO",
                     email="jane@acme.com", source="apollo")
    body = draft_cold_email.draft(_acct(), contact=person).body
    assert body.startswith("Hi Jane")
