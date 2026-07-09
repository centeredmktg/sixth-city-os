"""
Repository: the only module that turns engine dataclasses into rows and back.
Keeps SQL out of the jobs. Upsert dedupes by domain (re-ingesting the same Clay
pull updates, never duplicates) and preserves push state so a re-ingest can't
un-push a claimed firm.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from engine.db.models import AccountRow, SignalRow, ContactRow
from engine.models import (
    Account, Signal, SignalKind, Vertical, Score, RouteDecision, Route, Stage, Contact,
)


def _row_from_account(a: Account) -> AccountRow:
    row = AccountRow(
        domain=a.domain, name=a.name, vertical=a.vertical.value, city=a.city,
        state=a.state, linkedin_url=a.linkedin_url, discovered_by=a.discovered_by,
        extra=a.extra or {}, stage=a.stage.value, hubspot_id=a.hubspot_id,
        pushed=a.stage == Stage.PUSHED, net_new=a.net_new, pursued=a.pursued,
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
        stage=Stage(row.stage), hubspot_id=row.hubspot_id, net_new=row.net_new,
        pursued=row.pursued,
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
    # Collapse duplicate domains within the batch — Clay/lookalike exports list the
    # same company on multiple rows, and domain is the PK; without this the batch
    # INSERT trips a UniqueViolation (accounts_pkey). Last occurrence wins.
    accounts = list({a.domain: a for a in accounts if a.domain}.values())
    for a in accounts:
        existing = session.get(AccountRow, a.domain)
        new_row = _row_from_account(a)
        if existing is not None:
            new_row.pushed = existing.pushed or new_row.pushed
            new_row.hubspot_id = existing.hubspot_id or new_row.hubspot_id
            # Preserve the pursued state + sourced contacts so a re-ingest never wipes
            # decision-makers we already paid Apollo to find.
            new_row.pursued = existing.pursued or new_row.pursued
            new_row.contacts = [
                ContactRow(name=c.name, title=c.title, email=c.email,
                           linkedin_url=c.linkedin_url, seniority=c.seniority, source=c.source)
                for c in existing.contacts
            ]
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


def store_contacts(session: Session, domain: str, contacts: list[Contact]) -> int:
    """Record sourced contacts on a pursued company (replaces any prior set, so a
    re-pursue refreshes rather than duplicates) and flag the company pursued."""
    row = session.get(AccountRow, domain)
    if row is None:
        return 0
    row.contacts = [
        ContactRow(name=c.name, title=c.title, email=c.email,
                   linkedin_url=c.linkedin_url, seniority=c.seniority, source=c.source,
                   hubspot_id=c.hubspot_id or None)
        for c in contacts
    ]
    row.pursued = True
    session.commit()
    return len(contacts)


def get_contacts(session: Session, domain: str) -> list[Contact]:
    """The decision-makers sourced for a company (empty until it's pursued)."""
    row = session.get(AccountRow, domain)
    if row is None:
        return []
    return [
        Contact(name=r.name, company_domain=domain, title=r.title, email=r.email,
                linkedin_url=r.linkedin_url, seniority=r.seniority, source=r.source,
                hubspot_id=r.hubspot_id or "")
        for r in row.contacts
    ]
