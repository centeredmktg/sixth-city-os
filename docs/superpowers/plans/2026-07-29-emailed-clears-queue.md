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

### Task 1: `machine_sourced_date` in Eastern time

**Files:**
- Modify: `engine/hubspot/client.py:167`, `:211`, `:283`
- Test: `tests/test_machine_sourced_date_tz.py`

**Interfaces:**
- Consumes: nothing
- Produces: `engine.hubspot.client.sourced_date() -> str` — today's date in `America/New_York` as `YYYY-MM-DD`.

**The bug:** `date.today()` resolves against the server clock, which is UTC on Railway. A company claimed after 8pm Eastern gets stamped with *tomorrow's* date, disagreeing with HubSpot's own `createdate` sitting beside it in the `pipeline_engine` property group. That disagreement is what the operator reported as "create date is off."

- [ ] **Step 1: Write the failing test**

Create `tests/test_machine_sourced_date_tz.py`:

```python
"""Derived dates are Cleveland's, not the server's. Railway runs UTC, so an evening
claim was landing on tomorrow's date and disagreeing with HubSpot's createdate."""
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from engine.hubspot import client as hs


def _at(monkeypatch, instant_utc):
    """Freeze wall-clock at a given UTC instant."""
    class _DT(datetime):
        @classmethod
        def now(cls, tz=None):
            return instant_utc.astimezone(tz) if tz else instant_utc
    monkeypatch.setattr(hs, "datetime", _DT)


def test_evening_in_cleveland_is_still_today(monkeypatch):
    """2026-07-29 02:00 UTC is 2026-07-28 22:00 EDT — the date must be the 28th."""
    _at(monkeypatch, datetime(2026, 7, 29, 2, 0, tzinfo=timezone.utc))
    assert hs.sourced_date() == "2026-07-28"


def test_midday_is_unambiguous(monkeypatch):
    _at(monkeypatch, datetime(2026, 7, 29, 16, 0, tzinfo=timezone.utc))
    assert hs.sourced_date() == "2026-07-29"


def test_follows_dst_in_summer(monkeypatch):
    """July is EDT (UTC-4): 03:30 UTC is still the previous day locally."""
    _at(monkeypatch, datetime(2026, 7, 15, 3, 30, tzinfo=timezone.utc))
    assert hs.sourced_date() == "2026-07-14"


def test_follows_dst_in_winter(monkeypatch):
    """January is EST (UTC-5): 04:30 UTC is still the previous day locally."""
    _at(monkeypatch, datetime(2026, 1, 15, 4, 30, tzinfo=timezone.utc))
    assert hs.sourced_date() == "2026-01-14"


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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_machine_sourced_date_tz.py -v`
Expected: FAIL — `AttributeError: module 'engine.hubspot.client' has no attribute 'sourced_date'`

- [ ] **Step 3: Implement the helper**

In `engine/hubspot/client.py`, change the datetime import to include what's needed and add the helper beside the property constants:

```python
from datetime import datetime
from zoneinfo import ZoneInfo

# Sixth City is in Cleveland; Railway runs UTC. Every date WE derive is Cleveland's,
# or an evening claim lands on tomorrow and disagrees with HubSpot's own createdate.
# The zone, not a fixed -5 — it has to follow DST.
_LOCAL_TZ = ZoneInfo("America/New_York")


def sourced_date() -> str:
    """Today's date where the business actually is, as YYYY-MM-DD."""
    return datetime.now(_LOCAL_TZ).date().isoformat()
```

- [ ] **Step 4: Use it at all three call sites**

Replace `date.today().isoformat()` with `sourced_date()` at `engine/hubspot/client.py:167`, `:211`, and `:283`. Remove the now-unused `date` import if nothing else uses it — run `grep -n "date\." engine/hubspot/client.py` to check before removing.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pytest tests/test_machine_sourced_date_tz.py tests/test_claim_company.py tests/test_promote_and_push.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add engine/hubspot/client.py tests/test_machine_sourced_date_tz.py
git commit -m "fix(hubspot): stamp machine_sourced_date in Cleveland time, not UTC"
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
