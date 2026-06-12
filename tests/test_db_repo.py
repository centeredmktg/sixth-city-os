from engine.db.base import resolve_url


def test_resolve_url_normalizes_railway_postgres_scheme():
    # Railway hands out postgres:// ; SQLAlchemy + psycopg3 needs postgresql+psycopg://
    out = resolve_url("postgres://u:p@host:5432/db")
    assert out == "postgresql+psycopg://u:p@host:5432/db"


def test_resolve_url_passes_sqlite_through():
    assert resolve_url("sqlite:///tmp/x.db") == "sqlite:///tmp/x.db"


from engine.db import repo
from engine.models import (
    Account, Signal, SignalKind, Vertical, Score, RouteDecision, Route, Stage,
)


def _closer_account(domain="buckeye.example"):
    a = Account(name="Buckeye", domain=domain, vertical=Vertical.INDUSTRIAL_B2B,
                city="Cleveland", discovered_by="clay")
    a.signals = [
        Signal(kind=SignalKind.SITE_QUALITY, source="clay", value=34.0, detail="slow"),
        Signal(kind=SignalKind.ADS_ACTIVE, source="clay", value=3.0, detail="3 ads"),
    ]
    a.score = Score(fit=70.0, timing=60.0, total=65.0, band="A", rationale="strong")
    a.route = RouteDecision(recommended=Route.CLOSER, rationale="pain-qualified")
    return a


def test_upsert_then_candidates_roundtrip(session):
    repo.upsert_accounts(session, [_closer_account()])
    cands = repo.get_candidates(session)
    assert len(cands) == 1
    a = cands[0]
    assert a.domain == "buckeye.example"
    assert {s.kind for s in a.signals} == {SignalKind.SITE_QUALITY, SignalKind.ADS_ACTIVE}
    assert a.route.effective == Route.CLOSER


def test_upsert_is_idempotent_by_domain(session):
    repo.upsert_accounts(session, [_closer_account()])
    repo.upsert_accounts(session, [_closer_account()])  # same domain again
    assert len(repo.get_candidates(session)) == 1


def test_mark_pushed_drops_from_candidates(session):
    repo.upsert_accounts(session, [_closer_account()])
    repo.mark_pushed(session, "buckeye.example", "hs-123")
    assert repo.get_candidates(session) == []
    from engine.db.models import AccountRow
    row = session.get(AccountRow, "buckeye.example")
    assert row.pushed is True
    assert row.hubspot_id == "hs-123"
    assert row.stage == "pushed"
