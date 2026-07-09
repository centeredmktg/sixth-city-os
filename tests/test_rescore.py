"""rescore_all re-scores every saved account with a given config and returns the count."""
from engine.db import repo
from engine.db.models import AccountRow
from engine.jobs.rescore import rescore_all
from engine.models import Account, Signal, SignalKind, Vertical
from engine.scoring.config import ScoringConfig


def _acct(domain):
    a = Account(name="x", domain=domain, vertical=Vertical.INDUSTRIAL_MANUFACTURING, state="OH")
    a.signals = [Signal(kind=SignalKind.AI_CITATION_GAP, source="t", value=1.0)]
    return a


def test_rescore_all_writes_scores_and_counts(session):
    repo.upsert_accounts(session, [_acct("a.com"), _acct("b.com")])
    n = rescore_all(session, ScoringConfig())
    assert n == 2
    rows = session.query(AccountRow).all()
    assert all(r.total > 0 for r in rows)     # real scores written


def test_rescore_all_reflects_config(session):
    repo.upsert_accounts(session, [_acct("a.com"), _acct("b.com")])
    rescore_all(session, ScoringConfig())                                  # default → B-ish
    # A rubric with near-impossible cutoffs demotes everyone to R.
    rescore_all(session, ScoringConfig(band_a=99.0, band_b=98.0, band_c=97.0))
    rows = session.query(AccountRow).all()
    assert all(r.band == "R" for r in rows)
