"""
Adapter -> Centered skill `outbound-engine/trigger-scanner`.

Watches for buying-trigger events (hiring marketing, new location, review spikes)
and turns them into Signals attached to known accounts. Complements the always-on
discovery sources with event-driven 'now' timing.

Stub status: no-op pass-through. Real version runs the trigger-scanner skill
against the account list + trigger sources (see SOURCES.md Layer 4).
"""

from __future__ import annotations

from engine.models import Account, Signal


def scan(accounts: list[Account]) -> dict[str, list[Signal]]:
    """Return {account.domain: [new trigger signals]}. Empty in stub."""
    # TODO: wire trigger-scanner skill + Layer-4 sources (job boards, reviews API)
    return {a.domain: [] for a in accounts}
