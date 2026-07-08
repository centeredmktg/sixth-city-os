"""ScoringConfig — the tunable rubric as data. Defaults must reproduce today's constants;
validate() is the single source of truth for both the API and the console UI."""
from engine.models import Vertical
from engine.scoring.config import (
    ScoringConfig, DEFAULT_CONFIG, get_active_config, set_active_config,
)


def test_defaults_validate_clean():
    assert ScoringConfig().validate() == []


def test_timing_weight_is_complement():
    assert ScoringConfig(fit_weight=0.4).timing_weight == 0.6


def test_defaults_match_todays_constants():
    c = ScoringConfig()
    assert c.fit_weight == 0.4 and c.timing_weight == 0.6
    assert (c.band_a, c.band_b, c.band_c) == (75.0, 55.0, 35.0)
    assert c.proximity_boost == 1.12 and c.staffed_proximity_boost == 1.20
    assert c.radius_miles == 50.0
    assert c.vertical_fit_bonus[Vertical.INDUSTRIAL_MANUFACTURING.value] == 16.0
    assert c.vertical_fit_bonus[Vertical.RETAIL_ECOMMERCE.value] == 2.0


def test_rejects_unordered_bands():
    assert ScoringConfig(band_a=50.0, band_b=60.0).validate()   # A must be > B


def test_rejects_fit_weight_out_of_range():
    assert ScoringConfig(fit_weight=1.5).validate()


def test_rejects_staffed_below_proximity():
    assert ScoringConfig(proximity_boost=1.30, staffed_proximity_boost=1.10).validate()


def test_rejects_nonpositive_radius():
    assert ScoringConfig(radius_miles=0.0).validate()


def test_rejects_wrong_vertical_key_set():
    bad = dict(ScoringConfig().vertical_fit_bonus)
    del bad[Vertical.LEGAL.value]
    assert ScoringConfig(vertical_fit_bonus=bad).validate()


def test_rejects_vertical_bonus_out_of_range():
    bad = dict(ScoringConfig().vertical_fit_bonus)
    bad[Vertical.LEGAL.value] = 999.0
    assert ScoringConfig(vertical_fit_bonus=bad).validate()


def test_dict_roundtrip():
    c = ScoringConfig(fit_weight=0.55, band_a=80.0)
    assert ScoringConfig.from_dict(c.to_dict()) == c


def test_from_dict_ignores_unknown_and_fills_missing():
    # A partial payload keeps defaults for omitted keys; junk keys are ignored.
    c = ScoringConfig.from_dict({"fit_weight": 0.7, "bogus": 1})
    assert c.fit_weight == 0.7 and c.band_a == 75.0


def test_active_config_roundtrips():
    custom = ScoringConfig(fit_weight=0.5)
    set_active_config(custom)
    assert get_active_config() == custom
    set_active_config(DEFAULT_CONFIG)   # restore so other tests see defaults
    assert get_active_config() == DEFAULT_CONFIG
