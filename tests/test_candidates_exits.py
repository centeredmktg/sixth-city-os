"""The finding surface has exactly three exits: promoted, decided, emailed."""
from sqlalchemy import text

from engine.db.base import make_engine, create_all, make_session_factory
from engine.db.migrate_add_messages import run_migration
from engine.db.models import AccountRow, MessageRow
from engine.db import repo


def _session():
    engine = make_engine("sqlite:///:memory:")
    create_all(engine)
    return make_session_factory(engine)()


def _account(session, domain, **kw):
    session.add(AccountRow(domain=domain, name=domain, **kw))
    session.commit()


def _domains(session):
    return {a.domain for a in repo.get_candidates(session)}


def test_undecided_unpushed_unemailed_is_a_candidate():
    session = _session()
    _account(session, "open.example")
    assert _domains(session) == {"open.example"}


def test_promoted_is_excluded():
    session = _session()
    _account(session, "promoted.example", pushed=True)
    assert _domains(session) == set()


def test_decided_is_excluded():
    session = _session()
    _account(session, "held.example", route_confirmed=True, route_confirmed_route="hold")
    assert _domains(session) == set()


def test_emailed_is_excluded():
    session = _session()
    _account(session, "touched.example")
    session.add(MessageRow(company_domain="touched.example",
                           contact_email="jane@touched.example", status="sent"))
    session.commit()
    assert _domains(session) == set()


def test_draft_message_does_not_exclude():
    """A composed-but-unsent draft is not a touch — the firm is still to be worked."""
    session = _session()
    _account(session, "drafted.example")
    session.add(MessageRow(company_domain="drafted.example",
                           contact_email="jane@drafted.example", status="draft"))
    session.commit()
    assert _domains(session) == {"drafted.example"}


def test_failed_send_reverted_to_draft_stays_in_queue():
    """send_message reverts to DRAFT on failure — the card must not vanish."""
    session = _session()
    _account(session, "failed.example")
    session.add(MessageRow(company_domain="failed.example",
                           contact_email="jane@failed.example", status="draft"))
    session.commit()
    assert _domains(session) == {"failed.example"}


def test_null_company_domain_on_a_sent_message_does_not_blank_the_query():
    """I1: prod's messages.company_domain is nullable (migrate_add_messages.py has no
    NOT NULL, unlike the ORM's Mapped[str] / create_all() DDL) — a single NULL there
    used to make the `NOT IN` subquery evaluate NULL for every row, returning nothing
    on both screens. SQLite's create_all() infers NOT NULL from Mapped[str], so it
    rejects a NULL insert even via raw SQL (verified) — this test drops and rebuilds
    `messages` using the actual production DDL (no NOT NULL) so the NULL row can exist,
    reproducing the prod bug for real rather than trusting the fix blindly."""
    session = _session()
    engine = session.get_bind()
    with engine.begin() as conn:
        conn.execute(text("DROP TABLE messages"))
    run_migration(engine)   # recreates `messages` via the prod DDL: no NOT NULL

    _account(session, "open.example")
    session.execute(text(
        "INSERT INTO messages (contact_email, company_domain, status) "
        "VALUES ('jane@example.com', NULL, 'sent')"))
    session.commit()

    assert _domains(session) == {"open.example"}


def test_query_count_is_flat_regardless_of_row_count():
    """Signals must be batch-loaded — this query runs on every page load of two screens."""
    from sqlalchemy import event
    session = _session()
    for i in range(25):
        _account(session, f"firm{i}.example")

    seen = []

    def _count(*a, **k):
        seen.append(1)

    engine = session.get_bind()
    event.listen(engine, "before_cursor_execute", _count)
    try:
        repo.get_candidates(session)
    finally:
        event.remove(engine, "before_cursor_execute", _count)
    # accounts + batched signals + batched contacts — a small constant, never 25+.
    assert len(seen) <= 5, f"N+1 regression: {len(seen)} queries for 25 accounts"
