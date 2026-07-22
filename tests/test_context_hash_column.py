from engine.db.base import make_engine, create_all, make_session_factory
from engine.db.models import AccountRow
from engine.db import repo
from engine.models import Account


def _session():
    engine = make_engine("sqlite:///:memory:")
    create_all(engine)
    return make_session_factory(engine)()


def test_set_and_read_context_hash():
    s = _session()
    s.add(AccountRow(domain="a.example", name="A")); s.commit()
    repo.set_context_hash(s, "a.example", "abc123")
    assert s.get(AccountRow, "a.example").context_hash == "abc123"


def test_upsert_preserves_context_hash_on_reingest():
    s = _session()
    a = Account(name="A", domain="a.example")
    a.__dict__["context_hash"] = "keepme"
    repo.upsert_accounts(s, [a])
    repo.upsert_accounts(s, [Account(name="A", domain="a.example")])  # fresh row, no hash
    assert s.get(AccountRow, "a.example").context_hash == "keepme"
