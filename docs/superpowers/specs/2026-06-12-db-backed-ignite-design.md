# Spec: DB-backed Ignite — the deployed engine pushes to HubSpot

**Date:** 2026-06-12
**Status:** Approved (design), pending implementation plan
**Repo:** `pipeline-engine/` (own git history)

## Context

Today the Railway deployment (`sixth-city-os` service) is a **static file server**
for `web/design` — a custom start command set in the Railway dashboard. The Python
engine (`HubSpotClient`, scoring, routing) is batch/CLI code that only runs when
invoked locally from a Claude Code session. `run.py` orchestrates
`find → score → route → push`, but `ClayPayloadSource()` is registered with no
`csv_path`, so it runs on stub `SAMPLE_ROWS`.

The owner wants the **deployed version to perform the HubSpot push itself** — no
local/session involvement. The motive is concrete: getting net-new firms into
HubSpot quickly **claims first-touch credit** for the 5% rev-share scoreboard
(`machine_sourced` flag + `machine_sourced_date` = provable dibs). Speed to claim
is in the operator's financial interest, so the triage gate must protect against
mis-claims without becoming friction.

`config.py` already reserves `database_url` and `google_places_key` slots and a
`dry_run` property. The 6 office hubs in `geo.py` are real and multi-state
(Cleveland, Columbus, Pittsburgh, Indianapolis, Chicago, Nashville).

## Goal

Stand up a DB-backed web service on Railway that ingests a Clay pull, scores and
routes it, lets the operator review net-new closer-bound firms, and pushes the
confirmed set into HubSpot — all from the deployment, with state that survives
redeploy.

## Scope

**In (Phase 1):**
- Railway Postgres as the system of record for the pipeline working queue.
- A `seed`/ingest path that loads a Clay pull (CSV) into the DB.
- FastAPI app: ingest, candidates (triage), push, health; serves `web/design`.
- Minimal functional triage UI (upload → candidates table → select-all → push).
- Version-controlled start command (`Procfile`) replacing the dashboard command.

**Out (Phase 2, separate spec):**
- Google Places ICP scraper / continuous drip (a new `DataSource` + Railway cron).
- Polished Claude Design integration of the triage UI (this pass is logic only;
  Claude Design is the presentation-layer pass and needs working functionality to
  ideate against).
- Live AI-citation / ads-transparency signal scrapers.

## Architecture

State is decoupled through the DB. Ingest **writes** the queue; triage **reads**
it; push **drains** it.

```
POST /api/ingest (Clay CSV)
   → ingest → score → route(confirmed=False)
   → filter_net_new (drop firms already in John's HubSpot book)
   → UPSERT only net-new accounts/signals to DB
                                                      │
GET /api/candidates  ← closer-bound, unpushed rows ──┘
   → triage table (signals + outreach reason + score)
POST /api/push {domains[]}
   → push() RE-VALIDATES net-new in HubSpot → claims + mark pushed/hubspot_id in DB
   → returns scoreboard (read from HubSpot machine_sourced=true)
```

Net-new filtering happens at **ingest** (so the DB never stores the protected
5,234-company book) and push **re-validates** at claim time (so a firm added to
the book between ingest and push can never be wrongly claimed). Everything is keyed
on `domain` — the same key as the HubSpot net-new gate, so dedupe is consistent
end to end.

## Division of authority (load-bearing)

- **DB = the working pipeline queue.** Discovered → scored → routed → pushed
  state. Both feeders (Clay seed now, Places drip later) upsert here.
- **HubSpot = system of record for claimed firms + the attribution scoreboard.**
  `client.attribution_rows` (Search `machine_sourced=true`) stays the single
  source for rev-share. The DB never becomes a second source of truth for
  attribution.

## Components

- **`engine/db/`**
  - SQLAlchemy models mirroring the dataclasses:
    - `accounts`: `domain` (UNIQUE), `name`, `vertical`, `city`, `linkedin_url`,
      `discovered_by`, `extra` (JSON), `hubspot_id`, `stage`, `machine_sourced`,
      `machine_sourced_date`, `pushed_at`, plus route columns (`route_recommended`,
      `route_effective`, `route_confirmed`, `fit`, `timing`).
    - `signals`: FK to account `domain`, `kind`, `source`, `value`, `detail`,
      `observed_at`.
  - Engine from `DATABASE_URL`. **SQLite fallback** when the URL is a sqlite DSN
    (local + tests); Postgres in prod. Same code path.
