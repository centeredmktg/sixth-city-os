from datetime import datetime, timezone
from engine.db.base import make_engine, make_session_factory, create_all
from engine.db.models import AccountRow
from engine.db import repo
from engine.models import Account


def _session():
    engine = make_engine("sqlite:///:memory:")
    create_all(engine)
    return make_session_factory(engine)()


def test_claimed_roundtrips_through_repo():
    session = _session()
    a = Account(name="Buckeye", domain="buckeye.example")
    a.__dict__["claimed"] = True
    a.__dict__["claimed_at"] = datetime(2026, 7, 14, tzinfo=timezone.utc)
    repo.upsert_accounts(session, [a])
    row = session.get(AccountRow, "buckeye.example")
    assert row.claimed is True
    assert row.claimed_at is not None


def test_upsert_preserves_claimed_on_reingest():
    session = _session()
    a = Account(name="Buckeye", domain="buckeye.example")
    a.__dict__["claimed"] = True
    repo.upsert_accounts(session, [a])
    # Re-ingest the same domain as un-claimed (a fresh CSV row) must NOT reset the claim.
    a2 = Account(name="Buckeye", domain="buckeye.example")
    repo.upsert_accounts(session, [a2])
    assert session.get(AccountRow, "buckeye.example").claimed is True
