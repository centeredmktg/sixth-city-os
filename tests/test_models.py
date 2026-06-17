from engine.models import Vertical


def test_all_canonical_verticals_exist():
    expected = {
        "industrial_manufacturing", "real_estate", "education", "professional_b2b",
        "healthcare", "automotive", "legal", "home_construction",
        "retail_ecommerce", "unknown",
    }
    assert {v.value for v in Vertical} == expected


def test_from_hubspot_maps_known_value():
    assert Vertical.from_hubspot("real_estate") is Vertical.REAL_ESTATE
    assert Vertical.from_hubspot("  Industrial_Manufacturing ") is Vertical.INDUSTRIAL_MANUFACTURING


def test_from_hubspot_blank_or_unknown_is_unknown():
    assert Vertical.from_hubspot("") is Vertical.UNKNOWN
    assert Vertical.from_hubspot(None) is Vertical.UNKNOWN
    assert Vertical.from_hubspot("not_a_vertical") is Vertical.UNKNOWN


def test_from_hubspot_never_raises_on_non_string():
    """Contract is 'never raises' — a numeric/NaN payload value degrades, not crash."""
    assert Vertical.from_hubspot(5) is Vertical.UNKNOWN
    assert Vertical.from_hubspot(float("nan")) is Vertical.UNKNOWN


def test_from_industry_maps_linkedin_strings():
    assert Vertical.from_industry("Industrial Machinery Manufacturing") is Vertical.INDUSTRIAL_MANUFACTURING
    assert Vertical.from_industry("Advertising Services") is Vertical.PROFESSIONAL_B2B
    assert Vertical.from_industry("Construction") is Vertical.HOME_CONSTRUCTION
    assert Vertical.from_industry("Hospitals and Health Care") is Vertical.HEALTHCARE
    assert Vertical.from_industry("Motor Vehicle Manufacturing") is Vertical.AUTOMOTIVE  # before industrial
    assert Vertical.from_industry("Law Practice") is Vertical.LEGAL
    assert Vertical.from_industry("Real Estate") is Vertical.REAL_ESTATE


def test_from_industry_blank_or_unmatched_is_unknown():
    assert Vertical.from_industry("Non-profit Organizations") is Vertical.UNKNOWN
    assert Vertical.from_industry("") is Vertical.UNKNOWN
    assert Vertical.from_industry(None) is Vertical.UNKNOWN
