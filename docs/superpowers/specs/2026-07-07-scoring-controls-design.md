# Scoring Controls — Team-Adjustable Rubric — Design

**Date:** 2026-07-07
**Backlog item:** #6 (tune the scoring levers) — reframed as a **self-serve** tuning
screen rather than a data-calibration exercise.
**Status:** approved (Danny, 2026-07-07). Build this session.

## Problem

The ABCR scoring levers (fit/timing balance, band cutoffs, proximity boosts, per-vertical
fit bonuses) are hardcoded module constants in `engine/scoring/abcr.py` and `engine/geo.py`.
Only a developer can change them, and a change requires a deploy. The Sixth City team
wants to tune their own rubric: adjust the levers in the console and have the change
actually re-score the accounts already in the system.

## What the team can adjust (Danny's call: core + vertical bonuses)

| Lever | Today | Control |
|---|---|---|
| Fit vs Timing balance | fit 0.4 / timing 0.6 | one slider (complementary, sum = 1.0) |
| Band cutoffs A / B / C | 75 / 55 / 35 | three numbers, must stay ordered A>B>C, 0–100 |
| Proximity boost | 1.12 | number ≥ 1.0 |
| Staffed-hub boost | 1.20 | number ≥ proximity boost |
| Hub radius (miles) | 50 | number > 0 |
| Vertical fit bonuses | 10 values (Industrial 16 … Retail 2) | 10 numbers, 0–40 |

Per-signal timing weights are **out of scope** (dense + easy to misconfigure).

## Architecture

### `ScoringConfig` — the levers as data (`engine/scoring/config.py`, new)

A frozen dataclass holding every lever, **with the current constants as defaults** so an
un-configured system behaves exactly as today:

```
@dataclass(frozen=True)
class ScoringConfig:
    fit_weight: float = 0.4                    # timing_weight is 1 - fit_weight
    band_a: float = 75.0
    band_b: float = 55.0
    band_c: float = 35.0
    proximity_boost: float = 1.12
    staffed_proximity_boost: float = 1.20
    radius_miles: float = 50.0
    vertical_fit_bonus: dict[str, float] = <the 10 current values, keyed by Vertical.value>

    @property
    def timing_weight(self) -> float: return 1.0 - self.fit_weight
    def validate(self) -> list[str]: ...       # returns human-readable errors, empty = ok
    def to_dict(self)/from_dict(cls, d): ...    # JSON round-trip for persistence + API
```

`validate()` enforces: `0 ≤ fit_weight ≤ 1`; `100 ≥ band_a > band_b > band_c ≥ 0`;
`proximity_boost ≥ 1.0`; `staffed_proximity_boost ≥ proximity_boost`; `radius_miles > 0`;
each vertical bonus in `[0, 40]`; the 10 vertical keys exactly match `Vertical` (minus/plus
none). Validation lives here so both the API and tests use one source of truth.

### Active-config indirection (keeps scoring pure + DB-free)

Module-level active config, mirroring how `geo.OFFICE_HUBS` is a swappable module global:

```
_active = ScoringConfig()                       # defaults
def get_active_config() -> ScoringConfig: return _active
def set_active_config(cfg: ScoringConfig): global _active; _active = cfg
```

Scoring reads `get_active_config()`; it never touches the DB. The **web/job layer** owns
persistence: on app startup it loads the saved config from the DB and calls
`set_active_config`; after a save it persists + `set_active_config` + re-scores. Tests set
the active config directly. Default `_active` = the constants → **every existing scoring
test passes unchanged.**

### Scoring reads the config

- `abcr.score(account, config=None)` → `config = config or get_active_config()`.
  `_fit`, `_timing` band logic, and the rationale all read `config.*` instead of module
  constants. Call sites (`enrich.py`, `enrich_places.py`, `score_accounts.py`) are
  unchanged — the default kicks in.
- `geo.proximity_weight(account, config=None)` and `geo.nearest_staffed_hub(account,
  config=None)` read `config.proximity_boost / staffed_proximity_boost / radius_miles`.
  `abcr.score` passes its config through to the geo calls.
