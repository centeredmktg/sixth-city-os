"""Vertical fit is win-rate-weighted, not flat — the data-backed scoring change."""
from engine.models import Account, Signal, SignalKind, Vertical
from engine.scoring.abcr import _fit, _timing, VERTICAL_FIT_BONUS


def _acct(vertical):
    # same locale/reachability so only the vertical varies
    return Account(name="x", domain="x.com", vertical=vertical, state="OH")


def test_industrial_outscores_retail_on_fit():
    """The spine (Industrial Manufacturing, ~25% win) must beat Retail/Ecommerce (~6%)."""
    assert _fit(_acct(Vertical.INDUSTRIAL_MANUFACTURING)) > _fit(_acct(Vertical.RETAIL_ECOMMERCE))


def test_unknown_is_not_penalized():
    """Missing a vertical tag never scores below a known low-win vertical —
    historical unknowns closed ~24%."""
    assert _fit(_acct(Vertical.UNKNOWN)) >= _fit(_acct(Vertical.RETAIL_ECOMMERCE))


def test_fit_stays_bounded():
    for v in Vertical:
        assert 0.0 <= _fit(_acct(v)) <= 100.0


def test_every_vertical_has_a_weight():
    assert set(VERTICAL_FIT_BONUS) == set(Vertical)


def test_weight_ordering_matches_win_history():
    b = VERTICAL_FIT_BONUS
    assert b[Vertical.INDUSTRIAL_MANUFACTURING] == b[Vertical.REAL_ESTATE] == 16
    assert b[Vertical.RETAIL_ECOMMERCE] == 2
    assert b[Vertical.INDUSTRIAL_MANUFACTURING] > b[Vertical.HEALTHCARE] > b[Vertical.RETAIL_ECOMMERCE]


def test_hiring_marketing_has_no_special_timing_weight():
    """Dead, strategy-rejected signal: no bespoke +50 boost. It falls through to the
    generic weak contribution (value * 0.3) like any unmapped signal — pre-removal this
    returned a fixed 50, contradicting the thesis that hiring marketers = harder sell."""
    a = Account(name="x", domain="x.com")
    a.signals = [Signal(kind=SignalKind.HIRING_MARKETING, source="t", value=10.0)]
    assert _timing(a) == 10.0 * 0.3
