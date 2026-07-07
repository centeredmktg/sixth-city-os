# Outreach Personalization Layer — Design

**Date:** 2026-07-07
**Backlog items:** #4 (in-person offer), #1 (competitor mentions), #2 (spend benchmark)
**Status:** approved (Danny, 2026-07-07)

## Problem

Three demo-day requests all enrich the same artifact — the cold-email draft — with an
external hook: an in-person offer for staffed cities (#4), a named-competitor mention
(#1), and an industry spend benchmark (#2). They are one **pluggable personalization
layer** on `draft_cold_email`, not three separate features.

The design constraint: `draft(account, live)` has **two** rendering paths — a
deterministic template (rendered per-row in the candidates/Accounts list) and a live
Anthropic draft (push-only). Any hook must feed both: the template needs a rendered
*line*; the LLM needs a *fact* to weave in its own voice.

## Architecture — thin hook registry

New module `engine/modules/outreach_hooks.py`.

```
@dataclass(frozen=True)
class OutreachHook:
    kind: str    # "in_person" | "competitor" | "benchmark"
    fact: str    # plain sentence for the LIVE prompt (LLM weaves it)
    line: str    # deterministic sentence appended to the TEMPLATE body

HOOKS = [in_person_hook, competitor_hook, benchmark_hook]  # each: (Account) -> OutreachHook | None

def collect(account) -> list[OutreachHook]:
    return [h for hook in HOOKS if (h := hook(account)) is not None]
```

`draft()` calls `collect(account)` once and:
- **template path** — appends each `.line` to the body (before/after the team-not-tool
  close; see Rendering below).
- **live path** — passes the `.fact`s to `_call_anthropic` as an extra context block in
  the user message ("Additional context you may use, in your own words: …").

A hook returning `None` is silent in both paths. Adding a future hook = one function; no
change to `draft()`.

### Hooks

- **`in_person_hook`** — fully implemented. Fires when the account is within
  `RADIUS_MILES` (50) of a **staffed** hub (Chicago or Cleveland). Line names the city:
  "We've actually got people in {city} — worth grabbing coffee instead of a call?"
  Fact: "Sixth City has staff in {city}, ~{miles}mi from the prospect; an in-person
  meeting is genuinely on the table."
- **`competitor_hook`** — interface only. Reads `account.extra['competitors']` (a
  non-empty list, operator- or Clay-supplied). Returns `None` when absent. **Ahrefs Brand
  Radar later populates that same field** — the hook is decoupled from the data source, so
  it goes live with no code change once the field is filled.
- **`benchmark_hook`** — disabled stub. Always returns `None` until a defensible benchmark
  source is named (Danny's explicit call: do not invent numbers). Present so the shape is
  reserved and the wiring point is obvious.

## Geo changes — `engine/geo.py`

1. `OfficeHub` gains `staffed: bool = False`. Chicago + Cleveland set `staffed=True`;
   the other four unchanged.
2. `nearest_staffed_hub(account) -> OfficeHub | None` — the staffed hub the account is
   in-radius of (within `RADIUS_MILES`), else `None`. Reuses the existing distance /
   city-match logic. Used by `in_person_hook`.
3. **Staffed-aware `proximity_weight`** (the score bump — Danny's call). When the
   nearest in-radius hub is staffed, use a higher ceiling `STAFFED_PROXIMITY_BOOST`
   (~1.20, a `TODO(Danny)` lever) instead of the default `PROXIMITY_BOOST` (1.12);
   unstaffed hubs unchanged. Linear falloff identical.

   **Why this and not a new scoring axis:** proximity already owns "nearness → higher
   score." Staffed presence is a *stronger* version of the same idea, not a new one.
   Because hubs are >50mi apart, an in-radius account maps to exactly one hub — no
   double-count, no ambiguity. One place to reason about; keeps the rubric (#6)
   calibratable. The score rationale surfaces it: `× proximity 1.18 (staffed: Cleveland)`.

## Draft rendering — `engine/modules/draft_cold_email.py`

- Template path: after building the existing body, append hook `.line`s (each its own
  paragraph) between the value pitch and the "Worth 15 minutes?" close, so the in-person
  offer reads as a P.S.-style upgrade to the ask, not a non-sequitur.
- Live path: `_call_anthropic` user message gains an optional trailing block listing the
  `.fact`s. The system prompt already forbids fabricating specifics; the facts are
  supplied truthfully so the model may use them. Under-80-words rule still applies —
  facts are optional material, not mandatory inclusions.
- Precedence unchanged: a stored `extra['outreach']` draft still wins and short-circuits
  (it was already voice-matched); hooks apply only when we're generating fresh.

## Testing (hermetic — no live API)

- `in_person_hook`: fires within-radius of Chicago/Cleveland; silent for an unstaffed-hub
  city (e.g. Columbus), out-of-radius, and no-location accounts.
- `proximity_weight`: staffed hub out-scores an unstaffed hub at equal distance; unstaffed
  behavior unchanged (regression); missing location still 1.0.
- `nearest_staffed_hub`: returns the staffed hub in-radius, `None` otherwise.
- `competitor_hook`: silent with no `competitors`; renders a line when the field is a
  non-empty list.
- `benchmark_hook`: always `None`.
- `draft()`: template body contains the in-person line for a staffed-city account and not
  for a Columbus account; stored-outreach precedence still short-circuits hooks; live path
  builds a user message containing the facts (assert on the constructed prompt via a
  monkeypatched client — no network).

## Scope this session

Ship #4 end-to-end (geo + in_person_hook + draft wiring + score bump) plus the #1/#2 hook
interfaces (disabled). #1 goes live when the Ahrefs key populates `extra['competitors']`;
#2 when a benchmark source is named. No UI changes required — the drafts already render in
the Accounts/candidates views.

## Out of scope

- Ahrefs Brand Radar live wiring (competitor auto-derivation) — separate, key-gated.
- A benchmark data source — flagged open; hook stays disabled.
- The send loop / person-view editing (#3, #5) — separate arc, separate brainstorm.
