from datetime import date
from engine.modules import hubspot_context as hc
from engine.models import Account, Score, RouteDecision, Route, Signal, SignalKind


def _acct():
    a = Account(name="Buckeye", domain="buckeye.example")
    a.score = Score(fit=70.0, timing=50.0, total=61.6, band="A")
    a.route = RouteDecision(recommended=Route.CLOSER, rationale="")
    a.signals = [Signal(kind=SignalKind.SITE_QUALITY, source="pagespeed", value=0.45,
                        detail="Mobile site scores 45/100 on Google's performance test."),
                 Signal(kind=SignalKind.ADS_ACTIVE, source="clay", value=0.8,
                        detail="Running 3 live paid ad(s) — budget's already committed.")]
    return a


def test_context_properties_maps_all_five():
    p = hc.context_properties(_acct())
    assert p[hc.PROP_SCORE] == "62"           # round(61.6) as string
    assert p[hc.PROP_BAND] == "A"
    assert p[hc.PROP_ROUTE] == "closer"
    assert "Mobile site scores 45/100" in p[hc.PROP_WHY]
    assert "Running 3 live paid" in p[hc.PROP_WHY]
    assert p[hc.PROP_SYNCED] == date.today().isoformat()


def test_defaults_when_unscored_unrouted_no_signals():
    a = Account(name="X", domain="x.example")
    p = hc.context_properties(a)
    assert p[hc.PROP_SCORE] == "0"
    assert p[hc.PROP_BAND] == "R"
    assert p[hc.PROP_ROUTE] == "hold"
    assert p[hc.PROP_WHY] == ""


def test_why_now_capped():
    a = Account(name="X", domain="x.example")
    a.signals = [Signal(kind=SignalKind.SITE_QUALITY, source="s", value=0.5, detail="x" * 400),
                 Signal(kind=SignalKind.ADS_ACTIVE, source="s", value=0.5, detail="y" * 400)]
    assert len(hc.context_properties(a)[hc.PROP_WHY]) <= 500


def test_hash_stable_and_excludes_last_synced():
    a = _acct()
    h1 = hc.context_hash(a)
    h2 = hc.context_hash(a)
    assert h1 == h2                     # deterministic (date does not leak in)
    a.score = Score(fit=70.0, timing=50.0, total=40.0, band="C")   # score change
    assert hc.context_hash(a) != h1     # dirty on real change
