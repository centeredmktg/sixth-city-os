# Triage Decisions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Hold / Nurture / Reject persist, clear the card from every finding surface, and stop re-ingest from resurrecting decided companies.

**Architecture:** One new column (`decided_at`) plus a single rewrite of `repo.get_candidates` against all three queue exits — promoted, decided, and emailed. Decisions persist to the DB first (authoritative for the queue) and sync `engine_status` to HubSpot best-effort. Both console surfaces read the same query, so a decision clears the card everywhere for free.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2.0 (`Mapped`/`mapped_column`), pytest, React 18 via in-browser JSX (no build step).

## Global Constraints

- **Governing constraint:** this engine is the initial-touchpoint interface — finding and engaging. Not pipeline management, not an inbox, not a second HubSpot.
- Timestamps store in **UTC**. Anything derived (a date written to HubSpot, a date rendered in UI) converts to **`America/New_York`** at the edge — use the zone, never a fixed −5 offset.
- Never write to a HubSpot company that is not ours — every write path goes through the `_find_company_ours` / `machine_sourced` guard.
- Migrations in `auto_migrate` are **additive and idempotent only** (`ADD COLUMN IF NOT EXISTS`). Never add a data migration to that list.
- `get_candidates` runs on every load of both console screens. Its query count must not scale with row count — commit `bbc7da7` already fixed one N+1 that timed out against remote Postgres.
- Tests are hermetic: `tests/conftest.py` forces `DRY_RUN=1`, so nothing touches the live portal.
- Route key stays `closer` in all logic; `LFG` is display text only.

**Scope note:** this plan implements the *backend* exclusion of emailed companies (Task 2), because `get_candidates` must be rewritten once against all three exits rather than edited twice. The send-time UI and the `machine_sourced_date` fix belong to `2026-07-29-emailed-clears-queue.md`.

---

### Task 1: The `decided_at` column

**Files:**
- Modify: `engine/db/models.py:18-52` (AccountRow)
- Create: `engine/db/migrate_add_decided_at.py`
- Modify: `engine/db/auto_migrate.py:18-37`
- Test: `tests/test_decided_at_column.py`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: `AccountRow.decided_at` — `datetime | None`, timezone-aware, defaults `None`. `engine.db.migrate_add_decided_at.run_migration(engine) -> None`.

- [ ] **Step 1: Write the failing test**

Create `tests/test_decided_at_column.py`:

```python
"""accounts.decided_at — when a human made the Hold/Nurture/Reject call."""
from datetime import datetime, timezone

from engine.db.base import make_engine, create_all, make_session_factory
from engine.db.models import AccountRow
from engine.db.auto_migrate import _MIGRATIONS


def _session():
    engine = make_engine("sqlite:///:memory:")
    create_all(engine)
    return make_session_factory(engine)()


def test_decided_at_defaults_to_none():
    session = _session()
    session.add(AccountRow(domain="buckeye.example", name="Buckeye"))
    session.commit()
    assert session.get(AccountRow, "buckeye.example").decided_at is None


def test_decided_at_stores_a_timestamp():
    session = _session()
    when = datetime(2026, 7, 29, 14, 2, tzinfo=timezone.utc)
    session.add(AccountRow(domain="buckeye.example", name="Buckeye", decided_at=when))
    session.commit()
    assert session.get(AccountRow, "buckeye.example").decided_at is not None


def test_migration_is_registered_for_boot():
    names = " ".join(m.__name__ for m in _MIGRATIONS)
    assert "decided_at" in names
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_decided_at_column.py -v`
Expected: FAIL — `TypeError: 'decided_at' is an invalid keyword argument for AccountRow`

- [ ] **Step 3: Add the column**

In `engine/db/models.py`, directly after the `claimed_at` line in `AccountRow`:

```python
    decided_at: Mapped["datetime | None"] = mapped_column(DateTime(timezone=True), nullable=True, default=None)  # human made the Hold/Nurture/Reject call
```

- [ ] **Step 4: Write the migration**

Create `engine/db/migrate_add_decided_at.py`:

```python
"""One-time, idempotent: add accounts.decided_at. create_all() makes new tables but
won't ALTER an existing one, so prod (Postgres) needs this. Safe to re-run."""
from sqlalchemy import text
from engine.db.base import make_engine


def run_migration(engine) -> None:
    ddl = "ALTER TABLE accounts ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ"
    with engine.begin() as conn:
        conn.execute(text(ddl))
    print("  accounts.decided_at ensured")


def main():
    run_migration(make_engine())


if __name__ == "__main__":
    main()
```

- [ ] **Step 5: Register it for boot**

In `engine/db/auto_migrate.py`, add `migrate_add_decided_at` to the import block and append it to `_MIGRATIONS` after `migrate_add_context_hash`.

- [ ] **Step 6: Run tests to verify they pass**

Run: `pytest tests/test_decided_at_column.py tests/test_auto_migrate.py -v`
Expected: PASS (all)

- [ ] **Step 7: Commit**

```bash
git add engine/db/models.py engine/db/migrate_add_decided_at.py engine/db/auto_migrate.py tests/test_decided_at_column.py
git commit -m "feat(db): accounts.decided_at — when the human made the call"
```

---

### Task 2: `get_candidates` — all three exits, one query

**Files:**
- Modify: `engine/db/repo.py:108-118` (`get_candidates`)
- Test: `tests/test_candidates_exits.py`

**Interfaces:**
- Consumes: `AccountRow.decided_at` (Task 1)
- Produces: `repo.get_candidates(session) -> list[Account]` — unchanged signature, narrowed result set. Callers (`web/server.py` `/api/candidates`, `/api/push`) need no change.

- [ ] **Step 1: Write the failing test**

Create `tests/test_candidates_exits.py`:

```python
"""The finding surface has exactly three exits: promoted, decided, emailed."""
from engine.db.base import make_engine, create_all, make_session_factory
from engine.db.models import AccountRow, MessageRow
from engine.db import repo


def _session():
    engine = make_engine("sqlite:///:memory:")
    create_all(engine)
    return make_session_factory(engine)()


def _account(session, domain, **kw):
    session.add(AccountRow(domain=domain, name=domain, **kw))
    session.commit()


def _domains(session):
    return {a.domain for a in repo.get_candidates(session)}


def test_undecided_unpushed_unemailed_is_a_candidate():
    session = _session()
    _account(session, "open.example")
    assert _domains(session) == {"open.example"}


def test_promoted_is_excluded():
    session = _session()
    _account(session, "promoted.example", pushed=True)
    assert _domains(session) == set()


def test_decided_is_excluded():
    session = _session()
    _account(session, "held.example", route_confirmed=True, route_confirmed_route="hold")
    assert _domains(session) == set()


def test_emailed_is_excluded():
    session = _session()
    _account(session, "touched.example")
    session.add(MessageRow(company_domain="touched.example",
                           contact_email="jane@touched.example", status="sent"))
    session.commit()
    assert _domains(session) == set()


def test_draft_message_does_not_exclude():
    """A composed-but-unsent draft is not a touch — the firm is still to be worked."""
    session = _session()
    _account(session, "drafted.example")
    session.add(MessageRow(company_domain="drafted.example",
                           contact_email="jane@drafted.example", status="draft"))
    session.commit()
    assert _domains(session) == {"drafted.example"}


def test_failed_send_reverted_to_draft_stays_in_queue():
    """send_message reverts to DRAFT on failure — the card must not vanish."""
    session = _session()
    _account(session, "failed.example")
    session.add(MessageRow(company_domain="failed.example",
                           contact_email="jane@failed.example", status="draft"))
    session.commit()
    assert _domains(session) == {"failed.example"}


def test_query_count_is_flat_regardless_of_row_count():
    """Signals must be batch-loaded — this query runs on every page load of two screens."""
    from sqlalchemy import event
    session = _session()
    for i in range(25):
        _account(session, f"firm{i}.example")

    seen = []

    def _count(*a, **k):
        seen.append(1)

    engine = session.get_bind()
    event.listen(engine, "before_cursor_execute", _count)
    try:
        repo.get_candidates(session)
    finally:
        event.remove(engine, "before_cursor_execute", _count)
    # accounts + batched signals + batched contacts — a small constant, never 25+.
    assert len(seen) <= 5, f"N+1 regression: {len(seen)} queries for 25 accounts"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_candidates_exits.py -v`
