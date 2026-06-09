"""
Config + secrets surface. Loaded from environment (.env in dev, Railway vars in
prod — same deploy pattern as sows/).

Nothing here has real keys yet. Re-granting HubSpot access is BUILD step one
(design §, inputs.md) — until then HUBSPOT_TOKEN stays empty and the client
runs in dry mode.
"""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    # System of record
    hubspot_token: str = os.getenv("HUBSPOT_TOKEN", "")
    # AI module calls (draft-cold-email, scoring rationale, etc.)
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    # Persistence (swap dataclasses -> ORM when this is set)
    database_url: str = os.getenv("DATABASE_URL", "")

    # Data-source keys (see sources/SOURCES.md for the to-find scorecard)
    google_places_key: str = os.getenv("GOOGLE_PLACES_KEY", "")
    pagespeed_key: str = os.getenv("PAGESPEED_KEY", "")
    builtwith_key: str = os.getenv("BUILTWITH_KEY", "")
    apollo_key: str = os.getenv("APOLLO_KEY", "")

    # Targeting defaults (Sixth City = NE Ohio; widen, don't narrow — CLAUDE.md)
    target_states: tuple[str, ...] = ("OH",)

    @property
    def dry_run(self) -> bool:
        """No HubSpot token = scaffold mode: log what we WOULD do, write nothing."""
        return not self.hubspot_token


CONFIG = Config()
