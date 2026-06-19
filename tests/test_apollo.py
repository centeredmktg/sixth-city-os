"""ApolloClient: dry without a key; parses people-search results; masks locked emails."""
import engine.apollo.client as ac
from engine.apollo.client import ApolloClient


def test_dry_without_key(monkeypatch):
    monkeypatch.delenv("APOLLO_API_KEY", raising=False)
    c = ApolloClient()
    assert c.dry is True
    assert c.find_contacts("x.com") == []


def test_parses_people_and_masks_locked_email(monkeypatch):
    monkeypatch.setenv("APOLLO_API_KEY", "k")

    class R:
        status_code = 200
        def raise_for_status(self): pass
        def json(self):
            return {"people": [
                {"first_name": "Jane", "last_name": "Doe", "title": "CMO",
                 "email": "jane@x.com", "linkedin_url": "li/jane", "seniority": "executive"},
                {"name": "John Roe", "title": "Owner", "email": "email_not_unlocked@domain.com"},
            ]}

    monkeypatch.setattr(ac.requests, "post", lambda *a, **k: R())
    out = ApolloClient().find_contacts("x.com", limit=5)
    assert out[0].name == "Jane Doe" and out[0].email == "jane@x.com" and out[0].title == "CMO"
    assert out[1].name == "John Roe" and out[1].email == ""   # locked -> blank
