"""JOB: free deterministic enrichment over stored accounts. Chunked + resumable —
each call enriches up to `limit` not-yet-enriched, unpushed accounts (best-score
first), attaches signals from the free sources, marks them enriched, re-scores, and
persists. Network fetch is concurrent; DB writes are serial (session not thread-safe)."""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor

from sqlalchemy.orm import Session

from engine.db.models import AccountRow, SignalRow
from engine.db import repo
from engine.scoring import abcr


def default_sources():
    from engine.sources.site_audit import SiteAuditSource
    from engine.sources.domain_age import DomainAgeSource
    from engine.sources.pagespeed import PageSpeedSource
    return [SiteAuditSource(), DomainAgeSource(), PageSpeedSource()]


def _collect(account, sources):
    out = []
    for src in sources:
        try:
            out.extend(src.enrich(account))
        except Exception:
            pass
    return account.domain, out


def run(session: Session, limit: int = 20, workers: int = 5, sources=None) -> dict:
    sources = sources if sources is not None else default_sources()

    rows = (session.query(AccountRow)
            .filter(AccountRow.pushed.is_(False), AccountRow.enriched.is_(False))
            .order_by(AccountRow.total.desc())
            .limit(limit).all())
    by_domain = {r.domain: r for r in rows}
    accounts = {r.domain: repo._account_from_row(r) for r in rows}

    results = {}
    with ThreadPoolExecutor(max_workers=workers) as pool:
        for domain, sigs in pool.map(lambda a: _collect(a, sources), accounts.values()):
            results[domain] = sigs

    for domain, row in by_domain.items():
        acct = accounts[domain]
        for s in results.get(domain, []):
            row.signals.append(SignalRow(kind=s.kind.value, source=s.source,
                                         value=s.value, detail=s.detail, observed_at=s.observed_at))
            acct.signals.append(s)
        acct.score = abcr.score(acct)
        row.fit, row.timing, row.total = acct.score.fit, acct.score.timing, acct.score.total
        row.band, row.score_rationale = acct.score.band, acct.score.rationale
        row.enriched = True
    session.commit()

    remaining = (session.query(AccountRow)
                 .filter(AccountRow.pushed.is_(False), AccountRow.enriched.is_(False)).count())
    enriched_now = len(rows)
    print(f"[enrich] enriched {enriched_now}; remaining {remaining}")
    return {"enriched": enriched_now, "remaining": remaining}
