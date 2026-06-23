from engine.db.base import make_engine, create_all, make_session_factory
from engine.db.models import AccountRow


def test_account_row_has_places_enriched_default_false():
    eng = make_engine("sqlite:///:memory:")
    create_all(eng)
    s = make_session_factory(eng)()
    s.add(AccountRow(domain="d0.com", name="D0"))
    s.commit()
    row = s.query(AccountRow).filter_by(domain="d0.com").one()
    assert row.places_enriched is False