Expected: FAIL on `test_decided_is_excluded`, `test_emailed_is_excluded`, and likely `test_query_count_is_flat_regardless_of_row_count`

- [ ] **Step 3: Rewrite the query**

In `engine/db/repo.py`, add to the imports at the top:

```python
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from engine.db.models import AccountRow, SignalRow, ContactRow, MessageRow
```

Replace `get_candidates` entirely:

```python
def get_candidates(session: Session) -> list[Account]:
    """The finding surface: firms not yet worked, ranked best-first. A firm leaves
    this list through exactly three exits, and never by being deleted —
    the row persists so re-ingest still dedupes against it:

      promoted  pushed = True                (LFG confirmed -> HubSpot working)
      decided   route_confirmed = True       (human called Hold/Nurture/Reject)
      emailed   a sent message for the domain (the first touch went out)

    Both the Morning Queue and the Triage Board read this, so an exit clears the
    card from both. We surface the WHOLE sorted list (dump-and-sort), not just
    closer-bound: routing is a badge + sort hint, not a gate.
    """
    # ONE subquery, not a per-row lookup: this runs on every load of two screens.
    sent_domains = select(MessageRow.company_domain).where(MessageRow.status == "sent")
    rows = (session.query(AccountRow)
            # Batch the relationship loads — _account_from_row touches row.signals
            # for every account, which is an N+1 without this (cf. bbc7da7).
            .options(selectinload(AccountRow.signals), selectinload(AccountRow.contacts))
            .filter(AccountRow.pushed.is_(False),
                    AccountRow.route_confirmed.is_(False),
                    AccountRow.domain.not_in(sent_domains))
            .all())
    accounts = [_account_from_row(r) for r in rows]
    accounts.sort(key=lambda a: (a.score.total if a.score else 0.0), reverse=True)
    return accounts
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_candidates_exits.py -v`
Expected: PASS (all 7)

- [ ] **Step 5: Run the full suite — this query has many callers**

Run: `pytest -q`
Expected: PASS. If `tests/test_server.py` or `tests/test_promote_and_push.py` fail, read the failure: a fixture that decided a row and still expects it in candidates needs updating to the new contract, but a failure in `/api/push` means the exclusion broke promote (push loads its selection from `get_candidates`).

- [ ] **Step 6: Commit**

```bash
git add engine/db/repo.py tests/test_candidates_exits.py
git commit -m "feat(repo): get_candidates honors all three exits — promoted, decided, emailed"
```

---

### Task 3: Re-ingest must not resurrect decided companies

**Files:**
- Modify: `engine/db/repo.py:86-105` (`upsert_accounts`), `engine/db/repo.py:19-48` (`_row_from_account`), `engine/db/repo.py:50-76` (`_account_from_row`)
- Test: `tests/test_upsert_preserves_decision.py`

**Interfaces:**
- Consumes: `AccountRow.decided_at` (Task 1)
- Produces: `Account` instances carrying `decided_at` via `a.__dict__["decided_at"]`, matching the existing `claimed` / `claimed_at` / `context_hash` convention.

**Why this task exists:** `upsert_accounts` deletes the existing row and inserts a fresh one, explicitly carrying forward `pushed`, `claimed`, `claimed_at`, `context_hash`, `hubspot_id`, `pursued`, and contacts. Nothing carries `route_confirmed`. A fresh CSV row builds an `Account` whose `route.confirmed` is `False`, so **re-ingesting a Clay export would resurrect every rejected company.** The spec tests for this behavior but assigned it no task.

- [ ] **Step 1: Write the failing test**

Create `tests/test_upsert_preserves_decision.py`:

```python
"""A decided firm stays decided across re-ingest — otherwise every Clay export
resurrects the companies the operator already rejected."""
from datetime import datetime, timezone

from engine.db.base import make_engine, create_all, make_session_factory
from engine.db.models import AccountRow
from engine.db import repo
from engine.models import Account


def _session():
    engine = make_engine("sqlite:///:memory:")
    create_all(engine)
    return make_session_factory(engine)()


def test_reingest_preserves_a_rejection():
    session = _session()
    repo.upsert_accounts(session, [Account(name="Buckeye", domain="buckeye.example")])
    row = session.get(AccountRow, "buckeye.example")
    row.route_confirmed = True
    row.route_confirmed_route = "reject"
    row.route_confirmed_by = "operator"
    row.decided_at = datetime(2026, 7, 29, tzinfo=timezone.utc)
    session.commit()

    # The same domain comes back in tomorrow's Clay export, undecided.
    repo.upsert_accounts(session, [Account(name="Buckeye", domain="buckeye.example")])

    row = session.get(AccountRow, "buckeye.example")
    assert row.route_confirmed is True
    assert row.route_confirmed_route == "reject"
    assert row.decided_at is not None


def test_reingest_leaves_an_undecided_firm_undecided():
    session = _session()
    repo.upsert_accounts(session, [Account(name="Open", domain="open.example")])
    repo.upsert_accounts(session, [Account(name="Open", domain="open.example")])
    row = session.get(AccountRow, "open.example")
    assert row.route_confirmed is False
    assert row.decided_at is None


def test_rejected_firm_does_not_return_to_candidates_after_reingest():
    session = _session()
    repo.upsert_accounts(session, [Account(name="Buckeye", domain="buckeye.example")])
    row = session.get(AccountRow, "buckeye.example")
    row.route_confirmed, row.route_confirmed_route = True, "reject"
    session.commit()
    repo.upsert_accounts(session, [Account(name="Buckeye", domain="buckeye.example")])
    assert repo.get_candidates(session) == []


def test_decided_at_roundtrips_through_the_account_dataclass():
    session = _session()
    a = Account(name="Buckeye", domain="buckeye.example")
    a.__dict__["decided_at"] = datetime(2026, 7, 29, tzinfo=timezone.utc)
    repo.upsert_accounts(session, [a])
    assert session.get(AccountRow, "buckeye.example").decided_at is not None
    back = repo._account_from_row(session.get(AccountRow, "buckeye.example"))
    assert back.__dict__["decided_at"] is not None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_upsert_preserves_decision.py -v`
