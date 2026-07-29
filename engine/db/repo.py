"""
Repository: the only module that turns engine dataclasses into rows and back.
Keeps SQL out of the jobs. Upsert dedupes by domain (re-ingesting the same Clay
pull updates, never duplicates) and preserves push state so a re-ingest can't
un-push a claimed firm.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from engine.db.models import AccountRow, SignalRow, ContactRow, MessageRow
from engine.models import (
    Account, Signal, SignalKind, Vertical, Score, RouteDecision, Route, Stage, Contact,
)


def _row_from_account(a: Account) -> AccountRow:
    row = AccountRow(
        domain=a.domain, name=a.name, vertical=a.vertical.value, city=a.city,
        state=a.state, linkedin_url=a.linkedin_url, discovered_by=a.discovered_by,
        extra=a.extra or {}, stage=a.stage.value, hubspot_id=a.hubspot_id,
        pushed=a.stage == Stage.PUSHED, net_new=a.net_new, pursued=a.pursued,
        claimed=getattr(a, "claimed", False),
        claimed_at=getattr(a, "claimed_at", None),
        context_hash=getattr(a, "context_hash", None),
        decided_at=getattr(a, "decided_at", None),
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
    a.__dict__["claimed"] = bool(row.claimed)
    a.__dict__["claimed_at"] = row.claimed_at
    a.__dict__["context_hash"] = row.context_hash
    a.__dict__["decided_at"] = row.decided_at
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
            new_row.claimed = existing.claimed or new_row.claimed
            new_row.claimed_at = existing.claimed_at or new_row.claimed_at
            new_row.context_hash = existing.context_hash or new_row.context_hash
            new_row.hubspot_id = existing.hubspot_id or new_row.hubspot_id
            # Preserve the pursued state + sourced contacts so a re-ingest never wipes
            # decision-makers we already paid Apollo to find.
            new_row.pursued = existing.pursued or new_row.pursued
            # A human's Hold/Nurture/Reject outlives re-ingest — otherwise tomorrow's
            # Clay export resurrects every company the operator already rejected.
            if existing.route_confirmed:
                new_row.route_confirmed = True
                new_row.route_confirmed_route = existing.route_confirmed_route
                new_row.route_confirmed_by = existing.route_confirmed_by
                new_row.decided_at = existing.decided_at
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
    """The finding surface: firms not yet worked, ranked best-first. A firm leaves
    this list through exactly three exits, and never by being deleted —
    the row persists so re-ingest still dedupes against it:

      promoted  pushed = True                (LFG confirmed -> HubSpot working)
      decided   route_confirmed = True       (human called Hold/Nurture/Reject)
      emailed   a sent message for the domain (the first touch went out)

    Both the Morning Queue and the Triage Board read this, so an exit clears the
    card from both. We surface the WHOLE sorted list (dump-and-sort), not just
    closer-bound: routing is a badge + sort hint, not a gate.
    """
    # ONE subquery, not a per-row lookup: this runs on every load of two screens.
    sent_domains = select(MessageRow.company_domain).where(MessageRow.status == "sent")
    rows = (session.query(AccountRow)
            # Batch the relationship loads — _account_from_row touches row.signals
            # for every account, which is an N+1 without this (cf. bbc7da7).
            .options(selectinload(AccountRow.signals), selectinload(AccountRow.contacts))
            .filter(AccountRow.pushed.is_(False),
                    AccountRow.route_confirmed.is_(False),
                    AccountRow.domain.not_in(sent_domains))
            .all())
    accounts = [_account_from_row(r) for r in rows]
    accounts.sort(key=lambda a: (a.score.total if a.score else 0.0), reverse=True)
    return accounts


def get_decided(session: Session, decision: str) -> list[Account]:
    """Firms a human decided on (hold | nurture | reject), newest decision first.
    Feeds the Activity screen's filter — these left the finding surface but are not
    gone."""
    rows = (session.query(AccountRow)
            # signals only — _account_from_row reads them; nothing here reads .contacts.
            .options(selectinload(AccountRow.signals))
            .filter(AccountRow.route_confirmed.is_(True),
                    AccountRow.route_confirmed_route == decision)
            .order_by(AccountRow.decided_at.desc().nullslast())
            .all())
    return [_account_from_row(r) for r in rows]


def mark_pushed(session: Session, domain: str, hubspot_id: str) -> None:
    """Record the claim: the firm is in HubSpot, drop it from the triage queue."""
    row = session.get(AccountRow, domain)
    if row is not None:
        row.pushed = True
        row.hubspot_id = hubspot_id
        row.stage = Stage.PUSHED.value
        session.commit()


def set_context_hash(session: Session, domain: str, context_hash: str) -> None:
    """Record the context we last synced to HubSpot, so an unchanged row isn't re-pushed."""
    row = session.get(AccountRow, domain)
    if row is not None:
        row.context_hash = context_hash
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
