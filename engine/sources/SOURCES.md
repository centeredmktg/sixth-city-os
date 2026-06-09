# Data Sources — To-Find Scorecard

Living doc. Pick sources deliberately instead of buying the first list someone pitches.
Score each on **cost · coverage (NE Ohio + verticals) · API quality · have-key-yet**.
Status: `🔲 to-evaluate` · `🟡 testing` · `🟢 wired` · `⛔ rejected`.

**Architecture (settled 2026-06-08):** discovery lives in **Clay**, not in the engine.
Clay finds ~50k firms matching ICP and enriches them for FREE — domain, LinkedIn URL,
and a PageSpeed score (via Google auth). The engine ingests that rich payload and owns
**scoring, routing, and the attribution scoreboard** — the parts nothing off-the-shelf does.

In-house PageSpeed (`pagespeed.py`) is a **fallback**, not the spine: it evaluates
domains that arrive WITHOUT a Clay score (the "run any list through the machine"
feature). No token tax — it's a REST call, not an LLM.

---

## Layer 1 — Firmographic / list-building (find net-new accounts) → **CLAY**

Clay is the funnel. It does discovery + free enrichment; the engine ingests its export.

| Source | Provides | Cost | Coverage | Status | Notes |
|---|---|---|---|---|---|
| **Clay** | domain + LinkedIn + PageSpeed score, ~50k firms by ICP | credits for firmographic pull; PageSpeed enrich FREE (Google auth) | strong, ICP-targetable | 🟡 | **the funnel.** Danny has a POC. Export = engine's primary input |
| Apollo / PDL / Places | (available *inside* Clay as providers) | — | — | — | reach these via Clay, not as separate engine sources |
| Ohio SOS new-business filings | newly registered businesses | free (public) | OH-only | 🔲 | trigger source; could feed Clay or the engine directly |

## Layer 2 — Buying signal: site quality (comes free from Clay)

| Source | Provides | Cost | Coverage | Status | Notes |
|---|---|---|---|---|---|
| **Clay PageSpeed enrichment** | mobile perf score per domain | FREE w/ Google auth | any public site | 🟡 | primary — arrives in the export, no engine call |
| In-house `pagespeed.py` | mobile perf score per domain | free, rate-limited | any public site | 🟢 | **fallback** for non-Clay lists; built + tested |
| BuiltWith / Wappalyzer | tech stack per domain | $$ / freemium | any public site | 🔲 | detects no-GA, old CMS, no ad pixels = neglect signals |

## Layer 3 — Buying signal: SEO / ads gap

| Source | Provides | Cost | Coverage | Status | Notes |
|---|---|---|---|---|---|
| SEMrush / Ahrefs API | organic visibility, keyword gaps | $$$ | any domain | 🔲 | low visibility = SEO need; pricey, evaluate ROI |
| Google Ads Transparency Center | is this business already running ads? | free | any advertiser | 🔲 | already-spending = budget exists = warmer |

## Layer 4 — Trigger events (timing)

| Source | Provides | Cost | Coverage | Status | Notes |
|---|---|---|---|---|---|
| Job boards (Indeed/LinkedIn scrape) | "hiring marketing" postings | free-ish | broad | 🔲 | hiring marketing = in-market trigger |
| Google Reviews API | review velocity / new locations | free, rate-limited | local | 🔲 | spikes = growth = capacity to spend |

## Layer 5 — System of record (NOT optional)

| Source | Provides | Cost | Coverage | Status | Notes |
|---|---|---|---|---|---|
| HubSpot Pro API | the book of record + machine-sourced flag | included (their seat) | — | 🔲 | **BUILD STEP ONE: re-grant Danny access.** Dedupe net-new against this; write the scoreboard flag here |

---

## Decision order
1. **HubSpot access** — nothing ships without the scoreboard.
2. **PageSpeed/Lighthouse** — the spine; cheap, high-signal, productizes their lead magnet.
3. **Google Places** — the discovery default for local SMB.
4. Then layer in ads-transparency + SOS filings (both free) before paying for SEMrush/Apollo.
