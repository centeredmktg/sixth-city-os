"""
Routing — decide where a scored account goes, with a human in the loop.

Danny's rule (sales reality): TIMING TRUMPS FIT.
  - In-market now           -> CLOSER (the daily queue)
  - Great fit, bad timing   -> NURTURE (marketing's job, not the closer's day)
  - Weak on both axes       -> HOLD / REJECT

The engine only ever RECOMMENDS. A CLOSER route does not push into a HubSpot
sequence until a human confirms it (or overrides it). That HITL gate is the
feature — it keeps a misfire from spamming a prospect or miscrediting the
machine-sourced scoreboard.

Stub status: rule is real; the confirmation step is auto-stubbed (see
confirm_stub). Real version surfaces a triage screen where the closer/ops
confirms or reroutes — that's a Claude Design surface.
"""

from __future__ import annotations

from engine.models import Account, Route, RouteDecision

# Timing is the gate. Tune against real close data.
IN_MARKET_TIMING = 55.0     # at/above this, they're worth the closer's day NOW
VIABLE_FIT = 60.0           # good-enough fit to bother nurturing for later


def recommend(account: Account) -> RouteDecision:
    """Pure function: score -> routing recommendation. Timing-first."""
    s = account.score
    if s is None:
        return RouteDecision(Route.HOLD, "unscored")

    if s.timing >= IN_MARKET_TIMING:
        return RouteDecision(
            Route.CLOSER,
            f"in-market now (timing {s.timing:.0f} ≥ {IN_MARKET_TIMING:.0f})",
        )
    if s.fit >= VIABLE_FIT:
        return RouteDecision(
            Route.NURTURE,
            f"good fit ({s.fit:.0f}) but cold (timing {s.timing:.0f}) — marketing nurtures",
        )
    if s.fit >= VIABLE_FIT * 0.6:
        return RouteDecision(Route.HOLD, "marginal on both axes — revisit later")
    return RouteDecision(Route.REJECT, "not a fit")


def confirm_stub(decision: RouteDecision) -> RouteDecision:
    """STUB for the HITL gate. Auto-confirms the recommendation as-is so the loop
    runs unattended in dev. Replace with the triage-screen confirmation, where a
    human accepts, overrides the route, or rejects — setting confirmed/confirmed_
    route/confirmed_by."""
    decision.confirmed = True
    decision.confirmed_by = "auto-stub"
    return decision
