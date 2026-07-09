"""ScoringConfig persistence — save/load round-trip; empty store → defaults."""
from engine.db import settings_repo
from engine.scoring.config import ScoringConfig, DEFAULT_CONFIG


def test_load_defaults_when_empty(session):
    assert settings_repo.load_scoring_config(session) == DEFAULT_CONFIG


def test_save_then_load_roundtrip(session):
    cfg = ScoringConfig(fit_weight=0.55, band_a=80.0)
    settings_repo.save_scoring_config(session, cfg)
    assert settings_repo.load_scoring_config(session) == cfg


def test_save_is_upsert_not_duplicate(session):
    settings_repo.save_scoring_config(session, ScoringConfig(fit_weight=0.5))
    settings_repo.save_scoring_config(session, ScoringConfig(fit_weight=0.7))
    assert settings_repo.load_scoring_config(session).fit_weight == 0.7
