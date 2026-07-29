"""A decided firm stays decided across re-ingest — otherwise every Clay export
resurrects the companies the operator already rejected."""
from datetime import datetime, timezone

from engine.db.base import make_engine, create_all, make_session_factory
from engine.db.models import AccountRow
from engine.db import repo
from engine.models import Account


def _session():
    engine = make_engine("sqlite:///:memory:")
    create_all(engine)
    return make_session_factory(engine)()


def test_reingest_preserves_a_rejection():
    session = _session()
    repo.upsert_accounts(session, [Account(name="Buckeye", domain="buckeye.example")])
    row = session.get(AccountRow, "buckeye.example")
    row.route_confirmed = True
    row.route_confirmed_route = "reject"
    row.route_confirmed_by = "operator"
    row.decided_at = datetime(2026, 7, 29, tzinfo=timezone.utc)
    session.commit()

    # The same domain comes back in tomorrow's Clay export, undecided.
    repo.upsert_accounts(session, [Account(name="Buckeye", domain="buckeye.example")])

    row = session.get(AccountRow, "buckeye.example")
    assert row.route_confirmed is True
    assert row.route_confirmed_route == "reject"
    assert row.decided_at is not None


def test_reingest_leaves_an_undecided_firm_undecided():
    session = _session()
    repo.upsert_accounts(session, [Account(name="Open", domain="open.example")])
    repo.upsert_accounts(session, [Account(name="Open", domain="open.example")])
    row = session.get(AccountRow, "open.example")
    assert row.route_confirmed is False
    assert row.decided_at is None


def test_rejected_firm_does_not_return_to_candidates_after_reingest():
    session = _session()
    repo.upsert_accounts(session, [Account(name="Buckeye", domain="buckeye.example")])
    row = session.get(AccountRow, "buckeye.example")
    row.route_confirmed, row.route_confirmed_route = True, "reject"
    session.commit()
    repo.upsert_accounts(session, [Account(name="Buckeye", domain="buckeye.example")])
    assert repo.get_candidates(session) == []


def test_decided_at_roundtrips_through_the_account_dataclass():
    session = _session()
    a = Account(name="Buckeye", domain="buckeye.example")
    a.__dict__["decided_at"] = datetime(2026, 7, 29, tzinfo=timezone.utc)
    repo.upsert_accounts(session, [a])
    assert session.get(AccountRow, "buckeye.example").decided_at is not None
    back = repo._account_from_row(session.get(AccountRow, "buckeye.example"))
    assert back.__dict__["decided_at"] is not None
