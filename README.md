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

| Step | Module | Existing Centered skill behind it |
|---|---|---|
| Find | `engine/jobs/find_accounts.py`, `engine/sources/` | `trigger-scanner`, `intel` |
| Score | `engine/scoring/abcr.py` | `lead-scoring-abcr` |
| Push | `engine/jobs/push_to_hubspot.py`, `engine/modules/` | `draft-cold-email`, `csv-lead-enrichment` |
| Route | (HubSpot sequences) | `handle-replies`, `champ-meeting-qualifier` |
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

## Build order (from SOURCES.md)

1. **HubSpot access re-grant** — nothing ships without the scoreboard.
2. **PageSpeed/Lighthouse** — the spine; automates the "free website evaluation".
3. **Google Places** — discovery default for local SMB.
4. Then ads-transparency + Ohio SOS filings (free) before paying for SEMrush/Apollo.

## Open decision for Danny

`engine/scoring/abcr.py` — the fit/timing weighting + A/B/C/R cutoffs decide what
the closer works first. Defaults are in place; tune against real close data.
