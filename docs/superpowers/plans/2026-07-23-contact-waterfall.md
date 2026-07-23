# Contact Waterfall + Triage Affordance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `POST /api/pursue` into a multi-thread merge (Apollo people + free scraped role inboxes + a Google Places phone fallback), and add a discovery-only "Find contacts" affordance to the Triage Board.

**Architecture:** A new pure orchestrator `engine/modules/contact_waterfall.py` merges Apollo people with scraped domain inboxes (deduped by email, Apollo wins) and resolves a company phone (site → else Places). A thin `google_places.lookup_contact` reuses existing Places fetchers without touching the signal path. The endpoint calls the orchestrator, stores contacts, and writes the company phone/address onto `account.extra`. Triage gets a button that calls the existing shared `pursueDomains` and renders a compact result strip.

**Tech Stack:** Python 3.11, FastAPI, SQLAlchemy, pytest; no-build React (Babel-in-browser) for the console.

## Global Constraints

- Never push `main` directly — branch → PR → merge → Railway auto-deploy. (Working branch: `feat/contact-waterfall`.)
- Tests are hermetic: `conftest` forces `DRY_RUN=1`; no test touches live Apollo/Places/HubSpot/HTTP. Monkeypatch all network collaborators.
- No schema migration. `ContactRow.source` already exists; company phone/address ride on the existing JSON `account.extra`.
- No rev-share / attribution / "credit" language anywhere in UI copy.
- Degrade, never raise: every data tier (Apollo, site fetch, Places) fails independently to an empty result; the endpoint never 500s on a dry/failed source.
- Scraped inbox `Contact.source == "site_scrape"`; Apollo contacts keep `source == "apollo"`.

---

### Task 1: Places contact lookup helper

**Files:**
- Modify: `engine/sources/google_places.py` (add `lookup_contact`, top-level, after `place_details`)
- Test: `tests/test_google_places_contact.py`

**Interfaces:**
- Consumes: existing `find_place_id(query) -> str|None`, `place_details(place_id) -> dict`, `_match_ok(domain, name, listing) -> bool`, `CONFIG.google_places_key`.
- Produces: `lookup_contact(name: str, city: str, state: str, domain: str) -> dict | None` returning `{"phone": str, "address": str}` on a domain-matched listing, else `None` (dry / no query / no match / network error).

- [ ] **Step 1: Write the failing test**

```python
# tests/test_google_places_contact.py
"""lookup_contact: company phone/address from Places, dry-safe + match-gated."""
import engine.sources.google_places as gp


def test_dry_returns_none(monkeypatch):
    monkeypatch.setattr(gp.CONFIG, "google_places_key", "", raising=False)
    assert gp.lookup_contact("Acme", "Cleveland", "OH", "acme.com") is None


def test_match_returns_phone_and_address(monkeypatch):
    monkeypatch.setattr(gp.CONFIG, "google_places_key", "KEY", raising=False)
    monkeypatch.setattr(gp, "find_place_id", lambda q: "pid1")
    monkeypatch.setattr(gp, "place_details", lambda pid: {
        "nationalPhoneNumber": "(216) 555-0100",
        "formattedAddress": "1 Main St, Cleveland, OH",
        "websiteUri": "https://acme.com",
    })
    monkeypatch.setattr(gp, "_match_ok", lambda d, n, listing: True)
    got = gp.lookup_contact("Acme", "Cleveland", "OH", "acme.com")
    assert got == {"phone": "(216) 555-0100", "address": "1 Main St, Cleveland, OH"}


def test_wrong_domain_match_returns_none(monkeypatch):
    monkeypatch.setattr(gp.CONFIG, "google_places_key", "KEY", raising=False)
    monkeypatch.setattr(gp, "find_place_id", lambda q: "pid1")
    monkeypatch.setattr(gp, "place_details", lambda pid: {"nationalPhoneNumber": "x"})
    monkeypatch.setattr(gp, "_match_ok", lambda d, n, listing: False)
    assert gp.lookup_contact("Acme", "Cleveland", "OH", "acme.com") is None


def test_network_error_returns_none(monkeypatch):
    import requests
    monkeypatch.setattr(gp.CONFIG, "google_places_key", "KEY", raising=False)
    def boom(q): raise requests.RequestException("down")
    monkeypatch.setattr(gp, "find_place_id", boom)
    assert gp.lookup_contact("Acme", "Cleveland", "OH", "acme.com") is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_google_places_contact.py -v`
