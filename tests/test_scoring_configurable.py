"""Scoring honors a passed ScoringConfig; the default config reproduces today's numbers."""
from engine.models import Account, Signal, SignalKind, Vertical
from engine.scoring import abcr
from engine.scoring.config import ScoringConfig, DEFAULT_CONFIG


def _acct(vertical=Vertical.INDUSTRIAL_MANUFACTURING, linkedin=True, signals=()):
    a = Account(name="x", domain="x.com", vertical=vertical, state="OH",
                linkedin_url="u" if linkedin else "")
    a.signals = list(signals)
    return a


def _sig(kind, value):
    return Signal(kind=kind, source="t", value=value)


def test_default_config_matches_no_arg():
    # The default-config path must be identical to calling score() with no config.
    a = _acct(signals=[_sig(SignalKind.AI_CITATION_GAP, 1.0)])
    assert abcr.score(a).total == abcr.score(a, DEFAULT_CONFIG).total
    assert abcr.score(a).band == abcr.score(a, DEFAULT_CONFIG).band


def test_raising_fit_weight_lifts_high_fit_low_timing():
    a = _acct(signals=[_sig(SignalKind.SITE_QUALITY, 95.0)])   # good site → low timing
    default = abcr.score(a, ScoringConfig()).total
    heavy = abcr.score(a, ScoringConfig(fit_weight=0.9)).total
    assert heavy > default


def test_band_cutoff_change_demotes_from_a():
    a = _acct(signals=[_sig(SignalKind.AI_CITATION_GAP, 1.0)])   # strong timing → A
    assert abcr.score(a, ScoringConfig()).band == "A"
    assert abcr.score(a, ScoringConfig(band_a=99.0)).band != "A"


def test_vertical_bonus_change_lifts_fit():
    a = _acct(vertical=Vertical.RETAIL_ECOMMERCE)               # default bonus 2
    base = abcr.score(a, ScoringConfig()).fit
    bumped = dict(ScoringConfig().vertical_fit_bonus)
    bumped[Vertical.RETAIL_ECOMMERCE.value] = 40.0
    hi = abcr.score(a, ScoringConfig(vertical_fit_bonus=bumped)).fit
    assert hi > base
