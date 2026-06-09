# Data Sources — To-Find Scorecard

Living doc. Pick sources deliberately instead of buying the first list someone pitches.
Score each on **cost · coverage (NE Ohio + verticals) · API quality · have-key-yet**.
Status: `🔲 to-evaluate` · `🟡 testing` · `🟢 wired` · `⛔ rejected`.

The spine of the whole engine is the **website evaluation** (PageSpeed/Lighthouse).
It's the one source that does triple duty: finds who's hurting, scores them, and
writes the personalized outreach reason. Prioritize getting that one solid first.

---

## Layer 1 — Firmographic / list-building (find net-new accounts)

| Source | Provides | Cost | NE-OH + vertical coverage | Status | Notes |
|---|---|---|---|---|---|
| Google Places API | local businesses by keyword+geo | $ per call, generous free tier | strong on local SMB | 🔲 | best fit for home-services/legal/healthcare local SMB; the natural default |
| Apollo.io | B2B contacts + firmographics | $$ seat-based | strong B2B, thinner on hyperlocal | 🔲 | good for industrial/B2B + contact-level; has export API |
| People Data Labs | firmographic enrichment | $$ per record | broad | 🔲 | enrichment more than discovery |
| Ohio SOS new-business filings | newly registered businesses | free (public) | OH-only, all verticals | 🔲 | pure trigger source — brand-new = needs everything |

## Layer 2 — Buying signal: site quality ⭐ (the spine)

| Source | Provides | Cost | Coverage | Status | Notes |
|---|---|---|---|---|---|
| Google PageSpeed / Lighthouse API | core-web-vitals score per domain | free, rate-limited | any public site | 🔲 | **build this first** — IS the "free website evaluation" automated |
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
