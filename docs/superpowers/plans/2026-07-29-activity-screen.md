# Activity Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One company-grouped screen answering "did we actually do this?" — with the compose action that lets the operator reach a second person at a company already touched.

**Architecture:** A new `engine/modules/activity.py` derives the feed from three columns that already exist (`claimed_at`, `sent_at`, `decided_at`) — no new table. Every event carries a `source` field from day one, which is the seam that makes a later HubSpot timeline pull an addition rather than a refactor. A new `activity.jsx` console screen renders it.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2.0, pytest, React 18 via in-browser JSX (no build step).

## Global Constraints

- **Governing constraint:** this engine is the initial-touchpoint interface. This screen is a log plus one action — not a pipeline manager.
- **No schema change.** Deriving is the point; a table "for later" is the overengineering that was explicitly rejected.
- Timestamps serialize as **UTC ISO 8601** and render in **`America/New_York`** — the zone, never a fixed offset.
- **Totals count the whole set, not the returned page.** The operator asked for cumulative and individual; a total that silently describes only the current page understates the work done.
- Query count must not scale with company count — three queries total, same discipline as `get_candidates` (cf. `bbc7da7`).
- Every event carries `source: "engine" | "hubspot"`. Nothing emits `"hubspot"` yet; the field exists so Phase 2 doesn't reshape the response.
- Default view is **emailed-only**. ~4,300 saves against a few dozen sends — defaulting to everything buries the only activity that reflects a human decision.

**Prerequisite:** `2026-07-29-triage-decisions.md` must be complete — this plan reads `decided_at` (Task 1), `/api/undecide` (Task 5), and `PE.ComposePanel` (Task 9).

**Explicitly not in this plan:** the HubSpot engagement pull. It is tractable at the scope that matters (only companies we emailed, dozens not thousands), but it is blocked on a portal admin adding engagement read scopes, and the screen must not wait on someone else's task. Two costs are recorded in the spec so they aren't rediscovered: the scope change, and deduping our own BCC'd sends on `gmail_message_id`.

---

### Task 1: The activity feed builder

**Files:**
- Create: `engine/modules/activity.py`
- Test: `tests/test_activity_module.py`

**Interfaces:**
- Consumes: `AccountRow` (`claimed`, `claimed_at`, `route_confirmed`, `route_confirmed_route`, `decided_at`, `discovered_by`, `hubspot_id`), `MessageRow` (`company_domain`, `contact_email`, `status`, `sent_at`, `sent_by`)
- Produces: `activity.build(session, include: set[str] | None = None, limit: int = 100) -> dict` with keys `companies`, `totals`, `count`. Each company: `{domain, name, hubspot_url, last_at, events}`. Each event: `{type, at, source, detail, by}` where `type` ∈ `saved` | `emailed` | `decided`.

- [ ] **Step 1: Write the failing test**

Create `tests/test_activity_module.py`:

