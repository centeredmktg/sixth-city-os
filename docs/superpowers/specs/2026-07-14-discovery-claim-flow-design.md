# Discovery-Claim + Legible Flow — Design Spec

**Date:** 2026-07-14
**Origin:** John's first-solo-drive video (2026-07-14) — a real user narrating the tool cold. Plus Danny's discovery-partner revenue requirement surfaced in the same review.
**Status:** Approved design, pre-plan.

---

## 1. Problem

Two things, from one user session.

**(A) The flow isn't legible.** John couldn't tell Morning Queue from Triage Board, couldn't tell which screens are *act* vs. *watch*, conflated "Confirm → Push" with "reach out," and hit a dead-end after pushing (no owner set). "Added to CRM" shows a count with no list, so his action isn't reflected back to him.

**(B) The claim is under-protected.** Today a net-new company is only pushed to HubSpot and stamped `machine_sourced` **if an operator confirms it**. Danny's value as a *discovery partner* is the discovery itself — every net-new company the engine surfaces is his provable, timestamped claim, whether or not anyone works it. Operator-gated push means the other ~4,000 discoveries per run are never recorded as his.

## 2. Goals

- Every net-new company is auto-claimed in HubSpot at discovery — `machine_sourced=true` + provenance + date — with **zero human gate**, and **never unassigned**.
- The claim never touches John's existing book (dedup guard preserved) and **never triggers outreach** (claim ≠ contact).
- The flow reads honestly to a first-time user: the funnel is visible, screens are labeled act/watch, and "Confirm" means what it does.
- John's two loops close: pushed companies get an owner; "Added to CRM" becomes a real list showing which discoveries still need a contact.

## 3. Non-goals (deferred to backlog)

- Collapsing "Confirm → Push/Work" fully into a single "Reach out" action.
- Writing engine score/signals onto the HubSpot company record (Danny's "single surface" thesis: keep the user *in the app*, don't decorate HubSpot).
- Per-rep / round-robin ownership (single configurable default owner for now).
- Follow-up sequences / drip (separate arc).

## 4. Core reframe — CLAIM vs. OUTREACH

The whole design hinges on splitting one conflated action into two:

| | **Claim (discovery)** | **Outreach (reach out)** |
|---|---|---|
| Trigger | Automatic, at ingest | Human-gated (operator Compose → Send) |
| What it does | Create HubSpot company, stamp `machine_sourced` + `engine_status=discovered` + owner | Draft + send email from rep's Gmail |
| Purpose | Danny's revenue protection | Working the prospect |

Because the claim now happens at ingest, **"Confirm → Push" stops creating anything.** The record already exists. Confirm now **promotes** a discovery `discovered → working` — the operator's commitment to work it. All "pushes it into HubSpot" copy is rewritten; it was true before and becomes false after.

## 5. Data model changes

### 5.1 HubSpot (company properties)
- Existing (unchanged): `machine_sourced` (bool), `machine_source_origin` (text), `machine_sourced_date` (date).
- **New:** `engine_status` (enumeration/select) — values `discovered` | `working`. Filterable so John's team can exclude unworked discoveries from their normal views. Created via a guarded one-time property-create script (same pattern as the `pipeline_engine` group props), **not** auto-run.
- Owner: standard `hubspot_owner_id` set on create.

### 5.2 Engine DB (`AccountRow`)
- **New column `claimed` (bool, default false):** the auto-claim job created this company's HubSpot record. **Distinct from the existing worked/pushed state** — critical: if auto-claim reused the "pushed" flag, `get_candidates` (returns unpushed) would empty the Triage board. `claimed` = "in HubSpot as engine-sourced"; the existing worked/pushed state = "operator promoted it to working."
- Additive migration `migrate_add_claimed`, registered in `auto_migrate._MIGRATIONS` (additive → self-applies on deploy; never a data-rewrite migration).

## 6. Part 0 — Auto-claim (the backbone)

