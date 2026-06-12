"""
ABCR lead scoring -> wraps Centered skill `outbound-engine/lead-scoring-abcr`.

Two axes:
  fit    = how well the account matches Sixth City's ICP (vertical, size, locale)
  timing = how 'in-market' the signals say they are RIGHT NOW

Composite -> A/B/C/R band. The closer works A's first, never a random pile.

This is the one place where Danny's domain judgment changes the machine's
behavior most: how fit vs timing trade off, and where the band cutoffs sit,
decide which accounts the closer spends the day on. The defaults below are a
starting point — tune them against real Sixth City close data once it exists.
"""

from __future__ import annotations

from engine import geo
from engine.models import Account, Score, SignalKind, Vertical


# Vertical fit weights — from the full 2017–2026 Sales-Pipeline win analysis
# (deal-terms repo: analysis/clay-tam-spec.md). The old code added a flat +12 for
# ANY known vertical, scoring Real Estate (27% win) the same as Retail (6%). These
# bonuses spread that out by how much better than the 19.3% baseline each vertical
# historically closes. UNKNOWN stays neutral-positive: unlabeled accounts closed at
# ~24% historically, so missing a tag is never a penalty.
#   NOTE: the enum can't yet express Real Estate / Education / Automotive (all
#   above-baseline winners) — they fall into UNKNOWN today. Expanding Vertical to
#   capture them is the higher-value follow-up (touches design spec §4 + tagging).
VERTICAL_FIT_BONUS = {
    Vertical.INDUSTRIAL_B2B: 16,   # ~25% win — the spine (Mechanical/Industrial Eng)
    Vertical.HEALTHCARE:     10,   # ~17% win — high value, slower cycle
    Vertical.LEGAL:           6,   # ~14% win — rare, but fast + high-value when it lands
    Vertical.HOME_SERVICES:   6,   # ~14% win (construction) — volume trap; gate on signals
    Vertical.ECOMMERCE:       2,   # ~6% win (retail) — proven friction
    Vertical.UNKNOWN:        10,   # neutral-positive; historical unknowns closed ~24%
}


# --- Fit: does this account look like Sixth City's kind of client? -----------
def _fit(account: Account) -> float:
    """0-100. Pre-enrichment fit: vertical match + locale. Real version adds
    employee count, revenue band, locale tightness."""
    base = 55.0
    base += VERTICAL_FIT_BONUS.get(account.vertical, 10)  # win-rate-weighted (see above)
    if account.state in ("OH",):
        base += 10  # in the six-city footprint
    if account.linkedin_url:
        base += 5   # reachable decision-makers
    return min(base, 100.0)


# --- Timing: how 'in-market' do the signals say they are? --------------------
def _timing(account: Account) -> float:
    """0-100 from buying signals. A bad website + active ad spend = very warm."""
    if not account.signals:
        return 0.0

    def contribution(s) -> float:
        if s.kind == SignalKind.SITE_QUALITY:
            return (100 - s.value) * 0.8   # worse site = warmer
        if s.kind == SignalKind.AI_CITATION_GAP:
            return 70                       # flagship moat pain — competitors won't surface this
        if s.kind == SignalKind.ADS_STALE:
            return 55                       # active spend + obvious leak = warm + budget exists
        if s.kind == SignalKind.REVIEW_VELOCITY:
            return 45
        if s.kind == SignalKind.ADS_ACTIVE:
            return 60                       # budget already exists
        if s.kind == SignalKind.LOCAL_SEO_GAP:
            return 45                       # missing GBP = obvious quick win
        if s.kind == SignalKind.KEYWORD_GAP:
            return min(s.value, 50) * 0.7   # big keyword gap = lots of upside
        if s.kind == SignalKind.SEO_GAP:
            return 40
        if s.kind == SignalKind.BACKLINK_GAP:
            return 30
        if s.kind == SignalKind.CONTENT_GAP:
            return 25
        if s.kind == SignalKind.HIRING_MARKETING:
            return 50
        return s.value * 0.3

    # Diminishing returns: the strongest signal counts full, each next one less.
    # Many gaps still mean a warmer lead, but stacking doesn't trivially max out —
    # which keeps scores spread and believable instead of a wall of 100s.
    contribs = sorted((contribution(s) for s in account.signals), reverse=True)
    timing = sum(c * (0.55 ** i) for i, c in enumerate(contribs))
    return min(timing, 100.0)


# --- Composite + band: Danny's call ------------------------------------------
# TODO(Danny): this is the lever that decides what the closer works first.
#   1. How should fit and timing trade off? (e.g. 0.5/0.5, or timing-heavy 0.3/0.7
#      because a perfect-fit account that isn't in-market wastes the closer's day?)
#   2. Where do the A/B/C/R cutoffs sit on the 0-100 composite?
# Replace the two constants + the band ladder with your judgment. ~6 lines.
FIT_WEIGHT = 0.4
TIMING_WEIGHT = 0.6


def _band(total: float) -> str:
    if total >= 75:
        return "A"
    if total >= 55:
        return "B"
    if total >= 35:
        return "C"
    return "R"   # reject / nurture later


def score(account: Account) -> Score:
    fit = _fit(account)
    timing = _timing(account)
    base = fit * FIT_WEIGHT + timing * TIMING_WEIGHT

    # Office-hub proximity boost: accounts near a Sixth City hub score higher
    # (local advantage = higher fit + close). Neutral (1.0) until hubs are set.
    prox = geo.proximity_weight(account)
    total = min(100.0, base * prox)

    prox_note = f" × proximity {prox:.2f}" if prox != 1.0 else ""
    return Score(
        fit=round(fit, 1),
        timing=round(timing, 1),
        total=round(total, 1),
        band=_band(total),
        rationale=f"fit {fit:.0f} × {FIT_WEIGHT} + timing {timing:.0f} × {TIMING_WEIGHT}{prox_note}",
    )
