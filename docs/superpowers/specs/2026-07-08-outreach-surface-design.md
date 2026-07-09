# Outreach Surface — The Single Sales Operating Surface — Design

**Date:** 2026-07-08
**Supersedes:** the send-loop deep-link plan (`2026-07-07-send-loop-*`) — same goal, richer shape.
**Reference pattern:** `projects/intellitext` (signals → AI-drafted review queue → send-as-rep via Gmail).
**Status:** approved (Danny, 2026-07-08). Build Phase 1 this session.

## Vision

The console becomes the **single surface** where a Sixth City rep completes the whole
motion without leaving: **ingest → rank → enrich → compose → send**, with every step
calling the right source (Apollo, HubSpot, Google Places, Gmail) in-app. The front half
(ingest/rank/enrich/push) already exists; this builds the back half — **compose & send** —
and formalizes the data model underneath it.

## Data model — Company → Contact → Message (first-class, HubSpot/Apollo-aligned)

The natural sales path is the spine: **identify the company, then the right person at it,
then compose the message relevant to that contact at that company.** Three first-class
objects, each mapping 1:1 to HubSpot and Apollo so sync is clean:

| Object | Owns | HubSpot | Apollo |
|---|---|---|---|
| **Company** (`Account`/`AccountRow`) | domain (identity), vertical, score, signals, `hubspot_id` | Company `0-2` | Organization |
| **Contact** (`Contact`/`ContactRow`) | name, title, email, linkedin, seniority, `hubspot_id`, FK→company | Contact `0-1` | Person |
| **Message** (`Message`/`MessageRow`, NEW) | subject, body, `edited_subject/body`, status, send metadata, FK→**contact** (+ the account signal it opens on) | Engagement (email) | — |

**What changes:**
- **Contact is elevated to first-class.** It gains `hubspot_id` (nullable — set when the
  contact is created/associated in HubSpot) so the person round-trips to the CRM. It's the
  anchor for messages.
- **Message is NEW and first-class.** A draft record per *(contact × the account's opening
  signal)*. `status`: `draft → approved → sending → sent | failed | discarded`. Preserves
  the AI original in `subject/body` and the human edit in `edited_subject/edited_body`
  (intellitext's pattern). Send metadata: `gmail_message_id`, `gmail_thread_id`,
  `sent_at`, `sent_by` (rep email). Engagement fields (`opened_at`, `replied_at`) are
  reserved for a later reconcile phase.
- The message is composed **for that contact at that company**: `draft_cold_email` becomes
  contact-aware (greeting + role framing from the Contact; the "why" from the Account's
  strongest signal), instead of account-level.

## The surface — Morning Queue evolves into the compose/send queue

Per Danny's call, the existing **Morning Queue** becomes the operating surface (not a new
screen). It adopts intellitext's **Review Queue + MessageCard** shape:

- A vertical list of **contact cards**, ranked best-first (net-new · closer-bound ·
  in-market), each showing: company + contact (name/title) + the opening signal + score.
- Each card is a **self-contained composer**: the message subject + body render inline,
  **editable** (toggle Edit → `<input>`/`<textarea>`; saving PATCHes the Message's
  `edited_*`). Action row: **Send** · Edit · Skip/Discard.
- A company with no contact yet shows a **"Find the person"** action (calls `/api/pursue`
  → Apollo) — surfacing the natural path in the UI: company first, then person, then
  message.
- **Send** fires the native Gmail send (below); on success the card advances to sent and
  drops from the queue.

## Native Gmail send — send-as the rep, log to HubSpot via BCC

Backend service layer (intellitext's `services/gmail/*` pattern; the frontend never calls
Google directly — it calls our API, which owns the tokens):

- **`engine/gmail/oauth.py`** — extend the existing Google OAuth (`web/auth.py`) to request
  the **`gmail.send`** scope and persist the rep's refresh token **encrypted at rest**
  (Fernet via a `TOKEN_ENC_KEY` env). `web/auth.py` today requests only `openid email
  profile` and drops the token — this stores it per user (`gmail_accounts` table) and
  refreshes on demand.
- **`engine/gmail/send.py`** — `send(rep_email, to, subject, body, bcc)` builds a
  base64url MIME message and `POST`s to `gmail.googleapis.com/.../messages/send` as the
  rep. **Auto-BCCs `HUBSPOT_BCC_ADDRESS`** so HubSpot logs the engagement inbound — no
  HubSpot `emails` scope needed (the probe showed it's ungranted), and the Scoreboard
  "reached out" un-freezes for free.
- **`POST /api/messages/{id}/send`** — loads the Message, sends via the service, stamps
  `sent`/`gmail_*`/`sent_at`, advances the account's stage. Degrades safely: no
  `gmail.send` scope / no stored token / dry-run → returns a clear "connect Gmail" state,
  never crashes (same discipline as HubSpot/Apollo/Anthropic paths).

**Gated on Danny's GCP work:** add `gmail.send` to the OAuth consent screen; set
`TOKEN_ENC_KEY` + `HUBSPOT_BCC_ADDRESS` in Railway; a rep re-consents to grant send. Until
then the surface builds/tests fully and the Send button shows "connect Gmail to send."

## External-service integration pattern (locked)

Every vendor call follows intellitext's shape and the engine's existing one: **frontend →
our `/api/*` → a service module that owns credentials → the vendor.** Apollo
(`engine/apollo/`), HubSpot (`engine/hubspot/`), Places (`engine/sources/`), and now Gmail
(`engine/gmail/`) all sit behind our API. No vendor SDK is ever called from the browser.

## Phasing

- **Phase 1 (this session):** the data-model foundation + compose surface + native send
  scaffold.
  1. `Message`/`MessageRow` + repo (create-from-draft, read-queue, update-edit, set-status).
  2. `Contact.hubspot_id` (elevate Contact) + migration.
  3. `draft_cold_email` becomes contact-aware.
  4. Morning Queue → editable compose cards + Send/Edit/Find-the-person wiring; message CRUD API.
  5. `engine/gmail/` service (oauth token persistence + send + BCC) + `POST /api/messages/{id}/send`,
     scope-gated + degrading. `web/auth.py` extended for `gmail.send` + encrypted token store.
- **Phase 2 (later):** reply/open reconcile (Gmail push → `replied_at`/`opened_at`),
  templates/snippets (intellitext's `textModules`), sequence/follow-up cadence.

## Testing (hermetic)

- Message repo CRUD + status transitions; queue ordering; edited-vs-original preservation.
- Contact.hubspot_id round-trips.
- `draft_cold_email` is contact-aware (greeting/role from Contact; signal from Account).
- Gmail service: MIME build (correct headers incl. BCC) is pure + unit-tested; the network
  send is monkeypatched; no-token/no-scope/dry → degrades to None, never raises.
- `POST /api/messages/{id}/send`: success stamps metadata; ungated → "connect Gmail"
  response; never 500s.
- Front-end: Playwright — a card edits + persists; Send hits the endpoint; "Find the
  person" triggers pursue.

## Out of scope (Phase 1)

- Reply/open tracking + webhooks (Phase 2).
- Templates/snippet workbench (Phase 2).
- Multi-step sequences / cadence.
- Two-way inbox / conversation threads (intellitext isn't one either).
