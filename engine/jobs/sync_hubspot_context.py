"""JOB: sync the engine's assessment (score/band/route/why-now) onto the HubSpot company
records we claimed. Deliberate + batched — NOT auto-fired on every rescore. Only rows
whose context actually changed (hash differs) are pushed; only claimed companies with a
HubSpot id are touched (never John's book). Resumable: chunked + committed per chunk."""
from __future__ import annotations

import time

from sqlalchemy.orm import Session, selectinload

from engine.db.models import AccountRow
from engine.db import repo
from engine.modules import hubspot_context

_CHUNK = 100
_PACE_SEC = 0.2


def _dirty_rows(session: Session):
    """Claimed companies (with a HubSpot id) whose current context hash != stored."""
    # selectinload batches all signals in one query — without it, `_account_from_row`
    # lazy-loads signals per row (N+1); over ~4,300 claimed rows against remote Postgres
    # that's thousands of round-trips (times out / poisons the txn). Mirrors rescore_all.
    rows = (session.query(AccountRow)
            .options(selectinload(AccountRow.signals))
            .filter(AccountRow.claimed.is_(True), AccountRow.hubspot_id.isnot(None))
            .order_by(AccountRow.total.desc()).all())
    out = []
    for row in rows:
        account = repo._account_from_row(row)
        if hubspot_context.context_hash(account) != (row.context_hash or ""):
            out.append((row, account))
    return out


def pending_count(session: Session) -> int:
    return len(_dirty_rows(session))


def run(session: Session, limit: int | None = None, client=None) -> dict:
    if client is None:
        from engine.hubspot.client import HubSpotClient
        client = HubSpotClient()

    dirty = _dirty_rows(session)
    if limit is not None:
        dirty = dirty[:limit]

    synced = 0
    for i in range(0, len(dirty), _CHUNK):
        chunk = dirty[i:i + _CHUNK]
        for row, account in chunk:
            props = hubspot_context.context_properties(account)
            if client.update_context(row.hubspot_id, props):
                row.context_hash = hubspot_context.context_hash(account)
                synced += 1
            # failed update -> leave hash stale so the next run retries it
        session.commit()
        if i + _CHUNK < len(dirty):
            time.sleep(_PACE_SEC)

    remaining = pending_count(session)
    print(f"[sync-context] synced {synced}; remaining {remaining}")
    return {"synced": synced, "remaining": remaining, "error": None}
