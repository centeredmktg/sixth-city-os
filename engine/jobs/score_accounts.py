"""
JOB 2 (cron): score + prioritize discovered accounts (ABCR).

Loop step 2 of the software summary: "scores and prioritizes them" so the closer
spends the day on the accounts most likely to close. Returns accounts sorted best-
first, with sub-threshold (R-band) accounts dropped from the push queue.
"""

from __future__ import annotations

from engine.models import Account, Stage
from engine.scoring import abcr


def run(accounts: list[Account], min_band: str | None = None) -> list[Account]:
    """Score every account and return them ranked best-first. By default NOTHING is
    dropped — a 'dump names + domains, let the system sort it' tool keeps the whole
    list and ranks it (low scorers just sink). Pass min_band to enable a strict gate
    (e.g. a cron that only pushes B+); the interactive ingest path leaves it off."""
    band_rank = {"A": 0, "B": 1, "C": 2, "R": 3}
    for a in accounts:
        a.score = abcr.score(a)
        a.stage = Stage.SCORED

    ranked = sorted(accounts, key=lambda a: a.score.total, reverse=True)
    if min_band:
        ranked = [a for a in ranked if band_rank[a.score.band] <= band_rank[min_band]]

    gate = f" (>= {min_band})" if min_band else " (all, ranked)"
    print(f"[score] scored {len(accounts)}; kept {len(ranked)}{gate}; "
          f"top: " + ", ".join(f"{a.name}({a.score.band}:{a.score.total})"
                               for a in ranked[:3]))
    return ranked


if __name__ == "__main__":
    from engine.jobs import find_accounts
    run(find_accounts.run())
