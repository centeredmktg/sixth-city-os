# Send Loop — Person View → Edit → Send → Log → Enroll — Design

**Date:** 2026-07-07
**Backlog items:** #3 (person view + edit + send in-app), #5 (sequence enrollment)
**Status:** approved (Danny, 2026-07-07). Build deferred to next session.

## Problem

Today (`web/console/app/accounts.jsx`) contacts render as a **read-only** list, the
outreach draft is **account-level and read-only**, and "send" is a `mailto:` link that
exits to the mail client with nothing prefilled. The Scoreboard "reached out" metric is
frozen because nothing logs an engagement back to HubSpot. The team can't work a person
from inside the tool.

## Send-path decision (settled on live evidence, 2026-07-07)

A read-only probe of the Service Key + portal 3358054 (STANDARD) established:
- **No 1:1 sales-email send API** for an app token (sales emails send only via a
  connected personal inbox in the HubSpot UI). Transactional single-send needs a paid
  add-on and is marketing-grade — wrong for cold 1:1.
- Logging an email engagement via `POST /crm/v3/objects/emails` → **403 MISSING_SCOPES**
  (`crm.objects.emails.*` / `sales-email-read` not granted).
- Sequences REST → **404** (no public enrollment endpoint — the known wall).
- Workflows (`automation` scope) → **200** (a workflow-triggered enroll bridge is
  reachable, but the "enroll in sequence" action needs a Sales Hub Pro seat).

**Chosen mechanism: Gmail compose deep-link with the HubSpot BCC prefilled.** One click
opens a fully-prefilled Gmail compose (To / Subject / Body / **BCC = HubSpot log
address**); the rep reviews and hits send. Rationale: zero new OAuth/token infra, a human
beat before a cold send (safer for tone + deliverability), the email comes from the rep's
real Gmail, and **BCC logging is inbound email processing — it un-freezes the Scoreboard
without needing the missing `emails` scope.** In-app Gmail-API send (`gmail.send`) is a
clean later upgrade with an identical UI; explicitly out of scope here.

## Architecture

### Backend

1. **`CONFIG.hubspot_bcc_address`** (new, from env `HUBSPOT_BCC_ADDRESS`). The portal's
   "log to CRM" BCC/forwarding address (Danny grabs it from HubSpot Settings → Email).
   Non-secret. Absent → the compose link omits BCC and the UI shows "CRM logging off
   (set BCC address)" so it degrades instead of silently not logging.
2. **Expose the BCC address to the front-end** — add it to the existing
   `/api/scoreboard` or a tiny `GET /api/config` (non-secret config the console reads
   once). The compose URL is built client-side, so the front-end needs this value.
3. **Per-person HubSpot deep-link id (#5).** `AccountRow.hubspot_id` (company) already
   exists → deep-link to the company record works today:
   `https://app.hubspot.com/contacts/3358054/record/0-2/{companyId}`.
   `ContactRow` has **no** HubSpot contact id. Add `ContactRow.hubspot_id` (nullable) and
   persist it when a contact is created/associated in HubSpot, enabling the more precise
   per-person link `…/record/0-1/{contactId}`. Company link is the always-available floor.

### Front-end (`web/console/app/accounts.jsx`)

4. **Person view** — a contact row becomes selectable, opening an **editable** draft
   panel: subject `<input>` + body `<textarea>`, prefilled from the account's Outreach
   (already serialized on candidates), greeting addressed to the contact. Edits are
   **ephemeral** (v1): they live in component state and flow into the compose URL; we do
   not persist edited drafts server-side this version. (Persisting edits into
   `extra['outreach']` is a later option.)
5. **"Open in Gmail" action** — builds
   `https://mail.google.com/mail/?view=cm&fs=1&to={email}&su={enc subject}&body={enc body}&bcc={enc BCC}`
   and opens it in a new tab. Body is <80 words → URL well under the ~2000-char limit.
   Disabled with a hint when the contact has no email.
6. **"Open in HubSpot →" (#5 enroll fallback)** — deep-link to the record (per-contact
   when `ContactRow.hubspot_id` is present, else the company record). This is where the
   rep clicks Enroll manually. Auto-enroll stays gated; a workflow-enroll bridge is a
   future item pending the Pro-seat confirmation.

## Data flow

rep opens Accounts detail → picks a contact → edits the prefilled draft → **Open in
Gmail** (BCC prefilled) → rep sends from their own inbox → HubSpot logs the email to the
contact via BCC → Scoreboard "reached out" reflects it → rep clicks **Open in HubSpot →**
to enroll the follow-up manually.

## Testing (hermetic)

- Compose-URL builder (pure): correct encoding of subject/body/BCC; omits BCC when the
  address is unset; omits/disables when no recipient email.
- `/api/config` (or scoreboard extension) returns the BCC address; absent env → null.
- `ContactRow.hubspot_id` round-trips through upsert; deep-link builder prefers the
  contact id and falls back to the company id.
- No new network/LLM/HubSpot-write calls introduced on any page-load path.
- Front-end: person selection renders the editable panel; Gmail button disabled without
  an email; HubSpot link targets the right record type (0-1 vs 0-2).

## Open items for Danny (do not block the spec; block the live cutover)

- Grab the portal **BCC log address** (HubSpot Settings → Email) → set `HUBSPOT_BCC_ADDRESS`.
- Confirm the **Sales Hub seat tier** (Pro+ needed for any future workflow-enroll bridge).
- Live-verify once the BCC is set: a BCC'd send **associates** to the machine-sourced
  company's contact (so the "reached out" metric moves).

## Out of scope

- In-app Gmail-API send (`gmail.send` sensitive scope + per-user token persistence) —
  the later upgrade; same person-view UI, different send wiring.
- Auto sequence enrollment — no public API; revisit as a workflow bridge after the
  seat-tier check.
- Per-person AI drafting — v1 reuses the voice-matched account draft addressed to the
  person.
- Persisting edited drafts server-side.
