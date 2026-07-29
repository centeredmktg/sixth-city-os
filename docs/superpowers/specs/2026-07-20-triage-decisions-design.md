# Triage Decisions — Clear Worked Cards, Persist the Call

**Date:** 2026-07-20
**Amended:** 2026-07-29 — see "Amendment" at the foot of this document
**Status:** Approved, ready for implementation planning

> **Read the amendment first.** This spec was written before the operator set the
> initial-touchpoint constraint (2026-07-29). The amendment trims scope accordingly and
> adds a third queue exit that did not exist when this was written. Where the two
> disagree, the amendment wins.

## Problem

The triage board offers four routes — Hold, Nurture, LFG, Reject — but only LFG does
anything. The other three change a segmented toggle and nothing else.

Two distinct defects:

1. **Decisions are silently discarded.** `setRoute` (`web/console/app/triage.jsx:110`)
   writes only to local React state (`overrides`). No fetch, no persistence. Reloading
   the page erases every Hold/Nurture/Reject the operator clicked. This is the worst
   failure mode available: the UI acknowledges the click, so the operator trusts it.

2. **The board cannot clear those cards even in principle.** `repo.get_candidates`
   (`engine/db/repo.py:115`) defines the queue as `WHERE pushed = False`. The only exit
   from triage is being pushed to HubSpot. "Worked but not promoted" — exactly the state
   Reject, Hold, and Nurture need — has no representation in the data model.

The operator wants cards to clear as they are worked, while the row stays in the DB so
re-ingestion still dedupes against it.

## Current State (verified)

- **Auto-claim is live.** `AUTO_CLAIM_ENABLED=1` in prod. `engine/jobs/claim.py:34-38`
  claims every `net_new=True, claimed=False, pushed=False` row into HubSpot at ingest,
  stamped `machine_sourced=true` + provenance + owner + `engine_status=discovered`.
  **Attribution is secured at ingest, not at LFG.** Every triaged firm is already a
  HubSpot record the engine owns.
- **LFG is a promote, not a create.** `/api/push` (`web/server.py:322`) calls
  `promote_to_working` (`engine/hubspot/client.py:251`), which PATCHes
  `engine_status=working` on the existing record after verifying it is ours via
  `machine_sourced`. It does **not** call `client.push()` — that refuse-to-claim path
  belongs to the legacy cron job `engine/jobs/push_to_hubspot.py` and is not in the
  console flow.
- **The decision already has a home.** `RouteDecision` (`engine/models.py:129-131`)
  carries `confirmed`, `confirmed_route`, `confirmed_by`, with `effective` resolving them
  (`engine/models.py:134`). `/api/push` already sets these for the selected firms
  (`web/server.py:347-351`) and then skips any route that isn't CLOSER
  (`web/server.py:357-359`). The wiring terminates on both ends; nothing connects it.
- **`engine_status` is a HubSpot select property** in group `pipeline_engine` with two
  options today: `discovered`, `working`. Live read confirms
  `modificationMetadata.readOnlyDefinition = false` — the definition is editable. The
  prod token carries `crm.schemas.companies.write`.
- **The compose flow is already a clean component.** `MQComposePanel`
  (`web/console/app/queue.jsx:78`) takes `{account, onError}` and handles find-contact →
  compose → edit → send end to end.
- **An LFG list is half-built.** `/api/added` (`web/server.py:271`) returns claimed
  companies and already derives `engine_status: "working" if r.pushed else "discovered"`.

## Design Decisions

| Fork | Decision | Rationale |
|---|---|---|
| What does Hold mean? | Clears to a Hold list; manual return to triage | Distinct from Reject without needing a scheduler |
| Does a decided card come back? | Never for Reject; Hold/Nurture wake on new heat | Avoids re-litigating rejects while keeping real changes visible |
| What wakes a card? | Timing crosses 55 upward, or `in_market` flips to `confirmed` | Reuses the `GATE` constant (`triage.jsx:13`) the engine already routes on. Fit is near-static (industry, size); timing is the axis that moves when a firm heats up |
| Does Nurture touch HubSpot? | Yes — `engine_status=nurture` | The record already exists and is already ours; this is a PATCH on our own row, not a new claim. No attribution or dedupe consequence |
| Where does "decided" live? | Reuse `route_confirmed` + `route_confirmed_route`; add `decided_at` | One-column migration. `confirmed=True, confirmed_route=hold` already means "human decided Hold." A parallel `decision` column would drift from it |

