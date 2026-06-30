"""
JOB 3 (cron): push prioritized, net-new targets into HubSpot with tailored copy.

Loop steps 3+4 of the software summary: "pushes them into HubSpot with tailored
messaging" and sets them up so live conversations route to the closer already
tagged machine-sourced. Dedupe against HubSpot's book happens here (net-new gate).
"""

from __future__ import annotations

from engine.models import Account, Route, Stage
from engine.modules import draft_cold_email, enrichment
from engine.hubspot.client import HubSpotClient


def run(routed_accounts: list[Account]) -> list[Account]:
    client = HubSpotClient()

    # Only confirmed CLOSER routes enter the closer's sequences. NURTURE accounts
    # peel off to marketing; unconfirmed routes wait on the HITL triage gate.
    closer_bound = [
        a for a in routed_accounts
        if a.route and a.route.confirmed and a.route.effective == Route.CLOSER
    ]

    # Net-new gate: drop anything already in HubSpot's book before we claim it.
    net_new = client.filter_net_new(closer_bound)

    pushed: list[Account] = []
    for account in net_new:
        # Enrich contacts only now — after they cleared scoring (spend credits wisely)
        account.__dict__["contact"] = enrichment.enrich_contacts(account)
        outreach = draft_cold_email.draft(account, live=True)  # shortlist only → AI draft
        account.hubspot_id = client.push(account, outreach)
        account.stage = Stage.PUSHED
        pushed.append(account)

    print(f"[push] {len(pushed)} pushed to closer "
          f"(of {len(closer_bound)} closer-bound; "
          f"{len(closer_bound) - len(net_new)} dropped as not net-new)")
    return pushed


if __name__ == "__main__":
    from engine.jobs import find_accounts, score_accounts, route_accounts
    run(route_accounts.run(score_accounts.run(find_accounts.run())))