Expected: FAIL with `AttributeError: module 'engine.sources.google_places' has no attribute 'lookup_contact'`

- [ ] **Step 3: Write minimal implementation**

Add to `engine/sources/google_places.py` (after `place_details`, before `class GooglePlacesSource`):

```python
def lookup_contact(name: str, city: str, state: str, domain: str) -> dict | None:
    """Company phone/address from Google Places — the waterfall's phone-of-last-resort.
    Reuses the same fetchers as enrich() but returns contact fields instead of a Signal,
    and never mutates. None on dry mode / empty query / no or wrong-domain match / network
    error, so the caller degrades cleanly."""
    if not CONFIG.google_places_key:
        return None
    query = " ".join(p for p in (name, city, state) if p).strip()
    if not query:
        return None
    try:
        place_id = find_place_id(query)
        listing = place_details(place_id) if place_id else None
    except requests.RequestException:
        return None
    if listing is None or not _match_ok(domain, name, listing):
        return None
    return {"phone": listing.get("nationalPhoneNumber", "") or "",
            "address": listing.get("formattedAddress", "") or ""}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_google_places_contact.py -v`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add engine/sources/google_places.py tests/test_google_places_contact.py
git commit -m "feat(places): lookup_contact — company phone/address, dry-safe + match-gated"
```

---

### Task 2: Contact waterfall orchestrator

**Files:**
- Create: `engine/modules/contact_waterfall.py`
- Test: `tests/test_contact_waterfall.py`

**Interfaces:**
- Consumes: `ApolloClient.find_contacts(domain, limit=5) -> list[Contact]`; `engine.sources.site_audit.fetch(domain) -> (html, meta)`, `.extract_emails(html, domain) -> list[str]`, `.extract_phones(html) -> list[str]`; `engine.sources.google_places.lookup_contact(name, city, state, domain) -> dict|None` (Task 1); `engine.models.Contact`. Reads `account.domain/name/city/state/extra` (an `AccountRow`).
- Produces: `PursueResult` dataclass `(contacts: list[Contact], general_phone: str|None, general_address: str|None, phone_source: str)`; `pursue_company(account, apollo, *, fetch=..., places_lookup=...) -> PursueResult`; `_inbox_contact(email: str, domain: str) -> Contact`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_contact_waterfall.py
"""The multi-thread merge: Apollo people + scraped inboxes + a phone fallback."""
from types import SimpleNamespace
from engine.models import Contact
from engine.modules import contact_waterfall as cw


def _acct(domain="acme.com", name="Acme", city="Cleveland", state="OH", extra=None):
    return SimpleNamespace(domain=domain, name=name, city=city, state=state, extra=extra or {})


class _Apollo:
    def __init__(self, people): self._people = people
    def find_contacts(self, domain, limit=5): return self._people


def test_merges_apollo_and_scraped_inboxes():
    apollo = _Apollo([Contact(name="Jane Doe", company_domain="acme.com", title="CMO",
                              email="jane@acme.com", source="apollo")])
    res = cw.pursue_company(
        _acct(), apollo,
        fetch=lambda d: ("<a href='mailto:info@acme.com'>i</a> call (216) 555-0100", {}),
        places_lookup=lambda *a: None)
    emails = {c.email for c in res.contacts}
    assert emails == {"jane@acme.com", "info@acme.com"}
    inbox = [c for c in res.contacts if c.email == "info@acme.com"][0]
    assert inbox.name == "Info" and inbox.title == "General inbox" and inbox.source == "site_scrape"
    assert res.general_phone == "+12165550100" and res.phone_source == "site"


def test_apollo_wins_on_email_collision():
    apollo = _Apollo([Contact(name="Jane Doe", company_domain="acme.com", title="CMO",
                              email="info@acme.com", source="apollo")])
    res = cw.pursue_company(
        _acct(), apollo,
        fetch=lambda d: ("mailto:info@acme.com", {}),
        places_lookup=lambda *a: None)
    assert len(res.contacts) == 1
    assert res.contacts[0].source == "apollo" and res.contacts[0].title == "CMO"


def test_emailless_apollo_person_kept():
    apollo = _Apollo([Contact(name="No Email", company_domain="acme.com", title="Owner",
                              email="", source="apollo")])
    res = cw.pursue_company(_acct(), apollo, fetch=lambda d: ("", {}), places_lookup=lambda *a: None)
    assert len(res.contacts) == 1 and res.contacts[0].name == "No Email"


def test_prefers_prescraped_extra_over_fetch():
    apollo = _Apollo([])
    def _fetch(d): raise AssertionError("should not fetch when extra is populated")
    res = cw.pursue_company(
        _acct(extra={"site_emails": ["hello@acme.com"], "site_phones": ["+12160001111"]}),
        apollo, fetch=_fetch, places_lookup=lambda *a: None)
    assert res.contacts[0].email == "hello@acme.com"
    assert res.general_phone == "+12160001111" and res.phone_source == "site"


def test_places_phone_fallback_when_no_site_phone():
    apollo = _Apollo([])
    res = cw.pursue_company(
        _acct(), apollo,
        fetch=lambda d: ("no phone here", {}),
        places_lookup=lambda name, city, state, domain: {"phone": "(216) 555-9999",
                                                         "address": "1 Main St"})
    assert res.general_phone == "(216) 555-9999" and res.phone_source == "places"
    assert res.general_address == "1 Main St"


def test_all_dry_returns_empty():
    res = cw.pursue_company(_acct(), _Apollo([]), fetch=lambda d: ("", {}),
                            places_lookup=lambda *a: None)
    assert res.contacts == [] and res.general_phone is None and res.phone_source == "none"


def test_fetch_failure_degrades():
    def boom(d): raise RuntimeError("network")
    res = cw.pursue_company(_acct(), _Apollo([]), fetch=boom, places_lookup=lambda *a: None)
    assert res.contacts == [] and res.phone_source == "none"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_contact_waterfall.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'engine.modules.contact_waterfall'`

