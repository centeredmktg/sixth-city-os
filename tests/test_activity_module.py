"""The activity feed derives from columns that already exist — no events table."""
from datetime import datetime, timezone

from engine.db.base import make_engine, create_all, make_session_factory
from engine.db.models import AccountRow, MessageRow
from engine.modules import activity


def _session():
    engine = make_engine("sqlite:///:memory:")
    create_all(engine)
    return make_session_factory(engine)()


def _at(day, hour=12):
    return datetime(2026, 7, day, hour, tzinfo=timezone.utc)


def _saved(session, domain, day=22):
    session.add(AccountRow(domain=domain, name=domain.split(".")[0].title(),
                           claimed=True, claimed_at=_at(day),
                           discovered_by="clay-export-jul"))
    session.commit()


def _emailed(session, domain, email="jane@x.com", day=29):
    session.add(MessageRow(company_domain=domain, contact_email=email,
                           status="sent", sent_at=_at(day), sent_by="john@sixthcity.com"))
    session.commit()


def test_emailed_company_appears_by_default():
    session = _session()
    _saved(session, "acme.example")
    _emailed(session, "acme.example")
    out = activity.build(session)
    assert [c["domain"] for c in out["companies"]] == ["acme.example"]


def test_saved_only_company_is_hidden_by_default():
    """4,300 saves would bury the few dozen real touches."""
    session = _session()
    _saved(session, "quiet.example")
    assert activity.build(session)["companies"] == []


def test_include_saved_admits_them():
    session = _session()
    _saved(session, "quiet.example")
    out = activity.build(session, include={"saved"})
    assert [c["domain"] for c in out["companies"]] == ["quiet.example"]


def test_company_carries_its_full_event_trail_newest_first():
    session = _session()
    _saved(session, "acme.example", day=22)
    _emailed(session, "acme.example", day=29)
    events = activity.build(session)["companies"][0]["events"]
    assert [e["type"] for e in events] == ["emailed", "saved"]
    assert events[0]["detail"] == "jane@x.com"
    assert events[0]["by"] == "john@sixthcity.com"


def test_companies_order_by_most_recent_activity():
    session = _session()
    _saved(session, "old.example")
    _emailed(session, "old.example", day=23)
    _saved(session, "new.example")
    _emailed(session, "new.example", day=29)
    assert [c["domain"] for c in activity.build(session)["companies"]] == \
        ["new.example", "old.example"]


def test_totals_count_the_whole_set_not_the_page():
    """The failure mode that would quietly understate the work done."""
    session = _session()
    for i in range(12):
        _saved(session, f"firm{i}.example")
        _emailed(session, f"firm{i}.example")
    out = activity.build(session, limit=5)
    assert len(out["companies"]) == 5
    assert out["totals"]["saved"] == 12
    assert out["totals"]["emailed"] == 12


def test_decided_events_are_included_when_asked():
    session = _session()
    session.add(AccountRow(domain="held.example", name="Held", route_confirmed=True,
                           route_confirmed_route="hold", decided_at=_at(28)))
    session.commit()
    out = activity.build(session, include={"decided"})
    assert out["companies"][0]["events"][0]["type"] == "decided"
    assert out["companies"][0]["events"][0]["detail"] == "hold"
    assert out["totals"]["decided"] == 1


def test_every_event_declares_its_source():
    """The Phase 2 seam — exercised before there's anything to put through it."""
    session = _session()
    _saved(session, "acme.example")
    _emailed(session, "acme.example")
    out = activity.build(session, include={"saved", "decided"})
    assert {e["source"] for c in out["companies"] for e in c["events"]} == {"engine"}


def test_timestamps_serialize_as_utc_iso():
    session = _session()
    _saved(session, "acme.example")
    _emailed(session, "acme.example", day=29)
    assert activity.build(session)["companies"][0]["events"][0]["at"].startswith("2026-07-29")


def test_query_count_is_flat_regardless_of_company_count():
    from sqlalchemy import event
    session = _session()
    for i in range(30):
        _saved(session, f"firm{i}.example")
        _emailed(session, f"firm{i}.example")
    seen = []
    def _count(*a, **k):
        seen.append(1)
    engine = session.get_bind()
    event.listen(engine, "before_cursor_execute", _count)
    try:
        activity.build(session, include={"saved", "decided"})
    finally:
        event.remove(engine, "before_cursor_execute", _count)
    assert len(seen) <= 6, f"N+1 regression: {len(seen)} queries for 30 companies"
