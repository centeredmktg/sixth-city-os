from engine.db.base import make_engine, make_session_factory, create_all
from engine.db import settings_repo
from engine.hubspot.client import HubSpotClient


def _session():
    engine = make_engine("sqlite:///:memory:")
    create_all(engine)
    Session = make_session_factory(engine)
    return Session()


def test_default_owner_roundtrips():
    session = _session()
    assert settings_repo.load_default_owner_id(session) is None
    settings_repo.save_default_owner_id(session, "555")
    assert settings_repo.load_default_owner_id(session) == "555"


def test_list_owners_parses(monkeypatch):
    c = HubSpotClient()
    c._dry = False
    monkeypatch.setattr(c, "_get", lambda path, params=None: {"results": [
        {"id": "555", "firstName": "Kaylee", "lastName": "Sammon", "email": "kaylee@sc.com"},
    ]})
    owners = c.list_owners()
    assert owners == [{"id": "555", "name": "Kaylee Sammon", "email": "kaylee@sc.com"}]
