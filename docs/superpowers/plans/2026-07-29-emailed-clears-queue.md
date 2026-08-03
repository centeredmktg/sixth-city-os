# Emailed Clears the Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the first touch sends, the card leaves the finding surface — animated out on the server's confirmation, never on the click.

**Architecture:** The backend exclusion already shipped in `2026-07-29-triage-decisions.md` Task 2, where `get_candidates` was rewritten once against all three exits. This plan is the send-time UX that makes it visible, plus the `machine_sourced_date` timezone fix that shares its governing rule.

**Tech Stack:** React 18 via in-browser JSX (no build step), Python 3.12, `zoneinfo` (stdlib), pytest.

## Global Constraints

- **Governing constraint:** this engine is the initial-touchpoint interface. The Morning Queue is an active list — once the operator takes the action the surface exists for, the card leaves.
- The card animates out **only** on `{sent: true}` from the server. Animating on click would poof cards on failed sends.
- Timestamps store in **UTC**. Anything derived converts to **`America/New_York`** at the edge — use the zone, never a fixed −5 offset, so it follows DST.
- HubSpot's own `createdate` is canon and is never written to.
- `prefers-reduced-motion: reduce` skips the transition and removes the row directly.
- Tests are hermetic: `tests/conftest.py` forces `DRY_RUN=1`.

**Prerequisite:** `2026-07-29-triage-decisions.md` Tasks 2 and 9 must be complete — Task 2 excludes sent domains from `get_candidates`, and Task 9 provides `PE.ComposePanel` with its `onSent` callback.

---

### Task 1: Derived dates in Cleveland time

**Files:**
- Create: `engine/clock.py`
- Modify: `engine/hubspot/client.py:172`, `:216`, `:288`; `engine/modules/hubspot_context.py:33`
- Test: `tests/test_local_date_tz.py`

**Interfaces:**
- Consumes: nothing
- Produces: `engine.clock.local_today() -> str` — today's date in `America/New_York` as `YYYY-MM-DD`.

**The bug:** `date.today()` resolves against the server clock, which is UTC on Railway. A company claimed after 8pm Eastern is stamped with *tomorrow's* date, disagreeing with HubSpot's own `createdate` sitting beside it in the `pipeline_engine` property group. That disagreement is what the operator reported as "create date is off."

**Why a new module rather than a helper in `client.py`:** there are FOUR call sites across two packages, not three. `engine/hubspot/client.py` already imports `engine.modules.hubspot_context`, so putting the helper in either of those files and importing it from the other creates a cycle. `engine/clock.py` is a neutral leaf both can import.

**`engine_last_synced` is safe to change:** `hubspot_context.context_hash` deliberately excludes `PROP_SYNCED` from the stable hash, so correcting its value cannot trigger spurious re-syncs.

- [ ] **Step 1: Write the failing test**

Create `tests/test_local_date_tz.py`:

```python
"""Derived dates are Cleveland's, not the server's. Railway runs UTC, so an evening
claim was landing on tomorrow's date and disagreeing with HubSpot's own createdate."""
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from engine import clock
from engine.hubspot import client as hs
from engine.modules import hubspot_context


def _at(monkeypatch, instant_utc):
    """Freeze wall-clock at a given UTC instant, for engine.clock only."""
    class _DT(datetime):
        @classmethod
        def now(cls, tz=None):
            return instant_utc.astimezone(tz) if tz else instant_utc
    monkeypatch.setattr(clock, "datetime", _DT)


def test_evening_in_cleveland_is_still_today(monkeypatch):
    """2026-07-29 02:00 UTC is 2026-07-28 22:00 EDT — the date must be the 28th."""
    _at(monkeypatch, datetime(2026, 7, 29, 2, 0, tzinfo=timezone.utc))
    assert clock.local_today() == "2026-07-28"


def test_midday_is_unambiguous(monkeypatch):
    _at(monkeypatch, datetime(2026, 7, 29, 16, 0, tzinfo=timezone.utc))
    assert clock.local_today() == "2026-07-29"


def test_follows_dst_in_summer(monkeypatch):
    """July is EDT (UTC-4): 03:30 UTC is still the previous day locally."""
    _at(monkeypatch, datetime(2026, 7, 15, 3, 30, tzinfo=timezone.utc))
    assert clock.local_today() == "2026-07-14"


def test_follows_dst_in_winter(monkeypatch):
    """January is EST (UTC-5): 04:30 UTC is still the previous day locally."""
    _at(monkeypatch, datetime(2026, 1, 15, 4, 30, tzinfo=timezone.utc))
    assert clock.local_today() == "2026-01-14"


def test_is_not_a_fixed_offset():
    """A hardcoded -5 would be wrong for eight months of the year."""
    summer = datetime(2026, 7, 15, 12, tzinfo=ZoneInfo("America/New_York")).utcoffset()
    winter = datetime(2026, 1, 15, 12, tzinfo=ZoneInfo("America/New_York")).utcoffset()
    assert summer != winter


def test_claim_stamps_the_eastern_date(monkeypatch):
    _at(monkeypatch, datetime(2026, 7, 29, 2, 0, tzinfo=timezone.utc))
    from engine.models import Account

    posted = {}

    class _C(hs.HubSpotClient):
        def __init__(self):
            self._dry = False

        def _find_company_ours(self, domain):
            return (None, False)

        def _post(self, path, payload):
            posted.update(payload["properties"])
            return {"id": "1"}

    _C().claim_company(Account(name="Buckeye", domain="buckeye.example"), owner_id="42")
    assert posted[hs.MACHINE_SOURCED_DATE_PROPERTY] == "2026-07-28"


def test_context_properties_stamps_the_eastern_date(monkeypatch):
    """The fourth call site — engine_last_synced had the same UTC bug."""
    _at(monkeypatch, datetime(2026, 7, 29, 2, 0, tzinfo=timezone.utc))
    from engine.models import Account

    props = hubspot_context.context_properties(Account(name="Buckeye", domain="buckeye.example"))
    assert props[hubspot_context.PROP_SYNCED] == "2026-07-28"


def test_context_hash_ignores_the_synced_date(monkeypatch):
    """Changing the date must not make unchanged accounts look dirty and re-sync."""
    from engine.models import Account
    a = Account(name="Buckeye", domain="buckeye.example")
    _at(monkeypatch, datetime(2026, 7, 29, 2, 0, tzinfo=timezone.utc))
    first = hubspot_context.context_hash(a)
    _at(monkeypatch, datetime(2026, 8, 14, 16, 0, tzinfo=timezone.utc))
    assert hubspot_context.context_hash(a) == first
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m pytest tests/test_local_date_tz.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'engine.clock'`

