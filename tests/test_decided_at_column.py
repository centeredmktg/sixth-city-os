"""accounts.decided_at — when a human made the Hold/Nurture/Reject call."""
from datetime import datetime, timezone

from engine.db.base import make_engine, create_all, make_session_factory
from engine.db.models import AccountRow
from engine.db.auto_migrate import _MIGRATIONS


def _session():
    engine = make_engine("sqlite:///:memory:")
    create_all(engine)
    return make_session_factory(engine)()


def test_decided_at_defaults_to_none():
    session = _session()
    session.add(AccountRow(domain="buckeye.example", name="Buckeye"))
    session.commit()
    assert session.get(AccountRow, "buckeye.example").decided_at is None


def test_decided_at_stores_a_timestamp():
    session = _session()
    when = datetime(2026, 7, 29, 14, 2, tzinfo=timezone.utc)
    session.add(AccountRow(domain="buckeye.example", name="Buckeye", decided_at=when))
    session.commit()
    assert session.get(AccountRow, "buckeye.example").decided_at is not None


def test_migration_is_registered_for_boot():
    names = " ".join(m.__name__ for m in _MIGRATIONS)
    assert "decided_at" in names
