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
