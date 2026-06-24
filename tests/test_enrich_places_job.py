from engine.db.base import make_engine, create_all, make_session_factory
from engine.db.models import AccountRow
from engine.models import Signal, SignalKind
from engine.jobs import enrich_places


class FakePlaces:
    name = "google_places"
    provides_signals = True
    def enrich(self, account):
        account.extra = {**(account.extra or {}), "places_phone": "(216) 555-1234"}
        return [Signal(kind=SignalKind.LOCAL_SEO_GAP, source="google_places",
                       value=1.0, detail="no listing")]


def _session_with(rows):
    eng = make_engine("sqlite:///:memory:")
    create_all(eng)
    s = make_session_factory(eng)()
    for kw in rows:
        s.add(AccountRow(**kw))
    s.commit()
    return s


def test_runs_only_on_enriched_netnew_not_yet_places_rows():
    s = _session_with([
        dict(domain="a.com", name="A", enriched=True, net_new=True, total=90.0),   # eligible
        dict(domain="b.com", name="B", enriched=False, net_new=True, total=95.0),  # not enriched yet
        dict(domain="c.com", name="C", enriched=True, net_new=False, total=80.0),  # in-book
        dict(domain="d.com", name="D", enriched=True, net_new=True, total=70.0,
             places_enriched=True),                                                # already done
    ])
    res = enrich_places.run(s, limit=10, source=FakePlaces())
    assert res["enriched"] == 1
    a = s.query(AccountRow).filter_by(domain="a.com").one()
    assert a.places_enriched is True
    assert a.extra["places_phone"] == "(216) 555-1234"
    assert any(sg.kind == "local_seo_gap" for sg in a.signals)


def test_is_idempotent_second_run_does_nothing():
    s = _session_with([dict(domain="a.com", name="A", enriched=True, net_new=True, total=90.0)])
    enrich_places.run(s, limit=10, source=FakePlaces())
    res = enrich_places.run(s, limit=10, source=FakePlaces())
    assert res["enriched"] == 0
