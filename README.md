# Sixth City — Pipeline Engine

Always-on prospecting machine that hands Sixth City's closer a prioritized queue
of net-new accounts every morning — built, scored, and dropped into HubSpot with
tailored outreach, no list-buying, no hand-building.

This is the build for the signed engagement (`../docs/2026-06-02-sixth-city-pipeline-engine-design.md`).
Right now it's a **runnable stub**: the whole loop walks end-to-end on fake data
so the contracts are locked before any source or API is wired.

## The loop

```
find_accounts  ->  score_accounts  ->  push_to_hubspot  ->  attribution dashboard
  (sources)         (ABCR)              (HubSpot + copy)      (the scoreboard)
```

**Discovery lives in Clay, not here.** Clay finds ~50k ICP firms and enriches them
free (domain + LinkedIn + PageSpeed score). The engine ingests that and owns the
parts nothing off-the-shelf does: scoring, routing, attribution.

| Step | Module | Notes |
|---|---|---|
| Ingest | `engine/jobs/find_accounts.py`, `engine/sources/clay_payload.py` | reads Clay's free payload; `pagespeed.py` = fallback for non-Clay lists |
| Score | `engine/scoring/abcr.py` | `lead-scoring-abcr` — timing-weighted |
| Route | `engine/jobs/route_accounts.py`, `engine/routing.py` | timing-first + HITL gate |
| Push | `engine/jobs/push_to_hubspot.py`, `engine/modules/` | `draft-cold-email` (the only token step — gated to closer-bound), `csv-lead-enrichment` |
| Scoreboard | `engine/attribution/dashboard.py` | **net-new build** — the trust layer |

## Run it

```bash
cd pipeline-engine
python run.py          # dry mode: walks the loop, writes nothing real
```

## What's stub vs real

- **Real now:** the data contracts (`models.py`), the loop wiring, the rev-share
  math in the dashboard (5% × 12-mo per-client tail, $500 credited floor), the
  source/HubSpot interfaces.
- **Stubbed:** every external call (returns fake-but-shaped data), the module
  adapters (templated, not yet calling the real skills).
- **To find:** the data sources — see `engine/sources/SOURCES.md`.

## Build order

1. **HubSpot access re-grant** (tomorrow) — nothing ships without the scoreboard.
2. **Clay export → ingest** — wire `clay_payload.py` to a real Clay CSV/JSON export.
3. **Scoreboard against real HubSpot** — the net-new owned piece.
4. In-house `pagespeed.py` fallback already built + tested for arbitrary lists.

## Open decision for Danny

`engine/scoring/abcr.py` — the fit/timing weighting + A/B/C/R cutoffs decide what
the closer works first. Defaults are in place; tune against real close data.
