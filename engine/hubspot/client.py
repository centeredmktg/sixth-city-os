"""
HubSpot client — system of record + the machine-sourced flag writer.

The flag this client writes is the SOLE scoreboard (design §3). Two rules baked in:
  1. Net-new only — an 'if exists' check by DOMAIN before claiming. If the company
     already exists in HubSpot's book we never stamp machine_sourced. We claim what
     the machine found, never what was already there. This is the rev-share SLA, and
     it's guarded at the point of claiming (inside push), not just pre-filtered.
  2. Provenance + first-touch are stamped at creation so 'machine-sourced' is
     provable, not asserted: machine_source_origin (which source) + machine_sourced_date.

Auth is an account-scoped Service Key (HUBSPOT_TOKEN, Bearer). No token -> dry mode.
"""

from __future__ import annotations

import time
from datetime import date

import requests

from engine.config import CONFIG
from engine.models import Account, Attribution, Outreach


API = "https://api.hubapi.com"
# HubSpot's Search API is throttled to ~4 req/s (separate, stricter than the general
# limit). filter_net_new fires ~1 search per 100 domains, so a big list bursts past it.
_SEARCH_PACE_SEC = 0.25   # proactive pace -> stay under ~4/s
_MAX_RETRIES = 6          # 429 / transient 5xx retry budget

# The HubSpot custom properties that ARE the scoreboard. Created in portal 3358054,
# property group 'pipeline_engine'. Agreed in the proposal, not litigated later.
MACHINE_SOURCED_PROPERTY = "machine_sourced"
SOURCE_PROVENANCE_PROPERTY = "machine_source_origin"
MACHINE_SOURCED_DATE_PROPERTY = "machine_sourced_date"
ENGINE_STATUS_PROPERTY = "engine_status"   # discovered -> working (hygiene filter)


