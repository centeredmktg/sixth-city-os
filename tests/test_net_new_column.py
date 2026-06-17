"""net_new column: default None, persists True, round-trips through _account_from_row."""
from engine.db.base import make_engine, make_session_factory, create_all
from engine.db.models import AccountRow
from engine.db import repo


def _session():
    eng = make_engine("sqlite:///:memory:")
    create_all(eng)
    return make_session_factory(eng)()


def test_net_new_defaults_to_none():
    s = _session()
    row = AccountRow(domain="test.com", name="Test")
    s.add(row)
    s.commit()
    fetched = s.get(AccountRow, "test.com")
    assert fetched.net_new is None


def test_net_new_persists_true():
    s = _session()
    row = AccountRow(domain="nn.com", name="NN", net_new=True)
    s.add(row)
    s.commit()
    fetched = s.get(AccountRow, "nn.com")
    assert fetched.net_new is True


def test_net_new_round_trips_through_account_from_row():
    s = _session()
    row = AccountRow(domain="rt.com", name="RT", net_new=True)
    s.add(row)
    s.commit()
    fetched = s.get(AccountRow, "rt.com")
    account = repo._account_from_row(fetched)
    assert account.net_new is True


def test_net_new_none_round_trips():
    s = _session()
    row = AccountRow(domain="pending.com", name="Pending")
    s.add(row)
    s.commit()
    fetched = s.get(AccountRow, "pending.com")
    account = repo._account_from_row(fetched)
    assert account.net_new is None
