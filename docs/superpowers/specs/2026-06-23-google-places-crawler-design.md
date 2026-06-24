# Google Places Crawler — Design

**Date:** 2026-06-23
**Status:** Approved (brainstorming) → ready for implementation plan
**Depends on:** PR #28 (contact-enrichment) merged — extends `enrich_contacts` for phone priority.

## Problem

Sales has no phone/address to work with for net-new accounts. The site crawler
(`site_audit`) already gives email + a sometimes-present phone, but local SMBs reliably
expose their main line and address on their **Google Business Profile (GBP)**, not always
their website. Google location data is *also* a buying signal: a weak/absent GBP is exactly
the gap Sixth City sells against (`SignalKind.LOCAL_SEO_GAP`).

## Goal

Add a `GooglePlacesSource` that, for a **pre-scored slice** of accounts:
1. Finds the company's Google listing and extracts **phone + address** (contact data).
2. Emits a **`LOCAL_SEO_GAP`** signal from the listing snapshot (feeds re-scoring).

## Non-goals (deferred)

- **True `REVIEW_VELOCITY`** — needs cross-run persistence (store counts, re-read, diff).
  A single snapshot cannot honestly measure a trend. Separate later build.
- **`NEW_LOCATION`** detection — also needs time-series.
- Decision-maker *names* — that stays Apollo's job (paid, Pursue-gated).

## Decisions (locked in brainstorming)

1. **When it runs — pre-scored slice.** Free sources (`site_audit`, `pagespeed`) enrich +
   score first; Places fires only on the top-N by score. Keeps the local signal in scoring
   while paying for hundreds, not ~50k. (Run-on-everything ≈ $735–980/mo — rejected.)
2. **Scope — contact + `LOCAL_SEO_GAP` only.** No faked velocity from a count snapshot.
3. **Second pass — dedicated, flag-gated.** Add a `places_enriched` boolean to `AccountRow`
   (mirrors the existing `enriched` flag) + a Places enrich pass selecting
   `enriched=True & places_enriched=False`, top-N by score. Faithful to "score *then* Places."

## Architecture

### `engine/sources/google_places.py` — `GooglePlacesSource(DataSource)`
- `provides_signals = True`, `provides_accounts = False`. Mirrors `site_audit.py`.
- `enrich(account)`:
  1. **Match** → `_find_place_id(account)`: Places **Text Search** with FieldMask `places.id`
     only (the free "IDs Only" SKU). Query = `f"{name} {city} {state}"`.
  2. **Details** → `_place_details(place_id)`: one Place Details call, FieldMask =
     `nationalPhoneNumber, formattedAddress, rating, userRatingCount, websiteUri,
     businessStatus, displayName` (Enterprise + Atmosphere tier — first 1k/mo free).
  3. **Match guard** (`_match_ok`): compare the listing's `websiteUri` host (or name) to the
     account's domain/name. **No confident match → treat as "no listing found"**, attach no
     contact data, emit a strong `LOCAL_SEO_GAP`. Never attach a stranger's phone.
  4. Stash contact into `account.extra`: `places_phone`, `places_address`,
     `places_rating`, `places_review_count`, `places_website`.
  5. Return `[Signal(LOCAL_SEO_GAP, ...)]` per the thresholds below (or `[]` if the GBP is
     strong — good listing, healthy reviews).
- **Dry mode:** no `GOOGLE_PLACES_KEY` → return `[]`, zero API calls (like Apollo/HubSpot).

### Signal strength — honest snapshot thresholds (tunable constants)
- **No confident match** → `LOCAL_SEO_GAP` strong.
- **`review_count` < `_REVIEW_FLOOR`** (e.g. 10) → medium.
- **`rating` < `_RATING_FLOOR`** (e.g. 4.0) or **no `websiteUri` on the GBP** → low/additive.
- Strong GBP (good rating, healthy review count, website linked) → no signal.

### Phone priority — extends `enrich_contacts` (from PR #28)
GBP phone is the canonical main line for a local SMB. `contact_phone` prefers
`extra["places_phone"]`, falls back to site-scraped `extra["site_phones"]`. Small, tested
change to the existing function. (Address: surface `places_address` as a new contact field.)

### Second pass — `places_enriched` flag + pass
- **Schema:** add `places_enriched: bool = False` to `AccountRow` (migration mirrors the
  existing `enriched` column / `migrate_add_contacts.py` precedent).
- **Pass:** select `pushed=False, enriched=True, places_enriched=False`, `order_by(total.desc())`,
  `limit=N`; run `sources=[GooglePlacesSource()]`; re-score; set `places_enriched=True`.
  Reuses the existing `enrich.run(...)` machinery (it already takes a `sources=` subset and
  re-scores) — parameterize the row filter rather than duplicating the job.

## Data flow

```
Clay CSV (50k) -> find_accounts
  -> enrich pass 1 (site_audit + pagespeed, FREE) -> re-score        [existing]
  -> enrich pass 2 (GooglePlacesSource, top-N by score, PAID)        [new]
       -> places_phone/address into extra + LOCAL_SEO_GAP signal -> re-score
  -> route -> push (writes contact incl. places_phone to HubSpot)    [PR #28]
```

## Cost (verified against Google pricing, 2026-06)

- Text Search (IDs-only FieldMask) = **free, unlimited**.
- Place Details (Enterprise + Atmosphere) = **first 1,000/mo free**, then ~$25/1k (volume-discounted).
- At the slice scale (hundreds/mo): **$0**. 2k/mo ≈ $25. Confirm the actual billed SKU in the
  Cloud billing breakdown after first calls; field-mask down to the cheapest tier that returns
  phone + rating + review count.

## Testing (TDD)

Pure / mocked, no live API:
- `_match_ok`: accepts matching domain, **rejects a wrong-domain listing** (the key guard).
- Signal thresholds: no-match → strong; low review count → medium; strong GBP → no signal.
- `extra` stash: phone/address/rating/review_count populated from a mocked Details payload.
- Dry mode: no key → `[]`, zero calls.
- `enrich_contacts` phone priority: `places_phone` wins over `site_phones`; falls back when absent.
- HTTP mocked in the style of `test_hubspot_contact_write.py` / `test_pagespeed.py`.

## Open follow-ons (not this build)
- True `REVIEW_VELOCITY` via cross-run snapshot persistence.
- `NEW_LOCATION` trigger.
- Tune the second-pass slice size `N` against real cost/signal once live.
