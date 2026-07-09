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
from engine.scoring.config import ScoringConfig, get_active_config, DEFAULT_VERTICAL_FIT_BONUS


# Vertical fit weights now live as the DEFAULTS on ScoringConfig
# (config.DEFAULT_VERTICAL_FIT_BONUS) so the team can tune them from the console;
# scoring reads whatever the active/passed config carries. This enum-keyed alias is a
# read-only convenience for callers/tests that want the default weights by Vertical.
VERTICAL_FIT_BONUS = {v: DEFAULT_VERTICAL_FIT_BONUS[v.value] for v in Vertical}


# --- Fit: does this account look like Sixth City's kind of client? -----------
def _fit(account: Account, config: ScoringConfig | None = None) -> float:
    """0-100. Pre-enrichment fit: vertical match + locale. Real version adds
    employee count, revenue band, locale tightness."""
    config = config or get_active_config()
    base = 55.0
    base += config.vertical_fit_bonus.get(account.vertical.value, 10.0)  # win-rate-weighted
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


# --- Composite + band: now team-tunable via ScoringConfig --------------------
# The fit/timing balance and the A/B/C/R cutoffs are the levers that decide what the
# closer works first. They live on ScoringConfig (defaults = the historical constants)
# and are adjustable from the console Scoring screen. score() reads the passed config,
# or the active one (get_active_config()) when none is given.


def _band(total: float, config: ScoringConfig | None = None) -> str:
    config = config or get_active_config()
    if total >= config.band_a:
        return "A"
    if total >= config.band_b:
        return "B"
    if total >= config.band_c:
        return "C"
    return "R"   # reject / nurture later


def score(account: Account, config: ScoringConfig | None = None) -> Score:
    config = config or get_active_config()
    fit = _fit(account, config)
    timing = _timing(account)
    base = fit * config.fit_weight + timing * config.timing_weight

    # Office-hub proximity boost: accounts near a Sixth City hub score higher
    # (local advantage = higher fit + close). A STAFFED hub (people, not just a
    # ranking address) lifts the ceiling further — see geo.proximity_weight.
    prox = geo.proximity_weight(account, config)
    total = min(100.0, base * prox)

    prox_note = ""
    if prox != 1.0:
        staffed = geo.nearest_staffed_hub(account, config)
        tag = f" (staffed: {staffed.city})" if staffed else ""
        prox_note = f" × proximity {prox:.2f}{tag}"
    return Score(
        fit=round(fit, 1),
        timing=round(timing, 1),
        total=round(total, 1),
        band=_band(total, config),
        rationale=f"fit {fit:.0f} × {config.fit_weight} + timing {timing:.0f} × {config.timing_weight:.2f}{prox_note}",
    )
