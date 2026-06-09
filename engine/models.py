"""
Core data contracts for the Pipeline Engine.

These are the load-bearing shapes. Every job, source, and the attribution
scoreboard read/write these — so they get decided ONCE, here, up front. If an
Account or a Signal is vague, the scoreboard is vague, and the scoreboard is
literally what Danny gets paid on (5% net-new, machine-sourced flag).

Stub status: real shapes, no persistence yet. Swap dataclasses for ORM models
(SQLAlchemy) when DATABASE_URL goes live.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


class Vertical(str, Enum):
    """The verticals Sixth City already wins in (design spec §4)."""
    INDUSTRIAL_B2B = "industrial_b2b"
    HOME_SERVICES = "home_services"
    HEALTHCARE = "healthcare"
    LEGAL = "legal"
    ECOMMERCE = "ecommerce"


class SignalKind(str, Enum):
    """Why an account looks like a fit/timing match. Drives both the score AND
    the personalized outreach reason — one signal, two jobs."""
    SITE_QUALITY = "site_quality"       # bad/slow/non-mobile site (the website-eval spine)
    SEO_GAP = "seo_gap"                 # low organic visibility
    ADS_ACTIVE = "ads_active"           # already spending on ads = budget exists
    HIRING_MARKETING = "hiring_marketing"
    NEW_LOCATION = "new_location"
    REVIEW_VELOCITY = "review_velocity"


class Stage(str, Enum):
    """Maps to the HubSpot pipeline. Lead -> opp -> closed-won -> revenue is the
    trail both parties audit."""
    DISCOVERED = "discovered"
    SCORED = "scored"
    ROUTED = "routed"          # routing decided, awaiting/given HITL confirmation
    PUSHED = "pushed"          # in a HubSpot sequence
    ENGAGED = "engaged"        # live conversation, routed to closer
    OPPORTUNITY = "opportunity"
    CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"


class Route(str, Enum):
    """Where a scored account goes. Timing is the gate (timing trumps fit for
    sales): a great-fit/bad-time account is a marketing problem, not the closer's.
    """
    CLOSER = "closer"          # in-market now -> closer's daily queue
    NURTURE = "nurture"        # good fit, not in-market -> marketing nurture track
    HOLD = "hold"              # weak on both -> revisit later, don't spend on it
    REJECT = "reject"          # not a fit -> out


@dataclass
class RouteDecision:
    """A routing RECOMMENDATION plus its HITL confirmation status. The engine
    proposes; a human confirms before it acts. Nothing enters a HubSpot sequence
    on an unconfirmed CLOSER route."""
    recommended: Route
    rationale: str = ""
    confirmed: bool = False
    confirmed_route: Optional[Route] = None   # human may override the recommendation
    confirmed_by: str = ""

    @property
    def effective(self) -> Route:
        """What actually happens: the human's override if confirmed, else the rec."""
        if self.confirmed and self.confirmed_route is not None:
            return self.confirmed_route
        return self.recommended


@dataclass
class Signal:
    """A single piece of buying-signal evidence on an account."""
    kind: SignalKind
    source: str                 # which DataSource produced it (registry name)
    value: float                # normalized 0-1 strength, or raw score (e.g. Lighthouse 0-100/100)
    detail: str = ""            # human-readable reason, reused verbatim in outreach
    observed_at: Optional[datetime] = None


@dataclass
class Account:
    """A net-new target business. 'Net-new logo only' is a rev-share gate, so we
    never invent accounts that already exist in HubSpot — dedupe happens in the
    push job against HubSpot's book."""
    name: str
    domain: str
    vertical: Vertical
    city: str = ""
    state: str = "OH"
    signals: list[Signal] = field(default_factory=list)
    score: Optional["Score"] = None
    route: Optional["RouteDecision"] = None
    stage: Stage = Stage.DISCOVERED
    hubspot_id: Optional[str] = None
    discovered_by: str = ""     # source registry name — provenance for attribution


@dataclass
class Score:
    """ABCR ranking output. fit = how well they match Sixth City's ICP;
    timing = how 'in-market' the signals say they are right now."""
    fit: float                  # 0-100
    timing: float               # 0-100
    total: float                # 0-100 composite
    band: str                   # "A" / "B" / "C" / "R" (ABCR)
    rationale: str = ""


@dataclass
class Outreach:
    """The tailored message dropped into a HubSpot sequence. The 'why this
    account' reason is built from the account's strongest signal."""
    account_domain: str
    subject: str
    body: str
    reason_signal: Optional[SignalKind] = None


@dataclass
class Attribution:
    """The scoreboard row. This is the contract the 5%/12-mo rev-share settles
    against. machine_sourced is the SOLE flag that creates an obligation."""
    account_domain: str
    machine_sourced: bool       # the HubSpot flag = sole scoreboard (design §3)
    discovered_by: str          # provenance: which source first surfaced them
    first_touch_at: Optional[datetime] = None
    signed_at: Optional[datetime] = None     # starts the per-client 12-mo tail
    service_fee_monthly: float = 0.0         # mgmt fee ONLY, never ad-spend pass-through
    stage: Stage = Stage.DISCOVERED
