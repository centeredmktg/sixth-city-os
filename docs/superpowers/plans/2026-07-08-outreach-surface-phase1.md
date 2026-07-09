# Outreach Surface — Phase 1 Implementation Plan

> REQUIRED SUB-SKILL: superpowers:executing-plans (built inline). TDD per task; checkbox tracking.

**Goal:** Lay the Company→Contact→Message foundation, make drafting contact-aware, turn Morning Queue into an editable compose/send queue, and add a scope-gated native Gmail send service.

**Architecture:** Message is a first-class draft record hanging off Contact (elevated with `hubspot_id`). Compose is contact-aware. Native Gmail send lives behind a service layer (`engine/gmail/`) that auto-BCCs the HubSpot log address; the frontend only calls our `/api/*`. Spec: `docs/superpowers/specs/2026-07-08-outreach-surface-design.md`.

**Tech Stack:** FastAPI + SQLAlchemy, no-build React, pytest (hermetic, `DRY_RUN=1`).

## Global Constraints
- NEVER push main; branch → PR → merge. `DRY_RUN=1` locally. Suite green before PR.
- Product framing: team-facing only, no rev-share language.
- Every external call degrades safely (no-key/no-token/dry → clear state, never 500).

---

### Task 1: Elevate Contact — `hubspot_id`
**Files:** `engine/models.py` (Contact), `engine/db/models.py` (ContactRow), `engine/db/repo.py` (store/read), `engine/db/migrate_add_contact_hubspot_id.py` (new), `tests/test_contacts.py`.
- [ ] Test: a Contact with `hubspot_id` round-trips through `store_contacts`/`get_contacts`.
- [ ] Add `hubspot_id: str = ""` to Contact dataclass; `hubspot_id` nullable column to ContactRow; carry it in repo convert both ways; idempotent `ADD COLUMN IF NOT EXISTS` migration.
- [ ] Green + commit.

### Task 2: `Message` / `MessageRow` + repo (CRUD)
**Files:** `engine/models.py` (Message dataclass + `MessageStatus` enum), `engine/db/models.py` (MessageRow), `engine/db/messages_repo.py` (new), `engine/db/migrate_add_messages.py` (new), `tests/test_messages_repo.py`.
- **Message fields:** `id`, `contact_email` + `company_domain` (identity), `reason_signal`, `subject`, `body`, `edited_subject`, `edited_body`, `status` (`draft|approved|sending|sent|failed|discarded`), `gmail_message_id`, `gmail_thread_id`, `sent_at`, `sent_by`, `created_at`.
- **Repo:** `create_message(session, msg)`, `get_message(session, id)`, `list_queue(session)` (status in draft/approved, newest/priority order), `update_draft(session, id, subject, body)` (writes `edited_*`), `set_status(session, id, status, **send_meta)`. `final_subject/body` = edited if present else original.
- [ ] Tests: create→get; update writes edited, preserves original; list_queue excludes sent/discarded; set_status stamps send metadata.
- [ ] Idempotent `CREATE TABLE IF NOT EXISTS messages ...`. Green + commit.

### Task 3: Contact-aware drafting
**Files:** `engine/modules/draft_cold_email.py`, `tests/test_draft_cold_email.py`.
- [ ] Test: `draft(account, contact=<Contact>)` greets the contact by first name and (if titled) frames to their role; `draft(account)` (no contact) is unchanged (regression).
- [ ] Add optional `contact` param; when present, greeting uses `contact.name`; live-prompt user message gains the contact's name/title. Signatures stay backward-compatible (contact defaults None). Green + commit.

### Task 4: Message CRUD API + compose-from-draft
**Files:** `web/server.py`, `tests/test_server.py`.
- **Endpoints:** `GET /api/messages` (queue), `POST /api/messages` (create from a contact+account → runs `draft_cold_email` → persists a `draft` Message), `PATCH /api/messages/{id}` (save edit), `POST /api/messages/{id}/discard`.
- [ ] Tests (client fixture): create returns a draft with subject/body; PATCH saves edit; GET queue reflects it; discard drops it.
- [ ] Green + commit.

### Task 5: Gmail send service (scope-gated) + send endpoint
**Files:** `engine/gmail/__init__.py`, `engine/gmail/mime.py` (pure MIME builder), `engine/gmail/send.py` (network), `engine/config.py` (`hubspot_bcc_address`, `token_enc_key`), `web/server.py` (`POST /api/messages/{id}/send`), `tests/test_gmail_mime.py`, `tests/test_server.py`.
- [ ] Test (pure): `build_mime(from_, to, subject, body, bcc)` yields a base64url string decoding to a message with correct To/From/Bcc/Subject headers + body.
- [ ] Test: `POST /api/messages/{id}/send` with no stored Gmail token / dry-run → 200 `{sent:false, reason:"connect_gmail"}`, message stays `draft`, never 500. (Live send path monkeypatched → stamps `sent` + gmail ids + advances stage.)
- [ ] `send.py` swallows all errors → None (degrade). BCC = `CONFIG.hubspot_bcc_address` when set. Green + commit.

> Token persistence + `web/auth.py` `gmail.send` scope extension + `gmail_accounts` table are the last sub-step; if the session runs short, land Tasks 1–4 + the pure MIME builder + the gated endpoint (all testable now) and leave the live OAuth token store as the documented next step (it's gated on Danny's GCP consent-screen work regardless).

### Task 6: Morning Queue → compose/send cards
**Files:** `web/console/app/queue.jsx`, `web/console/app/data.jsx` (fetch helpers), verify via Playwright.
- [ ] Cards render the Message subject/body editable; Edit→PATCH; Send→`/api/messages/{id}/send`; a contact-less company shows "Find the person"→`/api/pursue`. Sent cards drop from the queue.
- [ ] Verify live on a scratchpad DB (`DATABASE_URL=sqlite`, `DRY_RUN=1`). Commit.

## Deploy items (Danny / on merge)
- GCP consent screen: add `gmail.send`; a rep re-consents. Railway: set `TOKEN_ENC_KEY`, `HUBSPOT_BCC_ADDRESS`.
- Run `migrate_add_contact_hubspot_id`, `migrate_add_messages` against Railway Postgres.
