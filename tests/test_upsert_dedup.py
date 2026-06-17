"""upsert_accounts collapses duplicate domains (PK) instead of 500-ing on insert."""
from engine.db.base import make_engine, make_session_factory, create_all
from engine.db.models import AccountRow
from engine.models import Account
from engine.db import repo


def test_upsert_dedupes_duplicate_domains():
    eng = make_engine("sqlite:///:memory:")
    create_all(eng)
    s = make_session_factory(eng)()
    accts = [
        Account(name="First", domain="dup.com"),
        Account(name="Second", domain="dup.com"),   # same domain (PK) — must not 500
        Account(name="Other", domain="other.com"),
        Account(name="NoDomain", domain=""),         # empty domain dropped
    ]
    repo.upsert_accounts(s, accts)  # must not raise IntegrityError
    rows = s.query(AccountRow).all()
    assert {r.domain for r in rows} == {"dup.com", "other.com"}
    assert s.get(AccountRow, "dup.com").name == "Second"  # last occurrence wins
