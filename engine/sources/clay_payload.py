"""
Clay payload ingester — the real top-of-funnel.

Clay does what Clay is best at: find firms matching ICP and enrich them for FREE
(domain, LinkedIn URL, industry, and a PageSpeed score via Google auth). We ingest
that export and turn it into Accounts + signals — no API calls, no credits.

Real Clay exports use human/LinkedIn column headers (`Domain`, `Name`, `Primary
Industry`, `LinkedIn URL`, `Location`) — NOT lowercase snake_case. So we normalize
headers (case-insensitive synonyms) and resolve `vertical` from a `vertical` column
if present, else by mapping the raw `Primary Industry` via Vertical.from_industry.

Input: a list of row dicts (Clay CSV/JSON export). Stub ships a small sample so the
loop runs offline. Real version: point csv_path at the export.
"""

from __future__ import annotations

import csv
import re

from engine.models import Account, Signal, SignalKind, Vertical
from engine.sources.base import DataSource

# Small sample mimicking a Clay free-payload export (canonical lowercase keys —
# still resolved via the synonyms below).
SAMPLE_ROWS = [
    {"company": "Buckeye Industrial Supply", "domain": "buckeyeindustrial.example",
     "linkedin_url": "https://linkedin.com/company/buckeye-industrial",
     "vertical": "industrial_manufacturing", "city": "Cleveland", "pagespeed_mobile": "34"},
    {"company": "Lakeshore Dental Group", "domain": "lakeshoredental.example",
     "linkedin_url": "https://linkedin.com/company/lakeshore-dental",
     "vertical": "healthcare", "city": "Toledo", "pagespeed_mobile": "61"},
    {"company": "Maple City Movers", "domain": "maplecitymovers.example",
     "linkedin_url": "https://linkedin.com/company/maple-city-movers",
     "vertical": "home_construction", "city": "Akron"},  # no score -> fallback eval territory
]

# Real Clay/LinkedIn headers vary in case + naming. Map them to canonical fields.
SYNONYMS = {
    "domain":           ["domain", "company domain", "website", "website url", "domain name"],
    "company":          ["company", "name", "company name"],
    "vertical":         ["vertical"],
    "industry":         ["primary industry", "industry"],
    "linkedin_url":     ["linkedin url", "linkedin_url", "linkedin"],
    "city":             ["city"],
    "location":         ["location"],
    "pagespeed_mobile": ["pagespeed_mobile", "pagespeed mobile", "mobile performance", "pagespeed"],
    "ads_active":       ["ads_active", "ads active", "ad count", "active ads"],
}
# Identity/firmographic keys consumed into first-class fields (so they're not
# duplicated into extra{}). Signal columns (pagespeed/ads) are intentionally left in
# extra too — harmless, and downstream readers find them by canonical name.
_CORE_KEYS = {n for f in ("domain", "company", "vertical", "industry",
                          "linkedin_url", "city", "location") for n in SYNONYMS[f]}


def _to_float(raw) -> float | None:
    try:
        return float(raw)
    except (TypeError, ValueError):
        return None


def _to_int(raw) -> int | None:
    try:
        return int(raw)
    except (TypeError, ValueError):
        return None


def _lower_keys(row: dict) -> dict:
    return {(k or "").strip().lower(): ("" if v is None else v) for k, v in row.items()}


def _get(lrow: dict, field: str) -> str:
    for name in SYNONYMS.get(field, [field]):
        val = lrow.get(name)
        if val is not None and str(val).strip():
            return str(val).strip()
    return ""


def _clean_domain(raw: str) -> str:
    d = re.sub(r"^https?://", "", (raw or "").strip().lower()).split("/")[0]
    return d[4:] if d.startswith("www.") else d


def _resolve_vertical(lrow: dict) -> Vertical:
    """Prefer an explicit canonical `vertical` column; else map raw `industry`."""
    v = _get(lrow, "vertical")
    if v:
        return Vertical.from_hubspot(v)
    return Vertical.from_industry(_get(lrow, "industry"))


def has_domain_column(rows: list[dict]) -> bool:
    if not rows:
        return False
    keys = {(k or "").strip().lower() for k in rows[0]}
    return bool(keys & set(SYNONYMS["domain"]))


class ClayPayloadSource(DataSource):
    name = "clay"
    provides_accounts = True
    provides_signals = True

    def __init__(self, rows: list[dict] | None = None, csv_path: str | None = None):
        if csv_path:
            with open(csv_path, newline="", encoding="utf-8-sig") as f:
                rows = list(csv.DictReader(f))
        raw_rows = rows if rows is not None else SAMPLE_ROWS
        self._norm = [self._normalize(r) for r in raw_rows]
        self._by_domain = {n["domain"]: n for n in self._norm if n["domain"]}

    @staticmethod
    def _normalize(raw: dict) -> dict:
        lrow = _lower_keys(raw)
        city = _get(lrow, "city") or _get(lrow, "location").split(",")[0].strip()
        return {
            "domain": _clean_domain(_get(lrow, "domain")),
            "company": _get(lrow, "company"),
            "vertical": _resolve_vertical(lrow),
            "linkedin_url": _get(lrow, "linkedin_url"),
            "city": city,
            "extra": {k: v for k, v in raw.items() if (k or "").strip().lower() not in _CORE_KEYS},
            "lrow": lrow,
        }

    def discover(self) -> list[Account]:
        accounts = []
        for n in self._norm:
            if not n["domain"]:
                continue   # no domain = can't identify or dedupe; skip
            accounts.append(Account(
                name=n["company"] or n["domain"],
                domain=n["domain"],
                vertical=n["vertical"],
                linkedin_url=n["linkedin_url"],
                city=n["city"],
                extra=n["extra"],
                discovered_by=self.name,
            ))
        return accounts

    def enrich(self, account: Account) -> list[Signal]:
        """Emit signals straight from Clay's free enrichment columns — no network
        call. The two-source gate (routing.MIN_AGREEING_SIGNALS) means a firm needs
        ≥2 distinct signal kinds to reach the closer; a single column parks it."""
        n = self._by_domain.get(account.domain)
        if not n:
            return []
        lrow = n["lrow"]
        signals: list[Signal] = []

        score = _to_float(_get(lrow, "pagespeed_mobile"))
        if score is not None:
            signals.append(Signal(
                kind=SignalKind.SITE_QUALITY, source=self.name, value=score,
                detail=(f"Mobile site scores {score:.0f}/100 on Google's performance "
                        f"audit. Slow, clunky load is quietly leaking conversions."),
                observed_at=None,
            ))

        count = _to_int(_get(lrow, "ads_active"))
        if count and count > 0:
            signals.append(Signal(
                kind=SignalKind.ADS_ACTIVE, source=self.name, value=float(count),
                detail=(f"Running {count} live paid ad(s) — budget's already committed. "
                        f"They're buying traffic a site this slow can't convert."),
                observed_at=None,
            ))

        return signals
