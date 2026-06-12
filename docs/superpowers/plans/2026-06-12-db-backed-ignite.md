# DB-backed Ignite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the deployed Railway service ingest a Clay pull, score/route it, let the operator confirm net-new closer-bound firms, and push them into HubSpot — all from the deployment, with state in Postgres.

**Architecture:** A FastAPI app replaces the static file server. State flows through a Postgres DB (SQLite locally/in tests): `POST /api/ingest` writes the net-new queue, `GET /api/candidates` reads it, `POST /api/push` drains it into HubSpot. The engine stays dataclass-based; the DB layer converts `Account`/`Signal` dataclasses to/from ORM rows at the edges, so scoring/routing/push are untouched.

**Tech Stack:** Python 3.11, FastAPI, Uvicorn, SQLAlchemy 2.0, psycopg3, pytest. Reuses existing `engine.jobs.*`, `engine.hubspot.client.HubSpotClient`, `engine.sources.clay_payload.ClayPayloadSource`.

**Spec:** `docs/superpowers/specs/2026-06-12-db-backed-ignite-design.md`

---

## File Structure

- Create: `engine/db/__init__.py` — package marker (empty)
- Create: `engine/db/base.py` — engine/session factory, URL resolution, `create_all`
- Create: `engine/db/models.py` — `AccountRow`, `SignalRow` ORM models
- Create: `engine/db/repo.py` — dataclass↔row conversion, `upsert_accounts`, `get_candidates`, `mark_pushed`
- Create: `web/server.py` — FastAPI app: `/`, `/api/health`, `/api/ingest`, `/api/candidates`, `/api/push`
- Create: `web/triage.html` — minimal functional triage UI (NOT styled — Claude Design is a later pass)
- Create: `Procfile` — version-controlled start command
- Modify: `engine/jobs/find_accounts.py` — add `sources=None` parameter
- Modify: `requirements.txt` — add fastapi, uvicorn, python-multipart, sqlalchemy, psycopg
- Create: `tests/conftest.py` — sqlite session + TestClient fixtures
- Create: `tests/test_db_repo.py` — repo round-trip, upsert idempotency, candidates filter
- Create: `tests/test_server.py` — ingest/candidates/push endpoint behavior

---

## Task 1: Dependencies and Procfile

**Files:**
- Modify: `requirements.txt`
- Create: `Procfile`

- [ ] **Step 1: Add runtime deps to `requirements.txt`**

Append these lines (keep existing `requests`, `python-dotenv`):

```
fastapi               # web service for ingest/triage/push
uvicorn[standard]     # ASGI server (prod start command)
python-multipart      # multipart/form-data for CSV upload
sqlalchemy            # ORM / persistence
psycopg[binary]       # Postgres driver (Railway DATABASE_URL)
```

- [ ] **Step 2: Create `Procfile`** (version-controlled start command — replaces the dashboard command)

```
web: uvicorn web.server:app --host 0.0.0.0 --port $PORT
```

- [ ] **Step 3: Install locally**

Run: `pip install -r requirements.txt`
Expected: installs fastapi, uvicorn, sqlalchemy, psycopg, python-multipart without error.

- [ ] **Step 4: Commit**

```bash
git add requirements.txt Procfile
git commit -m "build: add FastAPI+SQLAlchemy deps and Procfile start command"
```

---

## Task 2: DB engine/session factory

**Files:**
- Create: `engine/db/__init__.py`
- Create: `engine/db/base.py`
- Test: `tests/test_db_repo.py` (created here, expanded later)

- [ ] **Step 1: Create the package marker**

`engine/db/__init__.py`:

```python
```

(empty file)

- [ ] **Step 2: Write the failing test** for URL normalization

`tests/test_db_repo.py`:

```python
from engine.db.base import resolve_url


def test_resolve_url_normalizes_railway_postgres_scheme():
    # Railway hands out postgres:// ; SQLAlchemy + psycopg3 needs postgresql+psycopg://
    out = resolve_url("postgres://u:p@host:5432/db")
    assert out == "postgresql+psycopg://u:p@host:5432/db"


def test_resolve_url_passes_sqlite_through():
    assert resolve_url("sqlite:///tmp/x.db") == "sqlite:///tmp/x.db"
```

- [ ] **Step 3: Run it to verify it fails**

Run: `python3 -m pytest tests/test_db_repo.py -v`
Expected: FAIL — `ModuleNotFoundError: engine.db.base`

- [ ] **Step 4: Implement `engine/db/base.py`**

