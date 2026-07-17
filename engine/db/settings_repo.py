"""
Settings persistence — the team-tunable ScoringConfig, stored as a single JSON row.

Kept separate from repo.py (accounts/contacts) because it's a different concern with a
different lifecycle: one shared, team-wide rubric, not per-account state.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from engine.db.models import SettingRow
from engine.scoring.config import ScoringConfig, DEFAULT_CONFIG

SCORING_KEY = "scoring_config"
OWNER_KEY = "default_owner_id"


def load_scoring_config(session: Session) -> ScoringConfig:
    """The saved rubric, or DEFAULT_CONFIG when nothing has been saved yet. Never raises
    on a malformed row — degrades to defaults so scoring always has a valid config."""
    row = session.get(SettingRow, SCORING_KEY)
    if row is None or not isinstance(row.value, dict):
        return DEFAULT_CONFIG
    try:
        return ScoringConfig.from_dict(row.value)
    except (TypeError, ValueError, KeyError):
        return DEFAULT_CONFIG


def save_scoring_config(session: Session, cfg: ScoringConfig) -> None:
    """Upsert the single scoring-config row."""
    row = session.get(SettingRow, SCORING_KEY)
    if row is None:
        session.add(SettingRow(key=SCORING_KEY, value=cfg.to_dict()))
    else:
        row.value = cfg.to_dict()
    session.commit()


def load_default_owner_id(session: Session) -> str | None:
    """The team-wide default HubSpot owner id, or None if unset."""
    row = session.get(SettingRow, OWNER_KEY)
    if row is None or not isinstance(row.value, dict):
        return None
    oid = row.value.get("id")
    return str(oid) if oid else None


def save_default_owner_id(session: Session, owner_id: str) -> None:
    """Upsert the team-wide default HubSpot owner id."""
    row = session.get(SettingRow, OWNER_KEY)
    if row is None:
        session.add(SettingRow(key=OWNER_KEY, value={"id": str(owner_id)}))
    else:
        row.value = {"id": str(owner_id)}
    session.commit()