- The old module constants (`FIT_WEIGHT`, `PROXIMITY_BOOST`, …) become the dataclass
  field defaults; any lingering references are repointed at `ScoringConfig()` defaults.

### Persistence — a generic single-row settings table

`SettingRow(key: str [PK], value: JSON)` (`engine/db/models.py`), key `"scoring_config"`,
value = `ScoringConfig.to_dict()`. JSON blob (not typed columns) so future levers need no
migration. `engine/db/settings_repo.py`: `load_scoring_config(session) -> ScoringConfig`
(row present → `from_dict`; absent → defaults) and `save_scoring_config(session, cfg)`.
Migration `engine/db/migrate_add_settings.py` (idempotent `CREATE TABLE IF NOT EXISTS`).

### Re-score

`engine/jobs/rescore.py::rescore_all(session, config) -> int` — loads every `AccountRow`,
rebuilds the `Account` (with signals, via the existing `_account_from_row`), re-runs
`abcr.score(account, config)`, writes the new score back, returns the count. Pure CPU (no
network) — fast for a few thousand rows.

### API (`web/server.py`)

- `GET /api/scoring-config` → `{ "config": <saved or defaults>, "defaults": <constants> }`
  (defaults let the UI offer "Reset to defaults").
- `PUT /api/scoring-config` (body = full config) → `validate()`; on error → 400 with the
  messages; on ok → save + `set_active_config` + `rescore_all` → returns
  `{ "saved": true, "rescored": N, "bands": {"A":..,"B":..,"C":..,"R":..} }`.
- `POST /api/scoring-config/preview` (body = candidate config) → validate → **in-memory**
  re-score of all accounts with the candidate config, **no persistence** → returns
  `{ "bands": {...}, "total": N }`. This is the live preview; it reuses the real scoring
  logic (never re-implements scoring in JS).

### Front-end — new "Scoring" screen + nav item

- `web/console/app/scoring.jsx` (`PE.ScoringScreen`): sliders/number inputs for every
  lever, grouped (Balance · Bands · Geography · Verticals). A live **band-distribution**
  bar (A/B/C/R counts) that refreshes from `/api/scoring-config/preview` (debounced ~250ms)
  as levers move — the before-you-save impact. **Save** calls `PUT`, then surfaces
  "re-scored N accounts" and the queue/triage/accounts re-rank on next load. **Reset to
  defaults** repopulates from the `defaults` payload (still requires Save to apply).
- `app.jsx`: add `{ id: "scoring", label: "Scoring", … }` to `NAV` and a
  `view === "scoring"` render branch. Team-facing framing only (no rev-share language).
- Client mirrors `validate()` for instant feedback, but the server is authoritative.

## Testing (hermetic)

- `ScoringConfig.validate`: rejects unordered bands, fit_weight out of range,
  staffed < proximity, radius ≤ 0, wrong vertical key set; accepts the defaults.
- `to_dict`/`from_dict` round-trip (incl. the vertical dict).
- `abcr.score` honors a passed config: raising `fit_weight` moves a high-fit/low-timing
  account up; changing a band cutoff changes the band; a raised vertical bonus lifts that
  vertical. Default-config path reproduces today's numbers (regression).
- `geo.proximity_weight`/`nearest_staffed_hub` honor a config's boosts/radius.
- `settings_repo`: save→load round-trip; load with no row → defaults.
- `rescore_all`: writes new scores to all rows; returns the count.
- API: GET returns config+defaults; PUT with a bad config → 400 + messages, no re-score;
  PUT ok → saved + rescored count + bands; preview returns bands without persisting
  (verify the DB row is unchanged after a preview).
- Front-end: Playwright — nav item renders the screen; moving a slider updates the preview
  bar; Save shows the re-scored count. (No pytest for the no-build React.)

## Out of scope

- Per-signal timing weights.
- Per-user rubrics (this is one shared, team-wide config).
- Historical/data-driven auto-calibration (the original #6 framing) — this screen makes
  manual tuning first-class; data calibration can inform the values later.
- Config version history / audit trail.
