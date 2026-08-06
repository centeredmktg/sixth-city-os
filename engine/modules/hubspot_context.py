"""Single-source mapping from an engine Account to the HubSpot company properties that
carry the 'why' into the tool the team works in. The ONLY place this mapping lives, so
the app and HubSpot can never diverge in logic. Team-facing values only — no rev-share
or 'machine-sourced' language."""
from __future__ import annotations

import hashlib
import json

from engine.clock import local_today

PROP_SCORE = "engine_score"
PROP_BAND = "engine_band"
PROP_ROUTE = "engine_route"
PROP_WHY = "engine_why_now"
PROP_SYNCED = "engine_last_synced"

_WHY_CAP = 500


def context_properties(account) -> dict:
    """The 5 HubSpot property values for this account (all strings). engine_last_synced
    is stamped 'today' at build time; the hash below deliberately ignores it."""
    score = account.score.total if getattr(account, "score", None) else 0.0
    band = account.score.band if getattr(account, "score", None) else "R"
    route = account.route.effective.value if getattr(account, "route", None) else "hold"
    details = [s.detail for s in (getattr(account, "signals", None) or []) if getattr(s, "detail", "")]
    why = "; ".join(details)[:_WHY_CAP]
    return {
        PROP_SCORE: str(round(score)),
        PROP_BAND: band,
        PROP_ROUTE: route,
        PROP_WHY: why,
        PROP_SYNCED: local_today(),
    }


def context_hash(account) -> str:
    """Hash of the STABLE context (score/band/route/why) — excludes engine_last_synced so
    a re-sync of unchanged data is a no-op. Differs iff the assessment actually changed."""
    p = context_properties(account)
    stable = {k: p[k] for k in (PROP_SCORE, PROP_BAND, PROP_ROUTE, PROP_WHY)}
    return hashlib.sha256(json.dumps(stable, sort_keys=True).encode()).hexdigest()
