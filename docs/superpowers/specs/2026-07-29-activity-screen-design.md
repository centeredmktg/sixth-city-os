# Activity Screen — What Did We Actually Do?

**Date:** 2026-07-29
**Status:** Approved, ready for implementation planning
**Related:** `2026-07-29-emailed-clears-queue-design.md`,
`2026-07-20-triage-decisions-design.md` (amended same day)

## Governing constraint

> This engine is the initial-touchpoint interface. It is not pipeline management.

Which produces an honest and slightly uncomfortable observation the operator made
directly: **without a HubSpot pull, this surface has exactly two recordable facts** — we
saved a company, and we sent the first touch. Everything else happens elsewhere. The
screen should be built to that truth rather than padded to look busier.

## Problem

Cards now leave every surface — promoted, decided, or emailed. Nothing shows what was
done. Three consequences:

1. No answer to "did we actually do this?" — no total, no per-company trail.
2. A company that was emailed becomes unreachable in the console. If the operator wants to
   reach a *different* person there, there is no screen to do it from. This is the
   operator's own open question about non-responders, and it needs a destination.
3. Decided companies (Hold/Nurture/Reject) have nowhere to be seen or returned from, since
   the four decision pages were cut as pipeline management.

## Design decisions

| Fork | Decision | Rationale |
|---|---|---|
| Chronological event feed, or company-grouped? | **Company-grouped**, newest activity first | You cannot act on a company from an event stream without hunting. Grouping makes the compose-another-person action possible on the row |
| One screen or two (Activity + Contacted)? | **One** | They are the same data. Two screens means the read-only one becomes a wall of 4,300 saves nobody opens |
| Store events in a new table? | **No — derive** | `AccountRow.claimed_at` and `MessageRow.sent_at` already exist and are already timestamped. A table "for later" is the overengineering the operator flagged |
| Default view | **Companies with a sent touch**, saves behind a filter | ~4,300 saves against a few dozen sends. Defaulting to everything buries the only activity that reflects a human decision |
| HubSpot timeline pull | **Phase 2, not now** | Tractable at the scope that matters, but blocked on a token scope change. Do not block the screen on someone else's admin task |

## Data model

**No schema change.** Every event derives from a column that exists:

| Event | Source | Timestamp |
|---|---|---|
| `saved` | `AccountRow.claimed = True` | `claimed_at` |
| `emailed` | `MessageRow.status = 'sent'` | `sent_at` |
| `decided` | `AccountRow.route_confirmed = True` | `decided_at` (added by the 2026-07-20 spec) |

## The Phase 2 seam

Every event carries `source: "engine" | "hubspot"` from day one. It costs one string in a
JSON response and it is the difference between Phase 2 being an addition and being a
refactor.

Phase 2, when the token scopes land, folds HubSpot engagements for **only the companies we
have emailed** (dozens, not thousands) into the same endpoint behind the same response
shape. The UI does not change. Two known costs, recorded now so they are not rediscovered:
the private app needs engagement read scopes added by the portal admin, and because sends
are BCC'd into HubSpot, HubSpot will hand back our own email as an engagement — dedupe on
`gmail_message_id`, which `MessageRow` already stores.

Phase 2 is **not** in this spec's scope of work.

## API

`GET /api/activity`

```jsonc
{
  "companies": [
    {
      "domain": "acme-fab.com",
      "name": "Acme Fabrication",
      "hubspot_url": "https://…",
      "last_at": "2026-07-29T14:02:11Z",
      "events": [
        {"type": "emailed", "at": "2026-07-29T14:02:11Z", "source": "engine",
         "detail": "jane@acme-fab.com", "by": "john@sixthcitymarketing.com"},
        {"type": "saved",   "at": "2026-07-22T09:15:00Z", "source": "engine",
         "detail": "clay-export-jul"}
      ]
    }
  ],
  "totals": {"saved": 4318, "emailed": 37, "decided": 112},
  "count": 37
}
```

- Ordered by `last_at` descending.
- `?include=saved|decided` widens the default (emailed-only) view. `?limit=` caps, default
  100.
- **Totals are counted over the whole set, not the returned page** — the operator asked for
  cumulative and individual, so the number must not silently describe only what is on
  screen.
- Timestamps serialize as UTC ISO 8601; the client renders them in `America/New_York`.
  Storage stays UTC. Anything derived converts at the edge.
- One query per event type, unioned in Python — three queries total, not one per company.
  Same N+1 discipline as `get_candidates` (see `bbc7da7`).

`POST /api/undecide` (defined in the 2026-07-20 spec) backs return-to-triage from an
Activity row.

## UI

**Left nav:** new `Activity` item in `web/console/app/app.jsx:28`, with a route in
`VIEW_PATH` / `PATH_VIEW` (`app.jsx:103`) so it is deep-linkable like every other view. New
component `web/console/app/activity.jsx`, mounted in the `App` switch.

**Header:** the totals, as three counts — companies saved, first touches sent, decisions
made — each with its cumulative number. This is the "did we actually do this?" answer, and
it should be the first thing on the screen.

**Rows:** one per company. Company name hyperlinked to `https://{domain}`
(`rel="noopener noreferrer"`), its HubSpot deep-link where it has one, and the event trail
beneath — each event with its type, its Eastern-rendered timestamp, and who did it.

**Actions on the row:**
- **Compose** — mounts the shared compose panel extracted per the 2026-07-20 spec, letting
  the operator reach a *different* person at a company already touched. This is the answer
  to "what happens to companies that don't get back to us": the screen exists, you pick
  another person, you send. The engine does not track whether they replied and does not
  pretend to.
- **Return to triage** — on decided companies only, posting `/api/undecide`.

**Filter:** a control to include saves and decisions in the list. Default off.

**Empty state:** before any send, the screen reads honestly — saved count with a line
explaining that first touches appear here once sent — rather than an empty table.

## Out of scope

- The HubSpot timeline pull (Phase 2 above).
- Reply state, response rates, follow-up scheduling. The engine cannot know these.
- Per-event editing or deletion. This is a log.
- Exports.

## Testing

- Totals count the full set, not the returned page — the failure mode that would quietly
  understate the work done.
- A company with both a save and a send returns one row with two events, newest first.
- Default view excludes save-only companies; `?include=saved` admits them.
- Endpoint issues a fixed number of queries regardless of company count.
- Every event carries `source: "engine"`, so the Phase 2 seam is exercised before there is
  anything to put through it.
- Timestamps render in `America/New_York`, asserted across a DST boundary.
- Compose from an Activity row creates a message against the correct domain and a
  *different* contact than the original send.
- `/api/undecide` from an Activity row returns the company to `get_candidates`.