## Data Model

Add one column to `AccountRow` (`engine/db/models.py:18`):

```python
decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)
```

Existing rows get `NULL` — correct, they are all undecided.

**No row is ever deleted.** `domain` is the primary key and the dedupe key; re-ingestion
behaviour is untouched.

## Behaviour

| Button | HubSpot `engine_status` | Local state | Card |
|---|---|---|---|
| LFG | `working` | `pushed=True` (unchanged) | clears |
| Nurture | `nurture` | `route_confirmed=True`, `confirmed_route=nurture`, `decided_at` | clears |
| Hold | `hold` | `route_confirmed=True`, `confirmed_route=hold`, `decided_at` | clears |
| Reject | `rejected` | `route_confirmed=True`, `confirmed_route=reject`, `decided_at` | clears |

`get_candidates` becomes `WHERE pushed = False AND route_confirmed = False`.

Both the triage board and the morning queue read `get_candidates`, so a decision clears
the card from both surfaces with no additional work.

## Wake Rule

`engine/jobs/rescore.py` gains a pass, run after rescoring:

For each row where `route_confirmed = True` and `confirmed_route IN ('hold', 'nurture')`:
- if `timing >= 55` and the prior timing was `< 55`, **or** `in_market` has become
  `confirmed` → set `route_confirmed = False`, clear `decided_at`.

`reject` is excluded permanently. Waking is logged so a surprise reappearance is
explainable.

## HubSpot Migration

A guarded script in the shape of `engine/hubspot/create_engine_status_property.py`
(print-plan by default, `--run` to apply, refuses under `DRY_RUN`).

**Critical:** HubSpot's PATCH on a select property *replaces* the entire `options` array
rather than appending. The payload must contain all five options. The script must:

1. GET the live property first.
2. Assert `discovered` and `working` are present in the read, and carry them into the
   write with their original `value` and `displayOrder` intact.
3. Abort loudly if either is missing rather than writing a partial array.

Final options: `discovered(0)`, `working(1)`, `nurture(2)`, `hold(3)`, `rejected(4)`.

## API

- `POST /api/decide` — `{domains: [...], decision: "hold"|"nurture"|"reject"}`. Sets the
  route fields + `decided_at`, PATCHes `engine_status`. Mirrors `/api/push`'s per-domain
  results contract so the UI reports partial failures the same way.
- `POST /api/undecide` — `{domains: [...]}`. Clears `route_confirmed` + `decided_at`,
  returning rows to triage. Backs the "return to triage" action.
- `GET /api/candidates?decision=hold|nurture|reject` — filter the decided set. Absent
  parameter keeps today's undecided-only behaviour.
- `GET /api/added?engine_status=working` — filter to the LFG set.

`/api/decide` must **not** write `engine_status` on a record that is not ours — reuse the
`_find_company_ours` guard `promote_to_working` already applies
(`engine/hubspot/client.py:263-267`).

## UI

**Triage board** (`web/console/app/triage.jsx`):
- Each route button posts to `/api/decide` (or `/api/push` for LFG) and clears the card
  on success. Failures surface via the existing `onError` path — never optimistically
  clear.
- Per-row busy state, matching the existing per-domain `busy` pattern
  (`triage.jsx:107`), so one in-flight decision does not lock the board.
- Domain renders as `<a href="https://{domain}" target="_blank" rel="noopener noreferrer">`.
  `noopener` is required — without it the opened tab receives a `window.opener` handle
  back into the console.
- Mount the compose panel on the card (see below).

**New pages:** Hold, Nurture, Rejected, LFG. Each is a filtered list with the firm, its
score, when it was decided, and — for Hold/Nurture/Rejected — a "return to triage" action.

