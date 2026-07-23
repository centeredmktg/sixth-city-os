# Contact Waterfall + Triage Affordance — Design

**Date:** 2026-07-23
**Status:** Approved (design), pending implementation plan
**Branch:** `feat/contact-waterfall`

## Problem

Pursuing a company today (`POST /api/pursue`) calls Apollo and only Apollo. Apollo's
coverage is thin for SMB/local firms — most decision-makers come back
`email_status: unavailable`. When Apollo returns nothing usable, the operator is stuck:
the company is worth chasing but there's no person and no channel surfaced. Meanwhile the
engine already scrapes domain inboxes and a general phone during enrichment, and a Google
Places phone/address is one call away — but none of that feeds the pursue flow. And the
Triage Board, where the routing decision is made, has no contact-finding affordance at
all: the only "Pursue" button lives on Accounts detail.

## Goals

1. Turn `/api/pursue` into a **multi-thread merge** — Apollo people **and** free scraped
   role inboxes, always, with a Google Places phone as a last-resort company channel.
2. Make scraped domain inboxes **first-class sendable contacts** (the SMB unlock: role
   inboxes are read by owners/office managers, not black-holed like at enterprise).
3. When no sendable contact exists but a phone was found, **surface the phone as the
   primary action** — a call can beat an email for SMB.
4. Add a **"Find contacts" affordance to the Triage Board** so the operator can confirm a
   reachable contact exists *before* committing the route — without duplicating the
   compose/send UI that already lives in Morning Queue.

## Non-Goals

- No compose/send UI on Triage (stays in Morning Queue; shared `data.jsx` functions, no
  logic fork).
- No phone-only "contact" rows in the compose queue — phones are a company-level channel,
  not a Message target (the send loop is email-only / native Gmail).
- No new paid data sources. Apollo (Danny's account) + free site-scrape + Places (first
  1k Details/mo free) only.
- No schema migration — `ContactRow.source` already exists; company channel data rides on
  the existing JSON `account.extra`.

## Decisions (locked in brainstorming)

- **Multi-thread merge, not pure waterfall.** The free scrape always runs and merges in
  alongside Apollo; only the *phone* tier (Places) is gated on "no phone found yet."
- **Contacts = identities** (Apollo people + scraped role inboxes); sendability is a
  per-contact property (an emailless Apollo person is a kept identity but not yet
  composable). Phones are **never** contacts — they are company-level context — **except**
  a phone is promoted to the primary CTA when there is no sendable contact at all.
- **Triage affordance = discovery + surface only.** Compose/send stays in Morning Queue.

## Architecture

New orchestration module + a thin Places helper; the endpoint gets simpler.

### `engine/modules/contact_waterfall.py` (new)

The merge logic, pure and testable. Collaborators are injected so tests use fakes — no
live HTTP in the unit path.

```
def pursue_company(
    account,                 # AccountRow (has domain, name, city, state, extra)
    apollo,                  # ApolloClient
    *,
    fetch=site_audit.fetch,  # (domain) -> (html, meta)
    places_lookup=google_places.lookup_contact,
) -> PursueResult
```

`PursueResult` (dataclass): `contacts: list[Contact]`, `general_phone: str|None`,
`general_address: str|None`, `phone_source: str` ∈ {"site", "places", "none"}.

Steps per pursued domain:

1. **Apollo** — `apollo.find_contacts(domain)`. People kept even when email is blank (a
   named person with title/LinkedIn is still worth showing; email may fill later).
2. **Site-scrape (always, free)** — prefer already-enriched
   `account.extra["site_emails"]` / `["site_phones"]` if populated; else one live
   `site_audit.fetch(domain)` → `extract_emails(html, domain)` + `extract_phones(html)`.
   The `fetch` is SSRF-guarded (reused — essential for untrusted domains). Each domain
   inbox becomes a `Contact(source="site_scrape")`.
3. **Places (phone fallback only)** — if no phone from scrape *and* Places is configured,
   `places_lookup(name, city, state, domain)` → `{phone, address}`. Skipped when a phone
   already exists or the key is unset (dry).

### `engine/sources/google_places.py` (extend)