### 6.1 Architecture — a resumable background job, NOT inline
Auto-claiming thousands of companies inline in `/api/ingest` would issue thousands of sequential HubSpot POSTs and time out the request. It mirrors the existing `engine/jobs/enrich.py` pattern instead.

- **`engine/jobs/claim.py::run(session, limit=None)`** — selects `AccountRow` where `net_new is True AND claimed is False`; for each, calls `HubSpotClient.claim_company(account, owner_id)`; on success sets `AccountRow.claimed = True`. Chunked, paced, 429-retried, **idempotent/resumable** (a restart re-selects only unclaimed rows; the create itself is domain-guarded so a double-run can't duplicate).
- **Trigger:** `/api/ingest` fires the job automatically after upsert via FastAPI `BackgroundTasks` (fire-and-forget). Ingest still returns immediately with net-new counts. Fully automatic — no operator action, per Danny.
- **Also exposed as `POST /api/claim?limit=`** (idempotent) for manual drain / retry / cron, matching `/api/enrich`.

### 6.2 `HubSpotClient.claim_company(account, owner_id) -> str | None`
A **lean** claim — company only, no contact, no draft (those are outreach spend, deferred to Pursue/Compose):
1. `find_company_id_by_domain(account.domain)`.
2. **Exists (John's book — not machine_sourced):** skip, return None. *Dedup/SLA guard — never claim his book.*
3. **Exists and already ours (machine_sourced):** idempotent no-op, return id.
4. **Net-new:** create company with `{ machine_sourced: true, machine_source_origin, machine_sourced_date, engine_status: "discovered", hubspot_owner_id: owner_id }`; return new id.
- **Owner invariant:** if `owner_id` is falsy, **raise / refuse** — never create an unassigned record (Danny's hard rule). The job logs and halts rather than flooding HubSpot ownerless.

### 6.3 No-outreach guarantee
`claim_company` never calls `draft_cold_email` or `enrich_contacts`. The existing `push_to_hubspot.run`'s inline AI-draft + contact-enrich are **removed from the claim path** — drafting now lives in the already-shipped Morning Queue Compose action, contact-find in Pursue. (This is a deliberate behavior change: push no longer auto-drafts; Compose is the draft surface. Consistent with the live single-surface compose/send flow.)

## 7. The Confirm reframe — promote discovered → working

`/api/push` (the Triage/Morning Queue "Confirm" action) changes from create-and-claim to **promote**:
- **`HubSpotClient.promote_to_working(account, owner_id)`** — find our engine-sourced record by domain, set `engine_status = "working"`, ensure owner set. Never touches a non-machine_sourced (John's) record.
- Server marks the `AccountRow` worked/pushed (existing state) so it leaves the Triage queue.
- If the company somehow isn't claimed yet (claim job still draining), promote falls back to `claim_company` first, then sets working — so a fast operator is never blocked.
- UI copy: "Confirm → Push" → **"Confirm → Work"** / "Start working"; "Confirming a Closer pushes it into HubSpot" → "…moves it into your active pipeline." Applies in `triage.jsx` and `queue.jsx`.

## 8. Part A — Legibility (front-end only)

Header copy + funnel counts on four screens. No backend beyond counts already returned by `/api/candidates` and `/api/scoreboard`.

| Screen | New header treatment |
|---|---|
| Morning Queue (`queue.jsx`) | **"Work these today"** · `N to work` + subline: *"a filtered slice of Triage — today's net-new, in-market, closer-worthy."* |
| Triage Board (`triage.jsx`) | **"Sort the pile"** · `N to sort · from M net-new` |
| Accounts (`accounts.jsx`) | **"Look up any company"** · `M in your book` |
| Engine Impact (`scoreboard.jsx`) | **"What the engine produced"** · *watch, not work* |

## 9. Part B — Owner (load-bearing)

- **Persistence:** reuse `settings` table via `settings_repo` — new key `default_owner_id` (mirrors the `load_scoring_config`/`save_scoring_config` pattern). Optional in-memory active cache like `scoring/config._active` for hot reads by the claim job.
- **`HubSpotClient.list_owners() -> [{id, name, email}]`** (`GET /crm/v3/owners`, `owners.read` already granted).
- **API:** `GET /api/owners` (dropdown source); `GET /api/owner-config` + `PUT /api/owner-config` (read/save `default_owner_id`). Kept separate from `/api/scoring-config` (owner isn't a scoring lever).
- **UI:** an "Ownership" group on the Scoring screen (`scoring.jsx`) — `Default owner: [ Kaylee ▾ ]`, defaulted to Kaylee once chosen.
- **Invariant (tested):** claim/promote refuse to write when `default_owner_id` is unset. Auto-push never lands unassigned.

## 10. Part C — "Added to CRM" drill-down

- **`GET /api/added`** — returns the companies behind the scoreboard's "Added to CRM" count: `{domain, name, added_date, owner_name, contact_count, engine_status}`, sourced from the **same query** that produces the count so the number and list can't disagree. Sorted newest-first, capped/paginated (e.g. 200) with a total.
- **UI (`scoreboard.jsx`):** the "Added to CRM" stat becomes clickable → expands an inline list (no new nav item). Each row: company · added date · owner · contact count · status. **Rows with `contact_count == 0` show a "Find the person" button** (reuses `pursueDomains` → Apollo) — answering John's "do we need to add contacts?" in place. This doubles as the discovery-inventory view: found / working / still-needs-a-contact.

## 11. API surface (summary)

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/ingest` | (changed) after upsert, fire claim job via BackgroundTasks |
| POST | `/api/claim?limit=` | (new) manual/cron drain of the auto-claim job |
| POST | `/api/push` | (changed) promote discovered → working, not create |
| GET | `/api/owners` | (new) HubSpot owners for the dropdown |
| GET/PUT | `/api/owner-config` | (new) read/save `default_owner_id` |
| GET | `/api/added` | (new) drill-down list behind "Added to CRM" |

## 12. Rollout / prod gate

- Auto-claim is **flag-gated** in prod (e.g. `AUTO_CLAIM_ENABLED`), default OFF. **Turning it on is Danny's conscious step** — the first real ingest with it on writes thousands of live records into John's production HubSpot. Danny chose fully-automatic (no per-run gate); the flag is the one deliberate on-switch.
- Prereqs before flag-on: `engine_status` property created in HubSpot (guarded script); `default_owner_id` set to Kaylee via the new Settings control; `HUBSPOT_TOKEN` present (already set).
- `DRY_RUN=1` still forces dry everywhere — local/tests never write to the portal.

## 13. Testing (TDD, hermetic — `DRY_RUN=1`, conftest-forced)

- `claim_company`: net-new → create with all stamps + owner; John's book (existing, not machine_sourced) → skip/None (dedup guard); already-ours → idempotent no-op; **owner unset → raises** (invariant).
- `claim.run`: selects only `net_new & !claimed`; marks `claimed`; resumable (second run no-ops); respects `limit`.
- `promote_to_working`: sets `engine_status=working`; falls back to claim if unclaimed; never touches non-machine_sourced.
- Ingest fires the claim background task (mocked); still returns counts.
- `list_owners` parse; `/api/owner-config` round-trips; invariant blocks blank owner.
- `/api/added` count-parity with `/api/scoreboard`; contact_count correct; 0-contact rows flagged.
- Regression: with auto-claim flag OFF, ingest/push behave as today.

## 14. Delivery

One branch, TDD throughout, one PR; merge auto-deploys Railway. One additive migration (`migrate_add_claimed`) in `auto_migrate._MIGRATIONS`. The `engine_status` HubSpot property is a guarded manual script (not auto-run). Auto-claim ships **flag-off**; Danny flips it when ready.
