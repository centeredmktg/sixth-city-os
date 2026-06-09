"""
JOB 2 (cron): score + prioritize discovered accounts (ABCR).

Loop step 2 of the software summary: "scores and prioritizes them" so the closer
spends the day on the accounts most likely to close. Returns accounts sorted best-
first, with sub-threshold (R-band) accounts dropped from the push queue.
"""

from __future__ import annotations

from engine.models import Account, Stage
from engine.scoring import abcr


def run(accounts: list[Account], min_band: str = "B") -> list[Account]:
    band_rank = {"A": 0, "B": 1, "C": 2, "R": 3}
    for a in accounts:
        a.score = abcr.score(a)
        a.stage = Stage.SCORED

    qualified = [a for a in accounts
                 if band_rank[a.score.band] <= band_rank[min_band]]
    qualified.sort(key=lambda a: a.score.total, reverse=True)

    print(f"[score] {len(qualified)}/{len(accounts)} cleared {min_band}-band; "
          f"top: " + ", ".join(f"{a.name}({a.score.band}:{a.score.total})"
                               for a in qualified[:3]))
    return qualified


if __name__ == "__main__":
    from engine.jobs import find_accounts
    run(find_accounts.run())
