"""JOB: Places second pass. Runs the (paid) GooglePlacesSource on the top-N net-new
accounts already enriched by the free sources — NOT the whole list. Attaches contact
data + a LOCAL_SEO_GAP signal, re-scores, and flags places_enriched=True. Resumable
and idempotent: each call takes the next top-N where places_enriched is still False.
Net-new was settled in pass 1, so this job never re-checks HubSpot."""
from __future__ import annotations

from sqlalchemy.orm import Session

from engine.db.models import AccountRow, SignalRow
from engine.db import repo
from engine.scoring import abcr


def run(session: Session, limit: int = 200, source=None) -> dict:
    if source is None:
        from engine.sources.google_places import GooglePlacesSource
        source = GooglePlacesSource()

    rows = (session.query(AccountRow)
            .filter(AccountRow.pushed.is_(False), AccountRow.enriched.is_(True),
                    AccountRow.net_new.is_(True), AccountRow.places_enriched.is_(False))
            .order_by(AccountRow.total.desc())
            .limit(limit).all())

    for row in rows:
        acct = repo._account_from_row(row)
        try:
            sigs = source.enrich(acct)
        except Exception as e:
            print(f"  [enrich_places] {row.domain}: {type(e).__name__}: {e}")
            sigs = []
        for s in sigs:
            row.signals.append(SignalRow(kind=s.kind.value, source=s.source,
                                         value=s.value, detail=s.detail, observed_at=s.observed_at))
            acct.signals.append(s)
        acct.score = abcr.score(acct)
        row.fit, row.timing, row.total = acct.score.fit, acct.score.timing, acct.score.total
        row.band, row.score_rationale = acct.score.band, acct.score.rationale
        row.extra = acct.extra or {}
        row.places_enriched = True

    session.commit()
    remaining = (session.query(AccountRow)
                 .filter(AccountRow.pushed.is_(False), AccountRow.enriched.is_(True),
                         AccountRow.net_new.is_(True), AccountRow.places_enriched.is_(False))
                 .count())
    print(f"[enrich_places] enriched {len(rows)}; remaining {remaining}")
    return {"enriched": len(rows), "remaining": remaining}
