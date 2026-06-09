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

from engine.models import Account, Score, SignalKind


# --- Fit: does this account look like Sixth City's kind of client? -----------
def _fit(account: Account) -> float:
    """0-100. Stub: vertical match is the only fit input we have pre-enrichment.
    Real version factors employee count, revenue band, locale tightness."""
    # Every account here was discovered against a target vertical, so baseline high.
    base = 70.0
    if account.state in ("OH",):
        base += 15  # local to Sixth City's six-city footprint
    return min(base, 100.0)


# --- Timing: how 'in-market' do the signals say they are? --------------------
def _timing(account: Account) -> float:
    """0-100 from buying signals. A bad website + active ad spend = very warm."""
    if not account.signals:
        return 0.0
    points = 0.0
    for s in account.signals:
        if s.kind == SignalKind.SITE_QUALITY:
            points += (100 - s.value) * 0.8   # worse site = warmer
        elif s.kind == SignalKind.ADS_ACTIVE:
            points += 60                       # budget already exists
        elif s.kind == SignalKind.SEO_GAP:
            points += 40
        elif s.kind == SignalKind.HIRING_MARKETING:
            points += 50
        else:
            points += s.value * 0.3
    return min(points, 100.0)


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
    total = fit * FIT_WEIGHT + timing * TIMING_WEIGHT
    band = _band(total)
    return Score(
        fit=round(fit, 1),
        timing=round(timing, 1),
        total=round(total, 1),
        band=band,
        rationale=f"fit {fit:.0f} × {FIT_WEIGHT} + timing {timing:.0f} × {TIMING_WEIGHT}",
    )
