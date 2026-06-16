from engine.sources.site_audit import parse
from engine.models import SignalKind

GOOD = ('<html><head><title>Acme Tool & Die — CNC Machining</title>'
        '<meta name="description" content="Precision CNC machining in Cleveland.">'
        '<script src="https://www.googletagmanager.com/gtag/js?id=AW-123"></script>'
        '<script type="application/ld+json">{"@type":"Organization"}</script>'
        '</head><body><h1>Precision Machining</h1></body></html>')

BARE = ('<html><head></head><body>'
        '<p>Welcome to our site. Copyright 2019.</p></body></html>')


def test_ad_pixel_yields_ads_active():
    kinds = {s.kind for s in parse(GOOD, {}, "https://acme.com")}
    assert SignalKind.ADS_ACTIVE in kinds


def test_bare_page_yields_seo_gap_and_no_ads():
    sigs = parse(BARE, {}, "https://bare.com")
    kinds = {s.kind for s in sigs}
    assert SignalKind.SEO_GAP in kinds
    assert SignalKind.ADS_ACTIVE not in kinds
    assert SignalKind.CONTENT_GAP in kinds


def test_well_built_page_has_no_seo_gap():
    kinds = {s.kind for s in parse(GOOD, {}, "https://acme.com")}
    assert SignalKind.SEO_GAP not in kinds
    assert SignalKind.CONTENT_GAP not in kinds


def test_parse_never_raises_on_garbage():
    assert isinstance(parse("", {}, "https://x.com"), list)
    parse("<html", {}, "https://x.com")
