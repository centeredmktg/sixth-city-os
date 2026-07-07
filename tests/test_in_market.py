"""in_market_status: positive-confirm | unknown — never engine-asserted negative."""
from engine.models import Account, Signal, SignalKind
from engine import routing


def _acct(*kinds):
    a = Account(name="x", domain="x.com")
    a.signals = [Signal(kind=k, source="t", value=1.0) for k in kinds]
    return a


def test_confirmed_on_intent_signal():
    status, reason = routing.in_market_status(_acct(SignalKind.ADS_ACTIVE))
    assert status == "confirmed" and "ads" in reason.lower()


def test_unknown_on_gap_signals_only():
    # gap/fit signals (need, not intent) do NOT confer in-market
    status, reason = routing.in_market_status(_acct(SignalKind.SEO_GAP, SignalKind.SITE_QUALITY))
    assert status == "unknown" and reason == ""


def test_unknown_when_no_signals():
    assert routing.in_market_status(_acct())[0] == "unknown"


def test_hiring_marketing_is_not_intent():
    # Strategy rejected hiring-for-marketing as a buy signal (a firm hiring marketers is
    # fixing it in-house = a harder sell). It must NOT confer in-market. The enum member
    # is kept only for backward-compatible deserialization; it is intentionally unwired.
    status, reason = routing.in_market_status(_acct(SignalKind.HIRING_MARKETING))
    assert status == "unknown" and reason == ""
