"""
Pipeline Engine — end-to-end orchestrator.

Runs the full machine loop on stub data so the whole thing is walkable today:
  find -> score -> push (dry HubSpot) -> attribution scoreboard

    python run.py

In dry mode (no HUBSPOT_TOKEN) it writes nothing real — it logs what it WOULD do.
Re-grant HubSpot access (build step one) to flip into live mode.
"""

from __future__ import annotations

from engine.jobs import find_accounts, score_accounts, route_accounts, push_to_hubspot
from engine.attribution import dashboard


def main() -> None:
    print("=== Sixth City Pipeline Engine (stub run) ===\n")

    discovered = find_accounts.run()
    scored = score_accounts.run(discovered)
    routed = route_accounts.run(scored)        # timing-first routing + HITL gate
    pushed = push_to_hubspot.run(routed)

    print(f"\n[loop] {len(pushed)} accounts in HubSpot sequences, machine-sourced.")
    print(dashboard.build())


if __name__ == "__main__":
    main()