```python
"""
DB engine/session factory. Postgres in prod (Railway injects DATABASE_URL),
SQLite locally and in tests. The engine stays dataclass-based; this is the only
place that knows about a database connection.
"""

from __future__ import annotations

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from engine.config import CONFIG

Base = declarative_base()


def resolve_url(url: str | None = None) -> str:
    """Pick the DB URL and normalize it. Railway provides `postgres://`, but
    SQLAlchemy + psycopg3 needs `postgresql+psycopg://`. No URL: fatal in prod
    (Railway sets RAILWAY_ENVIRONMENT), SQLite fallback for local dev."""
    url = url if url is not None else CONFIG.database_url
    if not url:
        if os.getenv("RAILWAY_ENVIRONMENT"):
            raise RuntimeError("DATABASE_URL is required in production")
        return "sqlite:///pipeline_dev.db"
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


def make_engine(url: str | None = None):
    resolved = resolve_url(url)
    connect_args = {"check_same_thread": False} if resolved.startswith("sqlite") else {}
    return create_engine(resolved, connect_args=connect_args, future=True)


def make_session_factory(engine):
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, future=True)


def create_all(engine) -> None:
    # Import models so they register on Base before create_all.
    from engine.db import models  # noqa: F401
    Base.metadata.create_all(engine)
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `python3 -m pytest tests/test_db_repo.py -v`
Expected: PASS (2 passed)

- [ ] **Step 6: Commit**

```bash
git add engine/db/__init__.py engine/db/base.py tests/test_db_repo.py
git commit -m "feat(db): engine/session factory with Railway postgres URL normalization"
```

---

## Task 3: ORM models

**Files:**
- Create: `engine/db/models.py`

- [ ] **Step 1: Implement `engine/db/models.py`**

```python
"""
ORM rows mirroring the Account/Signal dataclasses. Persistence lives here ONLY;
the engine keeps operating on dataclasses (repo.py converts at the edges).
Account.domain is the primary key — the same dedupe key as the HubSpot net-new
gate, so the DB and HubSpot agree on identity.
"""

from __future__ import annotations

from sqlalchemy import Boolean, Float, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from engine.db.base import Base


class AccountRow(Base):
    __tablename__ = "accounts"

    domain: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, default="")
    vertical: Mapped[str] = mapped_column(String, default="unknown")
    city: Mapped[str] = mapped_column(String, default="")
    state: Mapped[str] = mapped_column(String, default="OH")
    linkedin_url: Mapped[str] = mapped_column(String, default="")
    discovered_by: Mapped[str] = mapped_column(String, default="")
    extra: Mapped[dict] = mapped_column(JSON, default=dict)
    stage: Mapped[str] = mapped_column(String, default="discovered")
    hubspot_id: Mapped[str | None] = mapped_column(String, nullable=True)
    pushed: Mapped[bool] = mapped_column(Boolean, default=False)

    # score (engine.models.Score)
    fit: Mapped[float] = mapped_column(Float, default=0.0)
    timing: Mapped[float] = mapped_column(Float, default=0.0)
    total: Mapped[float] = mapped_column(Float, default=0.0)
    band: Mapped[str] = mapped_column(String, default="R")
    score_rationale: Mapped[str] = mapped_column(String, default="")

    # route (engine.models.RouteDecision)
    route_recommended: Mapped[str] = mapped_column(String, default="hold")
    route_rationale: Mapped[str] = mapped_column(String, default="")
    route_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    route_confirmed_route: Mapped[str | None] = mapped_column(String, nullable=True)
    route_confirmed_by: Mapped[str] = mapped_column(String, default="")

    signals: Mapped[list["SignalRow"]] = relationship(
        back_populates="account", cascade="all, delete-orphan"
    )


class SignalRow(Base):
    __tablename__ = "signals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    account_domain: Mapped[str] = mapped_column(ForeignKey("accounts.domain"))
    kind: Mapped[str] = mapped_column(String)
    source: Mapped[str] = mapped_column(String)
    value: Mapped[float] = mapped_column(Float, default=0.0)
    detail: Mapped[str] = mapped_column(String, default="")

    account: Mapped["AccountRow"] = relationship(back_populates="signals")
```

- [ ] **Step 2: Verify it imports + tables register**

Run: `python3 -c "from engine.db.base import make_engine, create_all; e=make_engine('sqlite:///:memory:'); create_all(e); from sqlalchemy import inspect; print(sorted(inspect(e).get_table_names()))"`
Expected: `['accounts', 'signals']`

- [ ] **Step 3: Commit**

```bash
git add engine/db/models.py
git commit -m "feat(db): AccountRow + SignalRow ORM models keyed on domain"
```

---

## Task 4: Repo — conversion + upsert

**Files:**
- Create: `engine/db/repo.py`
- Test: `tests/test_db_repo.py`

- [ ] **Step 1: Add the conftest fixtures**

`tests/conftest.py`:

```python
import pytest

from engine.db.base import make_engine, create_all, make_session_factory


@pytest.fixture()
def session():
    """Fresh in-memory SQLite DB per test."""
    engine = make_engine("sqlite:///:memory:")
    create_all(engine)
    Session = make_session_factory(engine)
    s = Session()
    try:
        yield s
    finally:
        s.close()
```

- [ ] **Step 2: Write the failing test** for round-trip + idempotent upsert

Append to `tests/test_db_repo.py`:

```python
from engine.db import repo
from engine.models import (
    Account, Signal, SignalKind, Vertical, Score, RouteDecision, Route, Stage,
)


def _closer_account(domain="buckeye.example"):
    a = Account(name="Buckeye", domain=domain, vertical=Vertical.INDUSTRIAL_B2B,
                city="Cleveland", discovered_by="clay")
    a.signals = [
        Signal(kind=SignalKind.SITE_QUALITY, source="clay", value=34.0, detail="slow"),
        Signal(kind=SignalKind.ADS_ACTIVE, source="clay", value=3.0, detail="3 ads"),
    ]
    a.score = Score(fit=70.0, timing=60.0, total=65.0, band="A", rationale="strong")
    a.route = RouteDecision(recommended=Route.CLOSER, rationale="pain-qualified")
    return a


def test_upsert_then_candidates_roundtrip(session):
    repo.upsert_accounts(session, [_closer_account()])
    cands = repo.get_candidates(session)
    assert len(cands) == 1
    a = cands[0]
    assert a.domain == "buckeye.example"
    assert {s.kind for s in a.signals} == {SignalKind.SITE_QUALITY, SignalKind.ADS_ACTIVE}
    assert a.route.effective == Route.CLOSER


def test_upsert_is_idempotent_by_domain(session):
    repo.upsert_accounts(session, [_closer_account()])
    repo.upsert_accounts(session, [_closer_account()])  # same domain again
    assert len(repo.get_candidates(session)) == 1
```

- [ ] **Step 3: Run it to verify it fails**

Run: `python3 -m pytest tests/test_db_repo.py -v`
Expected: FAIL — `AttributeError: module 'engine.db.repo' has no attribute 'upsert_accounts'`

- [ ] **Step 4: Implement `engine/db/repo.py`** (conversion + upsert + the read used by the test)

```python
"""
Repository: the only module that turns engine dataclasses into rows and back.
Keeps SQL out of the jobs. Upsert dedupes by domain (re-ingesting the same Clay
pull updates, never duplicates) and preserves push state so a re-ingest can't
un-push a claimed firm.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from engine.db.models import AccountRow, SignalRow
from engine.models import (
    Account, Signal, SignalKind, Vertical, Score, RouteDecision, Route, Stage,
)