```python
"""The activity feed derives from columns that already exist — no events table."""
from datetime import datetime, timezone

from engine.db.base import make_engine, create_all, make_session_factory
from engine.db.models import AccountRow, MessageRow
from engine.modules import activity


def _session():
    engine = make_engine("sqlite:///:memory:")
    create_all(engine)
    return make_session_factory(engine)()


def _at(day, hour=12):
    return datetime(2026, 7, day, hour, tzinfo=timezone.utc)


def _saved(session, domain, day=22):
    session.add(AccountRow(domain=domain, name=domain.split(".")[0].title(),
                           claimed=True, claimed_at=_at(day),
                           discovered_by="clay-export-jul"))
    session.commit()


def _emailed(session, domain, email="jane@x.com", day=29):
    session.add(MessageRow(company_domain=domain, contact_email=email,
                           status="sent", sent_at=_at(day), sent_by="john@sixthcity.com"))
    session.commit()


def test_emailed_company_appears_by_default():
    session = _session()
    _saved(session, "acme.example")
    _emailed(session, "acme.example")
    out = activity.build(session)
    assert [c["domain"] for c in out["companies"]] == ["acme.example"]


def test_saved_only_company_is_hidden_by_default():
    """4,300 saves would bury the few dozen real touches."""
    session = _session()
    _saved(session, "quiet.example")
    assert activity.build(session)["companies"] == []


def test_include_saved_admits_them():
    session = _session()
    _saved(session, "quiet.example")
    out = activity.build(session, include={"saved"})
    assert [c["domain"] for c in out["companies"]] == ["quiet.example"]


def test_company_carries_its_full_event_trail_newest_first():
    session = _session()
    _saved(session, "acme.example", day=22)
    _emailed(session, "acme.example", day=29)
    events = activity.build(session)["companies"][0]["events"]
    assert [e["type"] for e in events] == ["emailed", "saved"]
    assert events[0]["detail"] == "jane@x.com"
    assert events[0]["by"] == "john@sixthcity.com"


def test_companies_order_by_most_recent_activity():
    session = _session()
    _saved(session, "old.example")
    _emailed(session, "old.example", day=23)
    _saved(session, "new.example")
    _emailed(session, "new.example", day=29)
    assert [c["domain"] for c in activity.build(session)["companies"]] == \
        ["new.example", "old.example"]


def test_totals_count_the_whole_set_not_the_page():
    """The failure mode that would quietly understate the work done."""
    session = _session()
    for i in range(12):
        _saved(session, f"firm{i}.example")
        _emailed(session, f"firm{i}.example")
    out = activity.build(session, limit=5)
    assert len(out["companies"]) == 5
    assert out["totals"]["saved"] == 12
    assert out["totals"]["emailed"] == 12


def test_decided_events_are_included_when_asked():
    session = _session()
    session.add(AccountRow(domain="held.example", name="Held", route_confirmed=True,
                           route_confirmed_route="hold", decided_at=_at(28)))
    session.commit()
    out = activity.build(session, include={"decided"})
    assert out["companies"][0]["events"][0]["type"] == "decided"
    assert out["companies"][0]["events"][0]["detail"] == "hold"
    assert out["totals"]["decided"] == 1


def test_every_event_declares_its_source():
    """The Phase 2 seam — exercised before there's anything to put through it."""
    session = _session()
    _saved(session, "acme.example")
    _emailed(session, "acme.example")
    out = activity.build(session, include={"saved", "decided"})
    assert {e["source"] for c in out["companies"] for e in c["events"]} == {"engine"}


def test_timestamps_serialize_as_utc_iso():
    session = _session()
    _saved(session, "acme.example")
    _emailed(session, "acme.example", day=29)
    assert activity.build(session)["companies"][0]["events"][0]["at"].startswith("2026-07-29")


def test_query_count_is_flat_regardless_of_company_count():
    from sqlalchemy import event
    session = _session()
    for i in range(30):
        _saved(session, f"firm{i}.example")
        _emailed(session, f"firm{i}.example")
    seen = []
    def _count(*a, **k):
        seen.append(1)
    engine = session.get_bind()
    event.listen(engine, "before_cursor_execute", _count)
    try:
        activity.build(session, include={"saved", "decided"})
    finally:
        event.remove(engine, "before_cursor_execute", _count)
    assert len(seen) <= 6, f"N+1 regression: {len(seen)} queries for 30 companies"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_activity_module.py -v`
Expected: FAIL — `ImportError: cannot import name 'activity' from 'engine.modules'`

- [ ] **Step 3: Implement**

Create `engine/modules/activity.py`:

