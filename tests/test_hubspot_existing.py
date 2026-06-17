"""existing_domains(): returns lowercased set of domains found in HubSpot."""
import engine.hubspot.client as clientmod
from engine.hubspot.client import HubSpotClient


class FakeResp:
    def __init__(self, status, body=None, headers=None):
        self.status_code = status
        self._body = body or {}
        self.headers = headers or {}
        self.content = b"x"

    def json(self):
        return self._body

    def raise_for_status(self):
        import requests
        if self.status_code >= 400:
            raise requests.HTTPError(str(self.status_code))


def test_existing_domains_returns_in_book_set(monkeypatch):
    monkeypatch.setattr(clientmod.time, "sleep", lambda *_: None)
    c = HubSpotClient()
    c._dry = False

    class FakeSession:
        def post(self, *a, **k):
            return FakeResp(200, {
                "results": [{"properties": {"domain": "inbook.com"}}]
            })

    c._session = FakeSession()
    result = c.existing_domains(["inbook.com", "new.com"])
    assert result == {"inbook.com"}


def test_existing_domains_dry_mode_returns_empty_set():
    c = HubSpotClient()
    c._dry = True  # force dry mode regardless of env token
    result = c.existing_domains(["any.com"])
    assert result == set()


def test_existing_domains_empty_input_returns_empty_set(monkeypatch):
    monkeypatch.setattr(clientmod.time, "sleep", lambda *_: None)
    c = HubSpotClient()
    c._dry = False
    # No domains -> no API call needed
    result = c.existing_domains([])
    assert result == set()
