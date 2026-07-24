# "Log the Call" Deep-Link — Design

**Date:** 2026-07-24
**Status:** Approved (design), pending implementation
**Branch:** `feat/log-call-deeplink`

## Problem

The Triage "Find contacts" strip surfaces a company phone (site-scrape → else Places) as a
`tel:` "Call" chip when there's no sendable contact. Tapping it dials, but **nothing is
logged to HubSpot** — so a rep's call effort is invisible on the record.

The Calls Engagements API scope (`crm.objects.calls.write`) was probed and *is* granted, so
one-click programmatic logging is possible. But Danny's call: a **deep-link** to the record
is the better design — reps are SSO'd into HubSpot as themselves, so a call they log on the
record is **automatically attributed to them** (no email→owner mapping), and they capture
the real disposition/notes/duration in HubSpot's native composer (honest, not a bare
one-click "call happened"). Cost: one extra step (land on record → Log activity → Call).

## Goal

Beside the `tel:` Call chip, add a **"Log the Call →"** link to the HubSpot record so the
rep logs the call themselves (SSO-attributed).

## The link target rule (Danny)

**"Log the Call" points to whoever owns the number:**
- A **contact's own** number → that **contact's** record.
- A **general company** number → the **company** page.

`hubspot_links.record_url(contact_hubspot_id, company_hubspot_id)` already encodes this
precedence (contact id if present, else company id, else `None`).

### Today's data reality (important — determines what actually renders)

- The `Contact` model has **no phone field** (Apollo person-level direct-dial is deferred;
  scraped/Places numbers are the company's general line). So **every phone the engine
  surfaces today is a general company number** → it resolves to the **company** record.
- On the Triage stream, Apollo contacts are not pushed to HubSpot (no contact HubSpot id),
  so even a future contact-phone would fall back to the company until contacts are synced.
- **Net effect now:** the link target is the **company record** (`a.hubspot_url`, already
  serialized on every candidate via `record_url(company_hubspot_id=a.hubspot_id)`).
- **Forward path (no rework):** when a per-contact direct-dial phone lands, render its
  "Log the Call" against that contact's `record_url(contact_hubspot_id=…)`. Structured for
  it; not built now (YAGNI — no contact phones exist yet).

## Scope

**Frontend only** (`web/console/app/triage.jsx`). No backend, no endpoint, no migration, no
new data — `a.hubspot_url` is already on the row.

- In the Call-chip branch of the "Find contacts" strip, render `Call {phone}` (the
  existing `tel:` chip) **plus** a `Log the Call →` anchor to `a.hubspot_url`, opening a new
  tab (`target="_blank" rel="noopener"`).
- **Degrade:** if `a.hubspot_url` is absent (company not yet claimed to HubSpot → no record
  to log against), render the `tel:` chip **without** the log link. Never a dead link.

## Non-Goals

- No programmatic API call-logging (the granted `calls.write` scope stays unused here; it
  remains available for a future in-app one-click logger if ever wanted).
- No per-contact call affordance (no contact phones exist yet).
- No change to the sendable-contact branch (those are email targets; email logs via the
  existing Gmail-BCC path).

## Testing

Frontend, no-build React (Babel-in-browser), so verified the established way:
1. **Babel transform** of `triage.jsx` (headless `@babel/standalone`) — syntax gate; a JS
   error blanks the whole screen.
2. **Live smoke** on a scratchpad sqlite (`DRY_RUN=1`, never prod): seed a claimed company
   (has `hubspot_id` → `hubspot_url`) with a general phone, confirm the strip renders the
   Call chip + a "Log the Call →" anchor whose `href` is the company record URL; seed an
   unclaimed company (no `hubspot_id`) and confirm the chip renders **without** the link.

## Rollout

Branch → PR → merge → Railway auto-deploy. No env vars, no migration, no flag.
