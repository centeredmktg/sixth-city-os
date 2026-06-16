"""
Repository: the only module that turns engine dataclasses into rows and back.
Keeps SQL out of the jobs. Upsert dedupes by domain (re-ingesting the same Clay
pull updates, never duplicates) and preserves push state so a re-ingest can't
un-push a claimed firm.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from engine.db.models import AccountRow, SignalRow
from engine.models import (
    Account, Signal, SignalKind, Vertical, Score, RouteDecision, Route, Stage,
)


def _row_from_account(a: Account) -> AccountRow:
    row = AccountRow(
        domain=a.domain, name=a.name, vertical=a.vertical.value, city=a.city,
        state=a.state, linkedin_url=a.linkedin_url, discovered_by=a.discovered_by,
        extra=a.extra or {}, stage=a.stage.value, hubspot_id=a.hubspot_id,
        pushed=a.stage == Stage.PUSHED,
    )
    if a.score:
        row.fit = a.score.fit
        row.timing = a.score.timing
        row.total = a.score.total
        row.band = a.score.band
        row.score_rationale = a.score.rationale
    if a.route:
        row.route_recommended = a.route.recommended.value
        row.route_rationale = a.route.rationale
        row.route_confirmed = a.route.confirmed
        row.route_confirmed_route = (
            a.route.confirmed_route.value if a.route.confirmed_route else None
        )
        row.route_confirmed_by = a.route.confirmed_by
    row.signals = [
        SignalRow(kind=s.kind.value, source=s.source, value=s.value, detail=s.detail,
                  observed_at=s.observed_at)
        for s in a.signals
    ]
    return row


def _account_from_row(row: AccountRow) -> Account:
    a = Account(
        name=row.name, domain=row.domain, vertical=Vertical.from_hubspot(row.vertical),
        linkedin_url=row.linkedin_url, city=row.city, state=row.state,
        extra=row.extra or {}, discovered_by=row.discovered_by,
        stage=Stage(row.stage), hubspot_id=row.hubspot_id,
    )
    a.signals = [
        Signal(kind=SignalKind(s.kind), source=s.source, value=s.value, detail=s.detail,
               observed_at=s.observed_at)
        for s in row.signals
    ]
    a.score = Score(
        fit=row.fit, timing=row.timing, total=row.total, band=row.band,
        rationale=row.score_rationale,
    )
    a.route = RouteDecision(
        recommended=Route(row.route_recommended), rationale=row.route_rationale,
        confirmed=row.route_confirmed,
        confirmed_route=Route(row.route_confirmed_route) if row.route_confirmed_route else None,
        confirmed_by=row.route_confirmed_by,
    )
    return a


def upsert_accounts(session: Session, accounts: list[Account]) -> None:
    """Insert or replace by domain. Preserves pushed/hubspot_id so re-ingest never
    un-claims a firm already in HubSpot."""
    for a in accounts:
        existing = session.get(AccountRow, a.domain)
        new_row = _row_from_account(a)
        if existing is not None:
            new_row.pushed = existing.pushed or new_row.pushed
            new_row.hubspot_id = existing.hubspot_id or new_row.hubspot_id
            session.delete(existing)
            session.flush()
        session.add(new_row)
    session.commit()


def get_candidates(session: Session) -> list[Account]:
    """Net-new unpushed firms, ranked best-first — the triage queue. We surface the
    WHOLE sorted list (dump-and-sort), not just closer-bound: routing is a badge +
    sort hint, not a gate. The operator works top-down and picks what to push.
    (The DB only ever holds net-new firms; ingest filters the book out before writing.)"""
    rows = session.query(AccountRow).filter(AccountRow.pushed.is_(False)).all()
    accounts = [_account_from_row(r) for r in rows]
    accounts.sort(key=lambda a: (a.score.total if a.score else 0.0), reverse=True)
    return accounts


def mark_pushed(session: Session, domain: str, hubspot_id: str) -> None:
    """Record the claim: the firm is in HubSpot, drop it from the triage queue."""
    row = session.get(AccountRow, domain)
    if row is not None:
        row.pushed = True
        row.hubspot_id = hubspot_id
        row.stage = Stage.PUSHED.value
        session.commit()
