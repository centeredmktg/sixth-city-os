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


def rescore_all(session: Session, config: ScoringConfig) -> int:
    """Re-score every AccountRow with `config`; return how many were re-scored."""
    # selectinload batches signals in one query — avoids an N+1 across all accounts.
    rows = session.query(AccountRow).options(selectinload(AccountRow.signals)).all()
    for row in rows:
        s = abcr.score(_account_from_row(row), config)
        row.fit, row.timing, row.total = s.fit, s.timing, s.total
        row.band, row.score_rationale = s.band, s.rationale
    session.commit()
    return len(rows)
