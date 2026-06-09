# Pipeline Engine — Design Brief

For a Claude Design pass (https://claude.ai/design). The logic and data contracts
are built (`engine/models.py`); this brief turns them into screens. Each screen
lists the data it binds to so the design sits on real shapes, not placeholders.

**Two users:**
- **Closer** — the converting AE. Lives in the Morning Queue. Wants the shortest
  path from "open laptop" to "talking to the right account."
- **Ops / John** — confirms routing, audits the scoreboard, settles rev-share.

---

## Screen 1 — Morning Queue (closer's daily surface) ⭐ primary

The whole product, from the closer's seat: a prioritized stack of confirmed,
in-market, net-new accounts to work today. No prospecting from scratch.

**Binds to:** `Account` where `route.effective == CLOSER`, sorted `score.total` desc.
Per card:
- `name`, `vertical`, `city/state`
- `score.band` (A/B/C) + `score.total` + `score.timing` (the "why now")
- strongest `Signal.detail` — the one-line reason ("Mobile site scores 34/100…")
- the drafted `Outreach.subject` (preview of what'll send)
- `stage` (pushed / engaged) + HubSpot link
- action: open in HubSpot · log a touch · kick back to nurture

**Design tension:** density vs. focus. The closer should see ~10 accounts and
instantly know who to call first. Band color + timing should do the triage at a glance.

---

## Screen 2 — Triage / Routing Board (the HITL feature) ⭐ the feature you greenlit

Where a human confirms or overrides the engine's routing before anything acts.
Timing-first: in-market → closer, great-fit/cold → nurture. Nothing enters a
closer sequence unconfirmed.

**Binds to:** `Account` + `RouteDecision` for the latest scored batch.
Per row:
- `name`, `vertical`
- `route.recommended` + `route.rationale` (e.g. "good fit but cold — marketing nurtures")
- `score.fit` vs `score.timing` shown side by side (the axes behind the call)
- controls: **confirm** · **override route** (closer ↔ nurture ↔ hold ↔ reject) · who/`confirmed_by`

**Design tension:** this is a decision queue, not a dashboard. Optimize for fast
confirm/override on a batch — bulk-confirm the obvious, single out the judgment calls.
Show fit vs timing as a tiny 2-axis read so the override decision is visual.

---

## Screen 3 — Attribution Scoreboard (trust layer / John's audit) ⭐ contract-critical

The scoreboard the 5% / 12-mo rev-share settles against. lead → source →
opportunity → closed-won → revenue, plus what's owed. John can audit any time.

**Binds to:** `Attribution` rows + the dashboard math (`engine/attribution/dashboard.py`).
- pipeline funnel by `stage` (counts + conversion)
- per closed-won: `service_fee_monthly`, `machine_sourced` flag, `discovered_by`
  (provenance), `signed_at`, computed 12-mo rev-share (5% × fee × 12)
- totals: qualifying rev-share owed; note that $500/mo floor is **credited, not additive**
- source attribution: which data source produced revenue (ties back to SOURCES.md)

**Design tension:** this screen has to feel *fair and legible to John*, not like a
vendor invoice. Provenance and the machine-sourced flag should be obvious and
auditable. This is the friend-keeps-friend screen.

---

## Screen 4 — Account Detail (drill-in, secondary)

Full picture behind one account when the closer or ops wants to dig.

**Binds to:** one `Account` with everything attached.
- all `signals` (kind, source, detail, value) — the full evidence trail
- `score` breakdown (fit, timing, composite, rationale)
- `route` decision + confirmation history
- enriched contact (name/title/email from `csv-lead-enrichment`)
- the full drafted `Outreach` (subject + body), editable before send
- HubSpot sync state + `stage` timeline

---

## Notes for the design pass

- **Brand:** Centered MKTG builds it; **Sixth City owns it** — design for *their*
  team to live in daily, not a Centered-branded tool. Their HubSpot, their queue.
- **Priority order to design:** Screen 2 (Triage — the new feature) and Screen 3
  (Scoreboard — the trust layer) are the two that don't exist anywhere yet and
  carry the most product risk. Screen 1 is the daily driver. Screen 4 is drill-in.
- **Real data is in `engine/models.py`** — hand those field names to Claude Design
  so the mock data matches what the backend will actually serve.
