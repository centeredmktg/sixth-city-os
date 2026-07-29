# Emailed Clears the Queue — The Third Exit

**Date:** 2026-07-29
**Status:** Approved, ready for implementation planning
**Related:** `2026-07-20-triage-decisions-design.md` (amended same day),
`2026-07-29-activity-screen-design.md`

## Governing constraint

> This engine is the initial-touchpoint interface — finding and engaging. It is not
> pipeline management, not an inbox, not a second HubSpot.

The Morning Queue is an **active list**. Once the operator takes the action the surface
exists for, the card leaves it. Reply tracking, follow-up cadence, and non-response timers
are explicitly out of scope — those live in HubSpot and the rep's inbox.

## Problem

Sending the first touch changes nothing about what the operator sees. `MQComposePanel`
(`web/console/app/queue.jsx:78`) sends successfully, flips a local `sent` flag, and the
card stays on the board. On reload even that flag is gone, because `done`
(`queue.jsx:152`) is React state with no server counterpart.

So the operator emails a firm, and tomorrow morning it is back at the top of the queue
looking exactly as unworked as it did yesterday.

## Current state (verified)

- `POST /api/messages/{id}/send` (`web/server.py:518`) already stamps
  `sent_at=datetime.now(timezone.utc)` and `status=SENT` on success, and returns
  `{sent: True, ...}`. On failure it reverts the message to `DRAFT` and returns
  `{sent: False, reason: ...}` — it never 500s.
- The send is race-safe already: `messages_repo.mark_sending` is an atomic claim, so a
  double-click loses the race and returns the current state rather than sending twice.
- `MessageRow` (`engine/db/models.py:93`) carries `company_domain`, `status`, `sent_at`.
  Every fact this feature needs is already persisted.
- `repo.get_candidates` (`engine/db/repo.py:108`) is `WHERE pushed = False`. Both Morning
  Queue and Triage Board read it via `/api/candidates`.

## Design decisions

| Fork | Decision | Rationale |
|---|---|---|
| Store `contacted` or derive it? | **Derive** from a sent `MessageRow` | A boolean could be set while the message write fails, leaving a company vanished with no record of why. Derived, the card cannot disappear unless a row exists proving the send |
| Clear from Morning Queue only, or both surfaces? | **Both** | Morning Queue is a prioritized view of the triage pool — the same row. A worked firm is not awaiting triage either |
| Grey out and sink, or remove? | **Remove** | Considered and rejected by the operator: grey-out + "clear completed" is queue management, which the constraint forbids |
| What triggers the animation? | **The server's `{sent: true}` response** | Animating on click would poof cards on failed sends — the current client-only `done` flag has exactly that defect |
| Where does the record go? | Nowhere — it stays | Row persists in the DB and HubSpot for posterity. Only the *view* changes |

## Data model

**No schema change.** This is the reason to derive rather than store.

## Behaviour

`get_candidates` excludes any domain having a `MessageRow` with `status = 'sent'`.

Combined with the other two exits (`2026-07-20` spec, as amended), the queue is:

```
pushed = False
AND route_confirmed = False
AND domain NOT IN (SELECT company_domain FROM messages WHERE status = 'sent')
```

**Implement this as one query.** The exclusion must be a single subquery or `LEFT JOIN`,
never a per-row lookup: `get_candidates` runs on every load of both screens, and commit
`bbc7da7` already fixed an N+1 in the context sync that timed out against remote Postgres.
This is the worst place in the codebase to reintroduce that pattern.

A second message sent to a *different* person at the same company does not change queue
state — the company is already out. It is recorded, and shows on the Activity screen.

## UI — the removal

`web/console/app/queue.jsx`, extended to Triage when `MQComposePanel` is shared per the
2026-07-20 spec.

1. Operator clicks Send. Button reads "Sending…" (existing behaviour).
2. `POST /api/messages/{id}/send` returns.
3. **`{sent: false}`** → card does not move. Failure renders where it does today
   (`connect_gmail` hint, or the generic reason). The draft survives and is retryable.
4. **`{sent: true}`** → the card animates out: opacity to 0 and height collapsed over
   ~400ms, then unmounted. The header count (`{left.length} to work`) decrements. A toast
   reads `Emailed {contact} at {company} — cleared from your queue`.
5. Removal is optimistic **on the confirmed send** — the card leaves immediately on
   `{sent: true}` rather than waiting for a `/api/candidates` round-trip, which would lag
   the poof by a second and read as broken. The next natural `refresh()` confirms it.

`@media (prefers-reduced-motion: reduce)` skips the transition and removes the row
directly.

**Empty state:** when the last card clears, the existing "You're clear for now" empty state
(`queue.jsx:197`) renders. It needs no change — it already reads correctly for a queue
emptied by work rather than one that was never filled.

## The `machine_sourced_date` fix

Folded in here because it is the same timezone rule, and it is one line in three places.

`claim_company` and its siblings stamp `MACHINE_SOURCED_DATE_PROPERTY: date.today()`
(`engine/hubspot/client.py:167`, `:211`, `:283`). `date.today()` resolves against the
server clock — UTC on Railway — so a company claimed after 8pm Eastern is stamped with
*tomorrow's* date and disagrees with HubSpot's own `createdate` sitting beside it in the
`pipeline_engine` property group. That disagreement is the reported bug.

HubSpot's `createdate` is canon and is not touched. Fix the derived date only:

```python
date.today()  →  datetime.now(ZoneInfo("America/New_York")).date()
```

Use the zone, not a fixed −5 offset, so it follows DST. Existing rows are not backfilled —
a handful of records are off by a day, and rewriting historical provenance stamps to fix
cosmetics is a worse trade than leaving them.

**The rule, stated once for the codebase:** timestamps store in UTC; anything *derived* —
a date written to HubSpot, a date rendered in the UI — converts to `America/New_York` at
the edge. Never store local time.

## Out of scope

- Reply detection, no-response timers, follow-up cadence — HubSpot and the inbox own these.
- Any notion of "contacted but no reply." The engine does not know whether they replied and
  will not learn. See the Phase 2 note in the Activity spec.
- Un-sending, or returning an emailed company to the queue. If the operator needs the firm
  back, the record is in HubSpot.

## Testing

- `get_candidates` excludes a domain with a sent message and still includes one whose only
  message is a draft.
- A domain with a *failed* send (message reverted to `DRAFT`) stays in the queue — the
  defect this feature must not introduce.
- The exclusion runs as a single query — assert query count, not just correctness, so the
  N+1 cannot regress in.
- A second sent message to the same domain is idempotent for queue purposes.
- `{sent: false}` leaves the card mounted; `{sent: true}` unmounts it.
- The card clears from Triage as well as Morning Queue.
- `machine_sourced_date` is the Eastern date, asserted at a UTC instant that falls on the
  following UTC day (e.g. 2026-07-29 02:00 UTC → `2026-07-28`).
- The date fix holds across the DST boundary in both directions.
