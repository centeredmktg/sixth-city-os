from engine.db.base import make_engine, make_session_factory, create_all
from engine.db.models import AccountRow


def test_enriched_defaults_false_and_persists():
    eng = make_engine("sqlite:///:memory:")
    create_all(eng)
    s = make_session_factory(eng)()
    s.add(AccountRow(domain="x.com", name="X"))
    s.commit()
    row = s.get(AccountRow, "x.com")
    assert row.enriched is False
    row.enriched = True
    s.commit()
    assert s.get(AccountRow, "x.com").enriched is True
