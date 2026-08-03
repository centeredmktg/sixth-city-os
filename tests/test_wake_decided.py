"""A Hold/Nurture firm that heats up returns to triage. A reject never does."""
from datetime import datetime, timezone

from engine.db.base import make_engine, create_all, make_session_factory
from engine.db.models import AccountRow
from engine.jobs import rescore

GATE = 55.0


def _session():
    engine = make_engine("sqlite:///:memory:")
    create_all(engine)
    return make_session_factory(engine)()


def _decided(session, domain, route, timing):
    session.add(AccountRow(domain=domain, name=domain, timing=timing,
                           route_confirmed=True, route_confirmed_route=route,
                           route_confirmed_by="operator",
                           decided_at=datetime(2026, 7, 1, tzinfo=timezone.utc)))
    session.commit()
    return session.get(AccountRow, domain)


def test_wakes_a_hold_that_crosses_the_gate_upward():
    session = _session()
    row = _decided(session, "buckeye.example", "hold", timing=70.0)   # new timing
    woken = rescore.wake_heated_decisions(session, [row], {"buckeye.example": 40.0})
    assert woken == ["buckeye.example"]
    assert row.route_confirmed is False
    assert row.decided_at is None
    assert row.route_confirmed_by == ""  # attribution clears too, same as /api/undecide


def test_wakes_a_nurture_that_crosses_the_gate_upward():
    session = _session()
    row = _decided(session, "nurtured.example", "nurture", timing=60.0)
    assert rescore.wake_heated_decisions(session, [row], {"nurtured.example": 20.0})


def test_does_not_wake_a_firm_already_above_the_gate():
    session = _session()
    row = _decided(session, "warm.example", "hold", timing=80.0)
    assert rescore.wake_heated_decisions(session, [row], {"warm.example": 70.0}) == []
    assert row.route_confirmed is True


def test_never_wakes_a_reject():
    session = _session()
    row = _decided(session, "dead.example", "reject", timing=95.0)
    assert rescore.wake_heated_decisions(session, [row], {"dead.example": 10.0}) == []
    assert row.route_confirmed is True


def test_does_not_wake_on_a_downward_crossing():
    session = _session()
    row = _decided(session, "cooling.example", "hold", timing=30.0)
    assert rescore.wake_heated_decisions(session, [row], {"cooling.example": 80.0}) == []


def test_rescore_all_wakes_as_it_scores(monkeypatch):
    """The wake pass runs off the timing rescore just computed, not a second pass."""
    from engine.scoring.config import ScoringConfig
    session = _session()
    row = _decided(session, "buckeye.example", "hold", timing=10.0)
    monkeypatch.setattr(
        rescore.abcr, "score",
        lambda account, config: type("S", (), {
            "fit": 50.0, "timing": 90.0, "total": 70.0, "band": "A", "rationale": ""})())
    rescore.rescore_all(session, ScoringConfig())
    assert session.get(AccountRow, "buckeye.example").route_confirmed is False
