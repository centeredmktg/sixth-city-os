"""
Outreach personalization hooks — a pluggable layer over `draft_cold_email`.

Each hook inspects an account and either fires (returns an OutreachHook) or stays
silent (None). A hook carries TWO renderings of the same idea because `draft()` has
two paths:
  - `line` — a deterministic sentence appended to the TEMPLATE body.
  - `fact` — a plain truth handed to the LIVE Anthropic prompt, which weaves it in
    its own voice (the system prompt forbids fabricating specifics, so facts must be
    supplied truthfully).

Adding a personalization angle later = one function + an entry in HOOKS; `draft()`
never changes. See docs/superpowers/specs/2026-07-07-outreach-personalization-layer-design.md.
"""

from __future__ import annotations

from dataclasses import dataclass

from engine import geo
from engine.models import Account


@dataclass(frozen=True)
class OutreachHook:
    kind: str    # "in_person" | "competitor" | "benchmark"
    fact: str    # truthful context for the live LLM prompt
    line: str    # deterministic sentence for the template body


# --- #4 in-person offer — the only fully-wired hook this session -------------
def in_person_hook(account: Account) -> OutreachHook | None:
    """Fire an in-person offer when the prospect is within RADIUS_MILES of a STAFFED
    hub (Chicago or Cleveland). Silent everywhere else — an offer to meet is only
    credible where Sixth City actually has people."""
    hub = geo.nearest_staffed_hub(account)
    if hub is None:
        return None
    return OutreachHook(
        kind="in_person",
        fact=f"Sixth City has staff in {hub.city}, near this prospect — an in-person "
             f"meeting is genuinely on the table, not just a call.",
        line=f"One more thing — we've actually got people in {hub.city}. Happy to grab "
             f"coffee in person instead of doing this over a call.",
    )


# --- #1 competitor mentions — interface now, data source later ----------------
def competitor_hook(account: Account) -> OutreachHook | None:
    """Name a competitor who's out-visibilitying the prospect. Reads a source-agnostic
    `extra['competitors']` list so the hook is decoupled from where that came from —
    operator-supplied today, Ahrefs Brand Radar auto-populating it later, no code
    change either way. Silent until the field is a non-empty list."""
    competitors = account.extra.get("competitors") if isinstance(account.extra, dict) else None
    if not isinstance(competitors, list):
        return None
    # First USABLE entry — not blindly index 0. A real source (Ahrefs Brand Radar) can
    # interleave unresolved None/blank entries with valid names; str(None) is truthy
    # ("None"), so we must skip nulls/blanks rather than render them.
    rival = next((str(c).strip() for c in competitors if c and str(c).strip()), None)
    if not rival:
        return None
    return OutreachHook(
        kind="competitor",
        fact=f"A direct competitor, {rival}, is winning search/AI visibility this "
             f"prospect is missing.",
        line=f"For what it's worth, {rival} is showing up in the searches where you "
             f"aren't — that gap is fixable.",
    )


# --- #2 spend benchmark — disabled stub (no invented numbers) -----------------
def benchmark_hook(account: Account) -> OutreachHook | None:
    """DISABLED. A 'firms your size spend $X' line needs a DEFENSIBLE benchmark source
    (Danny's call: never invent numbers). The shape is reserved here so wiring a real
    source later is a one-function change; until then it never fires."""
    return None


HOOKS = [in_person_hook, competitor_hook, benchmark_hook]


def collect(account: Account) -> list[OutreachHook]:
    """Run every hook; return the ones that fired, in registry order."""
    fired = []
    for hook in HOOKS:
        h = hook(account)
        if h is not None:
            fired.append(h)
    return fired
