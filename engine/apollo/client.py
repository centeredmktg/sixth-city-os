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

    def _headers(self) -> dict:
        return {"X-Api-Key": self._key, "Content-Type": "application/json",
                "Cache-Control": "no-cache"}

    def find_contacts(self, domain: str, limit: int = 5, titles: list[str] | None = None,
                      reveal_emails: bool = True) -> list[Contact]:
        """Two-step (Apollo's model, validated live):
          1. mixed_people/api_search -> decision-makers at `domain` (obfuscated: title +
             id, name/email/LinkedIn hidden).
          2. people/match by id (+reveal) -> unlock the real name/email/LinkedIn — this
             is the credit-consuming step, so it runs ONLY for the top `limit` (the
             shortlist of a pursued company). reveal_emails=False skips it (search-only).
        Dry mode (no key) -> []."""
        if self._dry or not domain:
            return []
        s = requests.post(
            f"{APOLLO_API}/mixed_people/api_search",
            headers=self._headers(),
            json={"q_organization_domains_list": [domain.strip().lower()],
                  "person_titles": titles or DEFAULT_TITLES,
                  "page": 1, "per_page": max(1, min(limit, 25))},
            timeout=30,
        )
        s.raise_for_status()
        people = s.json().get("people", []) or s.json().get("contacts", [])
        out: list[Contact] = []
        for p in people[:limit]:
            pid = p.get("id")
            if reveal_emails and pid:
                m = requests.post(f"{APOLLO_API}/people/match", headers=self._headers(),
                                  json={"id": pid, "reveal_personal_emails": True}, timeout=30)
                if m.status_code == 200:
                    out.append(self._parse(m.json().get("person") or {}, domain))
                    continue
            out.append(self._parse(p, domain))   # fall back to the (obfuscated) search row
        return out

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