```python
"""
What did we actually do? — the activity feed.

DERIVED, not stored. Every event comes from a column that already exists:

    saved    AccountRow.claimed_at
    emailed  MessageRow.sent_at   (status = 'sent')
    decided  AccountRow.decided_at

An events table would be a second source of truth that drifts from these three.

Grouped by company rather than served as an event stream: you can't act on a company
from a stream without hunting, and the whole point of the screen is the compose action
on the row.

Every event declares `source`. Nothing emits "hubspot" yet — the field is the seam so
that folding in HubSpot engagements later is an addition, not a reshape.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from engine.db.models import AccountRow, MessageRow
from engine.modules import hubspot_links

_DEFAULT_INCLUDE = frozenset({"emailed"})
_ALL = frozenset({"saved", "emailed", "decided"})


def _iso(dt):
    return dt.isoformat() if dt else None


def build(session: Session, include: set[str] | None = None, limit: int = 100) -> dict:
    """The feed. `include` widens the default (emailed-only) view; `limit` caps the
    companies returned but NEVER the totals — the operator asked for cumulative, and
    a total that describes only the page understates the work done."""
    include = frozenset(include) & _ALL if include else _DEFAULT_INCLUDE
    include = include | _DEFAULT_INCLUDE   # emailed is always shown

    # Three queries, flat regardless of company count.
    claimed_rows = (session.query(AccountRow)
                    .filter(AccountRow.claimed.is_(True)).all())
    decided_rows = (session.query(AccountRow)
                    .filter(AccountRow.route_confirmed.is_(True)).all())
    sent_rows = (session.query(MessageRow)
                 .filter(MessageRow.status == "sent").all())

    totals = {"saved": len(claimed_rows), "emailed": len(sent_rows),
              "decided": len(decided_rows)}

    # domain -> {meta, events}
    acc: dict[str, dict] = {}

    def _slot(domain, row=None):
        entry = acc.setdefault(domain, {
            "domain": domain, "name": domain, "hubspot_url": None, "events": []})
        if row is not None:
            entry["name"] = row.name or domain
            entry["hubspot_url"] = hubspot_links.record_url(company_hubspot_id=row.hubspot_id)
        return entry

    # Every event type is always collected onto its company. `include` decides
    # which COMPANIES qualify for the view (below) — not which events display
    # once a company is in. A company admitted because it was emailed still
    # shows its saved/decided history; that's the whole point of the screen.
    for row in claimed_rows:
        _slot(row.domain, row)["events"].append({
            "type": "saved", "at": _iso(row.claimed_at), "source": "engine",
            "detail": row.discovered_by or "", "by": ""})

    for row in decided_rows:
        _slot(row.domain, row)["events"].append({
            "type": "decided", "at": _iso(row.decided_at), "source": "engine",
            "detail": row.route_confirmed_route or "", "by": row.route_confirmed_by or ""})

    sent_domains = {m.company_domain for m in sent_rows}
    rows_by_domain = {r.domain: r for r in claimed_rows + decided_rows}
    for m in sent_rows:
        entry = _slot(m.company_domain, rows_by_domain.get(m.company_domain))
        entry["events"].append({
            "type": "emailed", "at": _iso(m.sent_at), "source": "engine",
            "detail": m.contact_email or "", "by": m.sent_by or ""})

    # Emailed always qualifies (the default); saved/decided widen the set.
    visible = set(sent_domains)
    if "saved" in include:
        visible |= {row.domain for row in claimed_rows}
    if "decided" in include:
        visible |= {row.domain for row in decided_rows}
    companies = [c for c in acc.values() if c["domain"] in visible]

    for c in companies:
        c["events"].sort(key=lambda e: e["at"] or "", reverse=True)
        c["last_at"] = c["events"][0]["at"] if c["events"] else None
    companies.sort(key=lambda c: c["last_at"] or "", reverse=True)

    return {"companies": companies[:limit], "totals": totals, "count": len(companies)}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_activity_module.py -v`
Expected: PASS (10)

- [ ] **Step 5: Commit**

```bash
git add engine/modules/activity.py tests/test_activity_module.py
git commit -m "feat(activity): derive the feed from claimed_at/sent_at/decided_at"
```

---

### Task 2: `GET /api/activity`

**Files:**
- Modify: `web/server.py` (add after `/api/added`, ~line 296)
- Test: `tests/test_activity_api.py`

**Interfaces:**
- Consumes: `activity.build` (Task 1)
- Produces: `GET /api/activity?include=saved,decided&limit=100` → the `build` payload verbatim.

- [ ] **Step 1: Write the failing test**

Create `tests/test_activity_api.py`:

