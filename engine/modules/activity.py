"""
What did we actually do? — the activity feed.

DERIVED, not stored. Every event comes from a column that already exists:

    saved    AccountRow.claimed_at
    emailed  MessageRow.sent_at   (status = 'sent')
    decided  AccountRow.decided_at

An events table would be a second source of truth that drifts from these three.

Grouped by company rather than served as an event stream: you can't act on a company
from a stream without hunting, and the whole point of the screen is the compose action
on the row.

Every event declares `source`. Nothing emits "hubspot" yet — the field is the seam so
that folding in HubSpot engagements later is an addition, not a reshape.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from engine.db.models import AccountRow, MessageRow
from engine.modules import hubspot_links

_DEFAULT_INCLUDE = frozenset({"emailed"})
_ALL = frozenset({"saved", "emailed", "decided"})


def _iso(dt):
    return dt.isoformat() if dt else None


def build(session: Session, include: set[str] | None = None, limit: int = 100) -> dict:
    """The feed. `include` widens the default (emailed-only) view; `limit` caps the
    companies returned but NEVER the totals — the operator asked for cumulative, and
    a total that describes only the page understates the work done."""
    include = frozenset(include) & _ALL if include else _DEFAULT_INCLUDE
    include = include | _DEFAULT_INCLUDE   # emailed is always shown

    # Three queries, flat regardless of company count.
    claimed_rows = (session.query(AccountRow)
                    .filter(AccountRow.claimed.is_(True)).all())
    decided_rows = (session.query(AccountRow)
                    .filter(AccountRow.route_confirmed.is_(True)).all())
    sent_rows = (session.query(MessageRow)
                 .filter(MessageRow.status == "sent").all())

    totals = {"saved": len(claimed_rows), "emailed": len(sent_rows),
              "decided": len(decided_rows)}

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

    sent_domains = {m.company_domain for m in sent_rows}
    rows_by_domain = {r.domain: r for r in claimed_rows + decided_rows}
    for m in sent_rows:
        entry = _slot(m.company_domain, rows_by_domain.get(m.company_domain))
        entry["events"].append({
            "type": "emailed", "at": _iso(m.sent_at), "source": "engine",
            "detail": m.contact_email or "", "by": m.sent_by or ""})

    # Emailed always qualifies (the default); saved/decided widen the set.
    visible = set(sent_domains)
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