Expected: FAIL — `test_reingest_preserves_a_rejection` asserts `True` but gets `False`

- [ ] **Step 3: Carry the decision through the row conversions**

In `engine/db/repo.py`, inside `_row_from_account`, add to the `AccountRow(...)` constructor call alongside `context_hash`:

```python
        decided_at=getattr(a, "decided_at", None),
```

In `_account_from_row`, add alongside the other `__dict__` assignments:

```python
    a.__dict__["decided_at"] = row.decided_at
```

- [ ] **Step 4: Preserve the decision on re-ingest**

In `upsert_accounts`, inside the `if existing is not None:` block, directly after the `new_row.pursued` line:

```python
            # A human's Hold/Nurture/Reject outlives re-ingest — otherwise tomorrow's
            # Clay export resurrects every company the operator already rejected.
            if existing.route_confirmed:
                new_row.route_confirmed = True
                new_row.route_confirmed_route = existing.route_confirmed_route
                new_row.route_confirmed_by = existing.route_confirmed_by
                new_row.decided_at = existing.decided_at
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pytest tests/test_upsert_preserves_decision.py tests/test_upsert_dedup.py tests/test_repo_claimed.py -v`
Expected: PASS (all)

- [ ] **Step 6: Commit**

```bash
git add engine/db/repo.py tests/test_upsert_preserves_decision.py
git commit -m "fix(repo): re-ingest preserves the human's decision — rejects stay rejected"
```

---

### Task 4: HubSpot `set_engine_status`

**Files:**
- Modify: `engine/hubspot/client.py` (add method after `promote_to_working`, ~line 288)
- Test: `tests/test_set_engine_status.py`

**Interfaces:**
- Consumes: existing `HubSpotClient._find_company_ours(domain) -> tuple[str | None, bool]`, `_patch`, `_dry`, `ENGINE_STATUS_PROPERTY`
- Produces: `HubSpotClient.set_engine_status(domain: str, status: str) -> bool` — `True` only on a real successful write. `engine.hubspot.client.ENGINE_STATUS_BY_DECISION: dict[str, str]` mapping decision keys to HubSpot option values.

- [ ] **Step 1: Write the failing test**

Create `tests/test_set_engine_status.py`:

```python
"""engine_status writes only ever touch companies we sourced."""
import pytest

from engine.hubspot.client import HubSpotClient, ENGINE_STATUS_BY_DECISION


class _Client(HubSpotClient):
    """Real method under test, network stubbed."""
    def __init__(self, found=("123", True)):
        self._dry = False
        self._found = found
        self.patched = []

    def _find_company_ours(self, domain):
        return self._found

    def _patch(self, path, payload):
        self.patched.append((path, payload))
        return {}


def test_decision_keys_map_to_hubspot_options():
    assert ENGINE_STATUS_BY_DECISION == {
        "hold": "hold", "nurture": "nurture", "reject": "rejected"}


def test_writes_engine_status_on_our_company():
    c = _Client(found=("123", True))
    assert c.set_engine_status("buckeye.example", "hold") is True
    path, payload = c.patched[0]
    assert path == "/crm/v3/objects/companies/123"
    assert payload["properties"]["engine_status"] == "hold"


def test_refuses_a_company_that_is_not_ours():
    """John's pre-existing book is never written to — the SLA guard."""
    c = _Client(found=("456", False))
    assert c.set_engine_status("theirs.example", "hold") is False
    assert c.patched == []


def test_refuses_a_company_not_in_hubspot():
    c = _Client(found=(None, False))
    assert c.set_engine_status("ghost.example", "hold") is False
    assert c.patched == []


def test_dry_mode_writes_nothing():
    c = _Client()
    c._dry = True
    assert c.set_engine_status("buckeye.example", "hold") is False
    assert c.patched == []


def test_rejects_an_unknown_status():
    c = _Client()
    with pytest.raises(ValueError):
        c.set_engine_status("buckeye.example", "banana")
    assert c.patched == []
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_set_engine_status.py -v`
Expected: FAIL — `ImportError: cannot import name 'ENGINE_STATUS_BY_DECISION'`

- [ ] **Step 3: Implement**

In `engine/hubspot/client.py`, beside the other property-name constants near line 37:

```python
# Operator decision key -> engine_status option value. "reject" is stored as
# "rejected" because that's the HubSpot option label the portal already reads.
ENGINE_STATUS_BY_DECISION = {"hold": "hold", "nurture": "nurture", "reject": "rejected"}
_VALID_ENGINE_STATUSES = {"discovered", "working", "nurture", "hold", "rejected"}
```

After `promote_to_working`, add:

```python
    def set_engine_status(self, domain: str, status: str) -> bool:
        """PATCH engine_status on a company WE sourced. Mirrors promote_to_working's
        ownership guard: John's pre-existing records are never written to. Dry mode
        writes nothing. Returns True only on a real successful write, so the caller
        can report a HubSpot sync failure without failing the operator's decision
        (the DB is authoritative for what's in the queue)."""
        if status not in _VALID_ENGINE_STATUSES:
            raise ValueError(f"unknown engine_status {status!r}")
        if self._dry:
            print(f"  [DRY] would set {ENGINE_STATUS_PROPERTY}={status} on {domain}")
            return False
        company_id, is_ours = self._find_company_ours(domain)
        if not company_id or not is_ours:
            print(f"  [skip] {domain} — not an engine-sourced company, not writing")
            return False
        self._patch(f"/crm/v3/objects/companies/{company_id}",
                    {"properties": {ENGINE_STATUS_PROPERTY: status}})
        return True
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_set_engine_status.py -v`
Expected: PASS (6)

- [ ] **Step 5: Commit**

```bash
git add engine/hubspot/client.py tests/test_set_engine_status.py
git commit -m "feat(hubspot): set_engine_status — ownership-guarded engine_status PATCH"
```

---

### Task 5: `POST /api/decide` and `POST /api/undecide`

**Files:**
- Modify: `web/server.py` (add after the `/api/push` handler, ~line 390)
- Test: `tests/test_decide_api.py`

**Interfaces:**
- Consumes: `HubSpotClient.set_engine_status` + `ENGINE_STATUS_BY_DECISION` (Task 4), `AccountRow.decided_at` (Task 1)
- Produces:
  - `POST /api/decide` — body `{"domains": [str], "decision": "hold"|"nurture"|"reject"}` → `{"results": [{"domain", "status", "hubspot_synced", "reason"?}], "decided": int}`. `status` is `"decided"` | `"not_found"`.
  - `POST /api/undecide` — body `{"domains": [str]}` → `{"results": [...], "undecided": int}`.

**Design call to honor:** the DB write is authoritative and happens first; the HubSpot sync is best-effort and reported as `hubspot_synced`. A HubSpot outage must not block the operator from clearing their board. A domain that isn't in the DB returns `not_found` and its card stays put — that is the "a failed decision leaves the card on the board" case from the spec.

- [ ] **Step 1: Write the failing test**

Create `tests/test_decide_api.py`:

```python
"""Hold/Nurture/Reject persist, clear the card, and never write to a foreign record."""
from engine.db.models import AccountRow
from engine.db import repo


def _account(session, domain):
    session.add(AccountRow(domain=domain, name=domain))
    session.commit()


def test_decide_persists_and_clears_the_card(client, session, monkeypatch):
    import web.server as server
    monkeypatch.setattr(server.HubSpotClient, "set_engine_status",
                        lambda self, domain, status: True)
    _account(session, "buckeye.example")

    r = client.post("/api/decide",
                    json={"domains": ["buckeye.example"], "decision": "hold"})
    assert r.status_code == 200
    body = r.json()
    assert body["decided"] == 1
    assert body["results"][0]["status"] == "decided"
    assert body["results"][0]["hubspot_synced"] is True

    row = session.get(AccountRow, "buckeye.example")
    assert row.route_confirmed is True
    assert row.route_confirmed_route == "hold"
    assert row.route_confirmed_by == "operator"
    assert row.decided_at is not None
    assert repo.get_candidates(session) == []


def test_decision_survives_a_reload(client, session, monkeypatch):
    """The defect that motivated this work: the click used to live only in React state."""
    import web.server as server
    monkeypatch.setattr(server.HubSpotClient, "set_engine_status",
                        lambda self, domain, status: True)
    _account(session, "buckeye.example")
    client.post("/api/decide", json={"domains": ["buckeye.example"], "decision": "nurture"})

    shown = {c["domain"] for c in client.get("/api/candidates").json()["candidates"]}
    assert "buckeye.example" not in shown


def test_reject_maps_to_the_rejected_option(client, session, monkeypatch):
    import web.server as server
    seen = {}
    monkeypatch.setattr(server.HubSpotClient, "set_engine_status",
                        lambda self, domain, status: seen.setdefault(domain, status) or True)
    _account(session, "buckeye.example")
    client.post("/api/decide", json={"domains": ["buckeye.example"], "decision": "reject"})
    assert seen["buckeye.example"] == "rejected"


def test_hubspot_failure_still_persists_the_decision(client, session, monkeypatch):
    """A HubSpot outage must not block the operator from clearing their board."""
    import web.server as server
    monkeypatch.setattr(server.HubSpotClient, "set_engine_status",
                        lambda self, domain, status: False)
    _account(session, "buckeye.example")

    body = client.post("/api/decide",
                       json={"domains": ["buckeye.example"], "decision": "hold"}).json()
    assert body["results"][0]["status"] == "decided"
    assert body["results"][0]["hubspot_synced"] is False
    assert session.get(AccountRow, "buckeye.example").route_confirmed is True


def test_unknown_domain_reports_not_found(client, session):
    body = client.post("/api/decide",
                       json={"domains": ["ghost.example"], "decision": "hold"}).json()
    assert body["decided"] == 0
    assert body["results"][0]["status"] == "not_found"


def test_unknown_decision_is_rejected(client, session):
    assert client.post("/api/decide",
                       json={"domains": ["x.example"], "decision": "banana"}).status_code == 400


def test_closer_is_not_a_decision(client, session):
    """LFG goes through /api/push — it's a promote, not a decide."""
    assert client.post("/api/decide",
                       json={"domains": ["x.example"], "decision": "closer"}).status_code == 400


def test_undecide_returns_the_firm_to_triage(client, session, monkeypatch):
    import web.server as server
    monkeypatch.setattr(server.HubSpotClient, "set_engine_status",
                        lambda self, domain, status: True)
    _account(session, "buckeye.example")
    client.post("/api/decide", json={"domains": ["buckeye.example"], "decision": "hold"})

    body = client.post("/api/undecide", json={"domains": ["buckeye.example"]}).json()
    assert body["undecided"] == 1

    row = session.get(AccountRow, "buckeye.example")
    assert row.route_confirmed is False
    assert row.decided_at is None
    assert {a.domain for a in repo.get_candidates(session)} == {"buckeye.example"}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_decide_api.py -v`
Expected: FAIL — 404 on `/api/decide`

- [ ] **Step 3: Implement both endpoints**

In `web/server.py`, near the other request models add:

```python
class DecideRequest(BaseModel):
    domains: list[str]
    decision: str


class UndecideRequest(BaseModel):
    domains: list[str]
```

Add `from engine.hubspot.client import ENGINE_STATUS_BY_DECISION` to the HubSpot import, and after the `/api/push` handler:

```python
@app.post("/api/decide")
def decide(req: DecideRequest, session=Depends(db_session)):
    """Record the operator's Hold/Nurture/Reject and clear the card from every finding
    surface. The DB write is authoritative — it decides what's in the queue — and the
    HubSpot engine_status sync is best-effort, reported per domain as `hubspot_synced`.
    A HubSpot outage must never stop the operator clearing their board. LFG is NOT a
    decision: it's a promote, and it goes through /api/push."""
    status_value = ENGINE_STATUS_BY_DECISION.get(req.decision)
    if status_value is None:
        raise HTTPException(
            status_code=400,
            detail=f"unknown decision {req.decision!r} — expected hold, nurture or reject")

    client = HubSpotClient()
    now = datetime.now(timezone.utc)
    results, decided = [], 0
    for dom in req.domains:
        row = session.get(AccountRow, dom)
        if row is None:
            results.append({"domain": dom, "status": "not_found",
                            "reason": "no such account"})
            continue
        row.route_confirmed = True
        row.route_confirmed_route = req.decision
        row.route_confirmed_by = "operator"
        row.decided_at = now
        decided += 1
        try:
            synced = client.set_engine_status(dom, status_value)
        except Exception as e:   # one firm's HubSpot hiccup never aborts the batch
            print(f"  [decide] {dom} hubspot sync failed ({type(e).__name__}: {e})")
            synced = False
        results.append({"domain": dom, "status": "decided", "hubspot_synced": synced})
    session.commit()
    return {"results": results, "decided": decided}


@app.post("/api/undecide")
def undecide(req: UndecideRequest, session=Depends(db_session)):
    """Return decided firms to the finding surface. Leaves engine_status alone — the
    next real decision overwrites it, and a firm back in triage is 'discovered' again
    only in our view, not a fact worth a write."""
    results, undecided = [], 0
    for dom in req.domains:
        row = session.get(AccountRow, dom)
        if row is None:
            results.append({"domain": dom, "status": "not_found"})
            continue
        row.route_confirmed = False
        row.route_confirmed_route = None
        row.route_confirmed_by = ""   # undo fully reverses the decision, attribution included
        row.decided_at = None
        undecided += 1
        results.append({"domain": dom, "status": "undecided"})
    session.commit()
    return {"results": results, "undecided": undecided}
```