```python
"""The activity endpoint — one screen's worth of 'did we actually do this'."""
from datetime import datetime, timezone

from engine.db.models import AccountRow, MessageRow


def _seed(session):
    session.add(AccountRow(domain="acme.example", name="Acme", claimed=True,
                           claimed_at=datetime(2026, 7, 22, tzinfo=timezone.utc)))
    session.add(MessageRow(company_domain="acme.example", contact_email="jane@acme.example",
                           status="sent", sent_at=datetime(2026, 7, 29, tzinfo=timezone.utc)))
    session.add(AccountRow(domain="quiet.example", name="Quiet", claimed=True,
                           claimed_at=datetime(2026, 7, 20, tzinfo=timezone.utc)))
    session.commit()


def test_defaults_to_touched_companies(client, session):
    _seed(session)
    body = client.get("/api/activity").json()
    assert [c["domain"] for c in body["companies"]] == ["acme.example"]


def test_totals_cover_everything_not_just_the_page(client, session):
    _seed(session)
    body = client.get("/api/activity").json()
    assert body["totals"]["saved"] == 2
    assert body["totals"]["emailed"] == 1


def test_include_widens_the_view(client, session):
    _seed(session)
    body = client.get("/api/activity?include=saved").json()
    assert {c["domain"] for c in body["companies"]} == {"acme.example", "quiet.example"}


def test_limit_caps_companies(client, session):
    _seed(session)
    body = client.get("/api/activity?include=saved&limit=1").json()
    assert len(body["companies"]) == 1
    assert body["count"] == 2


def test_empty_workspace_returns_zeroes_not_an_error(client, session):
    body = client.get("/api/activity").json()
    assert body["companies"] == []
    assert body["totals"]["emailed"] == 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_activity_api.py -v`
Expected: FAIL — 404

- [ ] **Step 3: Implement**

In `web/server.py`, add `from engine.modules import activity` to the modules import, then after `/api/added`:

```python
@app.get("/api/activity")
def activity_feed(session=Depends(db_session), include: str | None = None, limit: int = 100):
    """What the team actually did, grouped by company. Defaults to companies we've
    touched; `include=saved,decided` widens it. Totals always describe the whole set,
    never just the returned page."""
    wanted = {p.strip() for p in include.split(",")} if include else None
    return activity.build(session, include=wanted, limit=limit)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_activity_api.py -v`
Expected: PASS (5)

- [ ] **Step 5: Commit**

```bash
git add web/server.py tests/test_activity_api.py
git commit -m "feat(api): GET /api/activity — company-grouped, totals over the whole set"
```

---

### Task 3: The Activity screen

**Files:**
- Create: `web/console/app/activity.jsx`
- Modify: `web/console/app/app.jsx:27-35` (nav), `:103-104` (routes), `:165-185` (mount), `web/console/app/data.jsx` (fetcher + export), `web/console/index.html` (script tag)
- Test: manual, in the browser

**Interfaces:**
- Consumes: `GET /api/activity` (Task 2), `PE.ComposePanel`, `PE.undecideDomains` (triage-decisions plan Tasks 9 and 10)
- Produces: `window.PE.ActivityScreen`, `PE.fetchActivity(include, limit)`

- [ ] **Step 1: Add the fetcher**

In `web/console/app/data.jsx`, beside `fetchAdded`:

```js
/* The activity feed — what we actually did, grouped by company. */
async function fetchActivity(include, limit) {
  const qs = [];
  if (include && include.length) qs.push("include=" + encodeURIComponent(include.join(",")));
  if (limit) qs.push("limit=" + limit);
  const r = await fetch("/api/activity" + (qs.length ? "?" + qs.join("&") : ""));
  return r.json();   // { companies:[...], totals:{saved,emailed,decided}, count }
}
```

Add `fetchActivity` to the `Object.assign(window.PE, {...})` export list.

- [ ] **Step 2: Build the screen**

Create `web/console/app/activity.jsx`:

```jsx
/* ============================================================
   Activity — did we actually do this?
   Company-grouped, newest activity first. The engine records
   two facts (we saved them, we sent the first touch) plus the
   operator's decisions; everything after the touch lives in
   HubSpot and the inbox by design. The Compose action here is
   how you reach a SECOND person at a company already touched.
   ============================================================ */
const { useState: useStateA, useEffect: useEffectA } = React;
const PEA = window.PE;
const IcoA = PEA.Icons;
const { Badge: BadgeA, Button: BtnA } = window.SixthCityMarketingDesignSystem_4d5a9e;

const AC_CSS = `
.ac-tiles{ display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin:20px 0; }
@media (max-width:800px){ .ac-tiles{ grid-template-columns:1fr; } }
.ac-tile{ background:var(--surface-card); border:1px solid var(--border-subtle);
  border-radius:var(--radius-lg); box-shadow:var(--shadow-xs); padding:16px 18px; }
.ac-tile__v{ font-family:var(--font-condensed); font-weight:800; font-size:30px;
  color:var(--text-strong); line-height:1; }
.ac-tile__k{ font-family:var(--font-mono); font-size:10px; color:var(--text-subtle);
  text-transform:uppercase; letter-spacing:.06em; margin-top:6px; }
