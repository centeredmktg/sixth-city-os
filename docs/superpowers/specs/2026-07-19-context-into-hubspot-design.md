# Context into HubSpot — Design Spec

**Date:** 2026-07-19
**Origin:** John's demo/usage video — *"I pushed [a company] in… but there's no context associated with it in HubSpot."* The engine's assessment (score, why-now, route) lives only in the console app; John's team works in HubSpot and sees a bare record.
**Status:** Approved design, pre-plan.

---

## 1. Problem

Every claimed company lands in HubSpot with only `name`, `domain`, the engine-sourced stamp, `engine_status`, and an owner. The *why* — the ABCR score, the band, the "why now" signals, the route — exists **only** on the console's Accounts detail screen. John's team lives in HubSpot, so to understand why a company matters they must leave HubSpot and open the app. The record looks empty in the tool they actually use.

## 2. Goal

Write the engine's assessment onto the HubSpot company record as **custom properties** so the team can (a) see the "why" without leaving HubSpot, (b) sort/filter/report against it, and (c) trust that HubSpot reflects the engine's current view. The engine is authoritative; HubSpot mirrors.

## 3. Non-goals

- **Not bidirectional.** HubSpot edits do not flow back to the engine.
- **Not auto-on-rescore.** A slider drag on the Scoring screen re-scores the whole book but does NOT auto-blast HubSpot; sync is a deliberate, operator-fired batch.
- **No structured per-signal flags.** `engine_why_now` is free text (readable, not filterable). Structured signal checkboxes are a later feature only if that reporting need proves real (YAGNI).
- **No fit/timing split.** Tight property set only (Danny's call).

## 4. The properties

Created in the existing `pipeline_engine` group via a guarded one-time script (mirrors `create_engine_status_property.py`). **Team-facing labels; zero rev-share / "credit" / "machine-sourced-scoreboard" language** (locked product-framing rule).

| Property (name) | Label | Type / fieldType | Notes |
|---|---|---|---|
| `engine_score` | Engine Score | number | 0–100 composite (`Score.total`), rounded int. Sortable. |
| `engine_band` | Engine Priority Band | enumeration / select | options A / B / C / R. Filterable. |
| `engine_route` | Engine Route | enumeration / select | options closer / nurture / hold / reject. |
| `engine_why_now` | Why Now | string / textarea (multi-line) | Readable summary of the firing signals' `.detail` text. |
| `engine_last_synced` | Engine Last Synced | date | Freshness of the above. |

## 5. Single-source mapping — `engine/modules/hubspot_context.py`

One pure, tested function is the *only* place the account→property mapping lives (so app and HubSpot can never diverge in logic):

```
context_properties(account) -> dict
```
- `engine_score` = `round(account.score.total)` if scored else `0`
- `engine_band` = `account.score.band` if scored else `"R"`
- `engine_route` = `account.route.effective.value` if routed else `"hold"`
- `engine_why_now` = the firing signals' `.detail` strings, joined readably (e.g. `"Mobile site scores 45/100 …; Running 3 live paid ads …"`), capped to a sane length (e.g. top 4 signals / ~500 chars); empty string if no signals.
- `engine_last_synced` = today's date (ISO) — stamped at write time.

Returns a dict keyed by the HubSpot property names above.

## 6. Write at claim/promote (immediate)

`HubSpotClient.claim_company` and `promote_to_working` fold `context_properties(account)` into their create payload, so a company gets context the instant it enters HubSpot. (Both are the existing create sites; the context keys are added alongside `machine_sourced`/`engine_status`.)

**Avoid immediate-dirty churn:** the *claim job* (`claim.py`) and the *promote flow* (`/api/push`) already have the row + session, so after a successful write they also store the row's `context_hash` (alongside `claimed`/`claimed_at` / `pushed`). A freshly-claimed row therefore matches its stored hash and is NOT re-pushed by the next sync run. (The pure client methods stay session-free; hash storage lives in the job/endpoint that owns the row, mirroring how `claimed`/`pushed` are already set there.)

## 7. Dirty-tracking + the sync job (the "keep in sync" engine)

### 7.1 Dirty flag
- New `AccountRow.context_hash` (String, nullable; additive migration `migrate_add_context_hash`, registered in `auto_migrate._MIGRATIONS`).
- The sync computes `context_properties(account)`, hashes the stable subset (score/band/route/why_now — **excluding** `engine_last_synced`, which changes every run and would make everything perpetually dirty), and compares to the stored `context_hash`. Differs → the row is **dirty**.

### 7.2 The job — `engine/jobs/sync_hubspot_context.py`
```
run(session, limit=None, client=None) -> {"synced": int, "remaining": int|None, "error": str|None}
```
- Selects **claimed** rows (`claimed is True` AND `hubspot_id` present) whose current context hash ≠ stored `context_hash`.
- For each: `client.update_context(hubspot_id, context_properties(account))` → PATCH `/crm/v3/objects/companies/{id}`; on success store the new hash + set `engine_last_synced`.
- **Chunked (100), per-chunk commit, paced (`_PACE_SEC`), per-firm failure isolation** — mirrors `engine/jobs/claim.py` exactly (resumable; one firm's failure never aborts the batch).
- **Only claimed (our) companies** — never touches non-claimed rows or John's pre-existing book.

### 7.3 Client method
`HubSpotClient.update_context(company_id, props) -> bool` — `_patch` the properties; dry-mode returns without writing; degrades (returns False) on error rather than raising.

## 8. API + UI

- `POST /api/sync-context?limit=` — runs the job (idempotent manual/cron drain), mirrors `/api/claim`.
- `GET /api/sync-context/pending -> {"pending": N}` — the count of dirty claimed rows (claimed, has `hubspot_id`, current hash ≠ stored). Backs the button's badge.
- A **"Sync to HubSpot (N pending)"** button on the Scoring screen (next to the Ownership control — the existing team-settings surface), calling the POST. Deliberate, operator-fired.

## 9. Backfill

After the properties exist, all 4,318 already-claimed rows have `context_hash = NULL` → all read dirty → the first `run` pushes context to the whole book (~4,300 PATCHes, ~30–45 min, resumable, executed via `railway run` like the claim drain).

## 10. Boundaries / error handling

- One-way, engine-authoritative; HubSpot edits ignored.
- Dry mode (`DRY_RUN=1`) writes nothing; failures degrade (job isolates per-firm, `update_context` returns False).
- Sync only ever PATCHes companies we claimed (have `claimed=True` + our `hubspot_id`); the SLA guard (never touch John's book) holds because we only address our own record ids.

## 11. Testing (TDD, hermetic — `DRY_RUN=1`)

- `context_properties`: scored/routed/with-signals → correct dict; unscored/unrouted/no-signals → safe defaults; `why_now` join + cap.
- Hash dirty-detection: unchanged context → not dirty; changed score/band/route/why_now → dirty; `last_synced` change alone → NOT dirty.
- Sync job: selects only dirty **claimed** rows (skips unclaimed, skips in-book); PATCHes; stores new hash + last_synced; resumable (2nd run no-op); per-firm failure isolation; owner/SLA — never addresses a non-claimed row.
- `update_context`: dry → no write; success → True; error → False.
- claim/promote payloads include the `engine_*` context keys.
- After a successful claim, the row's `context_hash` is stored → a freshly-claimed row is NOT re-pushed by the next sync run (no immediate-dirty churn).

## 12. Delivery / rollout

One branch, TDD, one PR; merge auto-deploys. Additive migration self-applies via `auto_migrate`. The `engine_*` properties are a **guarded manual script** (`create_context_properties.py`, `--run`, not auto-run). Post-merge rollout: create properties → confirm deploy → `railway run` the sync backfill over the 4,318 → the "Sync to HubSpot" button covers ongoing drift.