- **Repository layer** (`engine/db/repo.py`): `upsert_accounts(accounts)`
  (dedupe by `domain`; re-ingesting the same pull updates, never duplicates),
  `get_candidates()` (net-new closer-bound unpushed), `mark_pushed(domain,
  hubspot_id)`. Keeps SQL out of the jobs.
- **`web/server.py`** (FastAPI):
  - `GET /` + static mount → `web/design/`.
  - `POST /api/ingest` (multipart CSV) → `ClayPayloadSource(rows=...)` →
    score → route(`auto_confirm=False`) → `upsert_accounts` → returns
    `{ingested, scored, closer_bound, parked_nurture, dropped_not_net_new}`.
  - `GET /api/candidates` → `get_candidates()` serialized (domain, name, city,
    vertical, fit, timing, signals[], outreach reason).
  - `POST /api/push` (`{domains[]}`) → load those candidates → `push_to_hubspot`
    → `mark_pushed` → returns `{pushed[], scoreboard}`.
  - `GET /api/health` → 200 (also resolves the bogus `FAILED` deploy status from
    the missing healthcheck path).
- **`find_accounts.run(sources=None)`** — small refactor to accept injected
  sources so the uploaded CSV drives the run instead of the global stub registry.
  Nothing downstream changes.
- **Schema init** — `Base.metadata.create_all(engine)` on startup (idempotent).
  Alembic deferred until the schema churns (YAGNI for v1).

## Minimal triage UI

A functional panel (not styled to Claude Design yet):
1. File picker → "Ingest" → POST `/api/ingest`, show counts.
2. Candidates table: domain, name, signals, outreach reason, fit/timing, with a
   checkbox per row and a **select-all**.
3. "Push N to HubSpot" → POST `/api/push` → show pushed result + scoreboard.

Select-all + one-click push keeps claiming fast (the credit motive). The gate is
review-then-confirm, but confirming a whole batch is one action.

## Deploy

- **`Procfile`** in repo: `web: uvicorn web.server:app --host 0.0.0.0 --port $PORT`.
  Update the Railway dashboard start command to match (or clear it so Procfile
  wins). This moves the start command into version control — the explicit ask.
- `requirements.txt` adds: `fastapi`, `uvicorn[standard]`, `python-multipart`,
  `sqlalchemy`, `psycopg[binary]`.
- Provision the **Railway Postgres plugin** in project `sixth-city-os` →
  `DATABASE_URL` auto-injected into the service. `HUBSPOT_TOKEN` already set.

## Error handling

- Bad/missing `domain` column in the CSV → `400` with a specific message.
- No `HUBSPOT_TOKEN` → push returns a clearly-labeled **dry-run** result (never a
  silent no-op); ingest/triage still work.
- No `DATABASE_URL` in prod → refuse to boot with a clear error (don't silently
  fall back to ephemeral storage in prod).
- HubSpot errors mid-push → per-domain success/failure; keep the firms that
  pushed, report the ones that failed.

## Testing

- SQLite in-memory for all tests (no infra).
- `POST /api/ingest` upserts rows; re-ingesting the same CSV is idempotent (no
  dupes by domain).
- `GET /api/candidates` returns only net-new, closer-bound, unpushed firms.
- `POST /api/push` with a monkeypatched `HubSpotClient` pushes only selected
  domains, marks them pushed, returns the scoreboard.
- Existing 22 tests stay green; the `find_accounts(sources=...)` refactor covered.

## Risks / notes

- **In-memory → DB migration of state** removes the redeploy-fragility from the
  earlier CSV-in-memory design. Good.
- **Push re-validates net-new by domain at push time** regardless of DB state, so
  stale rows can never claim an existing-book record. The SLA guard does not
  depend on the DB.
- **Phase 2 dependency to flag now:** Places-discovered firms only get
  `site_quality` natively (`ads_active` is a Clay/Adyntel enrichment). Their 2nd
  signal must come from `SeoGapSource`/`PublicSignalsSource`, which are still
  stubs — so Places firms will park in nurture until a 2nd live non-Clay signal
  exists. Phase 2 must account for this, plus a Places API call-cap guardrail.

## Phase 2 preview (not in this spec)

Google Places ICP drip: a new `DataSource` that walks the 6 hub metros × verticals,
extracts website/name/address, upserts net-new into the DB, runs signal sources;
driven by a Railway cron. Own spec → plan → build cycle.
