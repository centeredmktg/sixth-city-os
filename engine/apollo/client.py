"""
Apollo.io contact discovery — find the decision-makers at a PURSUED company.

Called only when the operator commits to an opportunity ("Pursue"), so Apollo credits
are spent on the shortlist, never the haystack. A company alone isn't actionable; this
finds the person to actually reach.

Auth: APOLLO_API_KEY (X-Api-Key header). No key -> dry mode (returns []), so local/test
runs and the un-configured prod stay safe. Danny's account funds it (~10k credits/mo);
overage is billed into the $500/mo retainer.

NOTE: request params + email-unlock behavior validated live against the portal with the
real key (Apollo masks emails in search until unlocked, which costs a credit) — see
find_contacts(reveal_emails=...).
"""
from __future__ import annotations

import os

import requests

from engine.models import Contact

APOLLO_API = "https://api.apollo.io/api/v1"

# Decision-makers worth reaching for a marketing-services pitch. Owner/founder first
# (SMB buyer), then the marketing leadership.
DEFAULT_TITLES = [
    "owner", "founder", "co-founder", "ceo", "president", "partner",
    "cmo", "vp marketing", "vice president of marketing", "director of marketing",
    "head of marketing", "marketing director", "marketing manager",
]


class ApolloClient:
    def __init__(self) -> None:
        self._key = os.getenv("APOLLO_API_KEY", "")
        self._dry = not self._key

    @property
    def dry(self) -> bool:
        return self._dry

    def find_contacts(self, domain: str, limit: int = 5, titles: list[str] | None = None,
                      reveal_emails: bool = True) -> list[Contact]:
        """People-search at `domain` for decision-maker titles. Returns up to `limit`
        Contacts. Dry mode (no key) -> []. reveal_emails asks Apollo to unlock work
        emails (consumes credits); set False to save credits and enrich later."""
        if self._dry or not domain:
            return []
        body = {
            "q_organization_domains_list": [domain.strip().lower()],
            "person_titles": titles or DEFAULT_TITLES,
            "page": 1,
            "per_page": max(1, min(limit, 25)),
        }
        if reveal_emails:
            body["reveal_personal_emails"] = True
        r = requests.post(
            f"{APOLLO_API}/mixed_people/search",
            headers={"X-Api-Key": self._key, "Content-Type": "application/json",
                     "Cache-Control": "no-cache"},
            json=body, timeout=30,
        )
        r.raise_for_status()
        people = r.json().get("people", []) or r.json().get("contacts", [])
        return [self._parse(p, domain) for p in people[:limit]]

    @staticmethod
    def _parse(p: dict, domain: str) -> Contact:
        first, last = p.get("first_name") or "", p.get("last_name") or ""
        email = p.get("email") or ""
        # Apollo masks unverified/locked emails with a sentinel — treat as blank.
        if email and ("not_unlocked" in email or "email_not_unlocked" in email):
            email = ""
        return Contact(
            name=(p.get("name") or f"{first} {last}").strip() or "(unknown)",
            company_domain=domain.strip().lower(),
            title=p.get("title") or "",
            email=email,
            linkedin_url=p.get("linkedin_url") or "",
            seniority=p.get("seniority") or "",
            source="apollo",
        )
