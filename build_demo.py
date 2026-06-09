"""
Demo builder — runs the real engine over the demo dataset and emits web/data.json
for the front-end. This is the "blow John's mind" artifact: real scoring, routing,
SEO-gap + PageSpeed + proximity signals fused into one queue.

    python build_demo.py     # -> web/data.json

Everything except the closed-won scoreboard rows is REAL engine output. The
closed-won rows are synthesized (that data lives downstream in HubSpot, which we
wire next) and clearly flagged demo: true so the money math renders populated.
"""

from __future__ import annotations

import json
import os

from engine import geo
from engine.geo import OfficeHub
from engine.models import Attribution, Route, Stage
from engine.scoring import abcr
from engine.routing import recommend, confirm_stub, pain_qualified
from engine.offers.recipes import select_offer
from engine.sources.clay_payload import ClayPayloadSource
from engine.sources.seo_gap import SeoGapSource
from engine.sources.public_signals import PublicSignalsSource
from engine.attribution.dashboard import owed_line, REV_SHARE_RATE, TAIL_MONTHS, MONTHLY_FLOOR

HERE = os.path.dirname(__file__)
CSV = os.path.join(HERE, "web", "demo_accounts.csv")
OUT = os.path.join(HERE, "web", "data.json")

# DEMO office hubs (placeholders — Danny swaps in Sixth City's real six). Three of
# NE Ohio's metros so proximity visibly differentiates the demo accounts.
DEMO_HUBS = [
    OfficeHub("Cleveland", 41.4993, -81.6944),
    OfficeHub("Akron", 41.0814, -81.5190),
    OfficeHub("Youngstown", 41.0998, -80.6495),
]

# Tier fees (mgmt fee = Sixth City revenue, NOT ad spend) — from inputs.md.
SILVER, GOLD = 1500.0, 2000.0


def account_dict(a) -> dict:
    miles = geo.miles_to_nearest_hub(a)
    return {
        "name": a.name,
        "domain": a.domain,
        "vertical": a.vertical.value,
        "city": a.city,
        "linkedin_url": a.linkedin_url,
        "score": {
            "fit": a.score.fit, "timing": a.score.timing,
            "total": a.score.total, "band": a.score.band,
            "rationale": a.score.rationale,
        },
        "route": {
            "recommended": a.route.recommended.value,
            "rationale": a.route.rationale,
            "effective": a.route.effective.value,
            "confirmed": a.route.confirmed,
        },
        "proximity": {
            "weight": round(geo.proximity_weight(a), 3),
            "miles_to_hub": round(miles, 1) if miles is not None else None,
        },
        "signals": [
            {"kind": s.kind.value, "detail": s.detail, "value": s.value, "source": s.source}
            for s in a.signals
        ],
        "pain_qualified": pain_qualified(a),
        "offer": ({
            "recipe": a.offer.recipe, "kind": a.offer.kind, "data_recipe": a.offer.data_recipe,
            "subject": a.offer.subject, "body": a.offer.body, "cta": a.offer.cta,
        } if a.offer else None),
    }


def build() -> dict:
    geo.OFFICE_HUBS = DEMO_HUBS

    source = ClayPayloadSource(csv_path=CSV)
    seo = SeoGapSource()
    public = PublicSignalsSource()
    accounts = source.discover()

    for a in accounts:
        a.signals.extend(source.enrich(a))
        a.signals.extend(seo.enrich(a))
        a.signals.extend(public.enrich(a))     # Blueprint moat signals
        a.score = abcr.score(a)
        a.route = confirm_stub(recommend(a))
        a.stage = Stage.ROUTED
        if a.route.effective == Route.CLOSER:
            a.offer = select_offer(a)           # PVP/PQS offer only for closer-bound (token discipline)

    accounts.sort(key=lambda a: a.score.total, reverse=True)
    closer = [a for a in accounts if a.route.effective == Route.CLOSER]
    nurture = [a for a in accounts if a.route.effective == Route.NURTURE]

    # --- Synthesized scoreboard (demo) — top 2 closer-bound shown closed-won ---
    won = closer[:2]
    owed_rows = []
    for a, fee in zip(won, (GOLD, SILVER)):
        row = Attribution(account_domain=a.domain, machine_sourced=True,
                          discovered_by=a.discovered_by, service_fee_monthly=fee,
                          signed_at=None, stage=Stage.CLOSED_WON)
        # owed math needs signed_at to qualify; stamp it for the demo
        row.signed_at = True  # truthy gate for qualifies(); real value is a date in prod
        line = owed_line(row)
        owed_rows.append({"name": a.name, "domain": a.domain,
                          "service_fee_monthly": fee, "rev_share": line.twelve_mo_rev_share,
                          "qualifying": line.qualifying})

    total_rev_share = sum(r["rev_share"] for r in owed_rows)

    return {
        "brand": "Sixth City — Pipeline Engine",
        "demo": True,
        "stats": {
            "ingested": len(accounts),
            "closer_queue": len(closer),
            "nurture": len(nurture),
            "rev_share_rate": REV_SHARE_RATE,
            "tail_months": TAIL_MONTHS,
            "monthly_floor": MONTHLY_FLOOR,
        },
        "queue": [account_dict(a) for a in closer],
        "nurture": [account_dict(a) for a in nurture],
        "all": [account_dict(a) for a in accounts],
        "scoreboard": {
            "funnel": {"discovered": len(accounts), "scored": len(accounts),
                       "routed": len(accounts), "closer_bound": len(closer),
                       "closed_won": len(won)},
            "owed": owed_rows,
            "total_rev_share": round(total_rev_share, 2),
            "demo_note": "Closed-won rows synthesized; live once HubSpot is wired.",
        },
    }


if __name__ == "__main__":
    data = build()
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    # Also emit data.js so index.html works on file:// (fetch is CORS-blocked there).
    with open(os.path.join(HERE, "web", "data.js"), "w", encoding="utf-8") as f:
        f.write("window.PIPELINE_DATA = " + json.dumps(data) + ";")
    print(f"wrote {OUT}")
    print(f"  ingested {data['stats']['ingested']} · "
          f"closer queue {data['stats']['closer_queue']} · "
          f"nurture {data['stats']['nurture']}")
    print(f"  demo rev-share shown: ${data['scoreboard']['total_rev_share']:,.0f}")
