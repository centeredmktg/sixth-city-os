"""
JOB 1 (cron): ingest accounts from upstream sources + attach buying signals.

"Find" really means INGEST now: Clay does the discovery (find ~50k firms, enrich
free), and this pulls that payload in. Signal sources then attach buying signals —
the Clay site-quality score directly, or the PageSpeed fallback for un-scored
domains. The signal layer is source-agnostic, so any list flows through identically.
"""

from __future__ import annotations

from engine.models import Account
from engine.modules import trigger_scanner
from engine.sources import registry


def run(sources: list | None = None) -> list[Account]:
    srcs = sources if sources is not None else registry.REGISTRY
    account_srcs = [s for s in srcs if s.provides_accounts]
    signal_srcs = [s for s in srcs if s.provides_signals]

    found: list[Account] = []
    for src in account_srcs:
        found.extend(src.discover())

    # Attach signals. Clay's score comes free; PageSpeed fallback fires only for
    # accounts still missing a site-quality signal (see PageSpeedSource.enrich).
    for account in found:
        for src in signal_srcs:
            account.signals.extend(src.enrich(account))

    # Layer in event-driven triggers (hiring, reviews) via the trigger-scanner skill
    triggers = trigger_scanner.scan(found)
    for account in found:
        account.signals.extend(triggers.get(account.domain, []))

    print(f"[ingest] {len(found)} accounts, "
          f"{sum(len(a.signals) for a in found)} signals")
    return found


if __name__ == "__main__":
    run()
