"""JOB: free deterministic enrichment over stored accounts. Chunked + resumable —
each call enriches up to `limit` not-yet-enriched, unpushed accounts (best-score
first). Net-new check happens FIRST (one batched HubSpot call per chunk). Only
net-new rows get signal sources + re-score; in-book rows are flagged enriched=True
/ net_new=False and skipped for signals (no credit, no waste). Resumable: each call
picks up where the last left off."""
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


def _default_existing_fn(domains: list[str]) -> set[str]:
    from engine.hubspot.client import HubSpotClient
    return HubSpotClient().existing_domains(domains)


def _collect(account, sources):
    out = []
    for src in sources:
        try:
            out.extend(src.enrich(account))
        except Exception:
            pass
    return account.domain, out


def run(session: Session, limit: int = 20, workers: int = 5, sources=None,
        existing_fn=None) -> dict:
    sources = sources if sources is not None else default_sources()
    existing_fn = existing_fn if existing_fn is not None else _default_existing_fn

    rows = (session.query(AccountRow)
            .filter(AccountRow.pushed.is_(False), AccountRow.enriched.is_(False))
            .order_by(AccountRow.total.desc())
            .limit(limit).all())
    by_domain = {r.domain: r for r in rows}
    accounts = {r.domain: repo._account_from_row(r) for r in rows}

    if not rows:
        remaining = 0
        print(f"[enrich] enriched 0; remaining {remaining}")
        return {"enriched": 0, "remaining": remaining}

    # --- net-new check (one batched HubSpot call for the whole chunk) ---
    existing = existing_fn(list(by_domain.keys()))
    net_new_domains = {d for d in by_domain if d.strip().lower() not in existing}
    in_book_domains = set(by_domain.keys()) - net_new_domains

    # Mark in-book rows immediately (no signals, no score churn)
    for domain in in_book_domains:
        row = by_domain[domain]
        row.net_new = False
        row.enriched = True

    # --- signal fetch (concurrent, only net-new) ---
    net_new_accounts = {d: accounts[d] for d in net_new_domains}
    results: dict[str, list] = {}
    if net_new_accounts:
        with ThreadPoolExecutor(max_workers=workers) as pool:
            for domain, sigs in pool.map(
                lambda a: _collect(a, sources), net_new_accounts.values()
            ):
                results[domain] = sigs

    # --- persist net-new rows ---
    for domain in net_new_domains:
        row = by_domain[domain]
        acct = accounts[domain]
        row.net_new = True
        for s in results.get(domain, []):
            row.signals.append(SignalRow(kind=s.kind.value, source=s.source,
                                         value=s.value, detail=s.detail, observed_at=s.observed_at))
            acct.signals.append(s)
        acct.score = abcr.score(acct)
        row.fit, row.timing, row.total = acct.score.fit, acct.score.timing, acct.score.total
        row.band, row.score_rationale = acct.score.band, acct.score.rationale
        row.extra = acct.extra or {}   # persist site-scraped emails (site_audit set them)
        row.enriched = True

    session.commit()

    remaining = (session.query(AccountRow)
                 .filter(AccountRow.pushed.is_(False), AccountRow.enriched.is_(False)).count())
    enriched_now = len(rows)
    print(f"[enrich] enriched {enriched_now}; remaining {remaining}")
    return {"enriched": enriched_now, "remaining": remaining}