- [ ] **Step 3: Write minimal implementation**

Create `engine/modules/contact_waterfall.py`:

```python
"""Multi-thread contact discovery for a pursued company.

Merges Apollo decision-makers with FREE scraped domain inboxes (deduped by email, Apollo
wins), and resolves one company phone (homepage scrape first, Google Places as the
last-resort fallback). Collaborators are injected so the unit path hits no live network.

Why merge, not pure-waterfall: for SMB/local, scraped role inboxes (info@, sales@) are
first-class targets — owners actually read them — so we surface them ALONGSIDE Apollo, not
only when Apollo comes back empty. Phones are company-level context, never Contact rows,
except the UI promotes the phone to the primary CTA when there's no sendable contact.
"""
from __future__ import annotations

from dataclasses import dataclass

from engine.models import Contact
from engine.sources import google_places, site_audit

# Role-inbox local-parts we label rather than treat as a person's name.
_ROLE_WORDS = {"info", "sales", "contact", "hello", "admin", "office",
               "support", "team", "marketing", "hi", "mail"}


@dataclass
class PursueResult:
    contacts: list[Contact]
    general_phone: str | None
    general_address: str | None
    phone_source: str          # "site" | "places" | "none"


def _inbox_contact(email: str, domain: str) -> Contact:
    """A scraped domain inbox as a first-class, sendable Contact. Named from the local
    part (info@ -> 'Info'); title 'General inbox'; source flags it so compose greets it
    neutrally (never 'Hi Info')."""
    local = email.split("@", 1)[0]
    label = local.replace(".", " ").replace("_", " ").replace("-", " ").strip().title()
    return Contact(name=label or "General inbox", company_domain=domain,
                   title="General inbox", email=email, source="site_scrape")


def pursue_company(account, apollo, *, fetch=site_audit.fetch,
                   places_lookup=google_places.lookup_contact) -> PursueResult:
    domain = (getattr(account, "domain", "") or "").strip().lower()

    # 1. Apollo — the decision-makers (kept even when email is blank).
    people = apollo.find_contacts(domain, limit=5) if domain else []

    # 2. Site-scrape (free) — prefer already-enriched extra, else one live fetch.
    extra = getattr(account, "extra", None) or {}
    site_emails = list(extra.get("site_emails") or [])
    site_phones = list(extra.get("site_phones") or [])
    if not site_emails and not site_phones:
        html = ""
        try:
            html, _ = fetch(domain)
        except Exception:
            html = ""   # SSRF block / network / bad response -> no scraped contacts
        if html:
            site_emails = site_audit.extract_emails(html, domain)
            site_phones = site_audit.extract_phones(html)

    # Merge: Apollo first (wins on email), then scraped inboxes not already present.
    contacts = list(people)
    have = {(c.email or "").strip().lower() for c in people if c.email}
    for addr in site_emails:
        a = (addr or "").strip().lower()
        if a and a not in have:
            contacts.append(_inbox_contact(a, domain))
            have.add(a)

    # 3. Phone — homepage first, else Places fallback.
    general_phone = site_phones[0] if site_phones else ""
    general_address = ""
    phone_source = "site" if general_phone else "none"
    if not general_phone:
        found = places_lookup(getattr(account, "name", ""), getattr(account, "city", ""),
                              getattr(account, "state", ""), domain)
        if found:
            general_phone = found.get("phone") or ""
            general_address = found.get("address") or ""
            if general_phone:
                phone_source = "places"

    return PursueResult(contacts=contacts,
                        general_phone=general_phone or None,
                        general_address=general_address or None,
                        phone_source=phone_source)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_contact_waterfall.py -v`