Confirm `datetime`, `timezone`, `AccountRow`, and `BaseModel` are already imported in `web/server.py` — they are, via the existing send/claim handlers.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_decide_api.py -v`
Expected: PASS (8)

- [ ] **Step 5: Commit**

```bash
git add web/server.py tests/test_decide_api.py
git commit -m "feat(api): /api/decide + /api/undecide — the decision persists"
```

---

### Task 6: HubSpot `engine_status` option migration

**Files:**
- Create: `engine/hubspot/extend_engine_status_options.py`
- Test: `tests/test_extend_engine_status_options.py`

**Interfaces:**
- Consumes: `HubSpotClient._get`, `_patch`
- Produces: `extend_engine_status_options.merged_options(live: dict) -> list[dict]`, `main(argv)`.

**Why the read-then-write guard:** HubSpot's PATCH on a select property **replaces** the entire `options` array rather than appending. Writing only the three new options would delete `discovered` and `working` from the portal, orphaning every record already stamped with them. This script must read live, assert both are present, and carry them forward with their original `value` and `displayOrder`.

Follows the guarded-script pattern of `engine/hubspot/create_engine_status_property.py`: print-plan by default, `--run` to apply, refuse under `DRY_RUN`. Never added to `auto_migrate`.

- [ ] **Step 1: Write the failing test**

Create `tests/test_extend_engine_status_options.py`:

```python
"""HubSpot PATCH REPLACES a select property's options — a partial write would
orphan every record stamped discovered/working."""
import pytest

from engine.hubspot import extend_engine_status_options as ext


def _live(options):
    return {"name": "engine_status", "options": options}


DISCOVERED = {"label": "Discovered", "value": "discovered", "displayOrder": 0}
WORKING = {"label": "Working", "value": "working", "displayOrder": 1}


def test_carries_existing_options_forward():
    merged = ext.merged_options(_live([DISCOVERED, WORKING]))
    values = [o["value"] for o in merged]
    assert values == ["discovered", "working", "nurture", "hold", "rejected"]


def test_preserves_original_value_and_display_order():
    merged = ext.merged_options(_live([DISCOVERED, WORKING]))
    assert merged[0] == DISCOVERED
    assert merged[1] == WORKING


def test_aborts_when_discovered_is_missing():
    with pytest.raises(ValueError, match="discovered"):
        ext.merged_options(_live([WORKING]))


def test_aborts_when_working_is_missing():
    with pytest.raises(ValueError, match="working"):
        ext.merged_options(_live([DISCOVERED]))


def test_is_idempotent_when_options_already_extended():
    already = [DISCOVERED, WORKING,
               {"label": "Nurture", "value": "nurture", "displayOrder": 2},
               {"label": "Hold", "value": "hold", "displayOrder": 3},
               {"label": "Rejected", "value": "rejected", "displayOrder": 4}]
    assert [o["value"] for o in ext.merged_options(_live(already))] == \
        ["discovered", "working", "nurture", "hold", "rejected"]


def test_is_not_registered_for_auto_migration():
    from engine.db.auto_migrate import _MIGRATIONS
    assert "engine_status" not in " ".join(m.__name__ for m in _MIGRATIONS)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_extend_engine_status_options.py -v`
Expected: FAIL — `ImportError: cannot import name 'extend_engine_status_options'`

- [ ] **Step 3: Implement**

Create `engine/hubspot/extend_engine_status_options.py`:

```python
"""GUARDED prod-setup (run ONCE by hand, never in CI / auto_migrate): extend the
company property `engine_status` with nurture | hold | rejected.

CRITICAL: HubSpot's PATCH on a select property REPLACES the options array — it does
not append. Writing only the new options would delete discovered/working and orphan
every record already stamped with them. So: read live, assert both survivors are
present, carry them forward untouched, then write all five.

Prints the plan unless --run is passed; refuses under DRY_RUN."""
from __future__ import annotations

import sys

from engine.hubspot.client import HubSpotClient
from engine.config import CONFIG

_PATH = "/crm/v3/properties/companies/engine_status"

_NEW = [
    {"label": "Nurture", "value": "nurture", "displayOrder": 2},
    {"label": "Hold", "value": "hold", "displayOrder": 3},
    {"label": "Rejected", "value": "rejected", "displayOrder": 4},
]
_REQUIRED = ("discovered", "working")


def merged_options(live: dict) -> list[dict]:
    """The full options array to write back. Raises rather than write a partial one.

    HubSpot's PATCH REPLACES this array, so anything not carried forward is DELETED.
    Every live option survives in its existing order — including any added in the portal
    that this script doesn't know about — and the new ones are appended after them.
    """
    existing = list(live.get("options") or [])
    by_value = {o.get("value"): o for o in existing}
    for required in _REQUIRED:
        if required not in by_value:
            raise ValueError(
                f"live engine_status is missing {required!r} — refusing to write a "
                f"partial options array that would orphan existing records")
    known = {"discovered", "working"} | {o["value"] for o in _NEW}
    for value in by_value:
        if value not in known:
            print(f"  [preserve] carrying forward unrecognized live option {value!r}")
    merged = list(existing)
    next_order = max((o.get("displayOrder", 0) or 0) for o in existing) + 1
    for option in _NEW:
        if option["value"] in by_value:
            continue
        merged.append({**option, "displayOrder": next_order})
        next_order += 1
    return merged


