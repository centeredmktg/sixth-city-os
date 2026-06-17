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


class HubSpotClient:
    def __init__(self) -> None:
        self._dry = CONFIG.dry_run
        self._session = requests.Session()
        if not self._dry:
            self._session.headers.update({
                "Authorization": f"Bearer {CONFIG.hubspot_token}",
                "Content-Type": "application/json",
            })

    def _post(self, path: str, payload: dict) -> dict:
        """POST with 429/5xx retry + backoff (HubSpot rate limits the Search API hard).
        Respects Retry-After when present, else exponential backoff (capped)."""
        for attempt in range(_MAX_RETRIES + 1):
            r = self._session.post(f"{API}{path}", json=payload, timeout=30)
            if (r.status_code == 429 or 500 <= r.status_code < 600) and attempt < _MAX_RETRIES:
                retry_after = r.headers.get("Retry-After")
                wait = float(retry_after) if retry_after and retry_after.replace(".", "", 1).isdigit() \
                    else min(2 ** attempt * 0.5, 10.0)
                time.sleep(wait)
                continue
            r.raise_for_status()
            return r.json() if r.content else {}
        return {}

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
            return f"dry-{account.domain}"

        existing = self.find_company_id_by_domain(account.domain)
        if existing:
            # It already existed -> never claim machine_sourced. (DEFAULT: leave it
            # untouched. If you ever want to enrich-but-not-claim existing records,
            # this is the single spot to change — add a PATCH that omits the 3 flag
            # properties.)
            print(f"  [exists] {account.domain} already in CRM (id {existing}) — not claimed")
            return existing

        created = self._post("/crm/v3/objects/companies", {"properties": {
            "name": account.name,
            "domain": account.domain,
            MACHINE_SOURCED_PROPERTY: "true",
            SOURCE_PROVENANCE_PROPERTY: account.discovered_by,
            MACHINE_SOURCED_DATE_PROPERTY: date.today().isoformat(),
        }})
        new_id = created["id"]
        print(f"  [claimed] {account.domain} -> id {new_id} | machine_sourced=true")
        # TODO: sequence enrollment is API-restricted (likely a workflow hand-off, not a
        # plain write). The net-new, tagged company is in; auto-enrolling the tailored
        # outreach is the follow-on once we resolve the enrollment path.
        return new_id

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
