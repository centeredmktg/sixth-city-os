"""The multi-thread merge: Apollo people + scraped inboxes + a phone fallback."""
from types import SimpleNamespace
from engine.models import Contact
from engine.modules import contact_waterfall as cw


def _acct(domain="acme.com", name="Acme", city="Cleveland", state="OH", extra=None):
    return SimpleNamespace(domain=domain, name=name, city=city, state=state, extra=extra or {})


class _Apollo:
    def __init__(self, people): self._people = people
    def find_contacts(self, domain, limit=5): return self._people


def test_merges_apollo_and_scraped_inboxes():
    apollo = _Apollo([Contact(name="Jane Doe", company_domain="acme.com", title="CMO",
                              email="jane@acme.com", source="apollo")])
    res = cw.pursue_company(
        _acct(), apollo,
        fetch=lambda d: ("<a href='mailto:info@acme.com'>i</a> call (216) 555-0100", {}),
        places_lookup=lambda *a: None)
    emails = {c.email for c in res.contacts}
    assert emails == {"jane@acme.com", "info@acme.com"}
    inbox = [c for c in res.contacts if c.email == "info@acme.com"][0]
    assert inbox.name == "Info" and inbox.title == "General inbox" and inbox.source == "site_scrape"
    assert res.general_phone == "(216) 555-0100" and res.phone_source == "site"


def test_apollo_wins_on_email_collision():
    apollo = _Apollo([Contact(name="Jane Doe", company_domain="acme.com", title="CMO",
                              email="info@acme.com", source="apollo")])
    res = cw.pursue_company(
        _acct(), apollo,
        fetch=lambda d: ("mailto:info@acme.com", {}),
        places_lookup=lambda *a: None)
    assert len(res.contacts) == 1
    assert res.contacts[0].source == "apollo" and res.contacts[0].title == "CMO"


def test_emailless_apollo_person_kept():
    apollo = _Apollo([Contact(name="No Email", company_domain="acme.com", title="Owner",
                              email="", source="apollo")])
    res = cw.pursue_company(_acct(), apollo, fetch=lambda d: ("", {}), places_lookup=lambda *a: None)
    assert len(res.contacts) == 1 and res.contacts[0].name == "No Email"


def test_prefers_prescraped_extra_over_fetch():
    apollo = _Apollo([])
    def _fetch(d): raise AssertionError("should not fetch when extra is populated")
    res = cw.pursue_company(
        _acct(extra={"site_emails": ["hello@acme.com"], "site_phones": ["+12160001111"]}),
        apollo, fetch=_fetch, places_lookup=lambda *a: None)
    assert res.contacts[0].email == "hello@acme.com"
    assert res.general_phone == "+12160001111" and res.phone_source == "site"


def test_places_phone_fallback_when_no_site_phone():
    apollo = _Apollo([])
    res = cw.pursue_company(
        _acct(), apollo,
        fetch=lambda d: ("no phone here", {}),
        places_lookup=lambda name, city, state, domain: {"phone": "(216) 555-9999",
                                                         "address": "1 Main St"})
    assert res.general_phone == "(216) 555-9999" and res.phone_source == "places"
    assert res.general_address == "1 Main St"


def test_all_dry_returns_empty():
    res = cw.pursue_company(_acct(), _Apollo([]), fetch=lambda d: ("", {}),
                            places_lookup=lambda *a: None)
    assert res.contacts == [] and res.general_phone is None and res.phone_source == "none"


def test_fetch_failure_degrades():
    def boom(d): raise RuntimeError("network")
    res = cw.pursue_company(_acct(), _Apollo([]), fetch=boom, places_lookup=lambda *a: None)
    assert res.contacts == [] and res.phone_source == "none"


def test_apollo_error_degrades():
    # A configured Apollo hitting 429/5xx/timeout must not sink the whole pursue —
    # the scrape tier still runs and the endpoint stays alive (degrade-never-raise).
    class _BoomApollo:
        def find_contacts(self, domain, limit=5):
            raise RuntimeError("apollo 429")
    res = cw.pursue_company(_acct(), _BoomApollo(),
                            fetch=lambda d: ("call (216) 555-0100", {}),
                            places_lookup=lambda *a: None)
    assert res.contacts == [] and res.general_phone == "(216) 555-0100"