Expected: PASS (7 tests). Note: `+12165550100` is `extract_phones`' normalized form — if the real normalizer differs, read `engine/sources/site_audit.py::_norm_phone` and match the test to it rather than the code to the test.

- [ ] **Step 5: Commit**

```bash
git add engine/modules/contact_waterfall.py tests/test_contact_waterfall.py
git commit -m "feat(waterfall): pursue_company merges Apollo + scraped inboxes + phone fallback"
```

---

### Task 3: Neutral greeting for scraped inboxes

**Files:**
- Modify: `engine/modules/draft_cold_email.py:85`
- Test: `tests/test_draft_inbox_greeting.py`

**Interfaces:**
- Consumes: `draft(account, live=False, contact=None) -> Outreach`; `Contact.source`.
- Produces: unchanged signature; behavior — a `source == "site_scrape"` contact greets "Hi", not "Hi {label}".

- [ ] **Step 1: Write the failing test**

```python
# tests/test_draft_inbox_greeting.py
"""Scraped inboxes greet neutrally; real people still greet by first name."""
from engine.models import Account, Contact, Vertical
from engine.modules import draft_cold_email


def _acct():
    return Account(name="Acme", domain="acme.com", vertical=Vertical.UNKNOWN)


def test_scraped_inbox_greets_neutrally():
    inbox = Contact(name="Info", company_domain="acme.com", title="General inbox",
                    email="info@acme.com", source="site_scrape")
    body = draft_cold_email.draft(_acct(), contact=inbox).body
    assert body.startswith("Hi —") and "Hi Info" not in body


def test_named_person_still_greets_by_first_name():
    person = Contact(name="Jane Doe", company_domain="acme.com", title="CMO",
                     email="jane@acme.com", source="apollo")
    body = draft_cold_email.draft(_acct(), contact=person).body
    assert body.startswith("Hi Jane")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_draft_inbox_greeting.py -v`
Expected: FAIL — `test_scraped_inbox_greets_neutrally` asserts `Hi —` but body starts `Hi Info —`.

- [ ] **Step 3: Write minimal implementation**

In `engine/modules/draft_cold_email.py`, change line 85 from:

```python
    first = contact.name.split()[0] if contact and contact.name else ""
```

to:

```python
    # Scraped role inboxes (info@, sales@) carry a label, not a person's name — greet them
    # neutrally so we never send "Hi Info".
    first = (contact.name.split()[0]
             if contact and contact.name and contact.source != "site_scrape" else "")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_draft_inbox_greeting.py -v`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add engine/modules/draft_cold_email.py tests/test_draft_inbox_greeting.py