def main(argv=None) -> None:
    argv = argv if argv is not None else sys.argv[1:]
    if "--run" not in argv:
        print("[guarded] would read engine_status, then PATCH it with all five options "
              "(discovered, working, nurture, hold, rejected). Re-run with --run to apply.")
        return
    if CONFIG.dry_run:
        print("[guarded] DRY_RUN set — refusing to write. Unset DRY_RUN and provide HUBSPOT_TOKEN.")
        return
    client = HubSpotClient()
    live = client._get(_PATH)
    options = merged_options(live)
    client._patch(_PATH, {"options": options})
    print(f"  engine_status extended -> {[o['value'] for o in options]}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_extend_engine_status_options.py -v`
Expected: PASS (6)

- [ ] **Step 5: Commit**

```bash
git add engine/hubspot/extend_engine_status_options.py tests/test_extend_engine_status_options.py
git commit -m "feat(hubspot): guarded engine_status option extension (read-then-write)"
```

**Deploy note for the human, not the agent:** this script must be run by hand against prod (`python -m engine.hubspot.extend_engine_status_options --run`) before Task 5's decisions can sync. Until it runs, `/api/decide` persists locally and reports `hubspot_synced: false` — which is the designed degradation, not a bug.

---

### Task 7: `?decision=` filter on `/api/candidates`

**Files:**
- Modify: `engine/db/repo.py` (add `get_decided`), `web/server.py:170-235` (`/api/candidates`)
- Test: `tests/test_candidates_decision_filter.py`

**Interfaces:**
- Consumes: `AccountRow.decided_at` (Task 1)
- Produces: `repo.get_decided(session, decision: str) -> list[Account]`. `/api/candidates?decision=hold|nurture|reject` returns the same candidate shape, plus `decided_at` (UTC ISO 8601) on each entry.

- [ ] **Step 1: Write the failing test**

Create `tests/test_candidates_decision_filter.py`:

```python
"""Decided firms are reachable by filter — they feed the Activity screen."""
from engine.db.models import AccountRow


def _decided(session, domain, route):
    from datetime import datetime, timezone
    session.add(AccountRow(domain=domain, name=domain, route_confirmed=True,
                           route_confirmed_route=route,
                           decided_at=datetime(2026, 7, 29, tzinfo=timezone.utc)))
    session.commit()


def test_no_param_returns_only_undecided(client, session):
    session.add(AccountRow(domain="open.example", name="Open"))
    session.commit()
    _decided(session, "held.example", "hold")
    shown = {c["domain"] for c in client.get("/api/candidates").json()["candidates"]}
    assert shown == {"open.example"}


def test_filter_returns_only_that_decision(client, session):
    _decided(session, "held.example", "hold")
    _decided(session, "nurtured.example", "nurture")
    body = client.get("/api/candidates?decision=hold").json()
    assert {c["domain"] for c in body["candidates"]} == {"held.example"}


def test_filtered_rows_carry_decided_at(client, session):
    _decided(session, "held.example", "hold")
    row = client.get("/api/candidates?decision=hold").json()["candidates"][0]
    assert row["decided_at"].startswith("2026-07-29")


def test_unknown_decision_is_rejected(client, session):
    assert client.get("/api/candidates?decision=banana").status_code == 400
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_candidates_decision_filter.py -v`
Expected: FAIL — `test_filter_returns_only_that_decision` returns both rows (the param is ignored)

- [ ] **Step 3: Add the repo query**

In `engine/db/repo.py`, after `get_candidates`:

```python
def get_decided(session: Session, decision: str) -> list[Account]:
    """Firms a human decided on (hold | nurture | reject), newest decision first.
    Feeds the Activity screen's filter — these left the finding surface but are not
    gone."""
    rows = (session.query(AccountRow)
            # signals only — _account_from_row reads them; nothing here reads .contacts.
            .options(selectinload(AccountRow.signals))
            .filter(AccountRow.route_confirmed.is_(True),
                    AccountRow.route_confirmed_route == decision)
            .order_by(AccountRow.decided_at.desc().nullslast())
            .all())
    return [_account_from_row(r) for r in rows]
```

- [ ] **Step 4: Wire the endpoint**

In `web/server.py`, change the `/api/candidates` signature to accept the filter and branch the source list:

```python
@app.get("/api/candidates")
def candidates(session=Depends(db_session), limit: int = 250, decision: str | None = None):
    if decision is not None:
        if decision not in ("hold", "nurture", "reject"):
            raise HTTPException(
                status_code=400,
                detail=f"unknown decision {decision!r} — expected hold, nurture or reject")
        all_unpushed = repo.get_decided(session, decision)
    else:
        all_unpushed = repo.get_candidates(session)   # sorted by score desc
```

In the per-account dict built in that handler, add alongside `route_confirmed`:

```python
            "decided_at": (dt.isoformat() if (dt := a.__dict__.get("decided_at")) else None),
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pytest tests/test_candidates_decision_filter.py tests/test_server.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add engine/db/repo.py web/server.py tests/test_candidates_decision_filter.py
git commit -m "feat(api): /api/candidates?decision= — reach the decided set"
```

---

### Task 8: Wake rule — a held firm that heats up comes back

**Files:**
- Modify: `engine/jobs/rescore.py`
- Test: `tests/test_wake_decided.py`

**Interfaces:**
- Consumes: `AccountRow.decided_at`, `route_confirmed_route`
- Produces: `rescore.wake_heated_decisions(session, rows, prior_timing: dict[str, float]) -> list[str]` — returns woken domains. `rescore_all` calls it and its return value is unchanged (`int`).

**Deviation from spec, deliberate:** the spec's wake rule fires on a timing crossing **or** `in_market` becoming `confirmed`. Only the timing crossing is implemented. Detecting "`in_market` has become confirmed" needs a stored prior value that does not exist, and `in_market` is driven by exactly the signals (`ads_active`, `hiring_marketing`, `new_location`) that also lift timing — so the crossing covers it in practice. Revisit if a real case appears where a firm confirms in-market without crossing 55.

- [ ] **Step 1: Write the failing test**

Create `tests/test_wake_decided.py`:

```python
"""A Hold/Nurture firm that heats up returns to triage. A reject never does."""
from datetime import datetime, timezone

from engine.db.base import make_engine, create_all, make_session_factory
from engine.db.models import AccountRow
from engine.jobs import rescore

GATE = 55.0


def _session():
    engine = make_engine("sqlite:///:memory:")
    create_all(engine)
    return make_session_factory(engine)()


def _decided(session, domain, route, timing):
    session.add(AccountRow(domain=domain, name=domain, timing=timing,
                           route_confirmed=True, route_confirmed_route=route,
                           decided_at=datetime(2026, 7, 1, tzinfo=timezone.utc)))
    session.commit()
    return session.get(AccountRow, domain)


def test_wakes_a_hold_that_crosses_the_gate_upward():
    session = _session()
    row = _decided(session, "buckeye.example", "hold", timing=70.0)   # new timing
    woken = rescore.wake_heated_decisions(session, [row], {"buckeye.example": 40.0})
    assert woken == ["buckeye.example"]
    assert row.route_confirmed is False
    assert row.decided_at is None


def test_wakes_a_nurture_that_crosses_the_gate_upward():
    session = _session()
    row = _decided(session, "nurtured.example", "nurture", timing=60.0)
    assert rescore.wake_heated_decisions(session, [row], {"nurtured.example": 20.0})


def test_does_not_wake_a_firm_already_above_the_gate():
    session = _session()
    row = _decided(session, "warm.example", "hold", timing=80.0)
    assert rescore.wake_heated_decisions(session, [row], {"warm.example": 70.0}) == []
    assert row.route_confirmed is True


def test_never_wakes_a_reject():
    session = _session()
    row = _decided(session, "dead.example", "reject", timing=95.0)
    assert rescore.wake_heated_decisions(session, [row], {"dead.example": 10.0}) == []
    assert row.route_confirmed is True


def test_does_not_wake_on_a_downward_crossing():
    session = _session()
    row = _decided(session, "cooling.example", "hold", timing=30.0)
    assert rescore.wake_heated_decisions(session, [row], {"cooling.example": 80.0}) == []


def test_rescore_all_wakes_as_it_scores(monkeypatch):
    """The wake pass runs off the timing rescore just computed, not a second pass."""
    from engine.scoring.config import ScoringConfig
    session = _session()
    row = _decided(session, "buckeye.example", "hold", timing=10.0)
    monkeypatch.setattr(
        rescore.abcr, "score",
        lambda account, config: type("S", (), {
            "fit": 50.0, "timing": 90.0, "total": 70.0, "band": "A", "rationale": ""})())
    rescore.rescore_all(session, ScoringConfig())
    assert session.get(AccountRow, "buckeye.example").route_confirmed is False
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_wake_decided.py -v`
Expected: FAIL — `AttributeError: module 'engine.jobs.rescore' has no attribute 'wake_heated_decisions'`

- [ ] **Step 3: Implement**

Replace the body of `engine/jobs/rescore.py` below the imports:

```python
# Mirrors the routing gate the console draws at triage.jsx:13 — timing at or above
# this means "in-market now".
_GATE = 55.0
# reject is permanently excluded: re-litigating rejects is exactly the churn the
# operator asked the decision to prevent.
_WAKEABLE = ("hold", "nurture")


def wake_heated_decisions(session: Session, rows, prior_timing: dict[str, float]) -> list[str]:
    """Return a decided firm to the finding surface when it crosses the timing gate
    UPWARD — the firm got hot after the operator set it aside. Rejects never wake.
    Waking is logged so a surprise reappearance on the board is explainable."""
    woken = []
    for row in rows:
        if not row.route_confirmed or row.route_confirmed_route not in _WAKEABLE:
            continue
        before = prior_timing.get(row.domain)
        if before is None or before >= _GATE or (row.timing or 0.0) < _GATE:
            continue
        row.route_confirmed = False
        row.route_confirmed_route = None
        row.route_confirmed_by = ""   # same full reversal /api/undecide performs
        row.decided_at = None
        woken.append(row.domain)
        print(f"  [wake] {row.domain} timing {before:.0f} -> {row.timing:.0f} "
              f"— back on the board")
    return woken


def rescore_all(session: Session, config: ScoringConfig) -> int:
    """Re-score every AccountRow with `config`; return how many were re-scored.
    Firms set aside on Hold/Nurture that heat up across the gate come back."""
    # selectinload batches signals in one query — avoids an N+1 across all accounts.
    rows = session.query(AccountRow).options(selectinload(AccountRow.signals)).all()
    prior_timing = {row.domain: (row.timing or 0.0) for row in rows}
    for row in rows:
        s = abcr.score(_account_from_row(row), config)
        row.fit, row.timing, row.total = s.fit, s.timing, s.total
        row.band, row.score_rationale = s.band, s.rationale
    wake_heated_decisions(session, rows, prior_timing)
    session.commit()
    return len(rows)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_wake_decided.py tests/test_rescore.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add engine/jobs/rescore.py tests/test_wake_decided.py
git commit -m "feat(rescore): wake Hold/Nurture firms that cross the timing gate upward"
```

---

### Task 9: Shared compose panel

**Files:**
- Create: `web/console/app/compose.jsx`
- Modify: `web/console/app/queue.jsx:78-149` (remove `MQComposePanel`, consume the shared one), `web/console/index.html` (add the script tag)
- Test: manual — this is a move, verified by Task 10's and Task 11's behavior

**Interfaces:**
- Consumes: `PE.fetchContacts`, `PE.pursueDomains`, `PE.composeMessage`, `PE.editMessage`, `PE.sendMessage` (all exist in `data.jsx`)
- Produces:
  - `window.PE.ComposePanel` — props `{account, onError, onSent}`. `onSent(contactEmail)` fires **only** after the server returns `{sent: true}`; Task 11 and the next plan hang the card removal off it.
  - `window.PE.CompanyLink` — props `{name, domain}`. Renders the company name as a link to its site. Used by Tasks 10 and 11 and by the Activity screen, so the markup exists once.

**This is a move, not a rewrite.** `MQComposePanel` already takes `{account, onError}` and handles find → compose → edit → send end to end. The only addition is the `onSent` callback.

`compose.jsx` holds console components shared across the queue, triage, and activity surfaces — hence `CompanyLink` living beside `ComposePanel` rather than being copy-pasted into three files.

- [ ] **Step 0: Add the shared company link**

At the top of `compose.jsx`, before `ComposePanel`, add the component and its CSS (fold these rules into the `CP_CSS` string created in Step 1):

```css
.cp-colink{ color:inherit; text-decoration:none; }
.cp-colink:hover{ text-decoration:underline; }
```

```jsx
// The company name, linked to their own site. `noopener noreferrer` is required —
// without it the opened tab gets a window.opener handle back into the console.
function CompanyLink({ name, domain }) {
  if (!domain) return <React.Fragment>{name}</React.Fragment>;
  return (
    <a className="cp-colink" href={"https://" + domain}
       target="_blank" rel="noopener noreferrer">{name}</a>
  );
}
```

End the file with both exports:

```jsx
window.PE.ComposePanel = ComposePanel;
window.PE.CompanyLink = CompanyLink;
```

- [ ] **Step 1: Create the shared module**

Create `web/console/app/compose.jsx` containing the current `MQComposePanel` body from `queue.jsx:78-149`, renamed to `ComposePanel`, with these changes and nothing else:

- Move the `.mq-cp*` CSS block from `MQ_CSS` (`queue.jsx:44-57`) into a `CP_CSS` string in this file, injected under `id="cp-css"` following the existing injection pattern.
- Accept a third prop, `onSent`.
- In `send()`, after `if (res.sent) patch(email, "sent", true);` add `onSent && onSent(email);` — inside the success branch only, never on the failure path.
- End the file with `window.PE.ComposePanel = ComposePanel;`

Keep the icon-fallback consts (`IcoCompose`, `IcoSend`, `IcoFind`, `IcoSent`) with it — they exist because an undefined icon component crashes the render.

- [ ] **Step 2: Load it before its consumers**

In `web/console/index.html`, add the `compose.jsx` script tag immediately **before** `queue.jsx` and `triage.jsx`, matching the existing Babel-transformed script tags.

- [ ] **Step 3: Consume it from the queue**

In `web/console/app/queue.jsx`: delete the `MQComposePanel` function and the `.mq-cp*` CSS rules now living in `compose.jsx`, and change the render site (`queue.jsx:234`) to:

```jsx
              {open[a.domain] && <PEQ.ComposePanel account={a} onError={onError} />}
```

- [ ] **Step 4: Verify in the browser**

Run the app, open Morning Queue, expand Compose on a card. Expected: contacts load, Compose builds a draft, edits persist, Send behaves exactly as before. Check the console for errors — a missing script tag shows as `PEQ.ComposePanel is not a function`.

- [ ] **Step 5: Commit**

```bash
git add web/console/app/compose.jsx web/console/app/queue.jsx web/console/index.html
git commit -m "refactor(ui): extract ComposePanel — shared by queue and triage"
```

---

### Task 10: Triage board — decisions that stick, compose, hyperlink

**Files:**
- Modify: `web/console/app/triage.jsx:114-330`, `web/console/app/data.jsx:252-259`
- Test: manual, in the browser

**Interfaces:**
- Consumes: `POST /api/decide` (Task 5), `PE.ComposePanel` (Task 9)
- Produces: `PE.decideDomains(domains, decision) -> Promise`, `PE.undecideDomains(domains) -> Promise` in `data.jsx`

- [ ] **Step 1: Add the client calls**

In `web/console/app/data.jsx`, beside `pushDomains`:

```js
/* Record the operator's Hold/Nurture/Reject. The DB write is authoritative; a false
   `hubspot_synced` means the decision stuck locally but HubSpot didn't take the
   engine_status write — surface it, don't fail the decision. */
async function decideDomains(domains, decision) {
  const r = await fetch("/api/decide", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domains, decision }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.detail || ("Decide failed (" + r.status + ")"));
  return j;   // { results:[{domain,status,hubspot_synced}], decided }
}

async function undecideDomains(domains) {
  const r = await fetch("/api/undecide", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domains }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.detail || ("Undecide failed (" + r.status + ")"));
  return j;
}
```

Add both to the `Object.assign(window.PE, {...})` export list.

- [ ] **Step 2: Make the route buttons decide**

In `web/console/app/triage.jsx`, replace `setRoute` (line 124) with a handler that persists. Add `decided` state beside the existing `confirmed` state:

```jsx
  const [decided, setDecided] = useStateT({});   // domain -> true (left the board)

  // Hold/Nurture/Reject persist to the server and clear the card. LFG is NOT here —
  // it's a promote, and it goes through confirm()/api/push.
  async function decide(domain, decision) {
    if (busy[domain] || decided[domain]) return;
    setOverrides((o) => ({ ...o, [domain]: decision }));   // reflect the click immediately
    setBusy((b) => ({ ...b, [domain]: true }));
    try {
      const res = await PET.decideDomains([domain], decision);
      const row = (res.results || []).find((x) => x.domain === domain);
      if (row && row.status === "decided") {
        setDecided((d) => ({ ...d, [domain]: true }));
        if (row.hubspot_synced === false) {
          onError && onError(new Error(
            `Saved ${decision} for ${domain}, but HubSpot didn't take the status write.`));
        }
        await PET.refresh();
      } else {
        // Never optimistically clear — put the toggle back where it was.
        setOverrides((o) => { const n = { ...o }; delete n[domain]; return n; });
        onError && onError(new Error(
          "Not saved — " + domain + ((row && row.reason) ? `: ${row.reason}` : "")));
      }
    } catch (e) {
      setOverrides((o) => { const n = { ...o }; delete n[domain]; return n; });
      onError && onError(e);
    } finally { setBusy((b) => { const n = { ...b }; delete n[domain]; return n; }); }
  }
