from engine.jobs import find_accounts
from engine.sources.clay_payload import ClayPayloadSource


def test_run_uses_injected_source_not_registry():
    rows = [{"company": "Inj", "domain": "inj.example", "vertical": "industrial_b2b",
             "city": "Cleveland", "pagespeed_mobile": "30", "ads_active": "2"}]
    src = ClayPayloadSource(rows=rows)
    found = find_accounts.run(sources=[src])
    domains = {a.domain for a in found}
    assert domains == {"inj.example"}
    a = found[0]
    assert {s.kind.value for s in a.signals} >= {"site_quality", "ads_active"}
