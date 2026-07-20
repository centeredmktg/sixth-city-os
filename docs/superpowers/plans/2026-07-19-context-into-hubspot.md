# Context into HubSpot — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Write the engine's assessment (score / band / route / why-now) onto HubSpot company records as reportable custom properties — fresh at claim/promote, kept current via a deliberate batched sync that only pushes changed rows.

**Architecture:** A single pure `context_properties(account)` mapping feeds both the claim/promote create payload and a `sync_hubspot_context` job (mirrors `claim.py`). A per-row `context_hash` marks rows whose assessment changed; the sync job PATCHes only dirty **claimed** rows (never John's book). One-way: engine authoritative, HubSpot mirrors.

**Tech Stack:** Python 3.11, FastAPI, SQLAlchemy, requests, pytest; no-build React (Babel-in-browser) console.

## Global Constraints

- **Hermetic tests:** `tests/conftest.py` forces `DRY_RUN=1`; no test touches the live portal. Build test sessions with `make_engine("sqlite:///:memory:")` → `create_all(engine)` → `make_session_factory(engine)()` (NOT `make_session`, which does not exist).
- **Never touch John's book:** the sync job only ever addresses companies we claimed (`claimed is True` AND a stored `hubspot_id`); it PATCHes those record ids only.
- **No rev-share / "credit" / "machine-sourced-scoreboard" language** in any property label, `why_now` text, or UI copy. Team-utility framing only.
- **Property names (exact):** `engine_score`, `engine_band`, `engine_route`, `engine_why_now`, `engine_last_synced`. Group `pipeline_engine`.
- **Hash excludes `engine_last_synced`** (it changes every run and would make everything perpetually dirty).
- **Additive migrations only** go in `auto_migrate._MIGRATIONS`.
- **HubSpot property values are strings** in the payload (matches the existing `machine_sourced="true"` / ISO-date style).
- **Branch:** `feat/context-into-hubspot` (created, spec committed). One PR; merge auto-deploys Railway.
- **Commit cadence:** one commit per task.

---

### Task 1: `hubspot_context.py` — the single-source mapping + hash

**Files:**
- Create: `engine/modules/hubspot_context.py`
- Test: `tests/test_hubspot_context.py`

**Interfaces:**
- Produces: `context_properties(account) -> dict` (keys = the 5 property names, values = strings); `context_hash(account) -> str`; name constants `PROP_SCORE/PROP_BAND/PROP_ROUTE/PROP_WHY/PROP_SYNCED`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_hubspot_context.py
from datetime import date
from engine.modules import hubspot_context as hc
from engine.models import Account, Score, RouteDecision, Route, Signal, SignalKind


def _acct():
    a = Account(name="Buckeye", domain="buckeye.example")
    a.score = Score(fit=70.0, timing=50.0, total=61.6, band="A")
    a.route = RouteDecision(recommended=Route.CLOSER, rationale="")
    a.signals = [Signal(kind=SignalKind.SITE_QUALITY, source="pagespeed",
                        detail="Mobile site scores 45/100 on Google's performance test."),
                 Signal(kind=SignalKind.ADS_ACTIVE, source="clay",
                        detail="Running 3 live paid ad(s) — budget's already committed.")]
    return a


def test_context_properties_maps_all_five():
    p = hc.context_properties(_acct())
    assert p[hc.PROP_SCORE] == "62"           # round(61.6) as string
    assert p[hc.PROP_BAND] == "A"
    assert p[hc.PROP_ROUTE] == "closer"
    assert "Mobile site scores 45/100" in p[hc.PROP_WHY]
    assert "Running 3 live paid" in p[hc.PROP_WHY]
    assert p[hc.PROP_SYNCED] == date.today().isoformat()


def test_defaults_when_unscored_unrouted_no_signals():
    a = Account(name="X", domain="x.example")
    p = hc.context_properties(a)
    assert p[hc.PROP_SCORE] == "0"
    assert p[hc.PROP_BAND] == "R"
    assert p[hc.PROP_ROUTE] == "hold"
    assert p[hc.PROP_WHY] == ""


def test_why_now_capped():
    a = Account(name="X", domain="x.example")
    a.signals = [Signal(kind=SignalKind.SITE_QUALITY, source="s", detail="x" * 400),
                 Signal(kind=SignalKind.ADS_ACTIVE, source="s", detail="y" * 400)]
    assert len(hc.context_properties(a)[hc.PROP_WHY]) <= 500


def test_hash_stable_and_excludes_last_synced():
    a = _acct()
    h1 = hc.context_hash(a)
    h2 = hc.context_hash(a)
    assert h1 == h2                     # deterministic (date does not leak in)
    a.score = Score(fit=70.0, timing=50.0, total=40.0, band="C")   # score change
    assert hc.context_hash(a) != h1     # dirty on real change
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m pytest tests/test_hubspot_context.py -q`
Expected: FAIL — `engine.modules.hubspot_context` does not exist.

- [ ] **Step 3: Implement**

```python
# engine/modules/hubspot_context.py
"""Single-source mapping from an engine Account to the HubSpot company properties that
carry the 'why' into the tool the team works in. The ONLY place this mapping lives, so
the app and HubSpot can never diverge in logic. Team-facing values only — no rev-share
or 'machine-sourced' language."""
from __future__ import annotations

import hashlib
import json
from datetime import date

PROP_SCORE = "engine_score"
PROP_BAND = "engine_band"
PROP_ROUTE = "engine_route"
PROP_WHY = "engine_why_now"
PROP_SYNCED = "engine_last_synced"

_WHY_CAP = 500


def context_properties(account) -> dict:
    """The 5 HubSpot property values for this account (all strings). engine_last_synced
    is stamped 'today' at build time; the hash below deliberately ignores it."""
    score = account.score.total if getattr(account, "score", None) else 0.0
    band = account.score.band if getattr(account, "score", None) else "R"
    route = account.route.effective.value if getattr(account, "route", None) else "hold"
    details = [s.detail for s in (getattr(account, "signals", None) or []) if getattr(s, "detail", "")]
    why = "; ".join(details)[:_WHY_CAP]
    return {
        PROP_SCORE: str(round(score)),
        PROP_BAND: band,
        PROP_ROUTE: route,
        PROP_WHY: why,
        PROP_SYNCED: date.today().isoformat(),
    }


def context_hash(account) -> str:
    """Hash of the STABLE context (score/band/route/why) — excludes engine_last_synced so
    a re-sync of unchanged data is a no-op. Differs iff the assessment actually changed."""
    p = context_properties(account)
    stable = {k: p[k] for k in (PROP_SCORE, PROP_BAND, PROP_ROUTE, PROP_WHY)}
    return hashlib.sha256(json.dumps(stable, sort_keys=True).encode()).hexdigest()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m pytest tests/test_hubspot_context.py -q`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```bash
git add engine/modules/hubspot_context.py tests/test_hubspot_context.py
git commit -m "feat(hubspot): context_properties + context_hash — single-source account->HubSpot mapping"
```

---

### Task 2: `AccountRow.context_hash` column + migration + repo carry/setter

**Files:**
- Modify: `engine/db/models.py` (AccountRow — after `claimed_at`)
- Create: `engine/db/migrate_add_context_hash.py`
- Modify: `engine/db/auto_migrate.py` (import + register)
- Modify: `engine/db/repo.py` (`_row_from_account`, `_account_from_row`, `upsert_accounts` preserve; add `set_context_hash`)
- Test: `tests/test_context_hash_column.py`

**Interfaces:**
- Produces: `AccountRow.context_hash: str | None`; `repo.set_context_hash(session, domain, hash)`; `migrate_add_context_hash.run_migration(engine)`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_context_hash_column.py
from engine.db.base import make_engine, create_all, make_session_factory
from engine.db.models import AccountRow
from engine.db import repo
from engine.models import Account


def _session():
    engine = make_engine("sqlite:///:memory:")
    create_all(engine)
    return make_session_factory(engine)()


def test_set_and_read_context_hash():
    s = _session()
    s.add(AccountRow(domain="a.example", name="A")); s.commit()
    repo.set_context_hash(s, "a.example", "abc123")
    assert s.get(AccountRow, "a.example").context_hash == "abc123"


def test_upsert_preserves_context_hash_on_reingest():
    s = _session()
    a = Account(name="A", domain="a.example")
    a.__dict__["context_hash"] = "keepme"
    repo.upsert_accounts(s, [a])
    repo.upsert_accounts(s, [Account(name="A", domain="a.example")])  # fresh row, no hash
    assert s.get(AccountRow, "a.example").context_hash == "keepme"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m pytest tests/test_context_hash_column.py -q`
Expected: FAIL — `AccountRow` has no attribute `context_hash` / `repo.set_context_hash` missing.

- [ ] **Step 3: Add column, migration, repo wiring**

In `engine/db/models.py`, in `AccountRow` right after the `claimed_at` line, add:

```python
    context_hash: Mapped[str | None] = mapped_column(String, nullable=True, default=None)  # last HubSpot-synced context
```

Create `engine/db/migrate_add_context_hash.py` (mirror `migrate_add_claimed.py`):

```python
"""One-time, idempotent: add accounts.context_hash. create_all() makes new tables but
won't ALTER an existing one, so prod (Postgres) needs this. Safe to re-run."""
from sqlalchemy import text
from engine.db.base import make_engine


def run_migration(engine) -> None:
    ddl = "ALTER TABLE accounts ADD COLUMN IF NOT EXISTS context_hash VARCHAR"
    with engine.begin() as conn:
        conn.execute(text(ddl))
    print("  accounts.context_hash ensured")


def main():
    run_migration(make_engine())


if __name__ == "__main__":
    main()
```

In `engine/db/auto_migrate.py`: add `migrate_add_context_hash` to the import block and append it to the `_MIGRATIONS` list (after `migrate_add_claimed`).

In `engine/db/repo.py`:
- `_row_from_account` — add to the `AccountRow(...)` kwargs: `context_hash=getattr(a, "context_hash", None),`
- `_account_from_row` — after building the account: `account.__dict__["context_hash"] = row.context_hash`
- `upsert_accounts` — where it preserves `claimed`, add: `new_row.context_hash = existing.context_hash or new_row.context_hash`
- Add a setter near `mark_pushed`:

```python
def set_context_hash(session: Session, domain: str, context_hash: str) -> None:
    """Record the context we last synced to HubSpot, so an unchanged row isn't re-pushed."""
    row = session.get(AccountRow, domain)
    if row is not None:
        row.context_hash = context_hash
        session.commit()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m pytest tests/test_context_hash_column.py -q`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
git add engine/db/models.py engine/db/migrate_add_context_hash.py engine/db/auto_migrate.py engine/db/repo.py tests/test_context_hash_column.py
git commit -m "feat(db): AccountRow.context_hash + migration + repo carry/set_context_hash"
```

---

### Task 3: `update_context` + fold context into claim/promote payloads

**Files:**
- Modify: `engine/hubspot/client.py` (add `update_context`; add context keys to `claim_company` + `promote_to_working` create payloads)
- Test: `tests/test_update_context.py`

**Interfaces:**
- Consumes: `hubspot_context.context_properties` (Task 1).
- Produces: `HubSpotClient.update_context(company_id: str, props: dict) -> bool`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_update_context.py
from engine.hubspot.client import HubSpotClient
from engine.modules import hubspot_context as hc
from engine.models import Account, Score, RouteDecision, Route


def _live():
    c = HubSpotClient(); c._dry = False; return c


def test_update_context_patches_and_returns_true(monkeypatch):
    c = _live()
    seen = {}
    monkeypatch.setattr(c, "_patch", lambda path, payload: seen.update(path=path, props=payload["properties"]) or {})
    ok = c.update_context("42", {"engine_score": "62", "engine_band": "A"})
    assert ok is True
    assert seen["path"] == "/crm/v3/objects/companies/42"
    assert seen["props"]["engine_band"] == "A"


def test_update_context_dry_writes_nothing(monkeypatch):
    c = HubSpotClient()  # DRY_RUN=1 in conftest -> dry
    monkeypatch.setattr(c, "_patch", lambda *a, **k: (_ for _ in ()).throw(AssertionError("must not write in dry")))
    assert c.update_context("42", {"engine_score": "1"}) is False


def test_update_context_degrades_on_error(monkeypatch):
    c = _live()
    monkeypatch.setattr(c, "_patch", lambda *a, **k: (_ for _ in ()).throw(RuntimeError("boom")))
    assert c.update_context("42", {"engine_score": "1"}) is False


def test_claim_payload_includes_context(monkeypatch):
    c = _live()
    monkeypatch.setattr(c, "find_company_id_by_domain", lambda d: None)
    made = {}
    monkeypatch.setattr(c, "_post", lambda path, payload: made.update(payload["properties"]) or {"id": "9"})
    a = Account(name="Buckeye", domain="buckeye.example")
    a.score = Score(fit=1, timing=1, total=61.6, band="A")
    a.__dict__["discovered_by"] = "clay"
    c.claim_company(a, owner_id="555")
    assert made["engine_score"] == "62" and made["engine_band"] == "A"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m pytest tests/test_update_context.py -q`
Expected: FAIL — `update_context` missing / context keys absent from payload.

- [ ] **Step 3: Implement**

In `engine/hubspot/client.py`, add the import near the top (with the other engine imports):

```python
from engine.modules import hubspot_context
```

Add the method (near `promote_to_working`):

```python
    def update_context(self, company_id: str, props: dict) -> bool:
        """PATCH the engine_* context properties onto a company we claimed. Dry mode
        writes nothing (returns False); any error degrades to False — never raises, so
        one firm can't abort a sync batch. True only on a real successful write."""
        if self._dry:
            print(f"  [DRY] would update context on {company_id}: {props}")
            return False
        try:
            self._patch(f"/crm/v3/objects/companies/{company_id}", {"properties": props})
            return True
        except Exception as e:
            print(f"  [context] update {company_id} failed ({type(e).__name__}: {e})")
            return False
```

In `claim_company`, extend the create payload's `"properties"` dict — after the existing `ENGINE_STATUS_PROPERTY: "discovered"` line, spread in the context:

```python
            ENGINE_STATUS_PROPERTY: "discovered",
            **hubspot_context.context_properties(account),
```

In `promote_to_working`'s create branch (the not-in-CRM `_post`), after `ENGINE_STATUS_PROPERTY: "working"`:

```python
            ENGINE_STATUS_PROPERTY: "working",
            **hubspot_context.context_properties(account),
```

(Leave the PATCH-to-working branch of `promote_to_working` alone — that path only flips `engine_status`; context sync is the job's job.)

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m pytest tests/test_update_context.py -q`
Expected: PASS (4 passed).

- [ ] **Step 5: Run the focused claim/promote regressions**

Run: `python3 -m pytest tests/test_claim_company.py tests/test_promote_and_push.py -q`
Expected: PASS (existing claim/promote tests still green — the extra payload keys don't break their assertions).

- [ ] **Step 6: Commit**

```bash
git add engine/hubspot/client.py tests/test_update_context.py
git commit -m "feat(hubspot): update_context PATCH + fold context props into claim/promote payloads"
```

---

### Task 4: Store `context_hash` after a successful claim / promote (churn avoidance)

**Files:**
- Modify: `engine/jobs/claim.py` (store hash where it sets `claimed`)
- Modify: `web/server.py` (`/api/push` — store hash after `mark_pushed`)
- Test: `tests/test_claim_stores_context_hash.py`

**Interfaces:**
- Consumes: `hubspot_context.context_hash` (Task 1), `repo.set_context_hash` (Task 2).

- [ ] **Step 1: Write the failing test**

```python
# tests/test_claim_stores_context_hash.py
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m pytest tests/test_claim_stores_context_hash.py -q`
Expected: FAIL — `row.context_hash` is None after claim.

- [ ] **Step 3: Implement**

In `engine/jobs/claim.py`, add the import:

```python
from engine.modules import hubspot_context
```

In the claim loop, where it sets `row.claimed = True` on a successful `hid`, also store the hash:

```python
            if hid:
                row.claimed = True
                row.claimed_at = datetime.now(timezone.utc)
                if not row.hubspot_id:
                    row.hubspot_id = hid
                row.context_hash = hubspot_context.context_hash(account)
                claimed += 1
```

In `web/server.py` `/api/push`, add `from engine.modules import hubspot_context` if not already imported, and where it does `repo.mark_pushed(session, dom, hid)` on a real (non-dry) claim, follow it with:

```python
            repo.mark_pushed(session, dom, hid)
            repo.set_context_hash(session, dom, hubspot_context.context_hash(a))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m pytest tests/test_claim_stores_context_hash.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add engine/jobs/claim.py web/server.py tests/test_claim_stores_context_hash.py
git commit -m "feat: store context_hash on claim/promote so freshly-synced rows aren't dirty"
```

---

### Task 5: `sync_hubspot_context.py` — the batched sync job

**Files:**
- Create: `engine/jobs/sync_hubspot_context.py`
- Test: `tests/test_sync_context_job.py`

**Interfaces:**
- Consumes: `AccountRow`, `repo._account_from_row`, `hubspot_context.context_properties/context_hash`, `HubSpotClient.update_context`.
- Produces: `sync_hubspot_context.run(session, limit=None, client=None) -> {"synced": int, "remaining": int|None, "error": str|None}`; `pending_count(session) -> int`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_sync_context_job.py
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m pytest tests/test_sync_context_job.py -q`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement (mirror `claim.py`)**

```python
# engine/jobs/sync_hubspot_context.py
"""JOB: sync the engine's assessment (score/band/route/why-now) onto the HubSpot company
records we claimed. Deliberate + batched — NOT auto-fired on every rescore. Only rows
whose context actually changed (hash differs) are pushed; only claimed companies with a
HubSpot id are touched (never John's book). Resumable: chunked + committed per chunk."""
from __future__ import annotations

import time

from sqlalchemy.orm import Session

from engine.db.models import AccountRow
from engine.db import repo
from engine.modules import hubspot_context

_CHUNK = 100
_PACE_SEC = 0.2


def _dirty_rows(session: Session):
    """Claimed companies (with a HubSpot id) whose current context hash != stored."""
    rows = (session.query(AccountRow)
            .filter(AccountRow.claimed.is_(True), AccountRow.hubspot_id.isnot(None))
            .order_by(AccountRow.total.desc()).all())
    out = []
    for row in rows:
        account = repo._account_from_row(row)
        if hubspot_context.context_hash(account) != (row.context_hash or ""):
            out.append((row, account))
    return out


def pending_count(session: Session) -> int:
    return len(_dirty_rows(session))


def run(session: Session, limit: int | None = None, client=None) -> dict:
    if client is None:
        from engine.hubspot.client import HubSpotClient
        client = HubSpotClient()

    dirty = _dirty_rows(session)
    if limit is not None:
        dirty = dirty[:limit]

    synced = 0
    for i in range(0, len(dirty), _CHUNK):
        chunk = dirty[i:i + _CHUNK]
        for row, account in chunk:
            props = hubspot_context.context_properties(account)
            if client.update_context(row.hubspot_id, props):
                row.context_hash = hubspot_context.context_hash(account)
                synced += 1
            # failed update -> leave hash stale so the next run retries it
        session.commit()
        if i + _CHUNK < len(dirty):
            time.sleep(_PACE_SEC)

    remaining = pending_count(session)
    print(f"[sync-context] synced {synced}; remaining {remaining}")
    return {"synced": synced, "remaining": remaining, "error": None}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m pytest tests/test_sync_context_job.py -q`
Expected: PASS (5 passed).

- [ ] **Step 5: Commit**

```bash
git add engine/jobs/sync_hubspot_context.py tests/test_sync_context_job.py
git commit -m "feat(job): sync_hubspot_context — batched, dirty-only, claimed-only context sync"
```

---

### Task 6: `POST /api/sync-context` + `GET /api/sync-context/pending`

**Files:**
- Modify: `web/server.py` (two routes)
- Test: `tests/test_sync_context_api.py`

**Interfaces:**
- Consumes: `sync_hubspot_context.run` / `.pending_count`.
- Produces: `POST /api/sync-context?limit= -> {synced, remaining, error}`; `GET /api/sync-context/pending -> {pending: N}`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_sync_context_api.py
from engine.db.models import AccountRow


def test_pending_and_run(client, session):
    session.add(AccountRow(domain="a.example", name="A", claimed=True, hubspot_id="111",
                           total=90, band="A", context_hash="STALE"))
    session.commit()
    assert client.get("/api/sync-context/pending").json()["pending"] == 1
    # dry HubSpot (conftest DRY_RUN=1) -> update_context returns False -> synced 0, still pending
    body = client.post("/api/sync-context").json()
    assert "synced" in body and "remaining" in body
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m pytest tests/test_sync_context_api.py -q`
Expected: FAIL — routes 404.

- [ ] **Step 3: Implement**

In `web/server.py`, add the import (with the other job imports near the top):

```python
from engine.jobs import sync_hubspot_context
```

Add the routes (near `/api/claim`):

```python
@app.get("/api/sync-context/pending")
def sync_context_pending(session=Depends(db_session)):
    return {"pending": sync_hubspot_context.pending_count(session)}


@app.post("/api/sync-context")
def sync_context(limit: int = None, session=Depends(db_session)):
    return sync_hubspot_context.run(session, limit=limit)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m pytest tests/test_sync_context_api.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/server.py tests/test_sync_context_api.py
git commit -m "feat(api): POST /api/sync-context + GET /api/sync-context/pending"
```

---

### Task 7: Guarded `create_context_properties.py` (manual prod-setup)

**Files:**
- Create: `engine/hubspot/create_context_properties.py`
- Test: `tests/test_create_context_properties.py`

**Interfaces:**
- Produces: a `--run`-guarded script creating the 5 `engine_*` properties in group `pipeline_engine`; `property_payloads() -> list[dict]`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_create_context_properties.py
from engine.hubspot import create_context_properties as m


def test_payloads_cover_all_five_with_team_facing_labels():
    payloads = m.property_payloads()
    names = {p["name"] for p in payloads}
    assert names == {"engine_score", "engine_band", "engine_route", "engine_why_now", "engine_last_synced"}
    assert all(p["groupName"] == "pipeline_engine" for p in payloads)
    band = next(p for p in payloads if p["name"] == "engine_band")
    assert {o["value"] for o in band["options"]} == {"A", "B", "C", "R"}
    # no rev-share / machine-sourced language anywhere in labels
    blob = " ".join(p["label"].lower() for p in payloads)
    assert "rev-share" not in blob and "credit" not in blob and "machine-sourced" not in blob
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m pytest tests/test_create_context_properties.py -q`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement (mirror `create_engine_status_property.py`)**

```python
# engine/hubspot/create_context_properties.py
"""GUARDED prod-setup (run ONCE by hand, never in CI / auto_migrate): create the 5
engine_* context properties in the pipeline_engine group. Prints the plan unless --run
is passed; refuses in dry mode. Team-facing labels only."""
from __future__ import annotations

import sys

from engine.hubspot.client import HubSpotClient
from engine.config import CONFIG

_GROUP = "pipeline_engine"


def property_payloads() -> list[dict]:
    return [
        {"name": "engine_score", "label": "Engine Score", "type": "number",
         "fieldType": "number", "groupName": _GROUP},
        {"name": "engine_band", "label": "Engine Priority Band", "type": "enumeration",
         "fieldType": "select", "groupName": _GROUP, "options": [
             {"label": "A", "value": "A", "displayOrder": 0},
             {"label": "B", "value": "B", "displayOrder": 1},
             {"label": "C", "value": "C", "displayOrder": 2},
             {"label": "R", "value": "R", "displayOrder": 3}]},
        {"name": "engine_route", "label": "Engine Route", "type": "enumeration",
         "fieldType": "select", "groupName": _GROUP, "options": [
             {"label": "Closer", "value": "closer", "displayOrder": 0},
             {"label": "Nurture", "value": "nurture", "displayOrder": 1},
             {"label": "Hold", "value": "hold", "displayOrder": 2},
             {"label": "Reject", "value": "reject", "displayOrder": 3}]},
        {"name": "engine_why_now", "label": "Why Now", "type": "string",
         "fieldType": "textarea", "groupName": _GROUP},
        {"name": "engine_last_synced", "label": "Engine Last Synced", "type": "date",
         "fieldType": "date", "groupName": _GROUP},
    ]


def main(argv=None) -> None:
    argv = argv if argv is not None else sys.argv[1:]
    payloads = property_payloads()
    if "--run" not in argv:
        print("[guarded] would create 5 engine_* context properties in group pipeline_engine. "
              "Re-run with --run to apply.")
        for p in payloads:
            print(f"  {p['name']} ({p['fieldType']})")
        return
    if CONFIG.dry_run:
        print("[guarded] DRY_RUN set — refusing to write. Unset DRY_RUN and provide HUBSPOT_TOKEN.")
        return
    client = HubSpotClient()
    for p in payloads:
        try:
            client._post("/crm/v3/properties/companies", p)
            print(f"  created {p['name']}")
        except Exception as e:
            print(f"  {p['name']}: {type(e).__name__} {e} (already exists? 409 is fine)")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m pytest tests/test_create_context_properties.py -q`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `python3 -m pytest -q`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add engine/hubspot/create_context_properties.py tests/test_create_context_properties.py
git commit -m "feat(hubspot): guarded create_context_properties script (manual prod-setup)"
```

---

### Task 8: "Sync to HubSpot (N pending)" button on the Scoring screen

**Files:**
- Modify: `web/console/app/scoring.jsx` (add a Sync control near the Ownership section)

**Interfaces:**
- Consumes: `GET /api/sync-context/pending`, `POST /api/sync-context`.

- [ ] **Step 1: Add state + handlers (match scoring.jsx conventions)**

`scoring.jsx` uses `const { useState: useStateSC, useEffect: useEffectSC } = React;`, **inline `fetch()`**, `sc-group` cards, and exposes `window.PE.ScoringScreen`. Inside `ScoringScreen`, near the owner state (`const [owners, ...]`), add:

```javascript
  const [pending, setPending] = useStateSC(null);
  const [syncing, setSyncing] = useStateSC(false);
  const loadPending = () => fetch("/api/sync-context/pending").then((r) => r.json()).then((j) => setPending(j.pending));
  useEffectSC(() => { loadPending(); }, []);
  const syncContext = () => {
    setSyncing(true);
    fetch("/api/sync-context", { method: "POST" })
      .then((r) => r.json())
      .then(() => loadPending())
      .catch(() => {})
      .finally(() => setSyncing(false));
  };
```

- [ ] **Step 2: Render the control (a new `sc-group`, near the Ownership group)**

Add this card next to the Ownership `sc-group` (match the file's existing markup):

```jsx
  <section className="sc-group">
    <div className="sc-group__h"><h4>Context in HubSpot</h4></div>
    <div className="sc-group__b">
      <p className="sc-owner-note">Push each company's score, band, route and "why now" onto its HubSpot record so the team can sort and filter by them. Only companies whose assessment changed are updated.</p>
      <button className="sc-save" disabled={syncing || pending === 0}
              onClick={syncContext}>
        {syncing ? "Syncing…" : pending == null ? "Sync to HubSpot"
          : pending === 0 ? "All synced ✓" : `Sync to HubSpot (${pending} pending)`}
      </button>
    </div>
  </section>
```

(Use the same button class the Save-owner button uses — check the file; it is `sc-save`. If the class differs, match the sibling button.)

- [ ] **Step 3: Verify in the browser (no JS unit harness)**

Start hermetically and confirm it boots + serves:
```
DRY_RUN=1 python3 -m uvicorn web.server:app --port 8098 &
sleep 4
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8098/          # 200
curl -s http://localhost:8098/app/scoring.jsx | grep -c "Sync to HubSpot"  # >=1
curl -s http://localhost:8098/api/sync-context/pending                     # {"pending":N} or 500 on the stale local dev DB — the pytest test is the real check
kill %1
```
Self-review the JSX for balanced braces/tags and that hooks stay above the `if (!cfg) return` early-return.

- [ ] **Step 4: Commit**

```bash
git add web/console/app/scoring.jsx
git commit -m "feat(ui): Sync-to-HubSpot button (N pending) on the Scoring screen"
```

---

## Post-build: prod cutover (Danny, manual — NOT build tasks)

1. Open the PR; verify `git log origin/main..HEAD` has every commit; merge → Railway auto-deploys. `migrate_add_context_hash` self-applies at boot.
2. **Create the 5 properties once:** `railway run python3 -m engine.hubspot.create_context_properties --run` (run from `pipeline-engine/`, `python3` not `python`).
3. **Backfill the 4,318 claimed:** `railway run python3 -c "from engine.db.base import make_engine, make_session_factory; from engine.jobs import sync_hubspot_context as s; s.run(make_session_factory(make_engine())())"` — all rows have `context_hash=NULL` → all dirty → full push (~30–45 min, resumable; re-run to finish if interrupted).
4. Ongoing drift is handled by the "Sync to HubSpot" button.

## Self-Review (done)

- **Spec coverage:** §4 properties → Task 7; §5 mapping → Task 1; §6 write-at-claim + churn-avoidance → Tasks 3, 4; §7 hash column + sync job → Tasks 2, 5; §8 API + UI → Tasks 6, 8; §9 backfill → post-build step; §10 boundaries (claimed-only, dry-safe, degrade) → Tasks 3, 5; §11 tests → each task. All covered.
- **Placeholder scan:** none — every code step carries real code; the one UI task is browser-verified (no JS harness) with an explicit boot check.
- **Type consistency:** `context_properties(account)->dict`, `context_hash(account)->str`, `update_context(company_id, props)->bool`, `sync_hubspot_context.run(session, limit, client)->{synced,remaining,error}`, `pending_count(session)->int`, `repo.set_context_hash(session, domain, hash)`, `AccountRow.context_hash`, the 5 `PROP_*`/property-name strings — consistent across tasks.
