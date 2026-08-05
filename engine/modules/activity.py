"""
What did we actually do? — the activity feed.

DERIVED, not stored. Every event comes from a column that already exists:

    saved     AccountRow.claimed_at
    emailed   MessageRow.sent_at   (status = 'sent')
    decided   AccountRow.decided_at
    promoted  AccountRow.pushed (True), timestamped by claimed_at when present —
              there is no pushed_at column, and a promote-without-prior-claim
              (see repo.mark_pushed / /api/push) leaves it null.

An events table would be a second source of truth that drifts from these three.

Grouped by company rather than served as an event stream: you can't act on a company
from a stream without hunting, and the whole point of the screen is the compose action
on the row.

Every event declares `source`. Nothing emits "hubspot" yet — the field is the seam so
that folding in HubSpot engagements later is an addition, not a reshape.
"""
from __future__ import annotations

from datetime import timezone

from sqlalchemy.orm import Session

from engine.db.models import AccountRow, MessageRow
from engine.modules import hubspot_links

_DEFAULT_INCLUDE = frozenset({"emailed", "promoted"})
_ALL = frozenset({"saved", "emailed", "decided", "promoted"})


def _iso(dt):
    # MessageRow.sent_at is a naive DateTime column (prod DDL: TIMESTAMP, no tz) —
    # Postgres hands back a naive datetime that's actually UTC. Without tzinfo,
    # `new Date(...)` in the browser parses it as viewer-local, silently shifting
    # every send time by the operator's UTC offset. Stamp UTC before serialising.
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def build(session: Session, include: set[str] | None = None, limit: int = 100) -> dict:
    """The feed. `include` widens the default (emailed-only) view; `limit` caps the
    companies returned but NEVER the totals — the operator asked for cumulative, and
    a total that describes only the page understates the work done."""
    include = frozenset(include) & _ALL if include else _DEFAULT_INCLUDE
    include = include | _DEFAULT_INCLUDE   # emailed + promoted are always shown
    limit = max(1, limit)   # limit=-1 (or 0) would silently drop rows instead of capping them

    # Four queries, flat regardless of company count.
    claimed_rows = (session.query(AccountRow)
                    .filter(AccountRow.claimed.is_(True)).all())
    decided_rows = (session.query(AccountRow)
                    .filter(AccountRow.route_confirmed.is_(True)).all())
    pushed_rows = (session.query(AccountRow)
                   .filter(AccountRow.pushed.is_(True)).all())
    sent_rows = (session.query(MessageRow)
                 .filter(MessageRow.status == "sent").all())

    totals = {"saved": len(claimed_rows), "emailed": len(sent_rows),
              "decided": len(decided_rows), "promoted": len(pushed_rows)}

    # domain -> {meta, events}
    acc: dict[str, dict] = {}

    def _slot(domain, row=None):
        entry = acc.setdefault(domain, {
            "domain": domain, "name": domain, "hubspot_url": None, "events": []})
        if row is not None:
            entry["name"] = row.name or domain
            entry["hubspot_url"] = hubspot_links.record_url(company_hubspot_id=row.hubspot_id)
        return entry

    # Every event type is always collected onto its company. `include` decides
    # which COMPANIES qualify for the view (below) — not which events display
    # once a company is in. A company admitted because it was emailed still
    # shows its saved/decided history; that's the whole point of the screen.
    for row in claimed_rows:
        _slot(row.domain, row)["events"].append({
            "type": "saved", "at": _iso(row.claimed_at), "source": "engine",
            "detail": row.discovered_by or "", "by": ""})

    for row in decided_rows:
        _slot(row.domain, row)["events"].append({
            "type": "decided", "at": _iso(row.decided_at), "source": "engine",
            "detail": row.route_confirmed_route or "", "by": row.route_confirmed_by or ""})

    # No pushed_at column exists (and none should be added). A promote-without-
    # prior-claim (/api/push on an unclaimed domain — its own docstring allows
    # this) has no timestamp to source; None sorts last, which the existing
    # sort already handles.
    for row in pushed_rows:
        _slot(row.domain, row)["events"].append({
            "type": "promoted", "at": _iso(row.claimed_at), "source": "engine",
            "detail": "", "by": ""})

    # get_candidates guards a falsy company_domain explicitly (repo.py) —
    # a sent row with no domain isn't a real company and must not become one.
    sent_rows = [m for m in sent_rows if m.company_domain]
    sent_domains = {m.company_domain for m in sent_rows}
    rows_by_domain = {r.domain: r for r in claimed_rows + decided_rows + pushed_rows}
    for m in sent_rows:
        entry = _slot(m.company_domain, rows_by_domain.get(m.company_domain))
        entry["events"].append({
            "type": "emailed", "at": _iso(m.sent_at), "source": "engine",
            "detail": m.contact_email or "", "by": m.sent_by or ""})

    # Emailed + promoted always qualify (the default, both outward actions);
    # saved/decided widen the set.
    visible = set(sent_domains) | {row.domain for row in pushed_rows}
    if "saved" in include:
        visible |= {row.domain for row in claimed_rows}
    if "decided" in include:
        visible |= {row.domain for row in decided_rows}
    companies = [c for c in acc.values() if c["domain"] in visible]

    for c in companies:
        c["events"].sort(key=lambda e: e["at"] or "", reverse=True)
        c["last_at"] = c["events"][0]["at"] if c["events"] else None
    companies.sort(key=lambda c: c["last_at"] or "", reverse=True)

    return {"companies": companies[:limit], "totals": totals, "count": len(companies)}