def _row_from_account(a: Account) -> AccountRow:
    row = AccountRow(
        domain=a.domain, name=a.name, vertical=a.vertical.value, city=a.city,
        state=a.state, linkedin_url=a.linkedin_url, discovered_by=a.discovered_by,
        extra=a.extra or {}, stage=a.stage.value, hubspot_id=a.hubspot_id,
        pushed=a.stage == Stage.PUSHED,
    )
    if a.score:
        row.fit = a.score.fit
        row.timing = a.score.timing
        row.total = a.score.total
        row.band = a.score.band
        row.score_rationale = a.score.rationale
    if a.route:
        row.route_recommended = a.route.recommended.value
        row.route_rationale = a.route.rationale
        row.route_confirmed = a.route.confirmed
        row.route_confirmed_route = (
            a.route.confirmed_route.value if a.route.confirmed_route else None
        )
        row.route_confirmed_by = a.route.confirmed_by
    row.signals = [
        SignalRow(kind=s.kind.value, source=s.source, value=s.value, detail=s.detail)
        for s in a.signals
    ]
    return row


def _account_from_row(row: AccountRow) -> Account:
    a = Account(
        name=row.name, domain=row.domain, vertical=Vertical(row.vertical),
        linkedin_url=row.linkedin_url, city=row.city, state=row.state,
        extra=row.extra or {}, discovered_by=row.discovered_by,
        stage=Stage(row.stage), hubspot_id=row.hubspot_id,
    )
    a.signals = [
        Signal(kind=SignalKind(s.kind), source=s.source, value=s.value, detail=s.detail)
        for s in row.signals
    ]
    a.score = Score(
        fit=row.fit, timing=row.timing, total=row.total, band=row.band,
        rationale=row.score_rationale,
    )
    a.route = RouteDecision(
        recommended=Route(row.route_recommended), rationale=row.route_rationale,
        confirmed=row.route_confirmed,
        confirmed_route=Route(row.route_confirmed_route) if row.route_confirmed_route else None,
        confirmed_by=row.route_confirmed_by,
    )
    return a


