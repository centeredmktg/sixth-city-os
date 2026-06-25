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


def test_enrich_reroutes_unconfirmed_account_on_new_signal(monkeypatch):
    """After enrichment adds a corroborating signal, the route recommendation is
    REFRESHED: a 1-signal 'nurture' firm that now has 2 agreeing signals + in-market
    timing is promoted to a 'closer' recommendation. (Operator still confirms — this
    is the momentum fix: stop freezing the ingest-time recommendation.)"""
    from engine.db.models import SignalRow
    from engine.scoring import abcr
    from engine.models import Score
    # Deterministic in-market score so the test isn't coupled to scoring weights.
    monkeypatch.setattr(abcr, "score",
                        lambda acct: Score(fit=80.0, timing=90.0, total=88.0, band="A", rationale="stub"))

    eng = make_engine("sqlite:///:memory:")
    create_all(eng)
    s = make_session_factory(eng)()
    row = AccountRow(domain="promote.com", name="Promote", total=20.0,
                     route_recommended="nurture", route_confirmed=False)
    # One pre-existing INTENT signal -> at ingest this read as a single-signal 'nurture'.
    row.signals.append(SignalRow(kind=SignalKind.ADS_ACTIVE.value, source="clay", value=1.0, detail="ads"))
    s.add(row)
    s.commit()

    # FakeSource adds a DISTINCT 2nd kind (site_quality) -> now pain-qualified.
    enrich.run(s, limit=10, workers=1, sources=[FakeSource()], existing_fn=lambda doms: set())

    refreshed = s.query(AccountRow).filter_by(domain="promote.com").one()
    assert refreshed.route_recommended == "closer"
    assert "pain-qualified" in refreshed.route_rationale


def test_enrich_does_not_clobber_operator_confirmed_route(monkeypatch):
    """Re-routing only refreshes the RECOMMENDATION. An account the operator already
    confirmed/overrode is left untouched, even if it would now qualify for closer."""
    from engine.db.models import SignalRow
    from engine.scoring import abcr
    from engine.models import Score
    monkeypatch.setattr(abcr, "score",
                        lambda acct: Score(fit=80.0, timing=90.0, total=88.0, band="A", rationale="stub"))

    eng = make_engine("sqlite:///:memory:")
    create_all(eng)
    s = make_session_factory(eng)()
    row = AccountRow(domain="locked.com", name="Locked", total=20.0,
                     route_recommended="nurture", route_confirmed=True,
                     route_confirmed_route="nurture", route_confirmed_by="operator")
    row.signals.append(SignalRow(kind=SignalKind.ADS_ACTIVE.value, source="clay", value=1.0, detail="ads"))
    s.add(row)
    s.commit()

    enrich.run(s, limit=10, workers=1, sources=[FakeSource()], existing_fn=lambda doms: set())

    locked = s.query(AccountRow).filter_by(domain="locked.com").one()
    assert locked.route_recommended == "nurture"        # recommendation untouched
    assert locked.route_confirmed is True
    assert locked.route_confirmed_route == "nurture"
