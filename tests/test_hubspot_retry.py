"""HubSpot _post retries on 429 (Search API rate limit) instead of 500-ing."""
import requests

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
        if self.status_code >= 400:
            raise requests.HTTPError(str(self.status_code))


def test_post_retries_on_429_then_succeeds(monkeypatch):
    monkeypatch.setattr(clientmod.time, "sleep", lambda *_: None)  # no real waiting
    c = HubSpotClient()
    c._dry = False
    calls = {"n": 0}

    class FakeSession:
        def post(self, *a, **k):
            calls["n"] += 1
            if calls["n"] == 1:
                return FakeResp(429, headers={"Retry-After": "0"})
            return FakeResp(200, {"ok": True})

    c._session = FakeSession()
    assert c._post("/crm/v3/objects/companies/search", {}) == {"ok": True}
    assert calls["n"] == 2  # one 429, one retry that succeeds


def test_post_raises_after_exhausting_retries(monkeypatch):
    monkeypatch.setattr(clientmod.time, "sleep", lambda *_: None)
    c = HubSpotClient()
    c._dry = False

    class AlwaysThrottled:
        def post(self, *a, **k):
            return FakeResp(429, headers={"Retry-After": "0"})

    c._session = AlwaysThrottled()
    try:
        c._post("/x", {})
        assert False, "should have raised after exhausting retries"
    except requests.HTTPError:
        pass
