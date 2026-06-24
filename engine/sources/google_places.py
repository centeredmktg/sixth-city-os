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

import requests

from engine.config import CONFIG
from engine.models import Account, Signal, SignalKind
from engine.sources.base import DataSource

_TEXT_SEARCH = "https://places.googleapis.com/v1/places:searchText"
_DETAILS = "https://places.googleapis.com/v1/places/{place_id}"
_DETAILS_MASK = ("nationalPhoneNumber,formattedAddress,rating,userRatingCount,"
                 "websiteUri,businessStatus,displayName")

_REVIEW_FLOOR = 10      # fewer lifetime reviews than this = thin local presence
_RATING_FLOOR = 4.0     # below this = reputation gap worth a pitch

# Generic business-name words carry no identity, so a shared one of these must NOT
# satisfy the name-fallback match (else "The LLC" matches "The LLC Auto Body").
_NAME_STOPWORDS = {"the", "llc", "inc", "corp", "ltd", "and", "for", "group",
                   "company", "services", "service", "incorporated"}


def _host(url: str) -> str:
    """Lowercased host of a URL, scheme + www. + path/query/fragment stripped.
    '' for empty/garbage."""
    u = (url or "").strip().lower()
    if "://" in u:
        u = u.split("://", 1)[1]
    u = u.split("/", 1)[0].split("?", 1)[0].split("#", 1)[0]
    return u[4:] if u.startswith("www.") else u


def _identity_tokens(text: str) -> set[str]:
    """Meaningful name tokens — drops short words and generic business stopwords."""
    return {t for t in text.lower().replace(",", " ").split()
            if len(t) > 2 and t not in _NAME_STOPWORDS}


def _match_ok(domain: str, name: str, listing: dict) -> bool:
    """True if the listing plausibly belongs to this account. Prefer a domain match
    on the listing's website; if the listing has no website, fall back to overlap of
    IDENTITY tokens (generic words excluded). Conservative: a non-matching website is
    a hard reject (never attach a stranger's phone)."""
    d = _host(domain)
    site = _host(listing.get("websiteUri", ""))
    if site:
        return site == d or site.endswith("." + d) or d.endswith("." + site)
    listed_name = ((listing.get("displayName") or {}).get("text") or "")
    want = _identity_tokens(name)
    have = _identity_tokens(listed_name)
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
        detail = ("No Google reviews yet" if reviews == 0
                  else f"Thin Google presence — only {reviews} reviews")
        return Signal(kind=SignalKind.LOCAL_SEO_GAP, source="google_places", value=0.6,
                      detail=detail)
    if rating < _RATING_FLOOR or not has_site:
        why = f"low rating {rating}" if rating < _RATING_FLOOR else "no website linked on GBP"
        return Signal(kind=SignalKind.LOCAL_SEO_GAP, source="google_places", value=0.3,
                      detail=f"Google Business gap — {why}")
    return None


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
        except requests.RequestException as e:
            # Only swallow network/HTTP failures — let real bugs (bad response shape,
            # etc.) surface instead of silently returning [].
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
