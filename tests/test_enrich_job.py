from engine.db.base import make_engine, make_session_factory, create_all
from engine.db.models import AccountRow
from engine.models import Account, Signal, SignalKind
from engine.jobs import enrich


class FakeSource:
    name = "fake"
    provides_signals = True
    def enrich(self, account):
        return [Signal(kind=SignalKind.SITE_QUALITY, source="fake", value=20.0, detail="bad")]


def _session_with(n):
    eng = make_engine("sqlite:///:memory:")
    create_all(eng)
    s = make_session_factory(eng)()
    for i in range(n):
        s.add(AccountRow(domain=f"d{i}.com", name=f"D{i}", total=10.0 + i))
    s.commit()
    return s


def test_enrich_attaches_signal_marks_enriched_and_decrements_remaining():
    s = _session_with(3)
    res = enrich.run(s, limit=2, workers=2, sources=[FakeSource()],
                     existing_fn=lambda doms: set())
    assert res["enriched"] == 2 and res["remaining"] == 1
    enriched = [r for r in s.query(AccountRow).all() if r.enriched]
    assert len(enriched) == 2
    assert all(any(sg.kind == "site_quality" for sg in r.signals) for r in enriched)


def test_enrich_is_idempotent_skips_already_enriched():
    s = _session_with(2)
    enrich.run(s, limit=10, workers=2, sources=[FakeSource()],
               existing_fn=lambda doms: set())
    res = enrich.run(s, limit=10, workers=2, sources=[FakeSource()],
                     existing_fn=lambda doms: set())
    assert res["enriched"] == 0 and res["remaining"] == 0


def test_source_failure_does_not_crash():
    class Boom:
        name = "boom"; provides_signals = True
        def enrich(self, a): raise RuntimeError("net down")
    s = _session_with(1)
    res = enrich.run(s, limit=1, workers=1, sources=[Boom()],
                     existing_fn=lambda doms: set())
    assert res["enriched"] == 1 and res["remaining"] == 0


def test_in_book_domain_flagged_not_signal_enriched():
    """Rows whose domain is in the HubSpot book get net_new=False, enriched=True,
    but NO signals. Net-new rows get the signal and net_new=True."""
    s = _session_with(2)   # d0.com (total=10.0), d1.com (total=11.0)
    # Pretend d0.com is already in HubSpot book
    enrich.run(s, limit=10, workers=2, sources=[FakeSource()],
               existing_fn=lambda doms: {"d0.com"})
    rows = {r.domain: r for r in s.query(AccountRow).all()}
    # d0 in book: no credit, no signals
    assert rows["d0.com"].net_new is False
    assert rows["d0.com"].enriched is True
    assert len(rows["d0.com"].signals) == 0
    # d1 net-new: credited, has signal
    assert rows["d1.com"].net_new is True
    assert rows["d1.com"].enriched is True
    assert any(sg.kind == "site_quality" for sg in rows["d1.com"].signals)