git commit -m "feat(draft): neutral greeting for scraped role inboxes"
```

---

### Task 4: Wire the waterfall into /api/pursue and /api/contacts

**Files:**
- Modify: `web/server.py` (`pursue` at `:403`, `contacts` at `:419`)
- Test: `tests/test_contacts.py` (extend)

**Interfaces:**
- Consumes: `contact_waterfall.pursue_company(row, apollo) -> PursueResult` (Task 2); `repo.store_contacts`, `_contact_dict`, `AccountRow`.
- Produces: `POST /api/pursue` per-domain row `{domain, contacts_found, contacts, general_phone, general_address, phone_source}` + top-level `apollo_configured`; `GET /api/contacts` returns `{domain, contacts, general_phone, general_address, phone_source}`.

- [ ] **Step 1: Write the failing test**

Append to `tests/test_contacts.py`:

```python
def test_pursue_merges_scraped_inbox_and_phone(client, monkeypatch):
    client.post("/api/ingest", files={"file": ("c.csv", io.BytesIO(CSV.encode()), "text/csv")})
    # Apollo returns nothing (thin SMB coverage); the free scrape carries the pursue.
    monkeypatch.setattr("engine.apollo.client.ApolloClient.find_contacts",
                        lambda self, domain, limit=5: [])
    monkeypatch.setattr("engine.sources.site_audit.fetch",
                        lambda d, **k: ("email info@buckeye.example call (216) 555-0100", {}))
    r = client.post("/api/pursue", json={"domains": ["buckeye.example"]})
    row = r.json()["pursued"][0]
    assert any(c["email"] == "info@buckeye.example" for c in row["contacts"])
    assert row["general_phone"] == "+12165550100" and row["phone_source"] == "site"

    g = client.get("/api/contacts?domain=buckeye.example").json()
    assert g["general_phone"] == "+12165550100" and g["phone_source"] == "site"


def test_pursue_phone_only_promotes(client, monkeypatch):
    client.post("/api/ingest", files={"file": ("c.csv", io.BytesIO(CSV.encode()), "text/csv")})
    monkeypatch.setattr("engine.apollo.client.ApolloClient.find_contacts",
                        lambda self, domain, limit=5: [])
    monkeypatch.setattr("engine.sources.site_audit.fetch", lambda d, **k: ("nothing", {}))
    monkeypatch.setattr("engine.sources.google_places.lookup_contact",
                        lambda name, city, state, domain: {"phone": "(216) 555-1200", "address": "1 Main"})
    r = client.post("/api/pursue", json={"domains": ["buckeye.example"]})
    row = r.json()["pursued"][0]
    assert row["contacts"] == [] and row["general_phone"] == "(216) 555-1200"
    assert row["phone_source"] == "places" and row["general_address"] == "1 Main"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_contacts.py -v -k "merges_scraped or phone_only"`
Expected: FAIL — `KeyError: 'general_phone'` (endpoint doesn't return it yet).

- [ ] **Step 3: Write minimal implementation**

Replace the `pursue` function body in `web/server.py` (`:403`) with:

```python
@app.post("/api/pursue")
def pursue(req: PushRequest, session=Depends(db_session)):
    """Operator commits to opportunities -> multi-thread discovery per company: Apollo
    decision-makers + free scraped role inboxes (merged, deduped) + a company phone
    (homepage, else Google Places). Contacts are stored; the phone/address ride on
    account.extra. Dry sources degrade to empty — never 500."""
    from engine.apollo.client import ApolloClient
    from engine.modules import contact_waterfall
    apollo = ApolloClient()
    out = []
    for domain in req.domains:
        row = session.get(AccountRow, domain)
        if row is None:
            out.append({"domain": domain, "contacts_found": 0, "contacts": [],
                        "general_phone": None, "general_address": None, "phone_source": "none"})
            continue
        result = contact_waterfall.pursue_company(row, apollo)
        n = repo.store_contacts(session, domain, result.contacts)   # commits contacts + pursued
        row = session.get(AccountRow, domain)
        row.extra = {**(row.extra or {}),
                     "general_phone": result.general_phone,
                     "general_address": result.general_address,
                     "phone_source": result.phone_source}
        session.commit()
        out.append({"domain": domain, "contacts_found": n,
                    "contacts": [_contact_dict(c) for c in result.contacts],
                    "general_phone": result.general_phone,
                    "general_address": result.general_address,
                    "phone_source": result.phone_source})
    return {"pursued": out, "apollo_configured": not apollo.dry}
