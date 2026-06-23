# Google Places Crawler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `GooglePlacesSource` that, on a pre-scored slice, extracts a company's Google Business phone/address (contact) and emits a `LOCAL_SEO_GAP` buying signal (feeds re-scoring).

**Architecture:** A new `DataSource` (mirrors `engine/sources/pagespeed.py`) does a free IDs-only Places Text Search → one field-masked Place Details call. A dedicated second-pass job (`enrich_places.py`) selects the top-N already-enriched net-new accounts by score, runs only this source, re-scores, and flags `places_enriched=True`. Contact data lands in `account.extra`; `enrich_contacts` is extended to prefer the GBP phone.

**Tech Stack:** Python 3.14, SQLAlchemy, `requests`, pytest. Places API (New) v1 (`places.googleapis.com`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-06-23-google-places-crawler-design.md`.
- **Depends on PR #28 merged** — Task 4 extends the `enrich_contacts` shipped there. Branch this work off `main` AFTER #28 merges.
- Dry mode: no `GOOGLE_PLACES_KEY` (already in `engine/config.py` as `CONFIG.google_places_key`) → every network method returns empty, zero API calls. Mirrors Apollo/HubSpot.
- Source registry name (the `source=` on every Signal and the `DataSource.name`): `"google_places"`.
- Field masks are mandatory on every Places call (they set the billing SKU): Text Search → `places.id` only; Place Details → `nationalPhoneNumber,formattedAddress,rating,userRatingCount,websiteUri,businessStatus,displayName`.
- TDD: test first, watch it fail, minimal code, commit per task.
- Run tests with `../.venv/bin/python -m pytest` from `pipeline-engine/`.

---

### Task 1: Add `places_enriched` column + migration

**Files:**
- Modify: `engine/db/models.py` (AccountRow, after the `pursued` column ~line with `pursued`)
- Create: `engine/db/migrate_add_places_enriched.py`
- Test: `tests/test_db_places_enriched.py`

**Interfaces:**
- Produces: `AccountRow.places_enriched: bool` (default `False`); `migrate_add_places_enriched.run_migration(engine)`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_db_places_enriched.py
from engine.db.base import make_engine, create_all, make_session_factory
from engine.db.models import AccountRow


def test_account_row_has_places_enriched_default_false():
    eng = make_engine("sqlite:///:memory:")
    create_all(eng)
    s = make_session_factory(eng)()
    s.add(AccountRow(domain="d0.com", name="D0"))
    s.commit()
    row = s.query(AccountRow).filter_by(domain="d0.com").one()
    assert row.places_enriched is False
```

- [ ] **Step 2: Run test to verify it fails**

Run: `../.venv/bin/python -m pytest tests/test_db_places_enriched.py -v`
Expected: FAIL — `AttributeError: 'AccountRow' object has no attribute 'places_enriched'`

- [ ] **Step 3: Add the column**

In `engine/db/models.py`, in `class AccountRow`, immediately after the `pursued` column line, add:

```python
    places_enriched: Mapped[bool] = mapped_column(Boolean, default=False)  # Places 2nd pass done
```

- [ ] **Step 4: Run test to verify it passes**

Run: `../.venv/bin/python -m pytest tests/test_db_places_enriched.py -v`
Expected: PASS

- [ ] **Step 5: Write the migration (mirror `migrate_add_contacts.py`)**

```python
# engine/db/migrate_add_places_enriched.py
"""One-time, idempotent: add accounts.places_enriched. create_all() won't ALTER the
existing accounts table, so prod (Postgres) needs the column add. Safe to re-run."""
from sqlalchemy import text

from engine.db.base import make_engine, create_all


def run_migration(engine) -> None:
    create_all(engine)
    with engine.begin() as conn:
        conn.execute(text(
            "ALTER TABLE accounts ADD COLUMN IF NOT EXISTS places_enriched BOOLEAN DEFAULT FALSE"))
    print("  accounts.places_enriched ensured")


def main():
    run_migration(make_engine())


if __name__ == "__main__":
    main()
```

- [ ] **Step 6: Commit**

```bash
git add engine/db/models.py engine/db/migrate_add_places_enriched.py tests/test_db_places_enriched.py
git commit -m "feat(db): add accounts.places_enriched column + migration"
```

---

### Task 2: Places match guard + gap-signal (pure functions)

**Files:**
- Create: `engine/sources/google_places.py` (pure helpers only this task)
- Test: `tests/test_google_places_pure.py`

**Interfaces:**
- Produces:
  - `_host(url: str) -> str` — lowercased host, `www.` stripped.
  - `_match_ok(domain: str, name: str, listing: dict) -> bool` — does the listing belong to this account?
  - `gap_signal(listing: dict | None) -> Signal | None` — `LOCAL_SEO_GAP` Signal when GBP weak/absent, else `None`.
  - Constants `_REVIEW_FLOOR = 10`, `_RATING_FLOOR = 4.0`.
- Consumes: `engine.models.Signal`, `SignalKind`.

`listing` shape (from Place Details, all optional): `{"nationalPhoneNumber": str, "formattedAddress": str, "rating": float, "userRatingCount": int, "websiteUri": str, "businessStatus": str, "displayName": {"text": str}}`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_google_places_pure.py
from engine.models import SignalKind
from engine.sources.google_places import _host, _match_ok, gap_signal


def test_host_strips_scheme_and_www():
    assert _host("https://www.AcmeFab.com/contact") == "acmefab.com"
    assert _host("") == ""


def test_match_ok_accepts_matching_domain():
    listing = {"websiteUri": "https://www.acmefab.com", "displayName": {"text": "Acme Fab"}}
    assert _match_ok("acmefab.com", "Acme Fab", listing) is True


def test_match_ok_rejects_wrong_domain_listing():
    listing = {"websiteUri": "https://someoneelse.com", "displayName": {"text": "Other Co"}}
    assert _match_ok("acmefab.com", "Acme Fab", listing) is False


def test_match_ok_falls_back_to_name_when_no_website():
    listing = {"displayName": {"text": "Acme Fabrication LLC"}}
    assert _match_ok("acmefab.com", "Acme Fab", listing) is True
    assert _match_ok("acmefab.com", "Zzz Industries", listing) is False


def test_gap_signal_strong_when_no_listing():
    sig = gap_signal(None)
    assert sig is not None and sig.kind == SignalKind.LOCAL_SEO_GAP
    assert sig.value == 1.0 and "no" in sig.detail.lower()


def test_gap_signal_medium_on_low_review_count():
    sig = gap_signal({"rating": 4.6, "userRatingCount": 3, "websiteUri": "https://acmefab.com"})
    assert sig is not None and sig.value == 0.6


def test_gap_signal_none_when_strong_gbp():
    listing = {"rating": 4.7, "userRatingCount": 120, "websiteUri": "https://acmefab.com"}
    assert gap_signal(listing) is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `../.venv/bin/python -m pytest tests/test_google_places_pure.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'engine.sources.google_places'`

- [ ] **Step 3: Write the pure helpers**

```python
# engine/sources/google_places.py
"""
Google Places (New) source — local-listing crawler for a PRE-SCORED slice.

Two jobs from one listing: (1) contact data (the GBP phone + address — often the
only reliable line for a local SMB), stashed into account.extra; (2) a LOCAL_SEO_GAP
buying signal (weak/absent Google Business Profile = the gap Sixth City sells against).

Cost is controlled by field masks: the Text Search returns ONLY place ids (the free
'IDs Only' SKU); one Place Details call (field-masked) is the sole billable unit, and
the first ~1k/month are free. No GOOGLE_PLACES_KEY -> dry mode (no calls, []).

Pure helpers (_host / _match_ok / gap_signal) are network-free so they're unit-tested
without the API; fetch_* are the only side-effecting parts.
"""
from __future__ import annotations

from engine.models import Signal, SignalKind

_REVIEW_FLOOR = 10      # fewer lifetime reviews than this = thin local presence
_RATING_FLOOR = 4.0     # below this = reputation gap worth a pitch


def _host(url: str) -> str:
    """Lowercased host of a URL, scheme + www. stripped. '' for empty/garbage."""
    u = (url or "").strip().lower()
    if "://" in u:
        u = u.split("://", 1)[1]
    u = u.split("/", 1)[0]
    return u[4:] if u.startswith("www.") else u


def _match_ok(domain: str, name: str, listing: dict) -> bool:
    """True if the listing plausibly belongs to this account. Prefer a domain match
    on the listing's website; if the listing has no website, fall back to name-token
    overlap. Conservative: a non-matching website is a hard reject (never attach a
    stranger's phone)."""
    d = _host(domain)
    site = _host(listing.get("websiteUri", ""))
    if site:
        return site == d or site.endswith("." + d) or d.endswith("." + site)
    listed_name = ((listing.get("displayName") or {}).get("text") or "").lower()
    want = {t for t in name.lower().replace(",", " ").split() if len(t) > 2}
    have = {t for t in listed_name.replace(",", " ").split() if len(t) > 2}
    return bool(want) and len(want & have) >= 1


def gap_signal(listing: dict | None) -> Signal | None:
    """LOCAL_SEO_GAP when the Google Business presence is weak/absent, else None.
    NOTE: abcr._timing treats LOCAL_SEO_GAP as a flat contribution (it ignores value),
    so `value` here is informational strength for the outreach detail / future tuning."""
    if listing is None:
        return Signal(kind=SignalKind.LOCAL_SEO_GAP, source="google_places", value=1.0,
                      detail="No confident Google Business listing found")
    reviews = listing.get("userRatingCount") or 0
    rating = listing.get("rating") or 0.0
    has_site = bool(listing.get("websiteUri"))
    if reviews < _REVIEW_FLOOR:
        return Signal(kind=SignalKind.LOCAL_SEO_GAP, source="google_places", value=0.6,
                      detail=f"Thin Google presence — only {reviews} reviews")
    if rating < _RATING_FLOOR or not has_site:
        why = f"low rating {rating}" if rating < _RATING_FLOOR else "no website linked on GBP"
        return Signal(kind=SignalKind.LOCAL_SEO_GAP, source="google_places", value=0.3,
                      detail=f"Google Business gap — {why}")
    return None
```

- [ ] **Step 4: Run test to verify it passes**

Run: `../.venv/bin/python -m pytest tests/test_google_places_pure.py -v`
Expected: PASS (7 passed)

- [ ] **Step 5: Commit**

```bash
git add engine/sources/google_places.py tests/test_google_places_pure.py
git commit -m "feat(places): match guard + LOCAL_SEO_GAP gap-signal (pure)"
```

---

### Task 3: `GooglePlacesSource` — fetch + enrich (HTTP isolated, dry mode)

**Files:**
- Modify: `engine/sources/google_places.py` (add fetch fns + the DataSource class)
- Test: `tests/test_google_places_source.py`

**Interfaces:**
- Consumes: `_match_ok`, `gap_signal` (Task 2); `engine.sources.base.DataSource`; `engine.config.CONFIG.google_places_key`.
- Produces: `GooglePlacesSource()` with `name="google_places"`, `provides_signals=True`; `enrich(account) -> list[Signal]`; module fns `find_place_id(query: str) -> str | None`, `place_details(place_id: str) -> dict`.
- Side effect of `enrich`: sets `account.extra["places_phone"|"places_address"|"places_rating"|"places_review_count"|"places_website"]` when a confident match is found.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_google_places_source.py
import engine.sources.google_places as gp
from engine.models import Account, SignalKind


def _acct():
    return Account(name="Acme Fab", domain="acmefab.com", city="Cleveland", state="OH")


def test_dry_mode_returns_no_signals_and_makes_no_calls(monkeypatch):
    src = gp.GooglePlacesSource()
    src._dry = True
    called = {"n": 0}
    monkeypatch.setattr(gp, "find_place_id", lambda q: called.__setitem__("n", called["n"] + 1))
    out = src.enrich(_acct())
    assert out == [] and called["n"] == 0


def test_enrich_stashes_contact_and_emits_no_signal_for_strong_gbp(monkeypatch):
    src = gp.GooglePlacesSource()
    src._dry = False
    monkeypatch.setattr(gp, "find_place_id", lambda q: "PLACE1")
    monkeypatch.setattr(gp, "place_details", lambda pid: {
        "nationalPhoneNumber": "(216) 555-1234", "formattedAddress": "1 Main St, Cleveland OH",
        "rating": 4.8, "userRatingCount": 90, "websiteUri": "https://www.acmefab.com",
        "displayName": {"text": "Acme Fab"}})
    acct = _acct()
    out = src.enrich(acct)
    assert acct.extra["places_phone"] == "(216) 555-1234"
    assert acct.extra["places_address"] == "1 Main St, Cleveland OH"
    assert out == []          # strong GBP -> no gap signal


def test_enrich_wrong_domain_match_attaches_no_contact_and_strong_gap(monkeypatch):
    src = gp.GooglePlacesSource()
    src._dry = False
    monkeypatch.setattr(gp, "find_place_id", lambda q: "PLACE1")
    monkeypatch.setattr(gp, "place_details", lambda pid: {
        "nationalPhoneNumber": "(800) 555-0000", "websiteUri": "https://someoneelse.com",
        "displayName": {"text": "Other Co"}})
    acct = _acct()
    out = src.enrich(acct)
    assert "places_phone" not in acct.extra            # never attach a stranger's line
    assert len(out) == 1 and out[0].kind == SignalKind.LOCAL_SEO_GAP and out[0].value == 1.0


def test_enrich_no_listing_found_emits_strong_gap(monkeypatch):
    src = gp.GooglePlacesSource()
    src._dry = False
    monkeypatch.setattr(gp, "find_place_id", lambda q: None)
    out = src.enrich(_acct())
    assert len(out) == 1 and out[0].value == 1.0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `../.venv/bin/python -m pytest tests/test_google_places_source.py -v`
Expected: FAIL — `AttributeError: module 'engine.sources.google_places' has no attribute 'GooglePlacesSource'`

- [ ] **Step 3: Add fetch fns + the DataSource**

Add these imports at the top of `engine/sources/google_places.py` (alongside the existing ones):

```python
import requests

from engine.config import CONFIG
from engine.models import Account
from engine.sources.base import DataSource

_TEXT_SEARCH = "https://places.googleapis.com/v1/places:searchText"
_DETAILS = "https://places.googleapis.com/v1/places/{place_id}"
_DETAILS_MASK = ("nationalPhoneNumber,formattedAddress,rating,userRatingCount,"
                 "websiteUri,businessStatus,displayName")
```

Then append to the module:

```python
def _headers(field_mask: str) -> dict:
    return {"X-Goog-Api-Key": CONFIG.google_places_key,
            "X-Goog-FieldMask": field_mask, "Content-Type": "application/json"}


def find_place_id(query: str) -> str | None:
    """Text Search, IDs-only field mask (the free SKU). First hit's place id, or None."""
    r = requests.post(_TEXT_SEARCH, headers=_headers("places.id"),
                      json={"textQuery": query}, timeout=30)
    r.raise_for_status()
    places = r.json().get("places") or []
    return places[0].get("id") if places else None


def place_details(place_id: str) -> dict:
    """Place Details, field-masked to phone + address + rating + reviews + site (one
    billable call; first ~1k/mo free)."""
    r = requests.get(_DETAILS.format(place_id=place_id), headers=_headers(_DETAILS_MASK),
                     timeout=30)
    r.raise_for_status()
    return r.json()


class GooglePlacesSource(DataSource):
    name = "google_places"
    provides_accounts = False
    provides_signals = True

    def __init__(self) -> None:
        self._dry = not CONFIG.google_places_key

    def discover(self) -> list[Account]:
        return []

    def enrich(self, account: Account) -> list[Signal]:
        if self._dry:
            return []
        query = " ".join(p for p in (account.name, account.city, account.state) if p).strip()
        try:
            place_id = find_place_id(query)
            listing = place_details(place_id) if place_id else None
        except Exception as e:
            print(f"  [google_places] skip {account.domain}: {type(e).__name__}")
            return []
        if listing is not None and _match_ok(account.domain, account.name, listing):
            account.extra = {**(account.extra or {}), **{
                "places_phone": listing.get("nationalPhoneNumber", ""),
                "places_address": listing.get("formattedAddress", ""),
                "places_rating": listing.get("rating"),
                "places_review_count": listing.get("userRatingCount"),
                "places_website": listing.get("websiteUri", ""),
            }}
            sig = gap_signal(listing)
        else:
            sig = gap_signal(None)   # no listing / wrong-domain match -> strong gap, no contact
        return [sig] if sig else []
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `../.venv/bin/python -m pytest tests/test_google_places_source.py -v`
Expected: PASS (4 passed)

- [ ] **Step 5: Commit**

```bash
git add engine/sources/google_places.py tests/test_google_places_source.py
git commit -m "feat(places): GooglePlacesSource fetch + enrich (dry-mode safe)"
```

---

### Task 4: Phone priority in `enrich_contacts` (extends PR #28)

**Files:**
- Modify: `engine/modules/enrichment.py` (the `enrich_contacts` shipped in PR #28)
- Test: `tests/test_enrichment_contacts.py` (append cases)

**Interfaces:**
- Consumes: `account.extra["places_phone"]`, `account.extra["places_address"]` (Task 3); `account.extra["site_phones"]` (existing).
- Produces: `enrich_contacts` return dict gains `contact_address`; `contact_phone` now prefers the GBP phone.

- [ ] **Step 1: Write the failing test (append to the file)**

```python
def test_contact_phone_prefers_places_phone_over_site_phone():
    acct = _acct(places_phone="(216) 555-1234", site_phones=["(330) 555-9876"],
                 places_address="1 Main St, Cleveland OH")
    out = enrich_contacts(acct)
    assert out["contact_phone"] == "(216) 555-1234"   # GBP line wins
    assert out["contact_address"] == "1 Main St, Cleveland OH"


def test_contact_phone_falls_back_to_site_phone_when_no_places():
    acct = _acct(site_phones=["(330) 555-9876"])
    out = enrich_contacts(acct)
    assert out["contact_phone"] == "(330) 555-9876"
    assert out["contact_address"] == ""
```

- [ ] **Step 2: Run test to verify it fails**

Run: `../.venv/bin/python -m pytest tests/test_enrichment_contacts.py -k "places or fall" -v`
Expected: FAIL — `KeyError: 'contact_address'` / `contact_phone` equals the site phone, not the places phone.

- [ ] **Step 3: Update `enrich_contacts`**

Replace the body of `enrich_contacts` in `engine/modules/enrichment.py` with:

```python
def enrich_contacts(account: Account) -> dict:
    """Return contact fields for the account, sourced from the crawl. Phone prefers the
    Google Business line (canonical for a local SMB), then the site-scraped number.
    Name/title stay blank until a decision-maker lookup (Apollo) fills them."""
    extra = account.extra or {}
    emails = _rank_emails(extra.get("site_emails") or [])
    site_phones = extra.get("site_phones") or []
    primary_email = emails[0] if emails else ""
    phone = (extra.get("places_phone") or "").strip() or (site_phones[0] if site_phones else "")
    return {
        "contact_name": "",
        "contact_title": "",
        "contact_email": primary_email,
        "contact_email_source": "site" if primary_email else "",
        "contact_emails": emails,
        "contact_phone": phone,
        "contact_address": (extra.get("places_address") or "").strip(),
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `../.venv/bin/python -m pytest tests/test_enrichment_contacts.py -v`
Expected: PASS (all — the new cases plus the 4 originals).

- [ ] **Step 5: Commit**

```bash
git add engine/modules/enrichment.py tests/test_enrichment_contacts.py
git commit -m "feat(enrichment): prefer Google Business phone + surface address"
```

---

### Task 5: `enrich_places` second-pass job

**Files:**
- Create: `engine/jobs/enrich_places.py`
- Test: `tests/test_enrich_places_job.py`

**Interfaces:**
- Consumes: `GooglePlacesSource` (Task 3); `AccountRow.places_enriched` (Task 1); `engine.db.repo._account_from_row`; `engine.scoring.abcr.score`; `engine.db.models.SignalRow`.
- Produces: `enrich_places.run(session, limit=N, source=None) -> dict` with keys `enriched`, `remaining`.
- Selection: `pushed=False, enriched=True, net_new.is_(True), places_enriched=False`, `order_by(total.desc())`, `limit`. (Dedicated job, not `enrich.run`: the Places pass must NOT re-run the net-new HubSpot check — that already happened in pass 1.)

- [ ] **Step 1: Write the failing test**

```python
# tests/test_enrich_places_job.py
from engine.db.base import make_engine, create_all, make_session_factory
from engine.db.models import AccountRow
from engine.models import Signal, SignalKind
from engine.jobs import enrich_places


class FakePlaces:
    name = "google_places"
    provides_signals = True
    def enrich(self, account):
        account.extra = {**(account.extra or {}), "places_phone": "(216) 555-1234"}
        return [Signal(kind=SignalKind.LOCAL_SEO_GAP, source="google_places",
                       value=1.0, detail="no listing")]


def _session_with(rows):
    eng = make_engine("sqlite:///:memory:")
    create_all(eng)
    s = make_session_factory(eng)()
    for kw in rows:
        s.add(AccountRow(**kw))
    s.commit()
    return s


def test_runs_only_on_enriched_netnew_not_yet_places_rows():
    s = _session_with([
        dict(domain="a.com", name="A", enriched=True, net_new=True, total=90.0),   # eligible
        dict(domain="b.com", name="B", enriched=False, net_new=True, total=95.0),  # not enriched yet
        dict(domain="c.com", name="C", enriched=True, net_new=False, total=80.0),  # in-book
        dict(domain="d.com", name="D", enriched=True, net_new=True, total=70.0,
             places_enriched=True),                                                # already done
    ])
    res = enrich_places.run(s, limit=10, source=FakePlaces())
    assert res["enriched"] == 1
    a = s.query(AccountRow).filter_by(domain="a.com").one()
    assert a.places_enriched is True
    assert a.extra["places_phone"] == "(216) 555-1234"
    assert any(sg.kind == "local_seo_gap" for sg in a.signals)


def test_is_idempotent_second_run_does_nothing():
    s = _session_with([dict(domain="a.com", name="A", enriched=True, net_new=True, total=90.0)])
    enrich_places.run(s, limit=10, source=FakePlaces())
    res = enrich_places.run(s, limit=10, source=FakePlaces())
    assert res["enriched"] == 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `../.venv/bin/python -m pytest tests/test_enrich_places_job.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'engine.jobs.enrich_places'`

- [ ] **Step 3: Write the job**

```python
# engine/jobs/enrich_places.py
"""JOB: Places second pass. Runs the (paid) GooglePlacesSource on the top-N net-new
accounts already enriched by the free sources — NOT the whole list. Attaches contact
data + a LOCAL_SEO_GAP signal, re-scores, and flags places_enriched=True. Resumable
and idempotent: each call takes the next top-N where places_enriched is still False.
Net-new was settled in pass 1, so this job never re-checks HubSpot."""
from __future__ import annotations

from sqlalchemy.orm import Session

from engine.db.models import AccountRow, SignalRow
from engine.db import repo
from engine.scoring import abcr


def run(session: Session, limit: int = 200, source=None) -> dict:
    if source is None:
        from engine.sources.google_places import GooglePlacesSource
        source = GooglePlacesSource()

    rows = (session.query(AccountRow)
            .filter(AccountRow.pushed.is_(False), AccountRow.enriched.is_(True),
                    AccountRow.net_new.is_(True), AccountRow.places_enriched.is_(False))
            .order_by(AccountRow.total.desc())
            .limit(limit).all())

    for row in rows:
        acct = repo._account_from_row(row)
        try:
            sigs = source.enrich(acct)
        except Exception as e:
            print(f"  [enrich_places] {row.domain}: {type(e).__name__}")
            sigs = []
        for s in sigs:
            row.signals.append(SignalRow(kind=s.kind.value, source=s.source,
                                         value=s.value, detail=s.detail, observed_at=s.observed_at))
            acct.signals.append(s)
        acct.score = abcr.score(acct)
        row.fit, row.timing, row.total = acct.score.fit, acct.score.timing, acct.score.total
        row.band, row.score_rationale = acct.score.band, acct.score.rationale
        row.extra = acct.extra or {}
        row.places_enriched = True

    session.commit()
    remaining = (session.query(AccountRow)
                 .filter(AccountRow.pushed.is_(False), AccountRow.enriched.is_(True),
                         AccountRow.net_new.is_(True), AccountRow.places_enriched.is_(False))
                 .count())
    print(f"[enrich_places] enriched {len(rows)}; remaining {remaining}")
    return {"enriched": len(rows), "remaining": remaining}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `../.venv/bin/python -m pytest tests/test_enrich_places_job.py -v`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add engine/jobs/enrich_places.py tests/test_enrich_places_job.py
git commit -m "feat(jobs): enrich_places second pass (top-N, re-score, idempotent)"
```

---

### Task 6: Full-suite regression + migration smoke

**Files:** none (verification only)

- [ ] **Step 1: Run the entire suite**

Run: `../.venv/bin/python -m pytest -q`
Expected: PASS — all prior tests (105 at PR #28 baseline) + the ~15 new ones, zero failures.

- [ ] **Step 2: Migration smoke (sqlite, idempotent re-run)**

Run:
```bash
../.venv/bin/python -c "
from engine.db.base import make_engine
from engine.db.migrate_add_places_enriched import run_migration
e = make_engine('sqlite:///:memory:')
run_migration(e); run_migration(e)
print('migration idempotent OK')"
```
Expected: prints `accounts.places_enriched ensured` twice then `migration idempotent OK`, no error.

- [ ] **Step 3: Commit (if any doc/touch-ups needed; otherwise skip)**

```bash
git commit --allow-empty -m "test: full-suite green + places_enriched migration smoke"
```

---

## Production rollout notes (not code tasks)

- Run `python -m engine.db.migrate_add_places_enriched` against prod Postgres (Railway) before the first `enrich_places` run — `create_all` won't ALTER the existing table.
- `enrich_places.run(session, limit=N)` is the second pass; choose `N` per the cost table in the spec (hundreds/mo ≈ $0). Wire it into the cron chain AFTER the free `enrich` pass.
- Confirm the actual billed SKU in the Cloud billing breakdown after the first batch; tighten the Details field mask if a cheaper tier still returns phone + rating + review count.

## Self-Review

- **Spec coverage:** source (T2/T3) ✓; match guard (T2) ✓; signal thresholds (T2) ✓; contact stash (T3) ✓; phone priority (T4) ✓; `places_enriched` flag + migration (T1) ✓; second pass (T5) ✓; dry mode (T3) ✓; cost field masks (Global Constraints + T3) ✓; deferred velocity — explicitly out of scope, no task ✓.
- **Placeholder scan:** none — every code/test step has full code.
- **Type consistency:** `find_place_id`/`place_details`/`gap_signal`/`_match_ok`/`_host` names and signatures match across T2/T3/T5; `places_*` extra keys match between T3 (writer) and T4 (reader); `enrich_places.run(session, limit, source)` matches T5 test usage.
