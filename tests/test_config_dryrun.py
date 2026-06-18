"""DRY_RUN is a safety latch: it must force dry mode even when a token is present,
so local/test runs (which load .env with a real token) can't write to the client's
production HubSpot. Regression guard — a missing latch once created live test records."""
from engine.config import Config


def test_dry_run_override_forces_dry_even_with_token(monkeypatch):
    monkeypatch.setenv("DRY_RUN", "1")
    assert Config(hubspot_token="pat-na1-real-token").dry_run is True


def test_live_when_token_present_and_no_override(monkeypatch):
    monkeypatch.delenv("DRY_RUN", raising=False)
    assert Config(hubspot_token="pat-na1-real-token").dry_run is False


def test_dry_when_no_token(monkeypatch):
    monkeypatch.delenv("DRY_RUN", raising=False)
    assert Config(hubspot_token="").dry_run is True
