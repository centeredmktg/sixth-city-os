"""JOB: auto-claim every net-new company into HubSpot as engine-sourced. Resumable —
each call claims up to `limit` net-new, not-yet-claimed rows. This is the discovery
dibs: it runs regardless of whether an operator ever works the company. Lean: company
only, no contact, no outreach draft. Owner is REQUIRED (never create unassigned)."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from engine.db.models import AccountRow
from engine.db import repo, settings_repo


def run(session: Session, limit: int | None = None, client=None, owner_id=None) -> dict:
    if client is None:
        from engine.hubspot.client import HubSpotClient
        client = HubSpotClient()
    if owner_id is None:
        owner_id = settings_repo.load_default_owner_id(session)

    # Never flood HubSpot with ownerless records — refuse the whole run.
    if not owner_id:
        print("[claim] no default owner set — refusing to claim (never unassigned)")
        return {"claimed": 0, "remaining": None, "error": "no_default_owner"}

    q = (session.query(AccountRow)
         .filter(AccountRow.net_new.is_(True),
                 AccountRow.claimed.is_(False),
                 AccountRow.pushed.is_(False))
         .order_by(AccountRow.total.desc()))
    if limit:
        q = q.limit(limit)
    rows = q.all()

    claimed = 0
    for row in rows:
        account = repo._account_from_row(row)
        try:
            hid = client.claim_company(account, owner_id=owner_id)
        except Exception as e:  # a single firm's failure never aborts the batch
            print(f"  [claim] {row.domain} failed ({type(e).__name__}: {e})")
            continue
        if hid:
            row.claimed = True
            row.claimed_at = datetime.now(timezone.utc)
            if not row.hubspot_id:
                row.hubspot_id = hid
            claimed += 1
    session.commit()

    remaining = (session.query(AccountRow)
                 .filter(AccountRow.net_new.is_(True), AccountRow.claimed.is_(False),
                         AccountRow.pushed.is_(False)).count())
    print(f"[claim] claimed {claimed}; remaining {remaining}")
    return {"claimed": claimed, "remaining": remaining, "error": None}
