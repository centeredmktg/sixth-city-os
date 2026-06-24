"""
Contact enrichment — hand sales a real email + phone for a pursued account.

Free first layer: the email/phone that `sources/site_audit.py` already scraped off the
homepage (domain-matched), stashed on `account.extra["site_emails"]` / `["site_phones"]`.
This adapter just surfaces it. Paid decision-maker lookup (Apollo / PDL) layers on top
later for the name/title the site can't give us.

Contract (Danny, sales-ops):
 - Prefer a named person (john@) over generic role inboxes (info@/sales@); keep the rest
   as a ranked fallback list (`contact_emails`).
 - No real email found -> leave `contact_email` BLANK. Never surface an unverified guess.
"""

from __future__ import annotations

from engine.models import Account

# Role/shared inboxes — real, but a named human is better for personalized outreach, so
# these rank below any named address.
_GENERIC_LOCALPARTS = {
    "info", "sales", "contact", "hello", "admin", "support", "office", "team", "mail",
    "inquiries", "enquiries", "hi", "marketing", "billing", "accounts", "accounting",
    "careers", "jobs", "hr", "help", "service", "general", "reception",
}


def _rank_emails(emails: list[str]) -> list[str]:
    """Named people first, then generic role inboxes; alphabetical within each group."""
    def key(e: str) -> tuple[bool, str]:
        local = e.split("@", 1)[0].lower()
        return (local in _GENERIC_LOCALPARTS, e.lower())
    return sorted(emails, key=key)


def enrich_contacts(account: Account) -> dict:
    """Return contact fields for the account, sourced from the crawl. Phone prefers the
    Google Business line (canonical for a local SMB), then the site-scraped number.
    Name/title stay blank until a decision-maker lookup (Apollo) fills them."""
    extra = account.extra or {}
    emails = _rank_emails(extra.get("site_emails") or [])
    site_phones = extra.get("site_phones") or []
    primary_email = emails[0] if emails else ""
    phone = (extra.get("places_phone") or "").strip() or (site_phones[0].strip() if site_phones else "")
    return {
        "contact_name": "",
        "contact_title": "",
        "contact_email": primary_email,
        "contact_email_source": "site" if primary_email else "",
        "contact_emails": emails,
        "contact_phone": phone,
        "contact_address": (extra.get("places_address") or "").strip(),
    }
