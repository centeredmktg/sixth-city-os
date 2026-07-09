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

import re
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


# Raw LinkedIn/Clay `industry` -> canonical vertical, ordered keyword rules (first
# match wins; specific exclusions before the broad 'manufactur'). Clay's free enrich
# emits LinkedIn industry (256+ values), NOT our taxonomy, so the engine maps it at
# ingestion. Present-but-unmatched -> UNKNOWN (neutral, never a penalty).
_INDUSTRY_RULES = [
    ("automotive",               r"motor vehicle|automotive|vehicle repair"),
    ("healthcare",               r"health care|hospital|medical|dental|dentist|wellness|mental health|veterinar|pharmaceutic|biotech|diagnostic laborator|home health|alternative medicine"),
    ("legal",                    r"law practice|legal"),
    ("real_estate",              r"real estate"),
    ("education",                r"higher education|education|e-learning|vocational training|primary and secondary"),
    ("retail_ecommerce",         r"retail|wholesale|consumer goods|apparel|fashion|restaurant|food|beverage|luxury goods|furniture|sporting goods|grocer"),
    ("industrial_manufacturing", r"manufactur|machinery|industrial|fabricat|\bmetal|plastics|chemical|aerospace|aviation|semiconductor|mining|oil and gas|paper and forest|textile|packaging and container|glass, ceramics|robotic|defense|wood product|rubber|foundr|tooling|measuring and control|electrical equipment|primary metal|maritime"),
    ("home_construction",        r"construction|contractor|facilities|landscaping|hvac|janitorial|fire protection|repair and maintenance|building"),
    ("professional_b2b",         r"advertising|marketing|public relations|communications|\bdesign|media|printing|photography|events|broadcast|publishing|animation|writing|software|information technology|technology, information|consulting|professional services|staffing|recruiting|financial|accounting|banking|insurance|investment|capital markets|human resources|telecommunications|data infrastructure|computer|research services|outsourcing|executive search|strategic management|engineering services|civil engineering|architecture"),
]


class Vertical(str, Enum):
    """Ten canonical verticals mapped from HubSpot Industry tags (design spec §4).
    UNKNOWN covers accounts that arrived without a recognizable tag — never a
    penalty (historical unknowns closed ~24%, above baseline).
    Use `Vertical.from_hubspot(tag)` to map raw HubSpot strings."""

    INDUSTRIAL_MANUFACTURING = "industrial_manufacturing"
    REAL_ESTATE               = "real_estate"
    EDUCATION                 = "education"
    PROFESSIONAL_B2B          = "professional_b2b"
    HEALTHCARE                = "healthcare"
    AUTOMOTIVE                = "automotive"
    LEGAL                     = "legal"
    HOME_CONSTRUCTION         = "home_construction"
    RETAIL_ECOMMERCE          = "retail_ecommerce"
    UNKNOWN                   = "unknown"

    @classmethod
    def from_hubspot(cls, value: str | None) -> "Vertical":
        """Map a HubSpot `vertical` field value (canonical snake_case) to the enum.
        Blank/unrecognized -> UNKNOWN. Never raises — ingestion must be blank-safe.
        The raw-industry -> canonical rollup lives in Clay (export) + the backfill's
        taxonomy.py, NOT here (Approach A: the engine reads canonical values)."""
        try:
            return cls((value or "").strip().lower())
        except (ValueError, AttributeError):
            return cls.UNKNOWN   # non-str input (int/NaN) also degrades, never raises

    @classmethod
    def from_industry(cls, raw: str | None) -> "Vertical":
        """Map a raw LinkedIn/Clay `industry` string to a canonical Vertical via
        keyword rules (_INDUSTRY_RULES). Blank or present-but-unmatched -> UNKNOWN."""
        t = (str(raw) if raw is not None else "").strip().lower()
        if not t:
            return cls.UNKNOWN
        for value, pattern in _INDUSTRY_RULES:
            if re.search(pattern, t):
                return cls(value)
        return cls.UNKNOWN


