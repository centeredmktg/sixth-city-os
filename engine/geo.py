"""
Geo layer — office hubs as the anchors of targeting and scoring.

Sixth City's six offices are local-SEO ranking addresses (unstaffed, but real
addresses that rank locally). Strategically they're more than that: they're the
geographic centers where Sixth City has local credibility and ranks — so a
prospect NEAR a hub is a higher-fit, higher-close account. That proximity is an
OWNED signal Clay can't sell anyone (see ADR-001/004).

This module answers "how local-advantaged is this account?" and feeds a weight
into scoring. It degrades to NEUTRAL (weight 1.0) when hubs or coordinates are
missing, so the engine runs fine until the real hub list is filled in.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from engine.models import Account


@dataclass(frozen=True)
class OfficeHub:
    city: str
    lat: float
    lon: float
    address: str = ""   # canonical local-SEO ranking address for this hub


# Sixth City's six office hubs — coordinates geocoded from the real local-SEO
# ranking addresses. Coarse city-name match fires immediately; haversine distance
# refines it whenever an export carries lat/lon. All six are >50mi apart, so at
# RADIUS_MILES = 50 their proximity circles never overlap — every in-radius
# account maps to exactly one hub.
OFFICE_HUBS: list[OfficeHub] = [
    OfficeHub("Cleveland",    41.50228, -81.68946, "815 Superior Ave E, Suite 1712, Cleveland, OH"),
    OfficeHub("Columbus",     39.96349, -82.99972, "35 E Gay St, #324, Columbus, OH"),
    OfficeHub("Pittsburgh",   40.43983, -80.00170, "239 4th Avenue, #1915, Pittsburgh, PA"),
    OfficeHub("Indianapolis", 39.77351, -86.15571, "429 N Penn St, Suite 300H, Indianapolis, IN"),
    OfficeHub("Chicago",      41.89292, -87.63300, "620 N La Salle St, Suite 415, Chicago, IL"),
    OfficeHub("Nashville",    36.16397, -86.78191, "501 Union St, Suite 410, Nashville, TN"),
]

RADIUS_MILES = 50.0      # within this of a hub = local advantage (tune)
# TODO(Danny): the boost ceiling. 1.12 = an in-radius account scores 12% higher.
# How much should "they're in our backyard" outweigh raw fit/timing?
PROXIMITY_BOOST = 1.12


def _haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 3958.8  # earth radius, miles
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _account_coords(account: Account) -> tuple[float, float] | None:
    """Lat/lon if the export carried them (a geo-scrape source would). Looks in
    extra{} under common keys; returns None if absent."""
    e = account.extra
    for la, lo in (("lat", "lon"), ("latitude", "longitude")):
        if e.get(la) and e.get(lo):
            try:
                return float(e[la]), float(e[lo])
            except (TypeError, ValueError):
                return None
    return None


def miles_to_nearest_hub(account: Account) -> float | None:
    """Distance to the closest office hub, or None if we can't determine it
    (no hubs configured, or no coords AND no city match)."""
    if not OFFICE_HUBS:
        return None
    coords = _account_coords(account)
    if coords:
        return min(_haversine_miles(*coords, h.lat, h.lon) for h in OFFICE_HUBS)
    # Coarse fallback: same city as a hub = treat as in-radius (0 mi).
    if account.city and any(account.city.lower() == h.city.lower() for h in OFFICE_HUBS):
        return 0.0
    return None


def proximity_weight(account: Account) -> float:
    """Score multiplier: 1.0 neutral, up to PROXIMITY_BOOST for accounts within
    RADIUS_MILES of a hub. Linear falloff from the hub out to the radius edge.
    Returns 1.0 when location can't be determined — never penalizes on missing data."""
    miles = miles_to_nearest_hub(account)
    if miles is None or miles >= RADIUS_MILES:
        return 1.0
    closeness = 1.0 - (miles / RADIUS_MILES)        # 1.0 at the hub, 0.0 at the edge
    return 1.0 + (PROXIMITY_BOOST - 1.0) * closeness
