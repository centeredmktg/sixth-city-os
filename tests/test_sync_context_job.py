from engine.db.base import make_engine, create_all, make_session_factory
from engine.db.models import AccountRow
from engine.jobs import sync_hubspot_context as sync


def _session():
    engine = make_engine("sqlite:///:memory:")
    create_all(engine)
    return make_session_factory(engine)()


class FakeClient:
    def __init__(self): self.calls = []
    def update_context(self, company_id, props):
        self.calls.append(company_id); return True


def _claimed(s, domain, hubspot_id, total=90, band="A", context_hash=None):
    s.add(AccountRow(domain=domain, name=domain, net_new=True, claimed=True,
                     hubspot_id=hubspot_id, total=total, band=band, context_hash=context_hash))
    s.commit()


def test_syncs_dirty_claimed_rows_and_stores_hash():
    s = _session()
    _claimed(s, "a.example", "111", context_hash="STALE")   # dirty (hash won't match)
    fake = FakeClient()
    res = sync.run(s, client=fake)
    assert res["synced"] == 1
    assert fake.calls == ["111"]
    assert s.get(AccountRow, "a.example").context_hash != "STALE"   # updated to current


def test_skips_unclaimed_and_rows_without_hubspot_id():
    s = _session()
    s.add(AccountRow(domain="unclaimed.example", name="U", net_new=True, claimed=False, total=90))
    s.add(AccountRow(domain="noid.example", name="N", claimed=True, hubspot_id=None, total=90))
    s.commit()
    fake = FakeClient()
    assert sync.run(s, client=fake)["synced"] == 0
    assert fake.calls == []


def test_resumable_second_run_noop_when_nothing_changed():
    s = _session()
    _claimed(s, "a.example", "111", context_hash="STALE")
    sync.run(s, client=FakeClient())
    fake2 = FakeClient()
    assert sync.run(s, client=fake2)["synced"] == 0   # hash now current
    assert fake2.calls == []


def test_failed_update_does_not_store_hash():
    s = _session()
    _claimed(s, "a.example", "111", context_hash="STALE")
    class Failing:
        def update_context(self, cid, props): return False
    sync.run(s, client=Failing())
    assert s.get(AccountRow, "a.example").context_hash == "STALE"   # unchanged -> retried next run


def test_pending_count():
    s = _session()
    _claimed(s, "a.example", "111", context_hash="STALE")
    _claimed(s, "b.example", "222", context_hash=None)
    assert sync.pending_count(s) == 2
