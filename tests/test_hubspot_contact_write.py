"""push(): when a net-new company is claimed, also create a Contact with the
site-scraped email/phone and associate it to that company — so the data
enrich_contacts produced actually lands where sales can see it.

Decisions: write a contact only when there's an email OR phone to write; never
touch contacts on companies that already existed (consistent with the no-claim SLA).
"""
import engine.hubspot.client as clientmod
from engine.hubspot.client import HubSpotClient
from engine.models import Account, Outreach


class FakeResp:
    def __init__(self, status, body=None):
        self.status_code = status
        self._body = body or {}
        self.headers = {}
        self.content = b"x"

    def json(self):
        return self._body

    def raise_for_status(self):
        import requests
        if self.status_code >= 400:
            raise requests.HTTPError(str(self.status_code))


class RecordingSession:
    """Routes by URL; records every call so tests can assert what was written."""
    def __init__(self, existing_company=False):
        self.calls = []          # list of (method, url, json)
        self.headers = {}
        self._existing = existing_company

    def post(self, url, json=None, timeout=None):
        self.calls.append(("POST", url, json))
        if "/companies/search" in url:
            return FakeResp(200, {"results": [{"id": "EXIST"}] if self._existing else []})
        if url.endswith("/objects/companies"):
            return FakeResp(200, {"id": "C1"})
        if url.endswith("/objects/contacts"):
            return FakeResp(200, {"id": "P1"})
        return FakeResp(200, {})

    def put(self, url, json=None, timeout=None):
        self.calls.append(("PUT", url, json))
        return FakeResp(200, {})

    # convenience filters
    def contact_posts(self):
        return [j for m, u, j in self.calls if m == "POST" and u.endswith("/objects/contacts")]

    def association_puts(self):
        return [u for m, u, j in self.calls if m == "PUT" and "associations" in u]


def _client(monkeypatch, session):
    monkeypatch.setattr(clientmod.time, "sleep", lambda *_: None)
    c = HubSpotClient()
    c._dry = False
    c._session = session
    return c


def _acct(contact):
    a = Account(name="Acme Fab", domain="acmefab.com")
    a.__dict__["contact"] = contact
    return a


_OUTREACH = Outreach(account_domain="acmefab.com", subject="s", body="b")


def test_creates_contact_with_email_and_phone_and_associates_to_new_company(monkeypatch):
    sess = RecordingSession()
    c = _client(monkeypatch, sess)
    acct = _acct({"contact_email": "john@acmefab.com",
                  "contact_phone": "(216) 555-1234", "contact_name": ""})

    new_id = c.push(acct, _OUTREACH)

    assert new_id == "C1"
    posts = sess.contact_posts()
    assert len(posts) == 1
    props = posts[0]["properties"]
    assert props["email"] == "john@acmefab.com"
    assert props["phone"] == "(216) 555-1234"
    # associated to the company we just created
    assert any("C1" in u and "P1" in u for u in sess.association_puts())


def test_skips_contact_when_no_email_and_no_phone(monkeypatch):
    sess = RecordingSession()
    c = _client(monkeypatch, sess)
    acct = _acct({"contact_email": "", "contact_phone": "", "contact_name": ""})

    c.push(acct, _OUTREACH)

    assert sess.contact_posts() == []          # nothing to write -> no contact
    assert sess.association_puts() == []


def test_does_not_write_contact_on_already_existing_company(monkeypatch):
    sess = RecordingSession(existing_company=True)
    c = _client(monkeypatch, sess)
    acct = _acct({"contact_email": "john@acmefab.com", "contact_phone": "", "contact_name": ""})

    out_id = c.push(acct, _OUTREACH)

    assert out_id == "EXIST"                    # untouched, not claimed
    assert sess.contact_posts() == []           # and no contact written
