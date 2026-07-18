"""Deterministic HubSpot record deep-links.

The unblocked fallback for sequence enrollment (#5): auto-enroll via the HubSpot API
is scope/tier-gated, so instead the engine hands the operator a direct link to the
right record where they click Enroll by hand — a human beat before dripping a
just-cold-emailed prospect, which is safer for tone + deliverability anyway.

Object-type ids in HubSpot's record URL: 0-1 = contact, 0-2 = company. We prefer the
contact record (enrollment happens on the person); when we don't have the contact's
HubSpot id — the common case, since Apollo-sourced contacts aren't pushed to HubSpot —
we fall back to the company record, which every claimed company has.
"""
from __future__ import annotations

PORTAL_ID = "3358054"  # Sixth City HubSpot portal

_CONTACT = "0-1"
_COMPANY = "0-2"


def record_url(contact_hubspot_id: str | None = None,
               company_hubspot_id: str | None = None,
               portal_id: str = PORTAL_ID) -> str | None:
    """A link to the HubSpot record: the contact if we have its id, else the company,
    else None (nothing to link to). Blank strings count as absent so an un-pushed
    contact (DB default "") never builds a broken 0-1 link."""
    cid = (contact_hubspot_id or "").strip()
    if cid:
        return f"https://app.hubspot.com/contacts/{portal_id}/record/{_CONTACT}/{cid}"
    coid = (company_hubspot_id or "").strip()
    if coid:
        return f"https://app.hubspot.com/contacts/{portal_id}/record/{_COMPANY}/{coid}"
    return None