.ac-filters{ display:flex; align-items:center; gap:10px; margin-bottom:14px; font-size:12px; }
.ac-filters label{ display:flex; align-items:center; gap:6px; color:var(--text-body); cursor:pointer; }
.ac-row{ background:var(--surface-card); border:1px solid var(--border-subtle);
  border-radius:var(--radius-lg); box-shadow:var(--shadow-sm); padding:15px 18px; margin-bottom:11px; }
.ac-row__h{ display:flex; align-items:center; gap:12px; }
.ac-row__nm{ font-weight:800; font-size:var(--text-md); color:var(--text-strong); }


.ac-row__sp{ margin-left:auto; display:flex; align-items:center; gap:9px; }
.ac-ev{ display:flex; align-items:center; gap:9px; font-size:12px; color:var(--text-body);
  padding:6px 0; border-top:1px solid var(--border-subtle); margin-top:8px; }
.ac-ev:first-of-type{ margin-top:10px; }
.ac-ev__t{ font-family:var(--font-mono); font-size:10px; color:var(--text-subtle);
  margin-left:auto; white-space:nowrap; }
.ac-hs{ font-size:12px; font-weight:700; color:var(--coral-600); text-decoration:none; }
.ac-empty{ text-align:center; padding:54px 20px; color:var(--text-muted); }
.ac-empty h3{ font-family:var(--font-display); font-weight:900; color:var(--text-strong); margin:10px 0 4px; }
`;
(function(){ if(document.getElementById("ac-css"))return; const s=document.createElement("style"); s.id="ac-css"; s.textContent=AC_CSS; document.head.appendChild(s); })();

const EV_LABEL = { saved: "Saved to CRM", emailed: "First touch sent", decided: "Decision" };
const EV_TONE = { saved: "neutral", emailed: "green", decided: "warning" };

// Cleveland's clock, not the server's and not the viewer's.
function whenET(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/New_York", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function ActivityScreen({ onError }) {
  const [data, setData] = useStateA(null);
  const [showSaved, setShowSaved] = useStateA(false);
  const [showDecided, setShowDecided] = useStateA(false);
  const [open, setOpen] = useStateA({});     // domain -> compose panel expanded

  const include = [];
  if (showSaved) include.push("saved");
  if (showDecided) include.push("decided");

  useEffectA(() => {
    let live = true;
    PEA.fetchActivity(include, 100)
      .then((j) => { if (live) setData(j); })
      .catch((e) => onError && onError(e));
    return () => { live = false; };
  }, [showSaved, showDecided]);

  async function returnToTriage(domain) {
    try {
      await PEA.undecideDomains([domain]);
      setData(await PEA.fetchActivity(include, 100));
    } catch (e) { onError && onError(e); }
  }

  const t = (data && data.totals) || { saved: 0, emailed: 0, decided: 0 };
  const companies = (data && data.companies) || [];

  return (
    <div className="pe-page">
      <div className="q-head">
        <div>
          <div className="pe-overline" style={{ color: "var(--coral-600)" }}>The record · what we actually did</div>
          <h2 style={{ margin: "6px 0 0" }}>Activity</h2>
          <p style={{ margin: "8px 0 0", color: "var(--text-muted)", maxWidth: "68ch" }}>
            Every company the engine saved and every first touch sent, newest first. What
            happens after the touch lives in HubSpot and your inbox — this is the record of
            what the engine and the team did here.
          </p>
        </div>
      </div>

      <div className="ac-tiles">
        <div className="ac-tile"><div className="ac-tile__v">{t.saved.toLocaleString("en-US")}</div><div className="ac-tile__k">companies saved</div></div>
        <div className="ac-tile"><div className="ac-tile__v">{t.emailed.toLocaleString("en-US")}</div><div className="ac-tile__k">first touches sent</div></div>
        <div className="ac-tile"><div className="ac-tile__v">{t.decided.toLocaleString("en-US")}</div><div className="ac-tile__k">decisions made</div></div>
      </div>

      <div className="ac-filters">
        <label><input type="checkbox" checked={showSaved} onChange={(e) => setShowSaved(e.target.checked)} /> Include saves</label>
        <label><input type="checkbox" checked={showDecided} onChange={(e) => setShowDecided(e.target.checked)} /> Include decisions</label>
      </div>

      {data === null ? (
        <div className="ac-empty">Loading…</div>
      ) : companies.length === 0 ? (
        <div className="ac-empty">
          <IcoA.Layers size={34} style={{ color: "var(--coral-400)" }} />
          <h3>No touches yet</h3>
          <p>{t.saved.toLocaleString("en-US")} companies are saved and waiting. Send a first
            touch from the Morning Queue and it shows up here.</p>
        </div>
      ) : companies.map((c) => {
        const decided = c.events.find((e) => e.type === "decided");
        return (
          <div className="ac-row" key={c.domain}>
            <div className="ac-row__h">
              <div className="ac-row__nm">
                <PEA.CompanyLink name={c.name} domain={c.domain} />
              </div>
              <div className="ac-row__sp">
                {c.hubspot_url && <a className="ac-hs" href={c.hubspot_url} target="_blank" rel="noopener noreferrer">HubSpot →</a>}
                {decided && <BtnA variant="ghost" size="sm" onClick={() => returnToTriage(c.domain)}>Return to triage</BtnA>}
                <BtnA variant="secondary" size="sm"
                  onClick={() => setOpen((o) => ({ ...o, [c.domain]: !o[c.domain] }))}>
                  {open[c.domain] ? "Close" : "Compose"}
                </BtnA>
              </div>
            </div>
            {c.events.map((e, i) => (
              <div className="ac-ev" key={i}>
                <BadgeA tone={EV_TONE[e.type] || "neutral"} variant="soft" size="sm">{EV_LABEL[e.type] || e.type}</BadgeA>
                <span>{e.detail}{e.by ? " · " + e.by : ""}</span>
                <span className="ac-ev__t">{whenET(e.at)}</span>
              </div>
            ))}
            {open[c.domain] && <PEA.ComposePanel account={{ domain: c.domain, name: c.name }} onError={onError} />}
          </div>
        );
      })}
    </div>
  );
}

window.PE.ActivityScreen = ActivityScreen;
```

