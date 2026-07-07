"""Outreach personalization hooks — the pluggable layer feeding both draft paths.
Uses the real OFFICE_HUBS (Cleveland staffed, Columbus not)."""
from engine.models import Account, Vertical
from engine.modules import outreach_hooks as oh


def _acct(**kw) -> Account:
    return Account(name="Acme", domain="acme.com", vertical=Vertical.UNKNOWN, **kw)


# --- in-person (#4) ----------------------------------------------------------
def test_in_person_fires_in_staffed_city():
    hook = oh.in_person_hook(_acct(city="Cleveland"))
    assert hook is not None and hook.kind == "in_person"
    assert "Cleveland" in hook.line and "Cleveland" in hook.fact


def test_in_person_silent_in_unstaffed_city():
    assert oh.in_person_hook(_acct(city="Columbus")) is None


def test_in_person_silent_without_location():
    assert oh.in_person_hook(_acct()) is None


# --- competitor (#1) — interface only, source-agnostic -----------------------
def test_competitor_silent_without_data():
    assert oh.competitor_hook(_acct()) is None


def test_competitor_silent_on_empty_list():
    assert oh.competitor_hook(_acct(extra={"competitors": []})) is None


def test_competitor_fires_with_list():
    hook = oh.competitor_hook(_acct(extra={"competitors": ["Rival LLC"]}))
    assert hook is not None and hook.kind == "competitor"
    assert "Rival LLC" in hook.line and "Rival LLC" in hook.fact


def test_competitor_skips_blank_leading_entry():
    # A real source (Ahrefs) can interleave unresolved blanks with valid names —
    # take the first USABLE entry, not blindly index 0.
    hook = oh.competitor_hook(_acct(extra={"competitors": ["", "  ", "Rival LLC"]}))
    assert hook is not None and "Rival LLC" in hook.line


def test_competitor_silent_on_null_entries():
    # [None] must NOT render the literal text "None" — that's absent data, stay silent.
    assert oh.competitor_hook(_acct(extra={"competitors": [None]})) is None


# --- benchmark (#2) — disabled stub, no invented numbers ---------------------
def test_benchmark_is_disabled():
    assert oh.benchmark_hook(_acct(city="Cleveland", extra={"competitors": ["X"]})) is None


# --- registry ----------------------------------------------------------------
def test_collect_gathers_active_hooks_only():
    hooks = oh.collect(_acct(city="Cleveland", extra={"competitors": ["Rival LLC"]}))
    kinds = {h.kind for h in hooks}
    assert kinds == {"in_person", "competitor"}   # benchmark disabled


def test_collect_empty_when_nothing_fires():
    assert oh.collect(_acct(city="Nowhere")) == []
