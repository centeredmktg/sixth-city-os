"""Vertical fit is win-rate-weighted, not flat — the data-backed scoring change."""
from engine.models import Account, Vertical
from engine.scoring.abcr import _fit


def _acct(vertical):
    # same locale/reachability so only the vertical varies
    return Account(name="x", domain="x.com", vertical=vertical, state="OH")


def test_industrial_outscores_retail_on_fit():
    """The spine (Industrial B2B, ~25% win) must beat Ecommerce/retail (~6%)."""
    assert _fit(_acct(Vertical.INDUSTRIAL_B2B)) > _fit(_acct(Vertical.ECOMMERCE))


def test_unknown_is_not_penalized():
    """Missing a vertical tag never scores below a known low-win vertical —
    historical unknowns closed ~24%."""
    assert _fit(_acct(Vertical.UNKNOWN)) >= _fit(_acct(Vertical.ECOMMERCE))


def test_fit_stays_bounded():
    for v in Vertical:
        assert 0.0 <= _fit(_acct(v)) <= 100.0