- [ ] **Step 3: Create the module**

Create `engine/clock.py`:

```python
"""
Wall-clock helpers.

Sixth City is in Cleveland; Railway runs its containers in UTC. Every date WE derive
and write outward has to be Cleveland's, or an evening claim lands on tomorrow and
disagrees with HubSpot's own createdate sitting beside it on the record.

Timestamps still STORE in UTC — this is only for dates at the edge.
"""
from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

# The zone, never a fixed -5: it has to follow DST or it's wrong eight months a year.
LOCAL_TZ = ZoneInfo("America/New_York")


def local_today() -> str:
    """Today's date where the business actually is, as YYYY-MM-DD."""
    return datetime.now(LOCAL_TZ).date().isoformat()
```

- [ ] **Step 4: Use it at all FOUR call sites**

In `engine/hubspot/client.py`, add `from engine.clock import local_today` to the imports and replace `date.today().isoformat()` at `:172`, `:216`, and `:288` with `local_today()`.

In `engine/modules/hubspot_context.py`, add the same import and replace `date.today().isoformat()` at `:33` with `local_today()`.

In each file, drop the now-unused `date` import only if nothing else uses it — check with `grep -n "date\." <file>` before removing.

- [ ] **Step 5: Run tests to verify they pass**

Run: `python3 -m pytest tests/test_local_date_tz.py tests/test_claim_company.py tests/test_promote_and_push.py tests/test_hubspot_context.py tests/test_sync_context_job.py -v`
Expected: PASS. The context tests matter most — they prove the hash behaviour is unchanged.

Then the full suite: `python3 -m pytest -q`

- [ ] **Step 6: Commit**

```bash
git add engine/clock.py engine/hubspot/client.py engine/modules/hubspot_context.py tests/test_local_date_tz.py
git commit -m "fix(hubspot): derive dates in Cleveland time, not the UTC server clock"
```

**Note on existing rows:** not backfilled. A handful of records are off by a day; rewriting historical provenance stamps to fix cosmetics is the worse trade.

---

### Task 2: The poof

**Files:**
- Modify: `web/console/app/compose.jsx` (CSS + `onSent` timing), `web/console/app/queue.jsx:151-244`
- Test: manual, in the browser

**Interfaces:**
- Consumes: `PE.ComposePanel` with its `onSent(contactEmail)` callback (triage-decisions plan, Task 9)
- Produces: nothing downstream

**The rule this task exists to enforce:** removal hangs off the server's `{sent: true}`. The current `done` state (`queue.jsx:152`) is client-only, which is exactly how you ship a card that vanishes on a failed send.

- [ ] **Step 1: Add the leaving animation**

In `web/console/app/queue.jsx`, add to `MQ_CSS`:

```css
.mq-card--leaving{ opacity:0; transform:translateY(-6px); max-height:0; margin-bottom:0;
  padding-top:0; padding-bottom:0; overflow:hidden;
  transition:opacity .28s ease, transform .28s ease, max-height .4s ease,
             margin .4s ease, padding .4s ease; }
.mq-card{ max-height:400px; }
@media (prefers-reduced-motion: reduce){
  .mq-card--leaving{ transition:none; }
}
```