```

Change the segmented control (line 244-248) so LFG selects the route locally while the other three decide:

```jsx
                          <div className="tg-seg">
                            {ROUTES.map((x) => (
                              <button key={x.key} className={r === x.key ? "on" : ""}
                                disabled={!!busy[a.domain]}
                                onClick={() => x.key === "closer"
                                  ? setRoute(a.domain, x.key)
                                  : decide(a.domain, x.key)}>{x.label}</button>
                            ))}
                          </div>
```

Keep `setRoute` for the LFG case:

```jsx
  const setRoute = (domain, key) => setOverrides((o) => ({ ...o, [domain]: key }));
```

- [ ] **Step 3: Clear decided cards from the board**

Change the list source (line 206) and the awaiting count (line 126) to drop decided rows:

```jsx
  const awaiting = all.filter((a) => !confirmed[a.domain] && !decided[a.domain]);
```

and render `awaiting.map((a) => {` instead of `all.map((a) => {`. Leave the scatter plot reading `all` — the distribution is about the whole set, not the remaining worklist.

- [ ] **Step 4: Hyperlink the company name**

Replace the name div (line 212), using the shared component from Task 9 rather than repeating the anchor markup:

```jsx
                      <div className="tg-card__nm">
                        <PET.CompanyLink name={a.name} domain={a.domain} />
                      </div>
```

- [ ] **Step 5: Mount the compose panel**

Add the toggle to state, beside `found` / `finding`:

```jsx
  const [composing, setComposing] = useStateT({});   // domain -> compose panel expanded
```

Add a Compose button inside the `tg-contacts` block, rendered once contacts have been discovered for that domain — directly after the `crow` rows are emitted. Replace the `if (sendable.length) return ...` branch with:

```jsx
                        if (sendable.length) return (
                          <React.Fragment>
                            <div className="tg-crows">{sendable.map(crow)}</div>
                            <button className="tg-find" style={{ marginTop: 8 }}
                              onClick={() => setComposing((c) => ({ ...c, [a.domain]: !c[a.domain] }))}>
                              {composing[a.domain] ? "Close" : "Compose"}
                            </button>
                          </React.Fragment>
                        );
```

Then mount the panel at the end of the `tg-contacts` div, after the IIFE that renders the contact block:

```jsx
                      {composing[a.domain] && <PET.ComposePanel account={a} onError={onError} />}
```

The panel only appears where there is a sendable contact, which is the same gate the Morning Queue applies.

- [ ] **Step 6: Verify in the browser**

Click Hold on a card → card clears. **Reload the page → it stays gone.** That reload is the defect this whole plan exists to fix. Then: click Reject → clears; click LFG → still shows "Confirm LFG" and pushes as before; click a company name → opens their site in a new tab.

- [ ] **Step 7: Commit**

```bash
git add web/console/app/triage.jsx web/console/app/data.jsx
git commit -m "feat(ui): triage decisions persist, card clears, company hyperlinked"
```

---

### Task 11: Reject and hyperlink on the Morning Queue

**Files:**
- Modify: `web/console/app/queue.jsx:151-244`
- Test: manual, in the browser

**Interfaces:**
- Consumes: `PE.decideDomains` (Task 10), the same `/api/decide` endpoint
- Produces: nothing downstream

**Why the same code path:** Morning Queue is a prioritized view of the triage pool — the same row. A reject here is the identical operation, so it must not grow a second implementation.

- [ ] **Step 1: Add reject state and handler**

In `MorningQueue`, beside the existing `done` / `busy` / `open` state:

```jsx
  const [gone, setGone] = useStateQ({});   // domain -> true (rejected off the list)

  async function reject(domain) {
    if (busy[domain] || gone[domain]) return;
    setBusy((b) => ({ ...b, [domain]: true }));
    try {
      const res = await PEQ.decideDomains([domain], "reject");
      const row = (res.results || []).find((x) => x.domain === domain);
      if (row && row.status === "decided") {
        setGone((g) => ({ ...g, [domain]: true }));
        await PEQ.refresh();
      } else {
        onError && onError(new Error("Not rejected — " + domain));
      }
    } catch (e) { onError && onError(e); }
    finally { setBusy((b) => { const n = { ...b }; delete n[domain]; return n; }); }
  }
```

- [ ] **Step 2: Drop rejected cards from the list**

Change the queue derivation (line 159-163) so rejected rows disappear:

```jsx
  const queue = (PEQ.STREAM || [])
    .filter((a) => a.netNew === true && a.inMarket === "confirmed" && !gone[a.domain])
    .sort((x, y) => (y.total || 0) - (x.total || 0))
    .slice(0, TOP_N);
```

- [ ] **Step 3: Add the reject control**

In the `mq-right` block, after the Compose toggle (line 231):

```jsx
                  <BtnQ variant="ghost" size="sm" disabled={!!busy[a.domain]}
                    onClick={() => reject(a.domain)}>Reject</BtnQ>
```

- [ ] **Step 4: Hyperlink the company name**

Replace the name div (line 218) with the shared component from Task 9:

```jsx
                  <div className="mq-nm"><PEQ.CompanyLink name={a.name} domain={a.domain} /></div>
```

- [ ] **Step 5: Verify in the browser**

Reject a card → it leaves the queue. **Reload → still gone.** Open the Triage Board → it is not there either, because both screens read `get_candidates`. Click a company name → opens their site in a new tab.

- [ ] **Step 6: Run the full suite and commit**

Run: `pytest -q`
Expected: PASS

```bash
git add web/console/app/queue.jsx
git commit -m "feat(ui): reject + company hyperlink on the Morning Queue"
```

---

## Done When

- A Hold, Nurture, or Reject clicked on either surface survives a page reload.
- A rejected firm does not come back after re-ingesting the same Clay export.
- A Hold firm whose timing crosses 55 upward reappears on the board, and a rejected one never does.
- Compose works from the Triage Board, from the same component the Morning Queue uses.
- Company names on both surfaces open the firm's site in a new tab with `noopener`.
- `pytest -q` passes.
- `python -m engine.hubspot.extend_engine_status_options --run` has been run against prod by a human, and a decision made afterward reports `hubspot_synced: true`.
