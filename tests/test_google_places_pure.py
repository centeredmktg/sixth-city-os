from engine.models import SignalKind
from engine.sources.google_places import _host, _match_ok, gap_signal


def test_host_strips_scheme_and_www():
    assert _host("https://www.AcmeFab.com/contact") == "acmefab.com"
    assert _host("") == ""


def test_match_ok_accepts_matching_domain():
    listing = {"websiteUri": "https://www.acmefab.com", "displayName": {"text": "Acme Fab"}}
    assert _match_ok("acmefab.com", "Acme Fab", listing) is True


def test_match_ok_rejects_wrong_domain_listing():
    listing = {"websiteUri": "https://someoneelse.com", "displayName": {"text": "Other Co"}}
    assert _match_ok("acmefab.com", "Acme Fab", listing) is False


def test_match_ok_falls_back_to_name_when_no_website():
    listing = {"displayName": {"text": "Acme Fabrication LLC"}}
    assert _match_ok("acmefab.com", "Acme Fab", listing) is True
    assert _match_ok("acmefab.com", "Zzz Industries", listing) is False


def test_match_ok_rejects_match_on_generic_words_only():
    # Only generic business words overlap -> NOT a confident match (no stranger's phone).
    listing = {"displayName": {"text": "The LLC Auto Body"}}
    assert _match_ok("acmefab.com", "The LLC", listing) is False


def test_host_strips_query_and_fragment():
    assert _host("https://acmefab.com?ref=google") == "acmefab.com"
    assert _host("https://www.acmefab.com/path#top") == "acmefab.com"


def test_gap_signal_zero_reviews_uses_clean_copy():
    sig = gap_signal({"rating": 0.0, "userRatingCount": 0, "websiteUri": "https://acmefab.com"})
    assert sig is not None and sig.value == 0.6
    assert sig.detail == "No Google reviews yet"


def test_gap_signal_strong_when_no_listing():
    sig = gap_signal(None)
    assert sig is not None and sig.kind == SignalKind.LOCAL_SEO_GAP
    assert sig.value == 1.0 and "no" in sig.detail.lower()


def test_gap_signal_medium_on_low_review_count():
    sig = gap_signal({"rating": 4.6, "userRatingCount": 3, "websiteUri": "https://acmefab.com"})
    assert sig is not None and sig.value == 0.6


def test_gap_signal_none_when_strong_gbp():
    listing = {"rating": 4.7, "userRatingCount": 120, "websiteUri": "https://acmefab.com"}
    assert gap_signal(listing) is None