`max-height` on `.mq-card` is required — a height transition needs a start value, and `auto` doesn't animate.

- [ ] **Step 2: Wire removal to the confirmed send**

In `MorningQueue`, add the leaving state and handler beside the existing state:

```jsx
  const [leaving, setLeaving] = useStateQ({});   // domain -> true (animating out)
  const [sentGone, setSentGone] = useStateQ({}); // domain -> true (unmounted)

  // Fires ONLY after the server confirmed {sent:true} — never on the click. Removal is
  // optimistic on that confirmation rather than on a /api/candidates round-trip, which
  // would lag the poof by a second and read as broken; the next refresh() confirms it.
  function onSent(domain, contactEmail, companyName) {
    setLeaving((l) => ({ ...l, [domain]: true }));
    const reduce = window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finish = () => {
      setSentGone((g) => ({ ...g, [domain]: true }));
      onConfirmed && onConfirmed(0, `Emailed ${contactEmail} at ${companyName} — cleared from your queue`);
      PEQ.refresh();
    };
    reduce ? finish() : setTimeout(finish, 400);
  }
```

- [ ] **Step 3: Drop sent cards from the list and apply the class**

Extend the queue filter (which already excludes `gone` from the triage-decisions plan, Task 11):

```jsx
  const queue = (PEQ.STREAM || [])
    .filter((a) => a.netNew === true && a.inMarket === "confirmed"
                   && !gone[a.domain] && !sentGone[a.domain])
    .sort((x, y) => (y.total || 0) - (x.total || 0))
    .slice(0, TOP_N);
```

On the card element, add the leaving class:

```jsx
              <div className={"mq-card" + (isDone ? " mq-card--done" : "")
                             + (leaving[a.domain] ? " mq-card--leaving" : "")}>
```

And pass the callback at the render site:

```jsx
              {open[a.domain] && <PEQ.ComposePanel account={a} onError={onError}
                onSent={(email) => onSent(a.domain, email, a.name)} />}
```

- [ ] **Step 4: Let the toast carry a custom message**

`onConfirmed` currently takes a count and builds its own toast (`app.jsx:141`). Widen it so a caller can pass its own text:

```jsx
  const triageConfirmed = (n, msg) => {
    P.refresh().then(() => setTick((t) => t + 1));
    setToast({ msg: msg ? <span>{msg}</span> : <span><b>{n}</b> confirmed → pushed to HubSpot</span> });
  };
```

- [ ] **Step 5: Verify in the browser — both paths**

**Success:** compose and send to a real contact. Expected: the card fades and collapses, the "N to work" count drops, the toast reads `Emailed jane@… at Acme — cleared from your queue`. Reload — still gone.

**Failure:** the path that matters more. Disconnect Gmail (or point `sendMessage` at a message id that returns `{sent:false}` via devtools) and send. Expected: **the card does not move**, and the `connect_gmail` hint renders as it does today.

**Reduced motion:** enable Reduce Motion in macOS System Settings → Accessibility → Display, send again. Expected: the row disappears with no animation.

- [ ] **Step 6: Commit**

```bash
git add web/console/app/queue.jsx web/console/app/compose.jsx web/console/app/app.jsx
git commit -m "feat(ui): sent card poofs out of the Morning Queue on server confirmation"
```

---

### Task 3: The same clearing from Triage

**Files:**
- Modify: `web/console/app/triage.jsx`
- Test: manual, in the browser

**Interfaces:**
- Consumes: `PE.ComposePanel`'s `onSent`, mounted on the triage card in the triage-decisions plan, Task 10 Step 5
- Produces: nothing downstream

- [ ] **Step 1: Reuse the pattern**

In `TriageBoard`, add `sentGone` state and an `onSent` handler mirroring Task 2 Step 2, then include it in the `awaiting` filter:

```jsx
  const awaiting = all.filter((a) => !confirmed[a.domain] && !decided[a.domain]
                                     && !sentGone[a.domain]);
```

Apply a `tg-card--leaving` class with the same CSS shape added to `TG_CSS`, and pass `onSent` at the `ComposePanel` mount site.

- [ ] **Step 2: Verify in the browser**

Send from a Triage card. Expected: the card animates out, and the Morning Queue no longer lists that firm either — both surfaces read `get_candidates`.

- [ ] **Step 3: Run the full suite and commit**

Run: `pytest -q`
Expected: PASS

```bash
git add web/console/app/triage.jsx
git commit -m "feat(ui): sent card clears the Triage Board too"
```

---

## Done When

- Sending the first touch removes the card from both surfaces, and it stays gone after a reload.
- A **failed** send leaves the card exactly where it was, with the existing failure hint.
- The animation is skipped under `prefers-reduced-motion`.
- A company claimed at 10pm Eastern is stamped `machine_sourced_date` = that day, matching HubSpot's `createdate`.
- `pytest -q` passes.
