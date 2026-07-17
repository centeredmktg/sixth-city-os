from datetime import datetime, timezone
from engine.db.base import make_engine, create_all, make_session_factory
from engine.db.models import Base, AccountRow
from engine.jobs import claim


def _session():
    engine = make_engine("sqlite:///:memory:")
    create_all(engine)
    Session = make_session_factory(engine)
    return Session()


class FakeClient:
    def __init__(self): self.calls = []
    def claim_company(self, account, owner_id):
        self.calls.append(account.domain)
        return f"id-{account.domain}"


def _seed(session, domain, net_new=True, claimed=False):
    session.add(AccountRow(domain=domain, name=domain, net_new=net_new,
                           claimed=claimed, pushed=False, total=90))
    session.commit()


def test_claim_job_claims_net_new_and_marks_rows():
    session = _session()
    _seed(session, "a.example")
    _seed(session, "b.example")
    fake = FakeClient()
    res = claim.run(session, client=fake, owner_id="555")
    assert res["claimed"] == 2
    assert set(fake.calls) == {"a.example", "b.example"}
    assert session.get(AccountRow, "a.example").claimed is True
    assert session.get(AccountRow, "a.example").claimed_at is not None


def test_claim_job_resumable_second_run_noop():
    session = _session()
    _seed(session, "a.example")
    fake = FakeClient()
    claim.run(session, client=fake, owner_id="555")
    fake2 = FakeClient()
    res = claim.run(session, client=fake2, owner_id="555")
    assert res["claimed"] == 0
    assert fake2.calls == []


def test_claim_job_refuses_without_owner():
    session = _session()
    _seed(session, "a.example")
    fake = FakeClient()
    res = claim.run(session, client=fake, owner_id=None)
    assert res["error"] == "no_default_owner"
    assert fake.calls == []
    assert session.get(AccountRow, "a.example").claimed is False


def test_claim_job_skips_in_book():
    session = _session()
    _seed(session, "inbook.example", net_new=False)
    fake = FakeClient()
    res = claim.run(session, client=fake, owner_id="555")
    assert res["claimed"] == 0
    assert fake.calls == []


class FailingFakeClient:
    """Mocks a client that fails for a specific domain."""
    def __init__(self, fail_on_domain):
        self.fail_on_domain = fail_on_domain
        self.calls = []

    def claim_company(self, account, owner_id):
        self.calls.append(account.domain)
        if account.domain == self.fail_on_domain:
            raise RuntimeError("claim failed: bad domain")
        return f"id-{account.domain}"


def test_claim_job_commits_incrementally_across_chunks(monkeypatch):
    """Seed more rows than one chunk (chunk size shrunk to 3 via monkeypatch), run
    with a FakeClient, and assert ALL rows still get claimed (behavior preserved
    across chunk boundaries). Also asserts session.commit() is called once per
    chunk (not just once at the end) so progress is durable mid-drain."""
    monkeypatch.setattr(claim, "_CHUNK", 3)
    monkeypatch.setattr(claim, "_PACE_SEC", 0)

    session = _session()
    domains = [f"firm{i}.example" for i in range(10)]
    for d in domains:
        _seed(session, d)

    commit_calls = {"count": 0}
    orig_commit = session.commit
    def counting_commit():
        commit_calls["count"] += 1
        return orig_commit()
    monkeypatch.setattr(session, "commit", counting_commit)

    fake = FakeClient()
    res = claim.run(session, client=fake, owner_id="555")

    assert res["claimed"] == 10
    assert set(fake.calls) == set(domains)
    for d in domains:
        assert session.get(AccountRow, d).claimed is True
    # 10 rows / chunk size 3 -> 4 chunks -> 4 commits
    assert commit_calls["count"] == 4


def test_claim_job_failure_isolation():
    """One firm's failure must not abort the batch; failed row must not be marked claimed."""
    session = _session()
    _seed(session, "good.example")
    _seed(session, "bad.example")

    fake = FailingFakeClient(fail_on_domain="bad.example")
    res = claim.run(session, client=fake, owner_id="555")

    # Batch completed (no exception raised)
    assert res["claimed"] == 1
    # Both domains were attempted
    assert set(fake.calls) == {"good.example", "bad.example"}
    # Good row is claimed
    assert session.get(AccountRow, "good.example").claimed is True
    # Bad row is NOT claimed
    assert session.get(AccountRow, "bad.example").claimed is False