def upsert_accounts(session: Session, accounts: list[Account]) -> None:
    """Insert or replace by domain. Preserves pushed/hubspot_id so re-ingest never
    un-claims a firm already in HubSpot."""
    for a in accounts:
        existing = session.get(AccountRow, a.domain)
        new_row = _row_from_account(a)
        if existing is not None:
            new_row.pushed = existing.pushed or new_row.pushed
            new_row.hubspot_id = existing.hubspot_id or new_row.hubspot_id
            session.delete(existing)
            session.flush()
        session.add(new_row)
    session.commit()


def get_candidates(session: Session) -> list[Account]:
    """Net-new closer-bound unpushed firms — the triage queue. (The DB only ever
    holds net-new firms; ingest filters the book out before writing.)"""
    rows = session.query(AccountRow).filter(AccountRow.pushed.is_(False)).all()
    accounts = [_account_from_row(r) for r in rows]
    return [a for a in accounts if a.route and a.route.effective == Route.CLOSER]
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `python3 -m pytest tests/test_db_repo.py -v`
Expected: PASS (round-trip + idempotency tests green)

- [ ] **Step 6: Commit**

```bash
git add engine/db/repo.py tests/conftest.py tests/test_db_repo.py
git commit -m "feat(db): repo conversion + idempotent upsert + candidates query"
```

---

## Task 5: Repo — mark_pushed

**Files:**
- Modify: `engine/db/repo.py`
- Test: `tests/test_db_repo.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_db_repo.py`:

```python
def test_mark_pushed_drops_from_candidates(session):
    repo.upsert_accounts(session, [_closer_account()])
    repo.mark_pushed(session, "buckeye.example", "hs-123")
    assert repo.get_candidates(session) == []
    from engine.db.models import AccountRow
    row = session.get(AccountRow, "buckeye.example")
    assert row.pushed is True
    assert row.hubspot_id == "hs-123"
    assert row.stage == "pushed"
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python3 -m pytest tests/test_db_repo.py::test_mark_pushed_drops_from_candidates -v`
Expected: FAIL — `AttributeError: ... 'mark_pushed'`

- [ ] **Step 3: Implement `mark_pushed`** (append to `engine/db/repo.py`)

```python
def mark_pushed(session: Session, domain: str, hubspot_id: str) -> None:
    """Record the claim: the firm is in HubSpot, drop it from the triage queue."""
    row = session.get(AccountRow, domain)
    if row is not None:
        row.pushed = True
        row.hubspot_id = hubspot_id
        row.stage = Stage.PUSHED.value
        session.commit()
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `python3 -m pytest tests/test_db_repo.py -v`
Expected: PASS (all repo tests green)

- [ ] **Step 5: Commit**

```bash
git add engine/db/repo.py tests/test_db_repo.py
git commit -m "feat(db): mark_pushed drains the firm from the triage queue"
```

---

## Task 6: find_accounts accepts injected sources

**Files:**
- Modify: `engine/jobs/find_accounts.py`
- Test: `tests/test_find_accounts_sources.py` (create)

- [ ] **Step 1: Write the failing test**

`tests/test_find_accounts_sources.py`:

```python
from engine.jobs import find_accounts
from engine.sources.clay_payload import ClayPayloadSource


def test_run_uses_injected_source_not_registry():
    rows = [{"company": "Inj", "domain": "inj.example", "vertical": "industrial_b2b",
             "city": "Cleveland", "pagespeed_mobile": "30", "ads_active": "2"}]
    src = ClayPayloadSource(rows=rows)
    found = find_accounts.run(sources=[src])
    domains = {a.domain for a in found}
    assert domains == {"inj.example"}
    a = found[0]
    assert {s.kind.value for s in a.signals} >= {"site_quality", "ads_active"}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python3 -m pytest tests/test_find_accounts_sources.py -v`
Expected: FAIL — `run() got an unexpected keyword argument 'sources'`

- [ ] **Step 3: Modify `engine/jobs/find_accounts.py`**

Replace the `run` function body (keep the module docstring and imports) with:

```python
def run(sources: list | None = None) -> list[Account]:
    srcs = sources if sources is not None else registry.REGISTRY
    account_srcs = [s for s in srcs if s.provides_accounts]
    signal_srcs = [s for s in srcs if s.provides_signals]

    found: list[Account] = []
    for src in account_srcs:
        found.extend(src.discover())

    # Attach signals. Clay's score comes free; PageSpeed fallback fires only for
    # accounts still missing a site-quality signal (see PageSpeedSource.enrich).
    for account in found:
        for src in signal_srcs:
            account.signals.extend(src.enrich(account))

    # Layer in event-driven triggers (hiring, reviews) via the trigger-scanner skill
    triggers = trigger_scanner.scan(found)
    for account in found:
        account.signals.extend(triggers.get(account.domain, []))

    print(f"[ingest] {len(found)} accounts, "
          f"{sum(len(a.signals) for a in found)} signals")
    return found