- [ ] **Step 3: Wire the nav and route**

In `web/console/app/app.jsx`:

Add to `NAV` (line 28), after `triage`:

```js
    { id: "activity", label: "Activity", icon: P.Icons.Layers },
```

Add to both route maps (line 103-104):

```js
const VIEW_PATH = { ingestion: "/", queue: "/queue", triage: "/triage", activity: "/activity", scoreboard: "/scoreboard", accounts: "/accounts", scoring: "/scoring" };
const PATH_VIEW = { "/": "ingestion", "/ingestion": "ingestion", "/queue": "queue", "/triage": "triage", "/activity": "activity", "/scoreboard": "scoreboard", "/accounts": "accounts", "/scoring": "scoring" };
```

Add to `titles` (line 153):

```js
    activity: ["Activity", "What the engine and the team actually did"],
```

Add to the view switch (line 174), after the triage branch:

```jsx
            : view === "activity"
              ? <P.ActivityScreen onError={pushError} />
```

- [ ] **Step 4: Load the script**

In `web/console/index.html`, add the `activity.jsx` script tag after `triage.jsx` and **after** `compose.jsx` (which it consumes).

- [ ] **Step 5: Verify in the browser**

Open `/activity` directly by URL — it should load the screen, not the ingestion default, since it's in `PATH_VIEW`. Check: three totals render with real numbers; a company you've emailed shows its trail with Eastern timestamps; "Include saves" widens the list; Compose opens on a row and can draft to a *different* contact than the original send; a held company shows "Return to triage" and clicking it puts the firm back on the Triage Board.

- [ ] **Step 6: Run the full suite and commit**

Run: `pytest -q`
Expected: PASS

```bash
git add web/console/app/activity.jsx web/console/app/app.jsx web/console/app/data.jsx web/console/index.html
git commit -m "feat(ui): Activity screen — the record, plus reach a second person"
```

---

## Done When

- Left nav has Activity, deep-linkable at `/activity`.
- The three totals describe the whole set, not the visible page.
- A company shows its full trail — saved, emailed, decided — newest first, timestamped in Cleveland time.
- Compose from an Activity row reaches a different person at an already-touched company.
- "Return to triage" on a decided company puts it back on the board.
- Default view is touched companies only; the saves filter admits the other ~4,300.
- `pytest -q` passes.
