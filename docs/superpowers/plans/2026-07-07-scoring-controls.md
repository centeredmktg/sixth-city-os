# Scoring Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (built inline this session). Steps use checkbox (`- [ ]`) tracking; TDD per task.

**Goal:** A team-adjustable "Scoring" console screen whose sliders persist a shared rubric and re-score every saved account.

**Architecture:** Levers become a `ScoringConfig` dataclass (defaults = today's constants). A module-level active config keeps scoring pure/DB-free; the web/job layer loads/saves it. Persist as a JSON row in a generic `settings` table. Live preview + save re-score reuse the real scoring logic via a preview/rescore endpoint. Spec: `docs/superpowers/specs/2026-07-07-scoring-controls-design.md`.

**Tech Stack:** FastAPI + SQLAlchemy, no-build React (`web/console`), pytest (hermetic, `DRY_RUN=1`).

## Global Constraints

- NEVER push `main`. Branch → PR → merge → Railway auto-deploys. Never `railway up`.
- `DRY_RUN=1` for any local server/test. Suite must stay green (`python -m pytest -q`).
- Product framing LOCKED: team-facing only, no rev-share/attribution language in UI.
- Default `ScoringConfig` MUST reproduce today's scores exactly (regression gate).

---

### Task 1: `ScoringConfig` dataclass + validation + active-config accessors

**Files:** Create `engine/scoring/config.py`; Test `tests/test_scoring_config.py`.
**Interfaces produced:** `ScoringConfig` (fields per spec); `.timing_weight` prop;
`.validate() -> list[str]`; `.to_dict()/.from_dict(d)`; `get_active_config()`,
`set_active_config(cfg)`, `DEFAULT_CONFIG`.

- [ ] Test first: defaults validate clean; unordered bands / fit_weight>1 /
  staffed<proximity / radius≤0 / wrong vertical-key set each yield a non-empty error list;
  `from_dict(to_dict(c)) == c`; `set/get_active_config` round-trips; `timing_weight == 1 - fit_weight`.
- [ ] Implement. Vertical defaults copied verbatim from current `VERTICAL_FIT_BONUS`
  (keyed by `Vertical.value`). `validate()` is the single source of truth for both API and UI.
- [ ] Run `DRY_RUN=1 python -m pytest tests/test_scoring_config.py -v` → green. Commit.

---

### Task 2: `abcr.score` reads config (default = active)

**Files:** Modify `engine/scoring/abcr.py`; Modify `tests/test_scoring.py`.
**Interfaces:** `score(account, config: ScoringConfig | None = None)`; internal `_fit`,
`_timing`, `_band` take the config. Old module constants → deleted (defaults live on `ScoringConfig`).

- [ ] Test first: with the **default** config, `score()` reproduces current numbers for a
  known account (regression — copy an existing expected total, or assert unchanged before/after).
  Then: a config with `fit_weight=0.8` raises a high-fit/low-timing account's total vs
  default; a config with `band_a=90` demotes a 78-total account from A→B; a config raising
  `vertical_fit_bonus[real_estate]` lifts a real-estate account's fit.
- [ ] Implement: read `config.fit_weight/timing_weight`, `config.band_a/b/c`,
  `config.vertical_fit_bonus.get(account.vertical.value, 10)`; pass `config` into the
  `geo.proximity_weight`/`nearest_staffed_hub` calls (Task 3). Call sites unchanged (default kicks in).
- [ ] Run scoring + full suite → green. Commit.

---

### Task 3: `geo.proximity_weight` / `nearest_staffed_hub` read config

**Files:** Modify `engine/geo.py`; Modify `tests/test_geo.py`.
**Interfaces:** `proximity_weight(account, config=None)`, `nearest_staffed_hub(account, config=None)`
read `config.proximity_boost / staffed_proximity_boost / radius_miles`; `_nearest_hub` takes a radius.
`PROXIMITY_BOOST`/`STAFFED_PROXIMITY_BOOST`/`RADIUS_MILES` remain as module-level default aliases
(referenced by the `test_geo` unittest suite and the `ScoringConfig` defaults).

- [ ] Test first: a config with `staffed_proximity_boost=1.50` yields a bigger boost than
  default at a staffed hub; a config with `radius_miles=10` makes a 25mi account neutral
  (was boosted). Default path = current behavior (existing tests unchanged).
- [ ] Implement (keep the >2×radius non-overlap reasoning; radius now a param).
- [ ] Run `tests/test_geo.py` + full suite → green. Commit.

---

### Task 4: `settings` table + `settings_repo` + migration

**Files:** Modify `engine/db/models.py` (`SettingRow`); Create `engine/db/settings_repo.py`,
`engine/db/migrate_add_settings.py`; Test `tests/test_settings_repo.py`.
**Interfaces:** `SettingRow(key PK, value JSON)`; `load_scoring_config(session) -> ScoringConfig`
(no row → `DEFAULT_CONFIG`), `save_scoring_config(session, cfg)`.

- [ ] Test first (mirror `tests/test_db_repo.py` in-memory SQLite): save→load round-trip;
  load with empty table → defaults.
- [ ] Implement. `value` uses SQLAlchemy `JSON` type (works on SQLite + Postgres). Migration
  is idempotent `CREATE TABLE IF NOT EXISTS settings (key VARCHAR PRIMARY KEY, value JSON)`.
- [ ] Run → green. Commit.

> Prod note (deploy PR): run `python -m engine.db.migrate_add_settings` against Railway Postgres.

---

### Task 5: `rescore_all` job

**Files:** Create `engine/jobs/rescore.py`; Test `tests/test_rescore.py`.
**Interfaces:** `rescore_all(session, config: ScoringConfig) -> int` — re-scores every
`AccountRow` via `_account_from_row` + `abcr.score(account, config)`, writes score back, returns count.

- [ ] Test first: seed 2 accounts, `rescore_all` with a config that changes bands → returns 2
  and the persisted scores reflect the new config.
- [ ] Implement (reuse `repo._account_from_row` / the score-write path already in `repo.upsert`).
- [ ] Run → green. Commit.

---

### Task 6: API — GET / PUT / preview + startup load

**Files:** Modify `web/server.py`; Test `tests/test_server.py`.
**Interfaces:** `GET /api/scoring-config` → `{config, defaults}`; `PUT /api/scoring-config`
(full config) → validate → 400{errors} | save+set_active+rescore → `{saved, rescored, bands}`;
`POST /api/scoring-config/preview` → validate → in-memory rescore (no persist) → `{bands, total}`.
On startup, `set_active_config(load_scoring_config(session))`.

- [ ] Test first (TestClient): GET returns defaults when unset; PUT bad config → 400 with
  errors and NO re-score; PUT good config → `saved:true`, `rescored:N`, `bands` present, and
  a subsequent GET returns the saved values; preview returns `bands` and leaves the DB row
  unchanged (assert load == pre-preview).
- [ ] Implement. `bands` = A/B/C/R counts over accounts. Guard: preview/PUT re-score is pure,
  but wrap DB writes so a bad row can't 500 the endpoint.
- [ ] Run `tests/test_server.py` + full suite → green. Commit.

---

### Task 7: Front-end — "Scoring" screen + nav item

**Files:** Create `web/console/app/scoring.jsx`; Modify `web/console/app/app.jsx` (NAV + render branch);
Verify via Playwright on a `DRY_RUN=1` server.
**Interfaces:** `PE.ScoringScreen` reads `/api/scoring-config`, renders grouped controls
(Balance · Bands · Geography · Verticals), a live band-distribution bar fed by a debounced
`POST /api/scoring-config/preview`, Save (`PUT`) → "re-scored N", Reset-to-defaults.

- [ ] Implement the screen (client mirrors `validate()` for instant feedback; server authoritative).
- [ ] Add nav item `{id:"scoring", label:"Scoring"}` + `view === "scoring"` branch in `app.jsx`.
- [ ] Verify (Playwright): nav → screen renders; drag a slider → preview bar changes; Save →
  "re-scored N" toast; grep server log for `[DRY]` only. Commit.

---

## Self-Review

- **Coverage:** config model+validate (T1) · scoring reads config (T2,T3) · persistence (T4) ·
  re-score (T5) · GET/PUT/preview+startup (T6) · screen+nav+live preview (T7). All spec sections mapped.
- **Regression gate:** default config reproduces today's scores — asserted in T2/T3.
- **Type consistency:** `ScoringConfig`, `get/set_active_config`, `load/save_scoring_config`,
  `rescore_all(session, config)`, endpoint shapes are named identically across tasks.

## Deploy items (for the merge/deploy, not the build)
- Run `python -m engine.db.migrate_add_settings` against Railway Postgres with the deploy.
