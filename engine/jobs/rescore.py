"""
Re-score every saved account against a ScoringConfig.

Called after the team saves a new rubric from the console Scoring screen, so the levers
they just moved actually re-rank the accounts already in the system. Pure CPU (no network
or HubSpot), so it's fast even for a few thousand rows. Mutates each row's score fields in
place — it does NOT rebuild signals/route.
"""

from __future__ import annotations

from sqlalchemy.orm import Session, selectinload

from engine.db.models import AccountRow
from engine.db.repo import _account_from_row
from engine.scoring import abcr
from engine.scoring.config import ScoringConfig


# Mirrors the routing gate the console draws at triage.jsx:13 — timing at or above
# this means "in-market now".
_GATE = 55.0
# reject is permanently excluded: re-litigating rejects is exactly the churn the
# operator asked the decision to prevent.
_WAKEABLE = ("hold", "nurture")


def wake_heated_decisions(session: Session, rows, prior_timing: dict[str, float]) -> list[str]:
    """Return a decided firm to the finding surface when it crosses the timing gate
    UPWARD — the firm got hot after the operator set it aside. Rejects never wake.
    Waking is logged so a surprise reappearance on the board is explainable."""
    woken = []
    for row in rows:
        if not row.route_confirmed or row.route_confirmed_route not in _WAKEABLE:
            continue
        before = prior_timing.get(row.domain)
        if before is None or before >= _GATE or (row.timing or 0.0) < _GATE:
            continue
        row.route_confirmed = False
        row.route_confirmed_route = None
        row.decided_at = None
        woken.append(row.domain)
        print(f"  [wake] {row.domain} timing {before:.0f} -> {row.timing:.0f} "
              f"— back on the board")
    return woken


def rescore_all(session: Session, config: ScoringConfig) -> int:
    """Re-score every AccountRow with `config`; return how many were re-scored.
    Firms set aside on Hold/Nurture that heat up across the gate come back."""
    # selectinload batches signals in one query — avoids an N+1 across all accounts.
    rows = session.query(AccountRow).options(selectinload(AccountRow.signals)).all()
    prior_timing = {row.domain: (row.timing or 0.0) for row in rows}
    for row in rows:
        s = abcr.score(_account_from_row(row), config)
        row.fit, row.timing, row.total = s.fit, s.timing, s.total
        row.band, row.score_rationale = s.band, s.rationale
    wake_heated_decisions(session, rows, prior_timing)
    session.commit()
    return len(rows)
