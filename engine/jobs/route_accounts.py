"""
JOB 2.5 (between score and push): route each scored account, then gate on HITL.

Timing-first routing (engine/routing.py). Recommendations get human confirmation
before anything acts. Returns the full set with route decisions attached; the push
job decides what to enqueue based on the EFFECTIVE (confirmed/overridden) route.
"""

from __future__ import annotations

from engine.models import Account, Route, Stage
from engine import routing


def run(scored_accounts: list[Account], auto_confirm: bool = True) -> list[Account]:
    counts: dict[Route, int] = {r: 0 for r in Route}
    for a in scored_accounts:
        decision = routing.recommend(a)
        if auto_confirm:
            decision = routing.confirm_stub(decision)   # real HITL = triage screen
        a.route = decision
        a.stage = Stage.ROUTED
        counts[decision.effective] += 1

    print("[route] " + " · ".join(f"{r.value}:{n}" for r, n in counts.items() if n))
    return scored_accounts


if __name__ == "__main__":
    from engine.jobs import find_accounts, score_accounts
    run(score_accounts.run(find_accounts.run()))