```

- [ ] **Step 4: Run the test + full suite**

Run: `python3 -m pytest tests/test_find_accounts_sources.py -v && python3 -m pytest -q`
Expected: new test PASS; existing suite still green.

- [ ] **Step 5: Commit**

```bash
git add engine/jobs/find_accounts.py tests/test_find_accounts_sources.py
git commit -m "feat(jobs): find_accounts accepts injected sources (uploaded CSV drives run)"
```

---

## Task 7: FastAPI app skeleton — health + static + DB wiring

**Files:**
- Create: `web/server.py`
- Test: `tests/test_server.py`

- [ ] **Step 1: Extend conftest with an app/client fixture**

Append to `tests/conftest.py`:

```python
@pytest.fixture()
def client(session, monkeypatch):
    """TestClient whose DB dependency is the in-memory `session` fixture."""
    from fastapi.testclient import TestClient
    import web.server as server

    monkeypatch.setattr(server, "get_session", lambda: session, raising=False)
    server.app.dependency_overrides[server.db_session] = lambda: session
    c = TestClient(server.app)
    try:
        yield c
    finally:
        server.app.dependency_overrides.clear()
```

- [ ] **Step 2: Write the failing test**

`tests/test_server.py`:

```python
def test_health_ok(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
```

- [ ] **Step 3: Run it to verify it fails**

Run: `python3 -m pytest tests/test_server.py -v`
Expected: FAIL — `ModuleNotFoundError: web.server`

- [ ] **Step 4: Implement `web/server.py`** (skeleton: app, DB session dependency, health, static)

```python
"""
FastAPI app: the deployment that ingests a Clay pull, lets the operator triage
net-new closer-bound firms, and pushes them to HubSpot. State lives in Postgres
(SQLite locally). Serves the minimal triage UI at /.
"""

from __future__ import annotations

import os

from fastapi import Depends, FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from engine.db.base import make_engine, create_all, make_session_factory

app = FastAPI(title="Sixth City Pipeline Engine")

# One engine/session-factory per process, built at import from DATABASE_URL.
_engine = make_engine()
create_all(_engine)
_SessionLocal = make_session_factory(_engine)

WEB_DIR = os.path.dirname(__file__)


def db_session():
    """Request-scoped session. Overridden in tests."""
    s = _SessionLocal()
    try:
        yield s
    finally:
        s.close()


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/")
def index():
    return FileResponse(os.path.join(WEB_DIR, "triage.html"))


# Serve the Claude Design app + assets under /design (presentation-layer pass).
app.mount("/design", StaticFiles(directory=os.path.join(WEB_DIR, "design"), html=True),
          name="design")
```

Note: the `client` fixture references `server.db_session` (the FastAPI dependency) and a `get_session` attr; the dependency override on `db_session` is what the endpoints use. `get_session` is set defensively for any direct calls.

- [ ] **Step 5: Run the test to verify it passes**

Run: `python3 -m pytest tests/test_server.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add web/server.py tests/conftest.py tests/test_server.py
git commit -m "feat(web): FastAPI skeleton — health, DB session dependency, static mounts"
```

---

## Task 8: POST /api/ingest

**Files:**
- Modify: `web/server.py`
- Test: `tests/test_server.py`

- [ ] **Step 1: Write the failing test** (uses a CSV string; monkeypatches HubSpot to an empty book so everything is net-new)

Append to `tests/test_server.py`:

```python
import io

CSV = (
    "company,domain,vertical,city,pagespeed_mobile,ads_active\n"
    "Buckeye Industrial,buckeye.example,industrial_b2b,Cleveland,34,3\n"
    "Lakeshore Dental,lakeshore.example,healthcare,Toledo,61,\n"
)


def _empty_book(monkeypatch):
    import web.server as server
    monkeypatch.setattr(server.HubSpotClient, "filter_net_new",
                        lambda self, accounts: accounts)


def test_ingest_writes_net_new_and_reports_counts(client, monkeypatch):
    _empty_book(monkeypatch)
    r = client.post("/api/ingest",
                    files={"file": ("clay.csv", io.BytesIO(CSV.encode()), "text/csv")})
    assert r.status_code == 200
    body = r.json()
    assert body["ingested"] == 2
    assert body["closer_bound"] >= 1   # Buckeye has 2 signals -> closer
    assert body["dropped_not_net_new"] == 0


def test_ingest_rejects_csv_without_domain(client, monkeypatch):
    _empty_book(monkeypatch)
    bad = "company,city\nNoDomain,Cleveland\n"
    r = client.post("/api/ingest",
                    files={"file": ("bad.csv", io.BytesIO(bad.encode()), "text/csv")})
    assert r.status_code == 400
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python3 -m pytest tests/test_server.py -v`
Expected: FAIL — 404 (no `/api/ingest` route yet)

- [ ] **Step 3: Add the ingest endpoint to `web/server.py`**

Add these imports near the top:

```python
import csv as csvmod
import io

from fastapi import File, HTTPException, UploadFile

from engine.db import repo
from engine.hubspot.client import HubSpotClient
from engine.jobs import score_accounts, route_accounts
from engine.models import Route
from engine.sources.clay_payload import ClayPayloadSource
from engine.jobs import find_accounts
```

Add the endpoint:

```python
@app.post("/api/ingest")
async def ingest(file: UploadFile = File(...), session=Depends(db_session)):
    raw = (await file.read()).decode("utf-8")
    rows = list(csvmod.DictReader(io.StringIO(raw)))
    if not rows or "domain" not in rows[0]:
        raise HTTPException(status_code=400, detail="CSV must have a 'domain' column")

    src = ClayPayloadSource(rows=rows)
    discovered = find_accounts.run(sources=[src])
    scored = score_accounts.run(discovered)
    routed = route_accounts.run(scored, auto_confirm=False)

    client = HubSpotClient()
    net_new = client.filter_net_new(routed)
    repo.upsert_accounts(session, net_new)

    closer_bound = sum(1 for a in net_new if a.route and a.route.effective == Route.CLOSER)
    parked = sum(1 for a in net_new if a.route and a.route.effective == Route.NURTURE)
    return {
        "ingested": len(rows),
        "scored": len(scored),
        "closer_bound": closer_bound,
        "parked_nurture": parked,
        "dropped_not_net_new": len(routed) - len(net_new),
    }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `python3 -m pytest tests/test_server.py -v`
Expected: PASS (ingest counts + 400-on-bad-CSV green)

- [ ] **Step 5: Commit**

```bash
git add web/server.py tests/test_server.py
git commit -m "feat(web): POST /api/ingest — CSV -> score -> route -> net-new upsert"
```

---

## Task 9: GET /api/candidates

**Files:**
- Modify: `web/server.py`
- Test: `tests/test_server.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_server.py`:

```python
def test_candidates_lists_closer_bound_with_signals(client, monkeypatch):
    _empty_book(monkeypatch)
    client.post("/api/ingest",
                files={"file": ("clay.csv", io.BytesIO(CSV.encode()), "text/csv")})
    r = client.get("/api/candidates")
    assert r.status_code == 200
    cands = r.json()["candidates"]
    domains = {c["domain"] for c in cands}
    assert "buckeye.example" in domains          # 2 signals -> closer
    assert "lakeshore.example" not in domains     # 1 signal -> nurture, not a candidate
    buckeye = next(c for c in cands if c["domain"] == "buckeye.example")
    assert buckeye["signals"]                      # has signal details
    assert "outreach" in buckeye
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python3 -m pytest tests/test_server.py::test_candidates_lists_closer_bound_with_signals -v`
Expected: FAIL — 404

- [ ] **Step 3: Add the candidates endpoint to `web/server.py`**

Add import:

```python
from engine.modules import draft_cold_email
```

Add the endpoint:

```python
@app.get("/api/candidates")
def candidates(session=Depends(db_session)):
    out = []
    for a in repo.get_candidates(session):
        outreach = draft_cold_email.draft(a)
        out.append({
            "domain": a.domain,
            "name": a.name,
            "city": a.city,
            "vertical": a.vertical.value,
            "fit": a.score.fit if a.score else 0.0,
            "timing": a.score.timing if a.score else 0.0,
            "total": a.score.total if a.score else 0.0,
            "band": a.score.band if a.score else "R",
            "signals": [{"kind": s.kind.value, "detail": s.detail} for s in a.signals],
            "outreach": {"subject": outreach.subject, "body": outreach.body},
        })
    out.sort(key=lambda c: c["total"], reverse=True)
    return {"candidates": out, "count": len(out)}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `python3 -m pytest tests/test_server.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/server.py tests/test_server.py
git commit -m "feat(web): GET /api/candidates — triage queue with signals + outreach"
```

---

## Task 10: POST /api/push

**Files:**
- Modify: `web/server.py`
- Test: `tests/test_server.py`

- [ ] **Step 1: Write the failing test** (monkeypatch the whole push path so no network: empty book + a fake `push`)

Append to `tests/test_server.py`:

```python
def test_push_claims_selected_and_drops_them(client, monkeypatch):
    _empty_book(monkeypatch)
    import web.server as server
    # Fake the claim: return a deterministic id, no HubSpot call.
    monkeypatch.setattr(server.HubSpotClient, "push",
                        lambda self, account, outreach: f"hs-{account.domain}")
    # Scoreboard text is read from HubSpot; stub it to avoid a network call.
    monkeypatch.setattr("web.server.dashboard.build", lambda: "SCOREBOARD")

    client.post("/api/ingest",
                files={"file": ("clay.csv", io.BytesIO(CSV.encode()), "text/csv")})

    r = client.post("/api/push", json={"domains": ["buckeye.example"]})
    assert r.status_code == 200
    body = r.json()
    assert {p["domain"] for p in body["pushed"]} == {"buckeye.example"}
    assert body["pushed"][0]["hubspot_id"] == "hs-buckeye.example"
    assert body["scoreboard"] == "SCOREBOARD"

    # No longer a candidate after the claim.
    cands = client.get("/api/candidates").json()["candidates"]
    assert "buckeye.example" not in {c["domain"] for c in cands}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python3 -m pytest tests/test_server.py::test_push_claims_selected_and_drops_them -v`
Expected: FAIL — 404

- [ ] **Step 3: Add the push endpoint to `web/server.py`**

Add imports:

```python
from pydantic import BaseModel

from engine.attribution import dashboard
from engine.jobs import push_to_hubspot
from engine.models import Stage


class PushRequest(BaseModel):
    domains: list[str]
```

Add the endpoint:

```python
@app.post("/api/push")
def push(req: PushRequest, session=Depends(db_session)):
    selected = {a.domain: a for a in repo.get_candidates(session)
                if a.domain in set(req.domains)}
    # Confirm the HITL gate for the operator-selected firms, then run the push job
    # (which re-validates net-new by domain at claim time as the SLA guard).
    for a in selected.values():
        a.route.confirmed = True
        a.route.confirmed_by = "operator"

    pushed = push_to_hubspot.run(list(selected.values()))

    results = []
    for a in pushed:
        if a.hubspot_id and not a.hubspot_id.startswith("dry-"):
            repo.mark_pushed(session, a.domain, a.hubspot_id)
        results.append({"domain": a.domain, "hubspot_id": a.hubspot_id})

    return {"pushed": results, "count": len(results), "scoreboard": dashboard.build()}
```

- [ ] **Step 4: Run the test + full suite**

Run: `python3 -m pytest -q`
Expected: all green (existing 25 + new repo/server/find tests).

- [ ] **Step 5: Commit**

```bash
git add web/server.py tests/test_server.py
git commit -m "feat(web): POST /api/push — confirm selected, claim net-new, mark pushed"
```

---

## Task 11: Minimal triage UI

**Files:**
- Create: `web/triage.html`

This is intentionally unstyled — Claude Design is the presentation-layer pass. Goal: prove the loop works end to end in a browser.

- [ ] **Step 1: Create `web/triage.html`**

```html
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Pipeline Engine — Ignite</title>
  <style>
    body { font: 14px system-ui, sans-serif; margin: 2rem; max-width: 1000px; }
    table { border-collapse: collapse; width: 100%; margin-top: 1rem; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
    button { padding: 8px 14px; cursor: pointer; }
    .muted { color: #666; }
    pre { white-space: pre-wrap; background: #f6f6f6; padding: 1rem; }
  </style>
</head>
<body>
  <h1>Pipeline Engine — Ignite</h1>

  <h2>1. Ingest a Clay export</h2>
  <input type="file" id="csv" accept=".csv" />
  <button onclick="ingest()">Ingest</button>
  <p id="ingestResult" class="muted"></p>

  <h2>2. Triage net-new closer-bound firms</h2>
  <button onclick="loadCandidates()">Refresh candidates</button>
  <button onclick="toggleAll()">Select all</button>
  <button onclick="pushSelected()">Push selected to HubSpot</button>
  <table id="candTable"><thead><tr>
    <th></th><th>Domain</th><th>Name</th><th>City</th><th>Vertical</th>
    <th>Fit</th><th>Timing</th><th>Signals</th>
  </tr></thead><tbody></tbody></table>

  <h2>3. Result</h2>
  <pre id="pushResult"></pre>

<script>
async function ingest() {
  const f = document.getElementById('csv').files[0];
  if (!f) { alert('Pick a CSV first'); return; }
  const fd = new FormData(); fd.append('file', f);
  const r = await fetch('/api/ingest', { method: 'POST', body: fd });
  const j = await r.json();
  document.getElementById('ingestResult').textContent =
    r.ok ? JSON.stringify(j) : ('Error: ' + (j.detail || r.status));
  if (r.ok) loadCandidates();
}

async function loadCandidates() {
  const r = await fetch('/api/candidates');
  const { candidates } = await r.json();
  const tb = document.querySelector('#candTable tbody');
  tb.innerHTML = '';
  for (const c of candidates) {
    const tr = document.createElement('tr');
    const sigs = c.signals.map(s => s.kind + ': ' + s.detail).join('<br>');
    tr.innerHTML =
      `<td><input type="checkbox" class="pick" value="${c.domain}"></td>` +
      `<td>${c.domain}</td><td>${c.name}</td><td>${c.city}</td><td>${c.vertical}</td>` +
      `<td>${c.fit.toFixed(0)}</td><td>${c.timing.toFixed(0)}</td><td>${sigs}</td>`;
    tb.appendChild(tr);
  }
}

function toggleAll() {
  const boxes = document.querySelectorAll('.pick');
  const allOn = [...boxes].every(b => b.checked);
  boxes.forEach(b => b.checked = !allOn);
}

async function pushSelected() {
  const domains = [...document.querySelectorAll('.pick:checked')].map(b => b.value);
  if (!domains.length) { alert('Select at least one firm'); return; }
  const r = await fetch('/api/push', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domains })
  });
  const j = await r.json();
  document.getElementById('pushResult').textContent = JSON.stringify(j, null, 2);
  loadCandidates();
}
</script>
</body>
</html>
```

- [ ] **Step 2: Manual smoke test locally**

Run: `DATABASE_URL=sqlite:///pipeline_dev.db HUBSPOT_TOKEN= uvicorn web.server:app --port 8080`
Then open `http://localhost:8080`, upload `tests/fixtures/clay_sample.csv`, click Ingest → Select all → Push.
Expected: candidates table populates; push result shows `dry-…` ids (no token = dry mode); pushed firms drop from the table.

- [ ] **Step 3: Commit**

```bash
git add web/triage.html
git commit -m "feat(web): minimal functional triage UI (Claude Design polish is a later pass)"
```

---

## Task 12: Deploy to Railway

**Files:** none (infra)

- [ ] **Step 1: Provision Postgres**

In the Railway `sixth-city-os` project, add the Postgres plugin (dashboard: New → Database → PostgreSQL). Railway auto-injects `DATABASE_URL` into the `sixth-city-os` service.

Verify the var is present (value masked):
Run: `railway variables 2>&1 | grep -i database_url | sed -E 's/=.*/=<set>/'`
Expected: `DATABASE_URL=<set>` (or shown in the variables table).

- [ ] **Step 2: Clear/replace the dashboard start command**

In the service Settings → Deploy, clear any custom start command so the `Procfile` (`uvicorn web.server:app …`) is authoritative. Confirm `HUBSPOT_TOKEN` is still set.

- [ ] **Step 3: Open a PR and merge to main** (auto-deploys), or deploy the branch directly

This work stacks on `data-backed-vertical-scoring` (it needs `HubSpotClient`). Open a PR for the DB-Ignite work; on merge, Railway auto-deploys main. (Do NOT push to main directly.)

- [ ] **Step 4: Verify the live deploy**

Run: `curl -s -o /dev/null -w "%{http_code}\n" https://sixth-city-os-production.up.railway.app/api/health`
Expected: `200`

Then open the URL in a browser, upload a real Clay export, triage, and push. Confirm in HubSpot that the selected net-new firms were created with `machine_sourced=true`.

- [ ] **Step 5: No commit** (infra task)

---

## Self-Review

**Spec coverage:**
- Railway Postgres system of record → Tasks 2–3, 12. ✓
- Clay-pull seed/ingest → Task 8. ✓
- FastAPI ingest/candidates/push/health + static → Tasks 7–10. ✓
- Minimal triage UI (select-all → push) → Task 11. ✓
- `find_accounts(sources=)` refactor → Task 6. ✓
- Net-new filter at ingest + re-validate at push → Task 8 (`filter_net_new`) + Task 10 (`push_to_hubspot.run` re-checks). ✓
- DB = working queue, HubSpot = scoreboard → push reads `dashboard.build()` (HubSpot-sourced); DB never stores attribution. ✓
- Procfile start command in repo → Task 1. ✓
- Error handling: bad CSV 400 (Task 8), no token → dry-run ids not marked pushed (Task 10), no DATABASE_URL in prod → raise (Task 2 `resolve_url`). ✓
- SQLite for tests → Task 4 conftest. ✓

**Type consistency:** `Account`, `Signal`, `Score`, `RouteDecision`, `Route`, `Stage`, `Vertical`, `SignalKind` used exactly as defined in `engine/models.py`. `HubSpotClient.push(account, outreach)`, `filter_net_new(accounts)`, `dashboard.build()`, `draft_cold_email.draft(account)`, `route_accounts.run(scored, auto_confirm=False)`, `score_accounts.run(accounts)` all match the real signatures read from source.

**Placeholder scan:** No TBD/TODO; every code step shows complete code; commands have expected output.
