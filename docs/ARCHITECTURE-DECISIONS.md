# Architecture Decisions

Short records of *why* the engine is shaped the way it is. Read this before
"improving" something — the reasoning is here, not just in commit messages.

---

## ADR-001 — Clay does discovery; the engine owns scoring, routing, attribution

**Date:** 2026-06-08
**Status:** Accepted

**Context.** The first scaffold drew the engine as the full loop, including a
native PageSpeed "spine" and a Google Places discovery source. Danny pointed out
he already has a Clay POC, and Clay does the entire find → enrich → score →
personalize → push loop natively — with PageSpeed as a *free* enrichment (Google
auth). Rebuilding any of that in code is motion, not momentum.

**Decision.** Clay owns **discovery + free enrichment** (domain, LinkedIn,
PageSpeed score). The engine owns the parts nothing off-the-shelf does:
**scoring, routing (timing-first + HITL), and the attribution scoreboard.**

**Consequences.**
- Native discovery removed (`places.py` deleted).
- In-house PageSpeed (`pagespeed.py`) demoted from spine to **fallback** — fires
  only for domains arriving without a score (the "run any list" feature). Kept
  because it's free (REST, not an LLM → no token tax) and useful for non-Clay lists.
- The "site quality" signal is source-agnostic: the scorer treats a Clay-supplied
  score and a fallback-fetched score identically.

---

## ADR-002 — CSV ignition, not a Clay integration

**Date:** 2026-06-08
**Status:** Accepted

**Context.** A Clay pull is ~50k rows *per vertical*. Across Sixth City's five
verticals that's ~250k accounts — years of TAM from a single export. Clay is a
one-time (or occasional) ignition source, not something the engine runs *on*.

**Decision.** The only Clay→engine handoff is a **CSV/JSON export the engine
ingests** (`ClayPayloadSource(csv_path=...)`). No Clay API, no webhook, no live
coupling. You could delete the Clay account the day after export; the engine is
unaffected.

**Consequences.**
- Zero vendor lock-in to Clay — reinforces the "Sixth City owns the machine" thesis.
- Ingestion is source-agnostic: any CSV of the right shape works, not just Clay's.

---

## ADR-003 — Engine owns the TAM + worked-state; HubSpot owns the active subset (OPEN)

**Date:** 2026-06-08
**Status:** Proposed — decide once HubSpot access is in hand

**Context.** With ~250k finite accounts, the engine is a *throughput* machine, not
an acquisition one. The bottleneck is **state**: which accounts are evaluated,
scored, worked, nurtured, rejected, and when to re-touch. You can't push 250k into
HubSpot without wrecking the CRM.

**Leaning.** The engine keeps its own store (the full TAM + each account's
worked-state). HubSpot receives only the **active subset** pushed into sequences,
plus the machine-sourced flag and the attribution scoreboard.

**Open questions for tomorrow.**
- Engine store: Postgres/Supabase (DATABASE_URL is already stubbed in config)?
- Re-evaluation cadence — do we re-score over time, or treat the export as static?
- The daily closer job becomes "surface the top-N *unworked* accounts," not "find new."

---

## ADR-004 — Office hubs as geo anchors; owned geo-scrape discovery (PARTIAL)

**Date:** 2026-06-08
**Status:** Part A accepted (proximity scoring); Part B proposed (geo-scrape source)

**Context.** Sixth City has six offices — unstaffed local-SEO ranking addresses.
They're more than addresses: they're the geographic centers where Sixth City ranks
and has local credibility, so a prospect near a hub is higher-fit and higher-close.
This is an OWNED targeting thesis Clay (generic firmographic) can't sell anyone.

**Part A — Proximity scoring weight. ACCEPTED, built 2026-06-08.**
- `engine/geo.py`: office hubs + haversine distance + `proximity_weight()`.
- Wired into `abcr.score()` as a capped multiplier (≤ PROXIMITY_BOOST).
- Degrades to neutral (1.0) until the real hub list + boost are filled in (TODOs
  in geo.py — Danny's domain calls: the six locations and how hard proximity counts).

**Part B — Validated Google-locations radius scrape. PROPOSED, not built.**
- A LinkedIn skill Danny saw does a validated scrape of Google locations within a
  radius for specific business-type queries. Anchored to the hubs, this becomes an
  OWNED discovery layer — geo-targeted, defensible — that supplements or eventually
  replaces Clay-as-seed.
- NOT built speculatively: Danny must surface the skill; validated scraping carries
  ToS / rate-limit / result-validation complexity that deserves a deliberate build.
- When built, it feeds the same `Account` shape (with lat/lon in `extra`), so the
  proximity weight already light up — the geo layer was built to receive it.