**Compose from triage:** extract `MQComposePanel` from `web/console/app/queue.jsx` into a
shared module and mount it in the triage card. Its interface (`{account, onError}`) is
already correct; this is a move, not a rewrite. Both queue and triage import from the new
location.

## Out of Scope

- **AI visibility / ranking signals** — a new signal source touching `engine/scoring`,
  `engine/modules/enrichment.py`, and `draft_cold_email`. Separate spec.
- Scheduled/automatic wake for Hold (no `revisit_at` date). Manual return only.
- Per-record owner on the decided lists — `/api/added` still shows the single team
  default.

## Testing

- `get_candidates` excludes decided rows and still includes undecided ones.
- Each decision persists across a session reload — the defect that motivated this work.
- Rejecting a firm leaves its row present, so a re-ingest of the same domain still
  dedupes and does not resurface it.
- Wake rule fires on a timing crossing upward through 55, does not fire on a firm already
  above 55, and never fires for `reject`.
- The migration script aborts when `discovered` or `working` is missing from the live
  read, and preserves both when they are present.
- `/api/decide` refuses to PATCH a company that is not `machine_sourced`.
- A failed decision leaves the card on the board.

---

# Amendment — 2026-07-29

Written after the operator set the governing constraint below. Supersedes the sections
named.

## Governing constraint (new)

> This engine is the **initial-touchpoint interface** — finding and engaging. It is not
> pipeline management, not an inbox, not a second HubSpot. Once the first touch is sent,
> what happens next belongs to HubSpot and the rep's inbox.

Every trim below follows from that one sentence.

## Supersedes: "New pages"

The original spec called for four new nav pages — Hold, Nurture, Rejected, LFG — each a
filtered list with a return-to-triage action. **Cut.** Four pipeline-management screens is
precisely what the constraint forbids.

Replaced by: decided companies are reachable as a **filter on the Activity screen**
(`2026-07-29-activity-screen-design.md`), which already has to render per-company history.
`GET /api/candidates?decision=hold|nurture|reject` still ships as specified — the data is
exposed, it just doesn't get four nav items. Return-to-triage (`POST /api/undecide`) moves
onto the Activity row.

## Supersedes: queue exit model

The original spec changed `get_candidates` to
`WHERE pushed = False AND route_confirmed = False`. That is now **two of three** exits. A
third — the first touch being sent — is added in `2026-07-29-emailed-clears-queue-design.md`.

The authoritative rule, which that spec owns:

| Exit | Mechanism | Storage |
|---|---|---|
| Promoted (LFG) | `pushed = True` | exists |
| Decided (Hold/Nurture/Reject) | `route_confirmed = True` + `decided_at` | this spec's one new column |
| Emailed (first touch sent) | a `MessageRow` with `status='sent'` for the domain | derived — no column |

Implement `get_candidates` **once**, against all three, rather than editing it twice.

## Additions

**Reject on the Morning Queue.** The original spec scoped the four-route control to the
Triage Board. Reject is now also required on Morning Queue cards, posting to the same
`/api/decide`. Morning Queue is a prioritized view of the triage pool, so a reject there is
the identical operation on the identical row — no second code path, and the card clears
from both surfaces because both read `get_candidates`.

**Company hyperlink — resolved target.** The original spec hyperlinked the *domain* on the
Triage card. Extended to the **company name on both surfaces**, linking to
`https://{domain}` in a new tab with `rel="noopener noreferrer"`. Rationale: at this stage
the operator is evaluating the firm, so the useful destination is the firm's own site. The
existing HubSpot deep-links (`hubspot_url`, "Log the Call") are unchanged and stay separate
— they answer a different question.

**Timezone rule (cross-cutting).** Timestamps store in UTC; anything *derived* — a date
written to HubSpot, a date rendered in the UI — converts to `America/New_York` at the edge.
Use the zone, never a fixed −5 offset, so it follows DST. `decided_at` stores UTC like its
siblings.

## Unchanged and still in force

The data model (`decided_at`), the behaviour table, the wake rule, the HubSpot
`engine_status` option migration and its read-then-write guard, `/api/decide` and
`/api/undecide`, the `_find_company_ours` guard, extracting `MQComposePanel` into a shared
module so Triage can compose, and the whole testing section.
