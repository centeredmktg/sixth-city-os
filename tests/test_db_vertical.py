from engine.db.base import make_engine, make_session_factory, create_all
from engine.db.models import AccountRow
from engine.db import repo
from engine.models import Vertical
from engine.db.migrate_vertical_rename import RENAMES, run_migration


def _session():
    eng = make_engine("sqlite:///:memory:")
    create_all(eng)
    return make_session_factory(eng)(), eng


def test_from_orm_degrades_stale_vertical_to_unknown():
    """A persisted pre-rename value must not crash the read path."""
    s, _ = _session()
    s.add(AccountRow(domain="x.com", name="X", vertical="industrial_b2b"))
    s.commit()
    acct = repo._account_from_row(s.get(AccountRow, "x.com"))
    assert acct.vertical is Vertical.UNKNOWN   # degraded, not crashed


def test_migration_renames_persisted_values():
    s, eng = _session()
    s.add(AccountRow(domain="y.com", name="Y", vertical="industrial_b2b"))
    s.commit()
    run_migration(eng)
    assert s.get(AccountRow, "y.com").vertical == "industrial_manufacturing"
    assert RENAMES["home_services"] == "home_construction"
