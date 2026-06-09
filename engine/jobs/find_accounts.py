"""
JOB 1 (cron): discover net-new accounts in target verticals + geo, attach signals.

Loop step 1+2 of the software summary: "finds the right accounts automatically"
and attaches the buying signals that later drive scoring + outreach.
"""

from __future__ import annotations

from engine.config import CONFIG
from engine.models import Account, Vertical
from engine.modules import trigger_scanner
from engine.sources import registry


def run() -> list[Account]:
    found: list[Account] = []
    for vertical in Vertical:
        for state in CONFIG.target_states:
            for src in registry.account_sources():
                found.extend(src.discover(vertical, state))

    # Attach signals from every signal-source (PageSpeed spine, etc.)
    for account in found:
        for src in registry.signal_sources():
            account.signals.extend(src.enrich(account))

    # Layer in event-driven triggers (hiring, reviews) via the trigger-scanner skill
    triggers = trigger_scanner.scan(found)
    for account in found:
        account.signals.extend(triggers.get(account.domain, []))

    print(f"[find] discovered {len(found)} accounts, "
          f"{sum(len(a.signals) for a in found)} signals")
    return found


if __name__ == "__main__":
    run()