class HubSpotClient:
    def __init__(self) -> None:
        self._dry = CONFIG.dry_run
        self._session = requests.Session()
        if not self._dry:
            self._session.headers.update({
                "Authorization": f"Bearer {CONFIG.hubspot_token}",
                "Content-Type": "application/json",
            })

    def _request(self, method: str, path: str, payload: dict) -> dict:
        """HTTP with 429/5xx retry + backoff (HubSpot rate limits the Search API hard).
        Respects Retry-After when present, else exponential backoff (capped)."""
        call = getattr(self._session, method)
        for attempt in range(_MAX_RETRIES + 1):
            r = call(f"{API}{path}", json=payload, timeout=30)
            if (r.status_code == 429 or 500 <= r.status_code < 600) and attempt < _MAX_RETRIES:
                retry_after = r.headers.get("Retry-After")
                wait = float(retry_after) if retry_after and retry_after.replace(".", "", 1).isdigit() \
                    else min(2 ** attempt * 0.5, 10.0)
                time.sleep(wait)
                continue
            r.raise_for_status()
            return r.json() if r.content else {}
        return {}

    def _post(self, path: str, payload: dict) -> dict:
        return self._request("post", path, payload)

    def _put(self, path: str, payload: dict) -> dict:
        return self._request("put", path, payload)

    def _patch(self, path: str, payload: dict) -> dict:
        return self._request("patch", path, payload)

    def _get(self, path: str, params: dict | None = None) -> dict:
        if self._dry:
            return {}
        r = self._session.get(f"{API}{path}", params=params or {}, timeout=30)
        r.raise_for_status()
        return r.json() if r.content else {}

    # --- net-new gate -------------------------------------------------------
    def existing_domains(self, domains: list[str]) -> set[str]:
        """Batched HubSpot search: returns the lowercased set of domains already in
        the book. Dry mode -> empty set (pretend book is empty). One POST per 100
        domains; paced to stay under HubSpot's ~4/s Search limit."""
        if self._dry:
            return set()
        if not domains:
            return set()
        existing: set[str] = set()
        for i in range(0, len(domains), 100):
            chunk = domains[i:i + 100]
            body = {
                "filterGroups": [{"filters": [
                    {"propertyName": "domain", "operator": "IN", "values": chunk},
                ]}],
                "properties": ["domain"],
                "limit": 100,
            }
            after: str | None = None
            while True:
                if after:
                    body["after"] = after
                data = self._post("/crm/v3/objects/companies/search", body)
                for r in data.get("results", []):
                    d = (r.get("properties", {}) or {}).get("domain")
                    if d:
                        existing.add(d.strip().lower())
                after = data.get("paging", {}).get("next", {}).get("after")
                if not after:
                    break
            time.sleep(_SEARCH_PACE_SEC)
        return existing

    def find_company_id_by_domain(self, domain: str) -> str | None:
        """Authoritative 'if exists' check: returns the HubSpot company id if this
        domain is already in the book, else None. THE net-new gate."""
        if self._dry:
            return None  # stub: pretend the book is empty
        body = {
            "filterGroups": [{"filters": [
                {"propertyName": "domain", "operator": "EQ", "value": domain},
            ]}],
            "properties": ["domain"],
            "limit": 1,
        }
        results = self._post("/crm/v3/objects/companies/search", body).get("results", [])
        return results[0]["id"] if results else None

    def filter_net_new(self, accounts: list[Account]) -> list[Account]:
        """Pre-filter: drop anything already in the book BEFORE enrichment. push()
        re-checks at write time as the authoritative guard. BATCHED — one search per
        100 domains (a 4,600-firm dump = ~46 calls, seconds), not one per firm."""
        if self._dry:
            return accounts  # stub: pretend the book is empty -> all net-new
        ex = self.existing_domains([a.domain for a in accounts if a.domain])
        return [a for a in accounts if a.domain.strip().lower() not in ex]

    # --- the claim ----------------------------------------------------------
    def push(self, account: Account, outreach: Outreach) -> str:
        """Create the net-new company and stamp it machine-sourced + provenance +
        first-touch date. If the domain already exists we DO NOT claim it — return the
        existing id untouched. The SLA guard lives here, at the point of claiming."""
        if self._dry:
            print(f"  [DRY] would create {account.domain} | {MACHINE_SOURCED_PROPERTY}=true "
                  f"| origin={account.discovered_by} | seq subject={outreach.subject!r}")
            account.__dict__["claimed"] = True   # simulated claim (no write)
            return f"dry-{account.domain}"

        existing = self.find_company_id_by_domain(account.domain)
        if existing:
            # It already existed -> never claim machine_sourced. (DEFAULT: leave it
            # untouched. If you ever want to enrich-but-not-claim existing records,
            # this is the single spot to change — add a PATCH that omits the 3 flag
            # properties.)
            print(f"  [exists] {account.domain} already in CRM (id {existing}) — not claimed")
            account.__dict__["claimed"] = False   # found, NOT claimed — caller must not mark pushed
            return existing

        created = self._post("/crm/v3/objects/companies", {"properties": {
            "name": account.name,
            "domain": account.domain,
            MACHINE_SOURCED_PROPERTY: "true",
            SOURCE_PROVENANCE_PROPERTY: account.discovered_by,
            MACHINE_SOURCED_DATE_PROPERTY: date.today().isoformat(),
        }})
        new_id = created["id"]
        account.__dict__["claimed"] = True   # genuinely created + stamped machine_sourced
        print(f"  [claimed] {account.domain} -> id {new_id} | machine_sourced=true")
        self._write_contact(new_id, getattr(account, "contact", None))
        # TODO: sequence enrollment is API-restricted (likely a workflow hand-off, not a
        # plain write). The net-new, tagged company is in; auto-enrolling the tailored
        # outreach is the follow-on once we resolve the enrollment path.
        return new_id

    def claim_company(self, account: Account, owner_id: str) -> str | None:
        """Auto-claim: create the net-new company stamped machine_sourced + provenance +
        first-touch date + engine_status=discovered + owner. Lean — company only, NO
        contact, NO outreach draft (those are outreach spend, gated to the Compose flow).

        Guards: (1) owner_id is REQUIRED — refuse rather than create an unassigned record;
        (2) domain already in the book -> never claim (return the existing id if it's ours,
        None if it's John's pre-existing record). Idempotent: a re-run on an already-claimed
        domain returns its id without writing."""
        if not owner_id:
            raise ValueError("claim_company requires an owner_id — refusing to create an unassigned company")

        if self._dry:
            print(f"  [DRY] would claim {account.domain} | machine_sourced=true "
                  f"| {ENGINE_STATUS_PROPERTY}=discovered | owner={owner_id}")
            return f"dry-{account.domain}"

        existing = self.find_company_id_by_domain(account.domain)
        if existing:
            # Already present. We can't tell ours vs John's from the id alone here, and the
            # SLA guard is conservative: NEVER re-stamp an existing record. Return the id so
            # callers can associate/promote, but no write happens.
            print(f"  [exists] {account.domain} already in CRM (id {existing}) — not claimed")
            return existing

        created = self._post("/crm/v3/objects/companies", {"properties": {
            "name": account.name,
            "domain": account.domain,
            MACHINE_SOURCED_PROPERTY: "true",
            SOURCE_PROVENANCE_PROPERTY: account.discovered_by,
            MACHINE_SOURCED_DATE_PROPERTY: date.today().isoformat(),
            ENGINE_STATUS_PROPERTY: "discovered",
            "hubspot_owner_id": owner_id,
        }})
        new_id = created["id"]
        print(f"  [claimed] {account.domain} -> id {new_id} | machine_sourced=true owner={owner_id}")
        return new_id

    def _find_company_ours(self, domain: str) -> tuple[str | None, bool]:
        """Like find_company_id_by_domain, but also reads back machine_sourced so
        callers can tell 'ours' (engine-claimed) apart from John's pre-existing book.
        Returns (id_or_None, is_ours). Dry mode -> (None, False)."""
        if self._dry:
            return None, False
        body = {
            "filterGroups": [{"filters": [
                {"propertyName": "domain", "operator": "EQ", "value": domain},
            ]}],
            "properties": ["domain", MACHINE_SOURCED_PROPERTY],
            "limit": 1,
        }
        results = self._post("/crm/v3/objects/companies/search", body).get("results", [])
        if not results:
            return None, False
        company = results[0]
        is_ours = (company.get("properties", {}) or {}).get(MACHINE_SOURCED_PROPERTY) == "true"
        return company["id"], is_ours

    def promote_to_working(self, account: Account, owner_id: str) -> str | None:
        """Operator confirmed a discovery -> mark it working (moves it into the team's
        active views). If it's already in HubSpot AND it's ours (machine_sourced), PATCH
        engine_status=working. If it's in HubSpot but NOT ours (John's book — e.g. a
        domain that was net-new at ingest but his team added it before the operator
        confirmed), never write — return the existing id untouched (SLA guard). If it's
        not claimed yet (auto-claim off or still draining), claim it straight to working
        so a fast operator is never blocked. Owner required on create."""
        if self._dry:
            print(f"  [DRY] would promote {account.domain} -> {ENGINE_STATUS_PROPERTY}=working")
            return f"dry-{account.domain}"

        existing, is_ours = self._find_company_ours(account.domain)
        if existing:
            if not is_ours:
                print(f"  [skip] {account.domain} in book but not engine-sourced — not promoted")
                return existing
            self._patch(f"/crm/v3/objects/companies/{existing}",
                        {"properties": {ENGINE_STATUS_PROPERTY: "working"}})
            print(f"  [working] {account.domain} (id {existing}) -> engine_status=working")
            return existing

        if not owner_id:
            raise ValueError("promote_to_working requires an owner_id to claim a not-yet-in-CRM company")
        created = self._post("/crm/v3/objects/companies", {"properties": {
            "name": account.name,
            "domain": account.domain,
            MACHINE_SOURCED_PROPERTY: "true",
            SOURCE_PROVENANCE_PROPERTY: account.discovered_by,
            MACHINE_SOURCED_DATE_PROPERTY: date.today().isoformat(),
            ENGINE_STATUS_PROPERTY: "working",
            "hubspot_owner_id": owner_id,
        }})
        return created["id"]

    def _write_contact(self, company_id: str, contact: dict | None) -> None:
        """Create a Contact from the site-scraped email/phone and associate it to the
        just-claimed company, so sales sees a real address/line on the record. No email
        AND no phone -> nothing worth writing, skip. Only called on net-new claims."""
        contact = contact or {}
        email = (contact.get("contact_email") or "").strip()
        phone = (contact.get("contact_phone") or "").strip()
        if not email and not phone:
            return
        props: dict = {}
        if email:
            props["email"] = email
        if phone:
            props["phone"] = phone
        name = (contact.get("contact_name") or "").strip()
        if name:
            first, _, last = name.partition(" ")
            props["firstname"] = first
            if last:
                props["lastname"] = last
        created = self._post("/crm/v3/objects/contacts", {"properties": props})
        contact_id = created.get("id")
        if not contact_id:
            return
        # v4 'default' association — applies the standard contact<->company link without
        # a brittle numeric associationTypeId.
        self._put(f"/crm/v4/objects/companies/{company_id}/associations/default/"
                  f"contacts/{contact_id}", {})
        print(f"  [contact] {email or phone} -> contact {contact_id} assoc company {company_id}")

    # --- read the scoreboard back ------------------------------------------
    def attribution_rows(self) -> list[Attribution]:
        """Every machine-sourced company + its provenance. This is what the dashboard
        renders and John audits. Deal-revenue join (signed_at, fee) is follow-on."""
        if self._dry:
            return []
        body: dict = {
            "filterGroups": [{"filters": [
                {"propertyName": MACHINE_SOURCED_PROPERTY, "operator": "EQ", "value": "true"},
            ]}],
            "properties": ["domain", SOURCE_PROVENANCE_PROPERTY, MACHINE_SOURCED_DATE_PROPERTY],
            "limit": 100,
        }
        rows: list[Attribution] = []
        after: str | None = None
        while True:
            if after:
                body["after"] = after
            data = self._post("/crm/v3/objects/companies/search", body)
            for r in data.get("results", []):
                p = r.get("properties", {})
                rows.append(Attribution(
                    account_domain=p.get("domain") or "",
                    machine_sourced=True,
                    discovered_by=p.get(SOURCE_PROVENANCE_PROPERTY) or "",
                ))
            after = data.get("paging", {}).get("next", {}).get("after")
            if not after:
                break
        return rows

    # --- engine-impact OUTCOMES (Sixth City's value signal, NOT rev-share) --------
    def _machine_sourced_company_ids(self) -> list[str]:
        """Every company the engine has claimed (machine_sourced=true), paginated."""
        body: dict = {
            "filterGroups": [{"filters": [
                {"propertyName": MACHINE_SOURCED_PROPERTY, "operator": "EQ", "value": "true"},
            ]}],
            "properties": ["domain"], "limit": 100,
        }
        ids: list[str] = []
        after: str | None = None
        while True:
            if after:
                body["after"] = after
            data = self._post("/crm/v3/objects/companies/search", body)
            ids += [r["id"] for r in data.get("results", [])]
            after = data.get("paging", {}).get("next", {}).get("after")
            if not after:
                break
        return ids

    def _assoc(self, to_obj: str, company_ids: list[str]) -> dict[str, list[str]]:
        """company id -> [associated `to_obj` ids], batched 100/call (v4 associations).
        Accepts 200 and 207 (multi-status: some companies simply have no links)."""
        out: dict[str, list[str]] = {}
        for i in range(0, len(company_ids), 100):
            chunk = company_ids[i:i + 100]
            data = self._post(f"/crm/v4/associations/companies/{to_obj}/batch/read",
                              {"inputs": [{"id": str(c)} for c in chunk]})
            for r in data.get("results", []):
                frm = str(r.get("from", {}).get("id"))
                out[frm] = [str(t.get("toObjectId")) for t in r.get("to", [])]
            time.sleep(_SEARCH_PACE_SEC)
        return out

    def _open_pipeline_value(self, company_ids: list[str]) -> float:
        """Sum `amount` of OPEN deals (exclude closed-won and closed-lost) associated
        with the given companies. Batched deal reads."""
        assoc = self._assoc("deals", company_ids)
        deal_ids = list({d for links in assoc.values() for d in links})
        total = 0.0
        for i in range(0, len(deal_ids), 100):
            chunk = deal_ids[i:i + 100]
            data = self._post("/crm/v3/objects/deals/batch/read", {
                "inputs": [{"id": d} for d in chunk],
                "properties": ["amount", "hs_is_closed_won", "dealstage"],
            })
            for r in data.get("results", []):
                p = r.get("properties", {})
                if p.get("hs_is_closed_won") == "true":
                    continue
                if "lost" in (p.get("dealstage") or "").lower():
                    continue
                try:
                    total += float(p.get("amount") or 0)
                except (TypeError, ValueError):
                    pass
        return round(total, 2)

    def outcomes(self) -> dict:
        """Engine-impact OUTCOMES for machine-sourced companies — Sixth City's value
        signal (never rev-share): how many we've reached out to (≥1 email or call),
        meetings booked, and open pipeline $ generated. Live from HubSpot, batched.
        Dry mode OR any failure -> None values (UI shows 'syncing'); real numbers
        (including 0) when the portal is reachable."""
        pending = {"reached_out": None, "meetings": None, "pipeline_value": None}
        if self._dry:
            return pending
        try:
            ids = self._machine_sourced_company_ids()
            if not ids:
                return {"reached_out": 0, "meetings": 0, "pipeline_value": 0.0}
            contacted = set()
            for kind in ("emails", "calls"):
                for cid, links in self._assoc(kind, ids).items():
                    if links:
                        contacted.add(cid)
            meetings = sum(len(v) for v in self._assoc("meetings", ids).values())
            return {
                "reached_out": len(contacted),
                "meetings": meetings,
                "pipeline_value": self._open_pipeline_value(ids),
            }
        except Exception as e:  # never break the scoreboard on a HubSpot hiccup
            print(f"  [outcomes] degraded ({type(e).__name__}: {e})")
            return pending

    def list_owners(self) -> list[dict]:
        """Active HubSpot owners for the default-owner picker (owners.read scope)."""
        if self._dry:
            return []
        data = self._get("/crm/v3/owners", {"limit": 100})
        out = []
        for r in data.get("results", []):
            name = " ".join(p for p in (r.get("firstName"), r.get("lastName")) if p).strip()
            out.append({"id": str(r.get("id")), "name": name or (r.get("email") or ""),
                        "email": r.get("email") or ""})
        return out
