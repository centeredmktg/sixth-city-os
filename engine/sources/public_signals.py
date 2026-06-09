"""
Public-signal source — the Blueprint data moat (ADR/blueprint-gtm-proposal.html).

Emits the signals competing agencies won't do the work to gather: AI answer-engine
citation gaps, stale ad creatives (Ads Transparency Center), and local review
velocity. These ride in on export columns here; real version runs scripted
answer-engine prompts + Apify/Ads-Transparency crawlers. No tokens at score time.
"""

from __future__ import annotations

from engine.models import Account, Signal, SignalKind
from engine.sources.base import DataSource


def _i(e: dict, k: str):
    v = (e.get(k) or "").strip() if isinstance(e.get(k), str) else e.get(k)
    try:
        return int(float(v)) if v not in (None, "") else None
    except (TypeError, ValueError):
        return None


class PublicSignalsSource(DataSource):
    name = "public_signals"
    provides_accounts = False
    provides_signals = True

    def discover(self) -> list[Account]:
        return []

    def enrich(self, account: Account) -> list[Signal]:
        e = account.extra
        out: list[Signal] = []

        comp, cc, yc = (e.get("ai_competitor") or "").strip(), _i(e, "ai_comp_cites"), _i(e, "ai_you_cites")
        if comp and cc is not None and yc is not None and cc > yc:
            out.append(Signal(
                kind=SignalKind.AI_CITATION_GAP, source=self.name, value=float(cc - yc),
                detail=(f"Invisible to AI answer engines: {comp} is cited {cc}× where this site "
                        f"is cited {yc}× — despite ranking on Google. The fastest-growing gap in search."),
            ))

        mine, theirs = _i(e, "ad_creatives"), _i(e, "ad_competitor_creatives")
        if mine is not None and theirs is not None and theirs > mine:
            out.append(Signal(
                kind=SignalKind.ADS_STALE, source=self.name, value=float(theirs - mine),
                detail=(f"Running {mine} ad creative vs. a competitor's {theirs} — paid spend likely "
                        f"pointing at the homepage instead of dedicated landing pages."),
            ))

        you, comp_rev = _i(e, "rev_you_90d"), (e.get("rev_comp_90d") or "").strip()
        if you is not None and comp_rev:
            out.append(Signal(
                kind=SignalKind.REVIEW_VELOCITY, source=self.name, value=float(max(0, 20 - you)),
                detail=(f"Added {you} Google reviews in 90 days while local competitors added "
                        f"{comp_rev} — losing the map pack on review velocity, not quality."),
            ))

        return out
