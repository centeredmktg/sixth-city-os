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
from engine.scoring.config import ScoringConfig, get_active_config


@dataclass(frozen=True)
class OfficeHub:
    city: str
    lat: float
    lon: float
    address: str = ""       # canonical local-SEO ranking address for this hub
    staffed: bool = False   # True = Sixth City has PEOPLE here, not just a ranking
                            # address. Gates the in-person outreach offer and a higher
                            # proximity ceiling. Only Chicago + Cleveland today.


# Sixth City's six office hubs — coordinates geocoded from the real local-SEO
# ranking addresses. Coarse city-name match fires immediately; haversine distance
# refines it whenever an export carries lat/lon. All six are >50mi apart, so at
# RADIUS_MILES = 50 their proximity circles never overlap — every in-radius
# account maps to exactly one hub.
OFFICE_HUBS: list[OfficeHub] = [
    OfficeHub("Cleveland",    41.50228, -81.68946, "815 Superior Ave E, Suite 1712, Cleveland, OH", staffed=True),
    OfficeHub("Columbus",     39.96349, -82.99972, "35 E Gay St, #324, Columbus, OH"),
    OfficeHub("Pittsburgh",   40.43983, -80.00170, "239 4th Avenue, #1915, Pittsburgh, PA"),
    OfficeHub("Indianapolis", 39.77351, -86.15571, "429 N Penn St, Suite 300H, Indianapolis, IN"),
    OfficeHub("Chicago",      41.89292, -87.63300, "620 N La Salle St, Suite 415, Chicago, IL", staffed=True),
    OfficeHub("Nashville",    36.16397, -86.78191, "501 Union St, Suite 410, Nashville, TN"),
]

RADIUS_MILES = 50.0      # within this of a hub = local advantage (tune)
# TODO(Danny): the boost ceilings. 1.12 = an in-radius account scores 12% higher.
# How much should "they're in our backyard" outweigh raw fit/timing — and how much
# MORE should "we have people in their city" (staffed) add on top?
PROXIMITY_BOOST = 1.12          # default: an unstaffed ranking-address hub nearby
STAFFED_PROXIMITY_BOOST = 1.20  # higher ceiling when the nearest hub is staffed


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


def _nearest_hub(account: Account) -> tuple[OfficeHub, float] | None:
    """The closest office hub and the miles to it, or None if undeterminable (no hubs,
    or no coords AND no city match). A same-city match counts as 0 mi (at the hub)."""
    if not OFFICE_HUBS:
        return None
    coords = _account_coords(account)
    if coords:
        best = min(OFFICE_HUBS, key=lambda h: _haversine_miles(*coords, h.lat, h.lon))
        return best, _haversine_miles(*coords, best.lat, best.lon)
    # Coarse fallback: same city as a hub = treat as at the hub (0 mi).
    if account.city:
        for h in OFFICE_HUBS:
            if account.city.lower() == h.city.lower():
                return h, 0.0
    return None


def miles_to_nearest_hub(account: Account) -> float | None:
    """Distance to the closest office hub, or None if we can't determine it."""
    nh = _nearest_hub(account)
    return nh[1] if nh else None


def nearest_staffed_hub(account: Account, config: "ScoringConfig | None" = None) -> OfficeHub | None:
    """The STAFFED hub this account is within the (configurable) radius of, else None.
    Gates the in-person outreach offer (#4). Because hubs are >2*radius apart, an
    in-radius account maps to exactly one hub — so 'is the nearest hub staffed and in
    range?' fully answers 'can we credibly offer to meet in person?'."""
    radius = (config or get_active_config()).radius_miles
    nh = _nearest_hub(account)
    if nh is None:
        return None
    hub, miles = nh
    return hub if (hub.staffed and miles < radius) else None


def proximity_weight(account: Account, config: "ScoringConfig | None" = None) -> float:
    """Score multiplier: 1.0 neutral, up to the (configurable) proximity boost — or the
    higher staffed boost when the nearest hub is staffed — for accounts within the
    configurable radius of a hub. Linear falloff from the hub out to the radius edge.
    Returns 1.0 when location can't be determined — never penalizes on missing data."""
    cfg = config or get_active_config()
    radius = cfg.radius_miles
    nh = _nearest_hub(account)
    if nh is None:
        return 1.0
    hub, miles = nh
    if miles >= radius:
        return 1.0
    ceiling = cfg.staffed_proximity_boost if hub.staffed else cfg.proximity_boost
    closeness = 1.0 - (miles / radius)              # 1.0 at the hub, 0.0 at the edge
    return 1.0 + (ceiling - 1.0) * closeness
