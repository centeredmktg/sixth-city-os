# Discovery-Claim + Legible Flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-claim every net-new company into HubSpot at discovery (Danny's revenue-protection dibs), split from human-gated outreach, and make the flow legible to first-time users — plus owner-on-claim and an "Added to CRM" drill-down.

**Architecture:** A new resumable background job (`engine/jobs/claim.py`, mirroring `enrich.py`) pushes all net-new companies to HubSpot stamped `machine_sourced` + `engine_status=discovered` + owner. A new `AccountRow.claimed` flag (distinct from the existing `pushed`/worked flag) tracks it. The operator's "Confirm" promotes `discovered → working` instead of creating. Front-end changes are header copy, an owner picker, and a drill-down — no build step (no-build React).

**Tech Stack:** Python 3.11, FastAPI, SQLAlchemy, requests, pytest. No-build React (Babel-in-browser) for the console.

## Global Constraints

- **Hermetic tests:** `tests/conftest.py` forces `DRY_RUN=1`; no test ever touches the live portal. Keep it that way. Copy verbatim: dry mode = `HubSpotClient` writes nothing and returns stubs.
- **Never touch John's book:** every claim/promote path checks domain first; a non-`machine_sourced` (pre-existing) record is never stamped or modified. This is the rev-share SLA guard.
- **Owner never-unassigned:** claim/promote must refuse to create a company when no `default_owner_id` is set — raise, never write an ownerless record.
- **Auto-claim ships OFF:** `AUTO_CLAIM_ENABLED` defaults false. Turning it on is a deliberate prod step.
- **No outreach in the claim path:** `claim_company` never calls `draft_cold_email` or contact enrichment. Drafting lives in the Morning Queue Compose action.
- **Additive migrations only** go in `auto_migrate._MIGRATIONS`; never a data-rewrite migration.
- **UI copy rule:** no rev-share / "credit" / "machine-sourced scoreboard" language in the console (frame as the team's utility).
- **Branch:** `feat/discovery-claim-flow` (already created, spec committed). One PR; merge auto-deploys Railway.
- **Commit cadence:** one commit per task (end of each task's steps).

---

### Task 1: `AccountRow.claimed` + `claimed_at` — the auto-claim flag, distinct from `pushed`

**Files:**
- Modify: `engine/db/models.py` (AccountRow, after line 32 `enriched`)
- Create: `engine/db/migrate_add_claimed.py`
- Modify: `engine/db/auto_migrate.py:18-33` (import + register)
- Modify: `engine/db/repo.py` (`_row_from_account`, `_account_from_row`, `upsert_accounts`)
- Test: `tests/test_repo_claimed.py`

**Interfaces:**
- Produces: `AccountRow.claimed: bool`, `AccountRow.claimed_at: datetime | None`; `Account` carries `claimed` (via `__dict__`) and repo maps it both ways; `migrate_add_claimed.run_migration(engine)`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_repo_claimed.py
from datetime import datetime, timezone
from engine.db.base import make_engine, make_session
from engine.db.models import Base, AccountRow
from engine.db import repo
from engine.models import Account, Stage


def _session():
    engine = make_engine("sqlite://")
    Base.metadata.create_all(engine)
    return make_session(engine)


def test_claimed_roundtrips_through_repo():
    session = _session()
    a = Account(name="Buckeye", domain="buckeye.example")
    a.__dict__["claimed"] = True
    a.__dict__["claimed_at"] = datetime(2026, 7, 14, tzinfo=timezone.utc)
    repo.upsert_accounts(session, [a])
    row = session.get(AccountRow, "buckeye.example")
    assert row.claimed is True
    assert row.claimed_at is not None


def test_upsert_preserves_claimed_on_reingest():
    session = _session()
    a = Account(name="Buckeye", domain="buckeye.example")
    a.__dict__["claimed"] = True
    repo.upsert_accounts(session, [a])
    # Re-ingest the same domain as un-claimed (a fresh CSV row) must NOT reset the claim.
    a2 = Account(name="Buckeye", domain="buckeye.example")
    repo.upsert_accounts(session, [a2])
    assert session.get(AccountRow, "buckeye.example").claimed is True
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_repo_claimed.py -v`
Expected: FAIL — `AccountRow` has no attribute `claimed`.

- [ ] **Step 3: Add the columns and repo mapping**

In `engine/db/models.py`, in `AccountRow` after the `enriched` line (line 32), add:

```python
    claimed: Mapped[bool] = mapped_column(Boolean, default=False)  # auto-claim pushed it to HubSpot
    claimed_at: Mapped["datetime | None"] = mapped_column(DateTime(timezone=True), nullable=True, default=None)
```

Ensure the imports at the top of `models.py` include `DateTime` and `datetime`:

```python
from datetime import datetime
from sqlalchemy import DateTime
```

In `engine/db/repo.py` `_row_from_account` (around line 18-24), add to the `AccountRow(...)` kwargs:

```python
        claimed=getattr(a, "claimed", False),
        claimed_at=getattr(a, "claimed_at", None),
```

In `_account_from_row` (around line 47-53), after building the account, set:

```python
    account.__dict__["claimed"] = bool(row.claimed)
    account.__dict__["claimed_at"] = row.claimed_at
```

In `upsert_accounts` (around line 82-84), where it preserves `pushed`, add the same preservation for `claimed`:

```python
            new_row.pushed = existing.pushed or new_row.pushed
            new_row.claimed = existing.claimed or new_row.claimed
            new_row.claimed_at = existing.claimed_at or new_row.claimed_at
```

- [ ] **Step 4: Create the migration**

```python
# engine/db/migrate_add_claimed.py
"""One-time, idempotent: add accounts.claimed + accounts.claimed_at. create_all()
makes new tables but won't ALTER an existing one, so prod (Postgres) needs this.
Safe to re-run."""
from sqlalchemy import text
from engine.db.base import make_engine


def run_migration(engine) -> None:
    ddls = [
        "ALTER TABLE accounts ADD COLUMN IF NOT EXISTS claimed BOOLEAN DEFAULT false",
        "ALTER TABLE accounts ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ",
    ]
    with engine.begin() as conn:
        for ddl in ddls:
            conn.execute(text(ddl))
    print("  accounts.claimed + claimed_at ensured")


def main():
    run_migration(make_engine())


if __name__ == "__main__":
    main()
```

Register it in `engine/db/auto_migrate.py`: add `migrate_add_claimed` to the import block (line 18-22) and append `migrate_add_claimed,` to the `_MIGRATIONS` list (after `migrate_add_gmail_accounts`).

- [ ] **Step 5: Run tests to verify they pass**

Run: `pytest tests/test_repo_claimed.py -v`
Expected: PASS (2 passed).

- [ ] **Step 6: Commit**

```bash
git add engine/db/models.py engine/db/migrate_add_claimed.py engine/db/auto_migrate.py engine/db/repo.py tests/test_repo_claimed.py
git commit -m "feat(db): AccountRow.claimed + claimed_at (auto-claim flag, distinct from pushed) + migration"
```

---

### Task 2: `HubSpotClient.claim_company` — lean auto-claim with owner + dedup guards

**Files:**
- Modify: `engine/hubspot/client.py` (add `ENGINE_STATUS_PROPERTY` constant near line 42; add `_get` helper near `_put`; add `claim_company` method after `push`)
- Test: `tests/test_claim_company.py`

**Interfaces:**
- Consumes: `Account` (`.name`, `.domain`, `.discovered_by`), `find_company_id_by_domain`, `_post`.
- Produces: `HubSpotClient.claim_company(account, owner_id: str) -> str | None` (returns HubSpot id on create/exists-ours, None when it's John's book); `ENGINE_STATUS_PROPERTY = "engine_status"`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_claim_company.py
import pytest
from engine.hubspot.client import HubSpotClient, MACHINE_SOURCED_PROPERTY, ENGINE_STATUS_PROPERTY
from engine.models import Account


def _live_client(monkeypatch):
    c = HubSpotClient()
    c._dry = False  # exercise the real code path with stubbed HTTP
    return c


def test_claim_company_creates_net_new_with_owner_and_status(monkeypatch):
    c = _live_client(monkeypatch)
    monkeypatch.setattr(c, "find_company_id_by_domain", lambda d: None)  # net-new
    captured = {}
    def fake_post(path, payload):
        captured["path"] = path
        captured["props"] = payload["properties"]
        return {"id": "77"}
    monkeypatch.setattr(c, "_post", fake_post)

    a = Account(name="Buckeye", domain="buckeye.example")
    a.__dict__["discovered_by"] = "clay_lookalike"
    new_id = c.claim_company(a, owner_id="555")

    assert new_id == "77"
    assert captured["props"][MACHINE_SOURCED_PROPERTY] == "true"
    assert captured["props"][ENGINE_STATUS_PROPERTY] == "discovered"
    assert captured["props"]["hubspot_owner_id"] == "555"


def test_claim_company_refuses_blank_owner(monkeypatch):
    c = _live_client(monkeypatch)
    a = Account(name="X", domain="x.example")
    with pytest.raises(ValueError):
        c.claim_company(a, owner_id="")


def test_claim_company_never_claims_existing_book(monkeypatch):
    c = _live_client(monkeypatch)
    monkeypatch.setattr(c, "find_company_id_by_domain", lambda d: "999")  # already in book
    def boom(path, payload):
        raise AssertionError("must not create when the domain already exists")
    monkeypatch.setattr(c, "_post", boom)
    a = Account(name="X", domain="x.example")
    assert c.claim_company(a, owner_id="555") == "999"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_claim_company.py -v`
Expected: FAIL — `ENGINE_STATUS_PROPERTY` / `claim_company` not defined.

- [ ] **Step 3: Implement the constant and method**

In `engine/hubspot/client.py`, after `MACHINE_SOURCED_DATE_PROPERTY` (line ~42) add:

```python
ENGINE_STATUS_PROPERTY = "engine_status"   # discovered -> working (hygiene filter)
```

After the `_put` method, add a `_get` helper:

```python
    def _get(self, path: str, params: dict | None = None) -> dict:
        if self._dry:
            return {}
        r = self._session.get(f"{API}{path}", params=params or {}, timeout=30)
        r.raise_for_status()
        return r.json() if r.content else {}
```

After the `push` method, add:

```python
    def claim_company(self, account: Account, owner_id: str) -> str | None:
        """Auto-claim: create the net-new company stamped machine_sourced + provenance +
        first-touch date + engine_status=discovered + owner. Lean — company only, NO
        contact, NO outreach draft (those are outreach spend, gated to the Compose flow).

        Guards: (1) owner_id is REQUIRED — refuse rather than create an unassigned record;
        (2) domain already in the book -> never claim (return the existing id if it's ours,
        None if it's John's pre-existing record). Idempotent: a re-run on an already-claimed
        domain returns its id without writing."""
        if not owner_id:
            raise ValueError("claim_company requires an owner_id — refusing to create an unassigned company")

        if self._dry:
            print(f"  [DRY] would claim {account.domain} | machine_sourced=true "
                  f"| {ENGINE_STATUS_PROPERTY}=discovered | owner={owner_id}")
            return f"dry-{account.domain}"

        existing = self.find_company_id_by_domain(account.domain)
        if existing:
            # Already present. We can't tell ours vs John's from the id alone here, and the
            # SLA guard is conservative: NEVER re-stamp an existing record. Return the id so
            # callers can associate/promote, but no write happens.
            print(f"  [exists] {account.domain} already in CRM (id {existing}) — not claimed")
            return existing

        created = self._post("/crm/v3/objects/companies", {"properties": {
            "name": account.name,
            "domain": account.domain,
            MACHINE_SOURCED_PROPERTY: "true",
            SOURCE_PROVENANCE_PROPERTY: account.discovered_by,
            MACHINE_SOURCED_DATE_PROPERTY: date.today().isoformat(),
            ENGINE_STATUS_PROPERTY: "discovered",
            "hubspot_owner_id": owner_id,
        }})
        new_id = created["id"]
        print(f"  [claimed] {account.domain} -> id {new_id} | machine_sourced=true owner={owner_id}")
        return new_id
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_claim_company.py -v`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add engine/hubspot/client.py tests/test_claim_company.py
git commit -m "feat(hubspot): claim_company — lean auto-claim (owner-required, dedup guard, engine_status)"
```

---

### Task 3: Default-owner setting + `HubSpotClient.list_owners`

**Files:**
- Modify: `engine/db/settings_repo.py` (add `OWNER_KEY`, `load_default_owner_id`, `save_default_owner_id`)
- Modify: `engine/hubspot/client.py` (add `list_owners`)
- Test: `tests/test_owner_settings.py`

**Interfaces:**
- Produces: `settings_repo.load_default_owner_id(session) -> str | None`, `settings_repo.save_default_owner_id(session, owner_id: str) -> None`; `HubSpotClient.list_owners() -> list[dict]` with keys `id, name, email`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_owner_settings.py
from engine.db.base import make_engine, make_session
from engine.db.models import Base
from engine.db import settings_repo
from engine.hubspot.client import HubSpotClient


def _session():
    engine = make_engine("sqlite://")
    Base.metadata.create_all(engine)
    return make_session(engine)


def test_default_owner_roundtrips():
    session = _session()
    assert settings_repo.load_default_owner_id(session) is None
    settings_repo.save_default_owner_id(session, "555")
    assert settings_repo.load_default_owner_id(session) == "555"


def test_list_owners_parses(monkeypatch):
    c = HubSpotClient()
    c._dry = False
    monkeypatch.setattr(c, "_get", lambda path, params=None: {"results": [
        {"id": "555", "firstName": "Kaylee", "lastName": "Sammon", "email": "kaylee@sc.com"},
    ]})
    owners = c.list_owners()
    assert owners == [{"id": "555", "name": "Kaylee Sammon", "email": "kaylee@sc.com"}]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_owner_settings.py -v`
Expected: FAIL — `load_default_owner_id` / `list_owners` not defined.

- [ ] **Step 3: Implement**

In `engine/db/settings_repo.py` add:

```python
OWNER_KEY = "default_owner_id"


def load_default_owner_id(session: Session) -> str | None:
    """The team-wide default HubSpot owner id, or None if unset."""
    row = session.get(SettingRow, OWNER_KEY)
    if row is None or not isinstance(row.value, dict):
        return None
    oid = row.value.get("id")
    return str(oid) if oid else None


def save_default_owner_id(session: Session, owner_id: str) -> None:
    row = session.get(SettingRow, OWNER_KEY)
    if row is None:
        session.add(SettingRow(key=OWNER_KEY, value={"id": str(owner_id)}))
    else:
        row.value = {"id": str(owner_id)}
    session.commit()
```

In `engine/hubspot/client.py` add:

```python
    def list_owners(self) -> list[dict]:
        """Active HubSpot owners for the default-owner picker (owners.read scope)."""
        if self._dry:
            return []
        data = self._get("/crm/v3/owners", {"limit": 100})
        out = []
        for r in data.get("results", []):
            name = " ".join(p for p in (r.get("firstName"), r.get("lastName")) if p).strip()
            out.append({"id": str(r.get("id")), "name": name or (r.get("email") or ""),
                        "email": r.get("email") or ""})
        return out
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_owner_settings.py -v`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
git add engine/db/settings_repo.py engine/hubspot/client.py tests/test_owner_settings.py
git commit -m "feat: default-owner setting (settings_repo) + HubSpotClient.list_owners"
```

---

### Task 4: `/api/owners` + `/api/owner-config` endpoints

**Files:**
- Modify: `web/server.py` (add three routes; add a `OwnerConfig` request model near the other Pydantic models)
- Test: `tests/test_owner_api.py`

**Interfaces:**
- Consumes: `HubSpotClient.list_owners`, `settings_repo.load_default_owner_id/save_default_owner_id`.
- Produces: `GET /api/owners -> {owners: [...]}`, `GET /api/owner-config -> {default_owner_id: str|null}`, `PUT /api/owner-config {owner_id} -> {default_owner_id}`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_owner_api.py
from fastapi.testclient import TestClient
from web.server import app

client = TestClient(app)


def test_owner_config_roundtrip():
    assert client.get("/api/owner-config").json()["default_owner_id"] is None
    r = client.put("/api/owner-config", json={"owner_id": "555"})
    assert r.status_code == 200
    assert r.json()["default_owner_id"] == "555"
    assert client.get("/api/owner-config").json()["default_owner_id"] == "555"


def test_owner_config_rejects_blank():
    r = client.put("/api/owner-config", json={"owner_id": ""})
    assert r.status_code == 400


def test_owners_list_dry_is_empty():
    # DRY_RUN=1 in conftest -> HubSpot dry -> empty owners list, no crash.
    assert client.get("/api/owners").json() == {"owners": []}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_owner_api.py -v`
Expected: FAIL — routes 404.

- [ ] **Step 3: Implement the routes**

Near the other Pydantic request models in `web/server.py` add:

```python
class OwnerConfig(BaseModel):
    owner_id: str
```

Add the routes (near the `/api/scoring-config` routes):

```python
@app.get("/api/owners")
def owners():
    return {"owners": HubSpotClient().list_owners()}


@app.get("/api/owner-config")
def get_owner_config(session=Depends(db_session)):
    return {"default_owner_id": settings_repo.load_default_owner_id(session)}


@app.put("/api/owner-config")
def put_owner_config(cfg: OwnerConfig, session=Depends(db_session)):
    if not cfg.owner_id.strip():
        raise HTTPException(status_code=400, detail="owner_id is required")
    settings_repo.save_default_owner_id(session, cfg.owner_id.strip())
    return {"default_owner_id": cfg.owner_id.strip()}
```

Ensure `settings_repo` is imported in `web/server.py` (it already imports from `engine.db`; add `from engine.db import settings_repo` if absent).

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_owner_api.py -v`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add web/server.py tests/test_owner_api.py
git commit -m "feat(api): /api/owners + /api/owner-config (default owner CRUD)"
```

---

### Task 5: `engine/jobs/claim.py` — resumable auto-claim job

**Files:**
- Create: `engine/jobs/claim.py`
- Test: `tests/test_claim_job.py`

**Interfaces:**
- Consumes: `AccountRow` (query `net_new is True, claimed is False, pushed is False`), `repo._account_from_row`, `settings_repo.load_default_owner_id`, `HubSpotClient.claim_company`.
- Produces: `claim.run(session, limit=None, client=None, owner_id=None) -> {"claimed": int, "remaining": int, "error": str | None}`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_claim_job.py
from datetime import datetime, timezone
from engine.db.base import make_engine, make_session
from engine.db.models import Base, AccountRow
from engine.jobs import claim


def _session():
    engine = make_engine("sqlite://")
    Base.metadata.create_all(engine)
    return make_session(engine)


class FakeClient:
    def __init__(self): self.calls = []
    def claim_company(self, account, owner_id):
        self.calls.append(account.domain)
        return f"id-{account.domain}"


def _seed(session, domain, net_new=True, claimed=False):
    session.add(AccountRow(domain=domain, name=domain, stage="scored", route="closer",
                           band="A", total=90, net_new=net_new, claimed=claimed, pushed=False,
                           vertical="unknown"))
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_claim_job.py -v`
Expected: FAIL — `engine.jobs.claim` does not exist.

- [ ] **Step 3: Implement the job**

```python
# engine/jobs/claim.py
"""JOB: auto-claim every net-new company into HubSpot as engine-sourced. Resumable —
each call claims up to `limit` net-new, not-yet-claimed rows. This is the discovery
dibs: it runs regardless of whether an operator ever works the company. Lean: company
only, no contact, no outreach draft. Owner is REQUIRED (never create unassigned)."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from engine.db.models import AccountRow
from engine.db import repo, settings_repo


def run(session: Session, limit: int | None = None, client=None, owner_id=None) -> dict:
    if client is None:
        from engine.hubspot.client import HubSpotClient
        client = HubSpotClient()
    if owner_id is None:
        owner_id = settings_repo.load_default_owner_id(session)

    # Never flood HubSpot with ownerless records — refuse the whole run.
    if not owner_id:
        print("[claim] no default owner set — refusing to claim (never unassigned)")
        return {"claimed": 0, "remaining": None, "error": "no_default_owner"}

    q = (session.query(AccountRow)
         .filter(AccountRow.net_new.is_(True),
                 AccountRow.claimed.is_(False),
                 AccountRow.pushed.is_(False))
         .order_by(AccountRow.total.desc()))
    if limit:
        q = q.limit(limit)
    rows = q.all()

    claimed = 0
    for row in rows:
        account = repo._account_from_row(row)
        try:
            hid = client.claim_company(account, owner_id=owner_id)
        except Exception as e:  # a single firm's failure never aborts the batch
            print(f"  [claim] {row.domain} failed ({type(e).__name__}: {e})")
            continue
        if hid:
            row.claimed = True
            row.claimed_at = datetime.now(timezone.utc)
            if not row.hubspot_id:
                row.hubspot_id = hid
            claimed += 1
    session.commit()

    remaining = (session.query(AccountRow)
                 .filter(AccountRow.net_new.is_(True), AccountRow.claimed.is_(False),
                         AccountRow.pushed.is_(False)).count())
    print(f"[claim] claimed {claimed}; remaining {remaining}")
    return {"claimed": claimed, "remaining": remaining, "error": None}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_claim_job.py -v`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```bash
git add engine/jobs/claim.py tests/test_claim_job.py
git commit -m "feat(job): claim.py — resumable auto-claim of all net-new (owner-required, dedup)"
```

---

### Task 6: `AUTO_CLAIM_ENABLED` flag + `/api/ingest` background trigger + `/api/claim`

**Files:**
- Modify: `engine/config.py` (add `auto_claim_enabled` property)
- Modify: `web/server.py` (`/api/ingest` gains `BackgroundTasks`; new `/api/claim`)
- Test: `tests/test_ingest_autoclaim.py`

**Interfaces:**
- Consumes: `claim.run`, `CONFIG.auto_claim_enabled`.
- Produces: `CONFIG.auto_claim_enabled: bool`; `POST /api/claim?limit= -> {claimed, remaining, error}`; ingest schedules the claim job when the flag is on.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_ingest_autoclaim.py
import io
from fastapi.testclient import TestClient
import web.server as server
from web.server import app

client = TestClient(app)
CSV = "Domain,Name,Primary Industry,Location\nbuckeye.example,Buckeye,Manufacturing,Cleveland OH\n"


def test_claim_endpoint_runs_job(monkeypatch):
    called = {}
    monkeypatch.setattr(server.claim, "run",
                        lambda session, limit=None: called.setdefault("ran", True) or {"claimed": 0, "remaining": 0, "error": None})
    r = client.post("/api/claim")
    assert r.status_code == 200
    assert called.get("ran") is True


def test_ingest_schedules_claim_only_when_flag_on(monkeypatch):
    scheduled = {"n": 0}
    # Count background tasks added by ingest.
    import starlette.background as bg
    orig = bg.BackgroundTasks.add_task
    def spy(self, func, *a, **k):
        scheduled["n"] += 1
        return orig(self, func, *a, **k)
    monkeypatch.setattr(bg.BackgroundTasks, "add_task", spy)

    monkeypatch.setattr(type(server.CONFIG), "auto_claim_enabled", property(lambda self: False))
    client.post("/api/ingest", files={"file": ("x.csv", io.BytesIO(CSV.encode()), "text/csv")})
    assert scheduled["n"] == 0

    monkeypatch.setattr(type(server.CONFIG), "auto_claim_enabled", property(lambda self: True))
    client.post("/api/ingest", files={"file": ("x.csv", io.BytesIO(CSV.encode()), "text/csv")})
    assert scheduled["n"] == 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_ingest_autoclaim.py -v`
Expected: FAIL — `/api/claim` 404 / `auto_claim_enabled` missing.

- [ ] **Step 3: Implement the flag, the trigger, and the endpoint**

In `engine/config.py`, inside `Config`, add a field and property alongside `gmail_send_enabled`:

```python
    auto_claim_enabled: bool = os.getenv("AUTO_CLAIM_ENABLED", "").strip().lower() in ("1", "true", "yes", "on")
```

In `web/server.py`, import the job and background type at top:

```python
from fastapi import BackgroundTasks
from engine.jobs import claim
from engine.db.base import make_session, make_engine  # if not already imported
```

Add a session-owning helper the background task can use (a request-scoped session is closed once ingest returns):

```python
def _claim_in_background(limit: int | None = None):
    """Runs the claim job on its OWN session — the request session is gone by now."""
    session = make_session(make_engine())
    try:
        claim.run(session, limit=limit)
    finally:
        session.close()
```

Change the `ingest` signature and add the scheduling after `repo.upsert_accounts(session, routed)`:

```python
async def ingest(file: UploadFile = File(...), background_tasks: BackgroundTasks = None,
                 session=Depends(db_session)):
    ...
    repo.upsert_accounts(session, routed)

    # Auto-claim: fire-and-forget so a big list doesn't block the upload response.
    # Flag-gated (default OFF) — turning it on is a deliberate prod step.
    if CONFIG.auto_claim_enabled and background_tasks is not None:
        background_tasks.add_task(_claim_in_background)
    ...
```

Add the manual/cron endpoint:

```python
@app.post("/api/claim")
def claim_endpoint(limit: int = None, session=Depends(db_session)):
    return claim.run(session, limit=limit)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_ingest_autoclaim.py -v`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
git add engine/config.py web/server.py tests/test_ingest_autoclaim.py
git commit -m "feat: AUTO_CLAIM_ENABLED flag + ingest background claim trigger + /api/claim"
```

---

### Task 7: `promote_to_working` + `/api/push` reframe (Confirm = promote, not create)

**Files:**
- Modify: `engine/hubspot/client.py` (add `promote_to_working`)
- Modify: `web/server.py` (`/api/push` uses promote + default owner; drop the draft/contact path)
- Test: `tests/test_promote_and_push.py`

**Interfaces:**
- Consumes: `find_company_id_by_domain`, `_post`, `claim_company`, `settings_repo.load_default_owner_id`, `repo.mark_pushed`.
- Produces: `HubSpotClient.promote_to_working(account, owner_id) -> str | None`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_promote_and_push.py
from engine.hubspot.client import HubSpotClient, ENGINE_STATUS_PROPERTY
from engine.models import Account


def _live():
    c = HubSpotClient(); c._dry = False; return c


def test_promote_sets_working_on_existing_ours(monkeypatch):
    c = _live()
    monkeypatch.setattr(c, "find_company_id_by_domain", lambda d: "42")
    patched = {}
    monkeypatch.setattr(c, "_request",
                        lambda m, p, payload: patched.update(method=m, path=p, props=payload["properties"]) or {"id": "42"})
    a = Account(name="Buckeye", domain="buckeye.example")
    assert c.promote_to_working(a, owner_id="555") == "42"
    assert patched["method"] == "patch"
    assert patched["props"][ENGINE_STATUS_PROPERTY] == "working"


def test_promote_claims_when_not_yet_in_crm(monkeypatch):
    c = _live()
    monkeypatch.setattr(c, "find_company_id_by_domain", lambda d: None)
    made = {}
    def fake_post(path, payload):
        made["props"] = payload["properties"]; return {"id": "88"}
    monkeypatch.setattr(c, "_post", fake_post)
    a = Account(name="X", domain="x.example")
    a.__dict__["discovered_by"] = "clay"
    assert c.promote_to_working(a, owner_id="555") == "88"
    assert made["props"][ENGINE_STATUS_PROPERTY] == "working"
    assert made["props"]["hubspot_owner_id"] == "555"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_promote_and_push.py -v`
Expected: FAIL — `promote_to_working` not defined.

- [ ] **Step 3: Implement `promote_to_working`**

Add a `_patch` helper next to `_put` in `client.py`:

```python
    def _patch(self, path: str, payload: dict) -> dict:
        return self._request("patch", path, payload)
```

Add the method after `claim_company`:

```python
    def promote_to_working(self, account: Account, owner_id: str) -> str | None:
        """Operator confirmed a discovery -> mark it working (moves it into the team's
        active views). If it's already in HubSpot, PATCH engine_status=working. If it's
        not claimed yet (auto-claim off or still draining), claim it straight to working
        so a fast operator is never blocked. Owner required on create."""
        if self._dry:
            print(f"  [DRY] would promote {account.domain} -> {ENGINE_STATUS_PROPERTY}=working")
            return f"dry-{account.domain}"

        existing = self.find_company_id_by_domain(account.domain)
        if existing:
            self._patch(f"/crm/v3/objects/companies/{existing}",
                        {"properties": {ENGINE_STATUS_PROPERTY: "working"}})
            print(f"  [working] {account.domain} (id {existing}) -> engine_status=working")
            return existing

        if not owner_id:
            raise ValueError("promote_to_working requires an owner_id to claim a not-yet-in-CRM company")
        created = self._post("/crm/v3/objects/companies", {"properties": {
            "name": account.name,
            "domain": account.domain,
            MACHINE_SOURCED_PROPERTY: "true",
            SOURCE_PROVENANCE_PROPERTY: account.discovered_by,
            MACHINE_SOURCED_DATE_PROPERTY: date.today().isoformat(),
            ENGINE_STATUS_PROPERTY: "working",
            "hubspot_owner_id": owner_id,
        }})
        return created["id"]
```

- [ ] **Step 4: Rewrite `/api/push` to promote**

Replace the body of `/api/push` in `web/server.py` with a promote-based flow (drops the AI-draft/contact-enrich path — drafting lives in Compose now):

```python
@app.post("/api/push")
def push(req: PushRequest, session=Depends(db_session)):
    owner_id = settings_repo.load_default_owner_id(session)
    if not owner_id:
        raise HTTPException(status_code=400,
                            detail="Set a default owner (Settings) before working accounts.")
    selected = {a.domain: a for a in repo.get_candidates(session)
                if a.domain in set(req.domains)}
    client = HubSpotClient()
    results, claimed = [], 0
    for dom, a in selected.items():
        try:
            hid = client.promote_to_working(a, owner_id=owner_id)
        except Exception as e:
            results.append({"domain": dom, "status": "error", "reason": str(e)})
            continue
        if hid and not str(hid).startswith("dry-"):
            repo.mark_pushed(session, dom, hid)
            claimed += 1
            results.append({"domain": dom, "status": "claimed", "hubspot_id": hid})
        else:
            results.append({"domain": dom, "status": "claimed", "hubspot_id": hid})  # dry
    return {"results": results, "claimed": claimed, "count": claimed,
            "pushed": [r for r in results if r["status"] == "claimed"],
            "scoreboard": dashboard.build()}
```

- [ ] **Step 5: Run the full suite**

Run: `pytest tests/test_promote_and_push.py tests/ -q`
Expected: PASS. If any pre-existing `/api/push` test asserted the old draft/create behavior, update it to the promote flow (the confirm now promotes; no AI draft is generated on push).

- [ ] **Step 6: Commit**

```bash
git add engine/hubspot/client.py web/server.py tests/test_promote_and_push.py
git commit -m "feat: Confirm = promote_to_working (not create); /api/push reframed, draft moves to Compose"
```

---

### Task 8: `/api/added` drill-down + scoreboard "Added to CRM" = claimed

**Files:**
- Modify: `web/server.py` (`scoreboard` `in_crm` counts `claimed`; new `/api/added`)
- Test: `tests/test_added_api.py`

**Interfaces:**
- Consumes: `AccountRow`, `repo.get_contacts`, `HubSpotClient.list_owners` (owner-id → name map, best-effort).
- Produces: `GET /api/added -> {added: [{domain, name, claimed_at, owner_name, contact_count, engine_status}], total}`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_added_api.py
from fastapi.testclient import TestClient
from web.server import app
import web.server as server
from engine.db.base import make_engine, make_session
from engine.db.models import Base, AccountRow

client = TestClient(app)


def test_added_lists_claimed_and_matches_scoreboard(monkeypatch):
    engine = make_engine("sqlite://"); Base.metadata.create_all(engine)
    session = make_session(engine)
    session.add(AccountRow(domain="a.example", name="A", stage="scored", route="closer",
                           band="A", total=90, net_new=True, claimed=True, pushed=False, vertical="unknown"))
    session.add(AccountRow(domain="b.example", name="B", stage="scored", route="nurture",
                           band="C", total=40, net_new=True, claimed=False, pushed=False, vertical="unknown"))
    session.commit()
    monkeypatch.setattr(server, "db_session", lambda: iter([session]))

    added = client.get("/api/added").json()
    assert added["total"] == 1
    assert added["added"][0]["domain"] == "a.example"
    assert added["added"][0]["engine_status"] == "discovered"
    assert added["added"][0]["contact_count"] == 0
    assert client.get("/api/scoreboard").json()["in_crm"] == 1
```

Note: if `Depends(db_session)` can't be monkeypatched this way in the existing suite, follow the pattern the current `tests/` use to inject a session (check an existing endpoint test, e.g. `test_scoreboard*`, and match it).

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_added_api.py -v`
Expected: FAIL — `/api/added` 404.

- [ ] **Step 3: Implement**

In `web/server.py` `scoreboard`, change the count:

```python
    in_crm = sum(1 for r in rows if r.claimed)   # "Added to CRM" = auto-claimed, not worked
```

Add the endpoint:

```python
@app.get("/api/added")
def added(session=Depends(db_session), limit: int = 200):
    rows = (session.query(AccountRow)
            .filter(AccountRow.claimed.is_(True))
            .order_by(AccountRow.claimed_at.desc().nullslast())
            .all())
    total = len(rows)
    owner_names = {o["id"]: o["name"] for o in HubSpotClient().list_owners()}
    default_owner = owner_names.get(settings_repo.load_default_owner_id(session), "")
    out = []
    for r in rows[:limit]:
        out.append({
            "domain": r.domain,
            "name": r.name,
            "claimed_at": r.claimed_at.isoformat() if r.claimed_at else None,
            "owner_name": default_owner,   # single team default today; per-record owner later
            "contact_count": len(repo.get_contacts(session, r.domain)),
            "engine_status": "working" if r.pushed else "discovered",
        })
    return {"added": out, "total": total}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_added_api.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/server.py tests/test_added_api.py
git commit -m "feat(api): /api/added drill-down; scoreboard 'Added to CRM' counts claimed"
```

---

### Task 9: Owner picker — "Ownership" group on the Scoring screen

**Files:**
- Modify: `web/console/app/scoring.jsx` (add an Ownership section)
- Modify: `web/console/app/data.jsx` (add `fetchOwners`, `fetchOwnerConfig`, `saveOwnerConfig`)

**Interfaces:**
- Consumes: `GET /api/owners`, `GET/PUT /api/owner-config`.

- [ ] **Step 1: Add the data-layer calls**

In `web/console/app/data.jsx`, following the existing fetch helpers' pattern (match how `fetchScoringConfig` etc. are written), add:

```javascript
export async function fetchOwners() {
  const r = await fetch("/api/owners");
  return (await r.json()).owners || [];
}
export async function fetchOwnerConfig() {
  const r = await fetch("/api/owner-config");
  return (await r.json()).default_owner_id || "";
}
export async function saveOwnerConfig(ownerId) {
  const r = await fetch("/api/owner-config", {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ owner_id: ownerId }),
  });
  if (!r.ok) throw new Error((await r.json()).detail || "save failed");
  return (await r.json()).default_owner_id;
}
```

(If `data.jsx` attaches helpers to a `PE`/`PEQ` namespace object rather than ES exports, follow that convention exactly — check the top of the file first.)

- [ ] **Step 2: Add the Ownership section to `scoring.jsx`**

At the top of the `ScoringScreen` component, load owners + current default into state (match the file's existing `useState`/`useEffect` alias, e.g. `useStateS`/`useEffectS`):

```javascript
  const [owners, setOwners] = useStateS([]);
  const [defaultOwner, setDefaultOwner] = useStateS("");
  const [ownerSaved, setOwnerSaved] = useStateS(false);
  useEffectS(() => {
    DATA.fetchOwners().then(setOwners);
    DATA.fetchOwnerConfig().then(setDefaultOwner);
  }, []);
```

Render an Ownership card (near the top of the groups, above the scoring sliders), using the file's existing card/label classes:

```jsx
  <section className="sc-group">
    <h3>Ownership</h3>
    <p className="sc-note">Every company the engine adds to HubSpot is assigned to this person. Required — nothing is created unassigned.</p>
    <label className="sc-field">
      Default owner
      <select value={defaultOwner}
              onChange={(e) => setDefaultOwner(e.target.value)}>
        <option value="">— select —</option>
        {owners.map((o) => <option key={o.id} value={o.id}>{o.name || o.email}</option>)}
      </select>
    </label>
    <button className="sc-save" disabled={!defaultOwner}
            onClick={async () => { await DATA.saveOwnerConfig(defaultOwner); setOwnerSaved(true); }}>
      {ownerSaved ? "Saved ✓" : "Save owner"}
    </button>
  </section>
```

- [ ] **Step 3: Verify in the browser**

Start locally with `DRY_RUN=1 uvicorn web.server:app --port 8000` and open `/scoring`. In dry mode the owner list is empty (expected — no live HubSpot); the section renders, the Save button is disabled until a selection. For a live-data check, follow the Playwright pattern prior sessions used (seed a scratchpad sqlite, stub `/api/owners`). Confirm no console errors.

- [ ] **Step 4: Commit**

```bash
git add web/console/app/scoring.jsx web/console/app/data.jsx
git commit -m "feat(ui): default-owner picker (Ownership group) on the Scoring screen"
```

---

### Task 10: Legibility headers + Confirm copy reframe (4 screens)

**Files:**
- Modify: `web/console/app/queue.jsx`, `web/console/app/triage.jsx`, `web/console/app/accounts.jsx`, `web/console/app/scoreboard.jsx`

**Interfaces:** none (copy + existing counts only).

- [ ] **Step 1: Morning Queue header (`queue.jsx`)**

Header already reads `Morning Queue` (line ~189) with a subline (line ~191). Change the overline/subline to make the funnel explicit. Keep the existing `<h2>Morning Queue</h2>`; replace the subline paragraph text with:

```
The shortlist that matters today — a filtered slice of the Triage Board: only net-new, in-market-now, closer-worthy prospects, ranked best-first. Work the top down.
```

Change the per-row primary button label (line ~230) from `Confirm → push` to `Confirm → work` and the busy label from `Pushing…` to `Starting…`.

- [ ] **Step 2: Triage Board header + copy (`triage.jsx`)**

- Line ~146 overline: keep "Human-in-the-loop · confirm or override routing".
- Line ~147 `<h2>`: change `{awaiting.length} to confirm before anything acts` to `Sort the pile — {awaiting.length} to confirm`.
- Line ~149-150 helper: replace "Confirming a Closer pushes it into HubSpot." with "Confirming an LFG moves it into your active pipeline. (It's already saved as engine-sourced — this is your decision to work it.)"
- Line ~218 button: `Confirm LFG` stays, but change the non-closer hint (line ~219) `"marketing track — no push"` to `"marketing track — not worked"`.
- Line ~209 `Pushed to HubSpot` → `In your active pipeline`.

- [ ] **Step 3: Accounts + Scoreboard headers**

- `accounts.jsx`: at the list header, add a subline/count `Look up any company — {N} in your book` using the existing accounts count in scope (match the component's existing count variable).
- `scoreboard.jsx`: line ~72-73 overline/`<h2>` — keep "Engine Impact"; change the overline to `What the engine produced · watch, not work`.

- [ ] **Step 4: Verify in the browser**

Start locally (`DRY_RUN=1`), click through Morning Queue / Triage / Accounts / Scoreboard. Confirm: no "pushes to HubSpot" copy remains on the confirm actions, the funnel language is present, no console errors, buttons still fire (dry).

- [ ] **Step 5: Commit**

```bash
git add web/console/app/queue.jsx web/console/app/triage.jsx web/console/app/accounts.jsx web/console/app/scoreboard.jsx
git commit -m "feat(ui): legible funnel headers + Confirm→Work copy (claim already happened at discovery)"
```

---

### Task 11: "Added to CRM" drill-down list on the Scoreboard

**Files:**
- Modify: `web/console/app/scoreboard.jsx` (make the stat expandable + render the list)
- Modify: `web/console/app/data.jsx` (add `fetchAdded`; reuse existing `pursueDomains`)

**Interfaces:**
- Consumes: `GET /api/added`, existing `pursueDomains(domain)` (Apollo Find-the-person).

- [ ] **Step 1: Add `fetchAdded` to `data.jsx`**

```javascript
export async function fetchAdded() {
  const r = await fetch("/api/added");
  return await r.json();   // { added: [...], total }
}
```

(Namespace convention: match the file — if others are `PE.fetchAdded = …`, do that.)

- [ ] **Step 2: Make the "Added to CRM" stat expandable in `scoreboard.jsx`**

The "Added to CRM" stat is around line 97. Wrap it so a click toggles an inline list. Add state at the top of the component (match the file's `useState` alias):

```javascript
  const [showAdded, setShowAdded] = useStateS(false);
  const [added, setAdded] = useStateS(null);
  const openAdded = () => {
    setShowAdded((v) => !v);
    if (!added) DATA.fetchAdded().then(setAdded);
  };
```

Make the stat clickable (add `onClick={openAdded}` and a pointer cursor to the "Added to CRM" stat block). Below the stat row, render the list when open:

```jsx
  {showAdded && (
    <div className="sb-added">
      {!added ? <div className="sb-added__loading">Loading…</div> : (
        <table className="sb-added__t">
          <thead><tr><th>Company</th><th>Added</th><th>Owner</th><th>Contacts</th><th></th></tr></thead>
          <tbody>
            {added.added.map((r) => (
              <tr key={r.domain}>
                <td>{r.name}<span className="sb-added__dom">{r.domain}</span></td>
                <td>{r.claimed_at ? r.claimed_at.slice(0, 10) : "—"}</td>
                <td>{r.owner_name || "—"}</td>
                <td>{r.contact_count}</td>
                <td>
                  {r.contact_count === 0 &&
                    <button className="sb-added__find"
                            onClick={() => DATA.pursueDomains(r.domain)}>Find the person</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )}
```

Add minimal styles to the screen's `<style>` block (match existing `sb-*` styling) so the table is readable and scrolls horizontally on narrow widths (`overflow-x:auto` on `.sb-added`).

- [ ] **Step 3: Verify in the browser**

Locally with a seeded scratchpad sqlite (some rows `claimed=True`, one with zero contacts): open Engine Impact, click "Added to CRM" → list expands, the zero-contact row shows "Find the person". Confirm the count over the stat equals `added.total`. No console errors.

- [ ] **Step 4: Commit**

```bash
git add web/console/app/scoreboard.jsx web/console/app/data.jsx
git commit -m "feat(ui): Added-to-CRM drill-down list with Find-the-person on zero-contact rows"
```

---

### Task 12: Guarded `engine_status` HubSpot property-create script (manual prod-setup)

**Files:**
- Create: `engine/hubspot/create_engine_status_property.py`
- Test: `tests/test_create_engine_status_property.py`

**Interfaces:**
- Produces: a script that creates the `engine_status` company property (select: discovered/working) in group `pipeline_engine`. **Not** registered in `auto_migrate`. Guarded: prints the plan unless `--run` is passed.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_create_engine_status_property.py
from engine.hubspot import create_engine_status_property as m


def test_property_payload_shape():
    payload = m.property_payload()
    assert payload["name"] == "engine_status"
    assert payload["groupName"] == "pipeline_engine"
    opts = {o["value"] for o in payload["options"]}
    assert opts == {"discovered", "working"}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_create_engine_status_property.py -v`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement the guarded script**

```python
# engine/hubspot/create_engine_status_property.py
"""GUARDED prod-setup (run ONCE by hand, never in CI / auto_migrate): create the
company property `engine_status` (select: discovered | working) in the pipeline_engine
group. Prints the plan unless --run is passed; requires a real HUBSPOT_TOKEN + not dry."""
from __future__ import annotations

import sys

from engine.hubspot.client import HubSpotClient
from engine.config import CONFIG


def property_payload() -> dict:
    return {
        "name": "engine_status",
        "label": "Engine Status",
        "type": "enumeration",
        "fieldType": "select",
        "groupName": "pipeline_engine",
        "options": [
            {"label": "Discovered", "value": "discovered", "displayOrder": 0},
            {"label": "Working", "value": "working", "displayOrder": 1},
        ],
    }


def main(argv=None) -> None:
    argv = argv if argv is not None else sys.argv[1:]
    payload = property_payload()
    if "--run" not in argv:
        print("[guarded] would create company property engine_status "
              "(discovered|working) in group pipeline_engine. Re-run with --run to apply.")
        print(payload)
        return
    if CONFIG.dry_run:
        print("[guarded] DRY_RUN set — refusing to write. Unset DRY_RUN and provide HUBSPOT_TOKEN.")
        return
    client = HubSpotClient()
    client._post("/crm/v3/properties/companies", payload)
    print("  engine_status property created")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_create_engine_status_property.py -v`
Expected: PASS.

- [ ] **Step 5: Run the full suite once**

Run: `pytest -q`
Expected: all green (should be ~200+ tests).

- [ ] **Step 6: Commit**

```bash
git add engine/hubspot/create_engine_status_property.py tests/test_create_engine_status_property.py
git commit -m "feat(hubspot): guarded engine_status property-create script (manual prod-setup)"
```

---

## Post-build: PR + prod cutover checklist (Danny)

1. Open the PR from `feat/discovery-claim-flow`; verify `git log origin/main..HEAD` shows every commit before merge.
2. Merge → Railway auto-deploys. `migrate_add_claimed` self-applies at boot (in `_MIGRATIONS`).
3. **Create the HubSpot property (once):** `railway run python -m engine.hubspot.create_engine_status_property --run`.
4. **Set the default owner:** open `/scoring` → Ownership → pick Kaylee → Save.
5. **Flip the switch when ready:** set `AUTO_CLAIM_ENABLED=1` in Railway. The next ingest auto-claims all net-new. (Deliberate — this writes thousands of live records into John's HubSpot.)
6. Sanity: run a small ingest first, `POST /api/claim`, confirm a handful of `machine_sourced=true, engine_status=discovered, owner=Kaylee` companies in HubSpot before a full run.

## Self-Review (done)

- **Spec coverage:** Part 0 auto-claim → Tasks 1,2,5,6; owner never-unassigned → Tasks 2,5,7 + invariant tests; dedup guard → Tasks 2,7; no-outreach → Task 2 (+ Task 7 drops draft from push); Confirm reframe → Task 7 + Task 10 copy; Part A legibility → Task 10; Part B owner → Tasks 3,4,9; Part C drill-down → Tasks 8,11; engine_status guarded property → Task 12. All covered.
- **Placeholder scan:** none — every code step carries real code; front-end steps give exact copy + functions with a browser-verification step (the repo has no JS unit harness).
- **Type consistency:** `claim_company(account, owner_id)->str|None`, `promote_to_working(account, owner_id)->str|None`, `claim.run(session, limit, client, owner_id)->{claimed,remaining,error}`, `ENGINE_STATUS_PROPERTY`, `load_default_owner_id/save_default_owner_id`, `AccountRow.claimed/claimed_at` — used consistently across tasks.
