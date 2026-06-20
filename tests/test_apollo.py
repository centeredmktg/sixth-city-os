"""ApolloClient two-step: api_search -> people/match by id (validated live). Dry without
a key; parses the enriched person; masks locked emails."""
import engine.apollo.client as ac
from engine.apollo.client import ApolloClient


class _R:
    def __init__(self, status, body): self.status_code = status; self._b = body
    def raise_for_status(self):
        if self.status_code >= 400:
            import requests; raise requests.HTTPError(str(self.status_code))
    def json(self): return self._b


def test_dry_without_key(monkeypatch):
    monkeypatch.delenv("APOLLO_API_KEY", raising=False)
    c = ApolloClient()
    assert c.dry is True and c.find_contacts("x.com") == []


def test_search_then_match_unlocks_and_masks(monkeypatch):
    monkeypatch.setenv("APOLLO_API_KEY", "k")

    def fake_post(url, **k):
        if "api_search" in url:
            return _R(200, {"people": [{"id": "p1", "title": "CMO"}, {"id": "p2", "title": "Owner"}]})
        if "people/match" in url:
            pid = (k.get("json") or {}).get("id")
            if pid == "p1":
                return _R(200, {"person": {"name": "Jane Doe", "title": "CMO",
                                           "email": "jane@x.com", "linkedin_url": "li/jane", "seniority": "executive"}})
            return _R(200, {"person": {"name": "John Roe", "title": "Owner",
                                       "email": "email_not_unlocked@x.com"}})
        return _R(200, {})

    monkeypatch.setattr(ac.requests, "post", fake_post)
    out = ApolloClient().find_contacts("x.com", limit=2)
    assert out[0].name == "Jane Doe" and out[0].email == "jane@x.com" and out[0].title == "CMO"
    assert out[1].name == "John Roe" and out[1].email == ""   # locked -> blank