Add a single-purpose contact fetcher that reuses the existing low-level helpers
(`find_place_id`, `place_details`, `_match_ok`) without touching `enrich()` (which mutates
the account and emits a gap Signal — a separate concern):

```
def lookup_contact(name, city, state, domain) -> {"phone": str, "address": str} | None
```

Returns `None` on dry mode, no match, wrong-domain match, or network error.

### `web/server.py` — `/api/pursue` (rework)

Calls `contact_waterfall.pursue_company` per domain instead of Apollo directly, then
`repo.store_contacts` (contacts) and writes the company channel onto `account.extra`.

## Merge & dedupe rules

- **Dedupe contacts by normalized email** (lowercased, trimmed).
- **On email collision, Apollo wins** — it carries name/title/LinkedIn; the scraped
  duplicate is dropped.
- **Emailless Apollo people are kept** (identity value; not yet composable).
- **Scraped inbox `Contact` shape:** `name` = title-cased local-part (`info@acme.com` →
  "Info"), `title` = "General inbox", `email` = the address, `source` = "site_scrape".
- **Compose greeting for scraped inboxes is neutral** ("Hi there") — no fabricated first
  name. `draft_cold_email.draft` already falls back to a neutral greeting when a contact
  has no usable first name; scraped-inbox contacts must hit that path (guard: treat a
  `site_scrape` contact / role-word name as having no first name).

## Company channel + promotion

- `account.extra["general_phone"]` = site phone → else Places phone → else absent.
- `account.extra["general_address"]` = Places address → else absent.
- `account.extra["phone_source"]` ∈ {"site", "places", "none"}.
- **Promotion:** when a company has zero sendable contacts but `general_phone` is set, the
  UI renders that phone as the card's primary CTA ("Call (216) 555-…").

## API (no new routes, no migration)

- `POST /api/pursue` — response superset (backward-compatible):
  `{pursued: [{domain, contacts_found, contacts:[…], general_phone, general_address,
  phone_source}], apollo_configured}`.
- `GET /api/contacts?domain=` — returns `contacts` plus the `general_phone` /
  `general_address` / `phone_source` block, so the UI needs one call.

## Triage affordance (`web/console/app/triage.jsx`)

- Per-card **"Find contacts"** button → shared `data.jsx` `pursueDomains([domain])`
  (exists). Spinner while running.
- Result renders a **compact strip** under the route toggle:
  - Sendable contacts as `name · title` (or `Info · General inbox` for scraped rows).
  - When phone-only, a **Call chip** as the primary action.
  - Empty result → a quiet "No contact found" line.
- No compose UI on Triage. `data.jsx` `pursueDomains`/`fetchContacts` gain the
  `general_phone`/`address`/`phone_source` fields (shared with Morning Queue, no fork).

## Error handling / degradation

Every tier degrades independently; the endpoint never raises to the UI.

- Apollo dry (no key) → skip people, continue.
- `site_audit.fetch` failure or SSRF block → skip inboxes, continue.
- Places dry / no match / network error → skip phone, continue.
- Fully dry stack → `{contacts: [], general_phone: null, phone_source: "none"}` cleanly.

## Testing (TDD, hermetic)

Unit (`tests/`):
- Merge/dedupe: Apollo+scrape same email → Apollo wins; emailless Apollo kept; scraped
  inbox labeling (`info@` → "Info"/"General inbox"); phone fallback site→places; all-dry
  → empty result.
- `lookup_contact`: dry mode → None; wrong-domain match → None; good match → phone/address.
- Endpoint `/api/pursue`: merged response shape; phone promotion (dry Apollo + fake html
  with a phone, no inbox → `general_phone` set, `contacts` empty). All collaborators
  monkeypatched — no live Apollo/Places/HTTP. `conftest` forces `DRY_RUN=1`.

UI: verified live in a scratchpad sqlite (seeded net-new company), per the established
no-build-React verification pattern — never against prod.

## Rollout

- No migration; ships behind no flag (pursue is already operator-gated + Apollo-gated).
- Prod stays safe: dry without `APOLLO_API_KEY` / `GOOGLE_PLACES_KEY`; SSRF guard on
  fetch; `DRY_RUN=1` locally.
- Standard path: branch → PR → merge to `main` → Railway auto-deploy.