```

Replace the `contacts` function body (`:419`) with:

```python
@app.get("/api/contacts")
def contacts(domain: str, session=Depends(db_session)):
    """The decision-makers + company phone/address sourced for a pursued company
    (empty until pursued)."""
    row = session.get(AccountRow, domain)
    extra = (row.extra or {}) if row else {}
    return {"domain": domain,
            "contacts": [_contact_dict(c) for c in repo.get_contacts(session, domain)],
            "general_phone": extra.get("general_phone"),
            "general_address": extra.get("general_address"),
            "phone_source": extra.get("phone_source", "none")}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_contacts.py -v`
Expected: PASS — the two new tests plus the pre-existing `test_pursue_stores_lists_and_flags` (backward-compatible superset).

- [ ] **Step 5: Run the full suite (no regressions)**

Run: `pytest -q`
Expected: all green (prior count + new tests). If `test_pursue_stores_lists_and_flags` fails on a missing `fetch` monkeypatch, note that Apollo returning a real contact means the scrape still runs — that test's Apollo stub returns a person with an email and no `site_audit.fetch` patch, so `pursue_company` will attempt a live fetch. Guard it: in that existing test, add `monkeypatch.setattr("engine.sources.site_audit.fetch", lambda d, **k: ("", {}))` before the pursue call.

- [ ] **Step 6: Commit**

```bash
git add web/server.py tests/test_contacts.py
git commit -m "feat(api): /api/pursue multi-thread merge + phone on extra; /api/contacts returns phone"
```

---

### Task 5: Triage "Find contacts" affordance (discovery-only)

**Files:**
- Modify: `web/console/app/data.jsx` (`fetchContacts` at `:194` — return the phone block)
- Modify: `web/console/app/triage.jsx` (per-card button + result strip)

**Interfaces:**
- Consumes: `data.jsx` `pursueDomains(domains) -> {pursued:[{domain, contacts, general_phone, general_address, phone_source}], apollo_configured}` (Task 4).
- Produces: a compact, discovery-only strip on each Triage card. No compose/send UI (that stays in Morning Queue).

**Note:** The console is no-build React (Babel-in-browser), so this task is verified live in a scratchpad sqlite, not by pytest — per the established pattern. Never run against prod; keep `DRY_RUN=1`.

- [ ] **Step 1: Extend `fetchContacts` to return the phone block**

In `web/console/app/data.jsx`, replace `fetchContacts` (`:194`):

```javascript
async function fetchContacts(domain) {
  const r = await fetch("/api/contacts?domain=" + encodeURIComponent(domain));
  const j = await r.json().catch(() => ({}));
  return { contacts: j.contacts || [], general_phone: j.general_phone || null,
           general_address: j.general_address || null, phone_source: j.phone_source || "none" };
}
```

Search the codebase for existing `fetchContacts(` callers and update them to read `.contacts`:

Run: `grep -rn "fetchContacts(" web/console/app/`
For each caller (e.g. `accounts.jsx`, `queue.jsx`), change `const contacts = await fetchContacts(d)` to `const { contacts } = await fetchContacts(d)`. If a caller already destructures or only needs contacts, keep it reading `.contacts`.

- [ ] **Step 2: Add the button + result strip to Triage cards**

In `web/console/app/triage.jsx`, inside the per-card render (near the route toggle / Confirm button), add local state and a handler. Use the file's existing React access pattern (`const { useState } = React;` at the top of the component). Add:

```javascript
// --- Find contacts (discovery only; compose/send lives in Morning Queue) ---
const [finding, setFinding] = useState(false);
const [found, setFound] = useState(null);   // {contacts, general_phone, phone_source} | null

async function onFindContacts() {
  setFinding(true);
  try {
    const res = await PE.pursueDomains([card.domain]);
    const row = (res.pursued || []).find(p => p.domain === card.domain) || {};
    setFound({ contacts: row.contacts || [], general_phone: row.general_phone || null,
               phone_source: row.phone_source || "none" });
  } catch (e) {
    setFound({ contacts: [], general_phone: null, phone_source: "error" });
  } finally {
    setFinding(false);
  }
}
```

Render, below the route toggle:

```javascript
{!found && (
  <button className="pe-btn pe-btn-ghost" onClick={onFindContacts} disabled={finding}>
    {finding ? "Finding…" : "Find contacts"}
  </button>
)}
{found && (
  <div className="pe-contact-strip">
    {found.contacts.length > 0 ? (
      found.contacts.map((c, i) => (
        <div className="pe-contact-row" key={i}>
          <span className="pe-contact-name">{c.name}</span>
          {c.title ? <span className="pe-contact-title"> · {c.title}</span> : null}
          {c.email ? <span className="pe-contact-email"> · {c.email}</span> : null}
        </div>
      ))
    ) : found.general_phone ? (
      <a className="pe-btn pe-btn-primary" href={"tel:" + found.general_phone}>
        Call {found.general_phone}
      </a>
    ) : found.phone_source === "error" ? (
      <span className="pe-muted">Couldn’t look up contacts — try again.</span>
    ) : (
      <span className="pe-muted">No contact found.</span>
    )}
  </div>
)}
```

Reuse existing class names where the file already defines button/muted styles; if `pe-contact-strip`/`pe-contact-row` don't exist, add minimal rules to the console stylesheet the other screens use (match `accounts.jsx`'s contact list styling — grep `pe-contact` there first and reuse those exact classes).

- [ ] **Step 3: Verify live in a scratchpad sqlite (never prod)**

```bash
cd "$(git rev-parse --show-toplevel)"
DRY_RUN=1 DATABASE_URL="sqlite:///$TMPDIR/triage_contacts.db" \
  python3 -c "import uvicorn; uvicorn.run('web.server:app', host='127.0.0.1', port=8099)" &
# Seed one net-new, in-market company, then drive the browser to /#triage.
```

Use the browser tools (or the project's `run` skill) to: open the console, go to Triage, click **Find contacts** on a card. With no `APOLLO_API_KEY`/`GOOGLE_PLACES_KEY` set, expect either scraped contacts (if the seeded domain resolves) or "No contact found." — the point is the button runs, the strip renders, and nothing 500s. Confirm the network tab shows one `POST /api/pursue`.

Expected: button → "Finding…" → strip renders (contacts, Call chip, or empty line). No console errors.

- [ ] **Step 4: Commit**

```bash
git add web/console/app/data.jsx web/console/app/triage.jsx
git commit -m "feat(ui): Triage 'Find contacts' — discovery-only strip with call fallback"
```

---

## Self-Review

**Spec coverage:**
- Multi-thread merge (Apollo + scrape) → Task 2. ✓
- Scraped inboxes as first-class sendable contacts → Task 2 (`_inbox_contact`) + Task 4 (stored/returned). ✓
- Phone promotion when no sendable contact → Task 2 (`phone_source`/`general_phone`) + Task 5 (Call chip). ✓
- Places phone fallback (gated on no site phone, dry-safe) → Task 1 + Task 2. ✓
- Neutral greeting for inboxes → Task 3. ✓
- Triage discovery-only affordance, no compose duplication → Task 5. ✓
- No migration; `extra`-carried phone; `ContactRow.source` reused → Tasks 2/4. ✓
- Degrade-never-raise across all tiers → Task 2 (try/except fetch; dry Apollo/Places) + endpoint. ✓
- Company block on `/api/contacts` (one call for the UI) → Task 4. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code. Task 5 verification is intentionally live-in-browser (no-build React) with an explicit expected outcome. ✓

**Type consistency:** `pursue_company(account, apollo, *, fetch=, places_lookup=)` and `PursueResult(contacts, general_phone, general_address, phone_source)` are consistent Tasks 2/4. `_inbox_contact(email, domain)` used only in Task 2. `lookup_contact(name, city, state, domain)` consistent Tasks 1/2. `fetchContacts` return shape `{contacts, general_phone, general_address, phone_source}` consistent Tasks 4/5. `Contact.source` values `"apollo"`/`"site_scrape"` consistent Tasks 2/3/4. ✓

**Known adjustment flagged inline:** the pre-existing `test_pursue_stores_lists_and_flags` needs a `site_audit.fetch` stub added (Task 4 Step 5) because pursue now scrapes in addition to Apollo.
