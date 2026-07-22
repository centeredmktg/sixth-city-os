"""Test that claim.run stores context_hash so freshly-claimed rows aren't immediately dirty."""
from engine.db.base import make_engine, create_all, make_session_factory
from engine.db.models import AccountRow
from engine.jobs import claim
from engine.modules import hubspot_context as hc
from engine.db import repo


def _session():
    engine = make_engine("sqlite:///:memory:")
    create_all(engine)
    return make_session_factory(engine)()


class FakeClient:
    def claim_company(self, account, owner_id): return f"id-{account.domain}"


def test_claim_stores_context_hash_so_row_not_immediately_dirty():
    s = _session()
    s.add(AccountRow(domain="a.example", name="A", net_new=True, total=90, band="A"))
    s.commit()
    claim.run(s, client=FakeClient(), owner_id="555")
    row = s.get(AccountRow, "a.example")
    assert row.claimed is True
    # the stored hash matches the row's current context -> the sync job won't re-push it
    assert row.context_hash == hc.context_hash(repo._account_from_row(row))
