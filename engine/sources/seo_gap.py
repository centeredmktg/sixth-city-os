"""
SEO-gap source — the bespoke-OS surface that speaks an SEO agency's language.

John runs an SEO/PPC shop and has SEO tools (Ahrefs/SEMrush-class) that quantify
gaps. This source reads those gap metrics off the ingested row (extra{}) and turns
them into signals worded the way an SEO audit would read — so the engine evaluates
a prospect the way John would, automatically, and fuses it into one score alongside
PageSpeed and proximity.

Real version pulls these from the SEO tool's API. Here they ride in on the export
columns (keyword_gap, backlinks_lost_90d, gbp_optimized, thin_pages, organic_kw),
so the source just reads + narrates. No tokens.
"""

from __future__ import annotations

from engine.models import Account, Signal, SignalKind
from engine.sources.base import DataSource


def _int(row: dict, key: str) -> int | None:
    raw = row.get(key)
    if raw in (None, ""):
        return None
    try:
        return int(float(raw))
    except (TypeError, ValueError):
        return None


class SeoGapSource(DataSource):
    name = "seo_gap"
    provides_accounts = False
    provides_signals = True

    def discover(self) -> list[Account]:
        return []

    def enrich(self, account: Account) -> list[Signal]:
        e = account.extra
        out: list[Signal] = []

        kw_gap = _int(e, "keyword_gap")
        if kw_gap:
            out.append(Signal(
                kind=SignalKind.KEYWORD_GAP, source=self.name, value=float(kw_gap),
                detail=(f"Competitors rank for {kw_gap} high-intent local keywords this "
                        f"site doesn't show up for — direct page-1 opportunity."),
            ))

        if (e.get("gbp_optimized") or "").strip().lower() in ("no", "false", "0"):
            out.append(Signal(
                kind=SignalKind.LOCAL_SEO_GAP, source=self.name, value=80.0,
                detail=("Google Business Profile unclaimed or unoptimized — invisible in "
                        "the local 3-pack, where the majority of local clicks land."),
            ))

        lost = _int(e, "backlinks_lost_90d")
        if lost:
            out.append(Signal(
                kind=SignalKind.BACKLINK_GAP, source=self.name, value=float(lost),
                detail=(f"Lost {lost} referring domains in 90 days — authority is bleeding "
                        f"while competitors gain links."),
            ))

        thin = _int(e, "thin_pages")
        if thin:
            out.append(Signal(
                kind=SignalKind.CONTENT_GAP, source=self.name, value=float(thin),
                detail=(f"{thin} core service pages are thin or missing — nothing built to "
                        f"rank for high-value services."),
            ))

        organic = _int(e, "organic_kw")
        if organic is not None and organic < 50:
            out.append(Signal(
                kind=SignalKind.SEO_GAP, source=self.name, value=float(organic),
                detail=(f"Only {organic} keywords ranking organically — minimal search "
                        f"visibility for a business this size."),
            ))

        return out