class SignalKind(str, Enum):
    """Why an account looks like a fit/timing match. Drives both the score AND
    the personalized outreach reason — one signal, two jobs."""
    SITE_QUALITY = "site_quality"       # bad/slow/non-mobile site (PageSpeed)
    # --- SEO gaps: the bespoke-OS surface that speaks an SEO agency's language ---
    SEO_GAP = "seo_gap"                 # low overall organic visibility
    KEYWORD_GAP = "keyword_gap"         # competitors rank for high-intent terms they don't
    LOCAL_SEO_GAP = "local_seo_gap"     # weak/missing Google Business Profile, no local pack
    BACKLINK_GAP = "backlink_gap"       # thin/declining referring domains
    CONTENT_GAP = "content_gap"         # thin/missing service pages
    AI_CITATION_GAP = "ai_citation_gap" # ranks on Google but uncited by AI answer engines (flagship)
    ADS_STALE = "ads_stale"             # stale/single ad creative pointing at homepage
    REVIEW_VELOCITY = "review_velocity" # losing the local pack on review recency/velocity
    # --- timing/intent triggers ---
    ADS_ACTIVE = "ads_active"           # already spending on ads = budget exists
    HIRING_MARKETING = "hiring_marketing"  # DEAD: strategy-rejected, no emitter, no weight, not an intent signal — kept only for deserialization
    NEW_LOCATION = "new_location"


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
    vertical: Vertical = Vertical.UNKNOWN
    linkedin_url: str = ""        # Clay's free payload carries this — feeds personalization
    city: str = ""
    state: str = "OH"
    extra: dict = field(default_factory=dict)   # other Clay firmographic fields, kept raw
    signals: list[Signal] = field(default_factory=list)
    score: Optional["Score"] = None
    route: Optional["RouteDecision"] = None
    offer: Optional["Offer"] = None
    stage: Stage = Stage.DISCOVERED
    hubspot_id: Optional[str] = None
    net_new: Optional[bool] = None
    pursued: bool = False       # operator committed -> contacts sourced
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
class Offer:
    """A Permissionless Value Prop (PVP) or Pain-Qualified Segment (PQS) message,
    built from a named Blueprint data recipe. The insight is standalone-valuable —
    quantified, names a competitor, and asks only for a one-word reply (never a
    meeting). Per Blueprint GTM: the PVP IS the deliverable, so outreach = product."""
    recipe: str                 # e.g. "AI Answer Gap Report"
    kind: str                   # "PVP" | "PQS"
    data_recipe: str            # the public-data sources used (shown for credibility)
    subject: str
    body: str
    cta: str                    # the one-word reply ask, e.g. 'reply "send it"'


@dataclass
class Contact:
    """A decision-maker at a pursued company — found + enriched (Apollo) only AFTER
    the operator commits to the opportunity. A company alone isn't actionable; this is
    the person you actually reach. Email may be blank until unlocked (costs a credit)."""
    name: str
    company_domain: str
    title: str = ""
    email: str = ""
    linkedin_url: str = ""
    seniority: str = ""
    source: str = "apollo"
    hubspot_id: str = ""        # set when the person is created/associated in HubSpot


@dataclass
class Outreach:
    """The tailored message dropped into a HubSpot sequence. The 'why this
    account' reason is built from the account's strongest signal."""
    account_domain: str
    subject: str
    body: str
    reason_signal: Optional[SignalKind] = None


class MessageStatus(str, Enum):
    """A first-class message's lifecycle in the compose/send queue."""
    DRAFT = "draft"            # composed, awaiting the rep
    APPROVED = "approved"      # rep approved, queued to send
    SENDING = "sending"        # send in flight
    SENT = "sent"              # delivered via the rep's Gmail
    FAILED = "failed"          # send attempted, errored
    DISCARDED = "discarded"    # rep dismissed it


@dataclass
class Message:
    """A first-class outreach message: the draft composed FOR a specific contact at a
    specific company, opening on that company's strongest signal. Hangs off the Contact
    (the person you actually send to), the third first-class object after Company/Contact.
    The AI/template original is preserved in subject/body; the rep's edit lives in
    edited_* — final_subject/body pick the edit when present."""
    contact_email: str        # who it goes to (identity with company_domain)
    company_domain: str
    subject: str
    body: str
    reason_signal: Optional[SignalKind] = None
    edited_subject: str = ""
    edited_body: str = ""
    status: MessageStatus = MessageStatus.DRAFT
    gmail_message_id: str = ""
    gmail_thread_id: str = ""
    sent_at: Optional[datetime] = None
    sent_by: str = ""          # the rep's email that sent it
    id: Optional[int] = None
    created_at: Optional[datetime] = None

    @property
    def final_subject(self) -> str:
        return self.edited_subject or self.subject

    @property
    def final_body(self) -> str:
        return self.edited_body or self.body


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
