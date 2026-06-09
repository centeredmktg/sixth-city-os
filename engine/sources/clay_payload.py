"""
Clay payload ingester — the real top-of-funnel.

Clay does what Clay is best at: find ~50k firms matching ICP and enrich them for
FREE (domain, LinkedIn URL, and a PageSpeed score via Google auth). We ingest
that rich export and turn it into Accounts + signals — no API calls, no credits,
no tokens.

Because Clay already ran PageSpeed, this source emits the SITE_QUALITY signal
directly from the export's score column. The in-house PageSpeed source only fires
as a FALLBACK for domains that arrive without a score (non-Clay lists).

Input: a list of row dicts (from a Clay CSV/JSON export). Stub ships a small
sample so the loop runs offline. Real version: point csv_path at the export.
"""

from __future__ import annotations

import csv
from datetime import datetime

from engine.models import Account, Signal, SignalKind, Vertical
from engine.sources.base import DataSource

# A small sample mimicking a Clay free-payload export. Two rows carry a PageSpeed
# score (Clay enriched them); one arrives bare (the fallback eval would handle it).
SAMPLE_ROWS = [
    {"company": "Buckeye Industrial Supply", "domain": "buckeyeindustrial.example",
     "linkedin_url": "https://linkedin.com/company/buckeye-industrial",
     "vertical": "industrial_b2b", "city": "Cleveland", "pagespeed_mobile": "34"},
    {"company": "Lakeshore Dental Group", "domain": "lakeshoredental.example",
     "linkedin_url": "https://linkedin.com/company/lakeshore-dental",
     "vertical": "healthcare", "city": "Toledo", "pagespeed_mobile": "61"},
    {"company": "Maple City Movers", "domain": "maplecitymovers.example",
     "linkedin_url": "https://linkedin.com/company/maple-city-movers",
     "vertical": "home_services", "city": "Akron"},  # no score -> fallback eval territory
]


def _vertical(raw: str) -> Vertical:
    try:
        return Vertical(raw.strip().lower())
    except (ValueError, AttributeError):
        return Vertical.UNKNOWN


class ClayPayloadSource(DataSource):
    name = "clay"
    provides_accounts = True
    provides_signals = True

    def __init__(self, rows: list[dict] | None = None, csv_path: str | None = None):
        if csv_path:
            with open(csv_path, newline="", encoding="utf-8") as f:
                rows = list(csv.DictReader(f))
        self._rows = rows if rows is not None else SAMPLE_ROWS
        self._by_domain = {r["domain"]: r for r in self._rows}

    def discover(self) -> list[Account]:
        return [
            Account(
                name=r.get("company", r["domain"]),
                domain=r["domain"],
                vertical=_vertical(r.get("vertical", "")),
                linkedin_url=r.get("linkedin_url", ""),
                city=r.get("city", ""),
                extra={k: v for k, v in r.items()
                       if k not in {"company", "domain", "vertical", "linkedin_url",
                                    "city", "pagespeed_mobile"}},
                discovered_by=self.name,
            )
            for r in self._rows
        ]

    def enrich(self, account: Account) -> list[Signal]:
        """Emit the SITE_QUALITY signal straight from Clay's free PageSpeed score —
        no network call. Returns [] when the row had no score (fallback handles it)."""
        row = self._by_domain.get(account.domain, {})
        raw = row.get("pagespeed_mobile")
        if not raw:
            return []
        score = float(raw)
        return [
            Signal(
                kind=SignalKind.SITE_QUALITY,
                source=self.name,
                value=score,
                detail=(f"Mobile site scores {score:.0f}/100 on Google's performance "
                        f"audit. Slow, clunky load is quietly leaking conversions."),
                observed_at=None,
            )
        ]
