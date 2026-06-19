"""
FastAPI app: the deployment that ingests a Clay pull, lets the operator triage
net-new closer-bound firms, and pushes them to HubSpot. State lives in Postgres
(SQLite locally). Serves the minimal triage UI at /.
"""

from __future__ import annotations

import csv as csvmod
import io
import os

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from engine.attribution import dashboard
from engine.db import repo
from engine.db.base import make_engine, create_all, make_session_factory
from engine.db.models import AccountRow
from engine.hubspot.client import HubSpotClient
from engine.jobs import find_accounts, score_accounts, route_accounts
from engine.jobs import enrich as enrich_job
from engine.jobs import push_to_hubspot
from engine.modules import draft_cold_email
from engine.models import Route, Stage
from engine import routing
from engine.sources.clay_payload import ClayPayloadSource, has_domain_column

from web import auth


class PushRequest(BaseModel):
    domains: list[str]


class RevalidateStaticFiles(StaticFiles):
    """StaticFiles that tells browsers to ALWAYS revalidate (Cache-Control: no-cache).

    This is a no-build app — index.html pulls app/*.jsx straight off disk and Babel
    transforms them in the browser. Without this, browsers heuristically cache those
    .jsx files (no explicit Cache-Control), so a deploy ships new code but users keep
    running the old UI until a hard refresh. `no-cache` = cache but revalidate every
    time; StaticFiles still answers conditional requests with 304 when unchanged, so
    it stays cheap. Fresh code the moment a deploy lands."""

    async def get_response(self, path, scope):
        response = await super().get_response(path, scope)
        response.headers.setdefault("Cache-Control", "no-cache")
        return response


app = FastAPI(title="Sixth City Pipeline Engine")

# Google-OAuth gate — guards the console + every /api/* route. No-op (open) until the
# Google creds are configured in prod, so local dev/tests are unaffected.
auth.setup_auth(app)

# One engine/session-factory per process, built at import from DATABASE_URL.
_engine = make_engine()
create_all(_engine)
_SessionLocal = make_session_factory(_engine)

WEB_DIR = os.path.dirname(__file__)


def db_session():
    """Request-scoped session. Overridden in tests."""
    s = _SessionLocal()
    try:
        yield s
    finally:
        s.close()


@app.get("/api/health")
def health():
    return {"status": "ok"}


# The console (designed ingestion-engine UI) is served by the StaticFiles mount at
# the bottom of this file — its index.html is the app shell, with ds/ + app/ assets.


@app.post("/api/ingest")
async def ingest(file: UploadFile = File(...), session=Depends(db_session)):
    raw = (await file.read()).decode("utf-8")
    rows = list(csvmod.DictReader(io.StringIO(raw)))
    if not has_domain_column(rows):
        raise HTTPException(status_code=400,
                            detail="CSV must have a domain column (e.g. 'Domain', 'Website')")

    src = ClayPayloadSource(rows=rows)
    discovered = find_accounts.run(sources=[src])
    scored = score_accounts.run(discovered)
    routed = route_accounts.run(scored, auto_confirm=False)

    # Net-new check runs NOW, as part of the upload — to the operator it IS step 1:
    # "is this already in the book?" is the rev-share gate (credit only on net-new), so
    # we surface it immediately, not in a later pass. Batched (one HubSpot Search per
    # 100 domains, paced + 429-retried), so a few-thousand-row list resolves in seconds
    # inside the request. The slow free-signal enrichment stays deferred to /api/enrich.
    # Dry mode (no token) -> empty set -> everything reads net-new.
    existing = HubSpotClient().existing_domains([a.domain for a in routed if a.domain])
    for a in routed:
        a.net_new = (a.domain.strip().lower() not in existing) if a.domain else None

    repo.upsert_accounts(session, routed)

    return {
        "ingested": len(rows),
        "stored": len(routed),
        "net_new": sum(1 for a in routed if a.net_new is True),
        "in_book": sum(1 for a in routed if a.net_new is False),
    }


@app.get("/api/candidates")
def candidates(session=Depends(db_session), limit: int = 250):
    all_unpushed = repo.get_candidates(session)   # sorted by score desc

    # Counts over the full unpushed set
    n_net_new = sum(1 for a in all_unpushed if a.net_new is True)
    n_in_book = sum(1 for a in all_unpushed if a.net_new is False)
    n_pending = sum(1 for a in all_unpushed if a.net_new is None)
    # How many have been through the free-signal enrichment pass — lets the UI show
    # site-quality/signals as "pending" until enrichment runs (net-new is known at
    # ingest; signals are not).
    n_enriched = (session.query(AccountRow)
                  .filter(AccountRow.pushed.is_(False), AccountRow.enriched.is_(True)).count())

    # Sort: net-new first, then pending, then in_book — each group by score desc
    def _rank_key(a):
        nn = a.net_new
        if nn is True:
            group = 0
        elif nn is None:
            group = 1
        else:
            group = 2
        score = -(a.score.total if a.score else 0.0)
        return (group, score)

    ranked = sorted(all_unpushed, key=_rank_key)

    out = []
    for a in ranked[:limit]:
        outreach = draft_cold_email.draft(a)
        in_market, in_market_reason = routing.in_market_status(a)
        out.append({
            "domain": a.domain,
            "name": a.name,
            "city": a.city,
            "vertical": a.vertical.value,
            "in_market": in_market,                 # "confirmed" | "unknown" (never "no")
            "in_market_reason": in_market_reason,
            "route": a.route.effective.value if a.route else None,
            "fit": a.score.fit if a.score else 0.0,
            "timing": a.score.timing if a.score else 0.0,
            "total": a.score.total if a.score else 0.0,
            "band": a.score.band if a.score else "R",
            "net_new": a.net_new,
            "stage": a.stage.value if a.stage else None,
            "score_rationale": a.score.rationale if a.score else "",
            "route_confirmed": bool(a.route and a.route.confirmed),
            "pursued": a.pursued,
            "signals": [{"kind": s.kind.value, "detail": s.detail, "source": s.source,
                         "value": s.value} for s in a.signals],
            "outreach": {"subject": outreach.subject, "body": outreach.body},
        })
    return {
        "candidates": out,
        "count": len(ranked),
        "shown": len(out),
        "counts": {"net_new": n_net_new, "in_book": n_in_book, "pending": n_pending,
                   "enriched": n_enriched},
    }


@app.get("/api/scoreboard")
def scoreboard(session=Depends(db_session)):
    """Engine-impact metrics for Sixth City — the VALUE the engine is creating for
    THEIR pipeline (not rev-share; that stays backend-only). Top of funnel is real
    from the DB now: prospects surfaced, perfect-fit found, net-new, added to CRM.
    The outcome funnel (reached out / meetings booked / pipeline generated) lives in
    HubSpot activity and isn't synced yet — returned as null so the UI shows it as
    pending rather than a fake zero."""
    rows = session.query(AccountRow).all()
    surfaced = len(rows)
    by_band = {b: sum(1 for r in rows if (r.band or "") == b) for b in ("A", "B", "C", "R")}
    net_new = sum(1 for r in rows if r.net_new is True)
    perfect_fit = sum(1 for r in rows if (r.band or "") == "A" and r.net_new is True)
    in_crm = sum(1 for r in rows if r.pushed)
    by_vertical = {}
    for r in rows:
        by_vertical[r.vertical] = by_vertical.get(r.vertical, 0) + 1
    top_verticals = sorted(by_vertical.items(), key=lambda kv: kv[1], reverse=True)[:6]
    # Outcome funnel from live HubSpot activity (reached out / meetings / pipeline $).
    # Defensive: never let a HubSpot hiccup 500 the scoreboard — degrade to pending.
    try:
        outcomes = HubSpotClient().outcomes()
    except Exception:
        outcomes = {"reached_out": None, "meetings": None, "pipeline_value": None}
    return {
        "surfaced": surfaced,
        "perfect_fit": perfect_fit,
        "net_new": net_new,
        "in_crm": in_crm,
        "by_band": by_band,
        "top_verticals": [{"vertical": v, "count": n} for v, n in top_verticals],
        "outcomes": outcomes,
    }


@app.post("/api/enrich")
def enrich(limit: int = 20, session=Depends(db_session)):
    """Run one chunk of free enrichment (site audit + domain age + PageSpeed) over
    not-yet-enriched accounts; re-scores them. Idempotent + resumable — the console
    loops this until remaining == 0."""
    return enrich_job.run(session, limit=limit)


@app.post("/api/push")
def push(req: PushRequest, session=Depends(db_session)):
    selected = {a.domain: a for a in repo.get_candidates(session)
                if a.domain in set(req.domains)}
    # Confirm the HITL gate for the operator-selected firms, then run the push job
    # (which re-validates net-new by domain at claim time as the SLA guard).
    for a in selected.values():
        a.route.confirmed = True
        a.route.confirmed_by = "operator"

    pushed = push_to_hubspot.run(list(selected.values()))

    results = []
    for a in pushed:
        if a.hubspot_id and not a.hubspot_id.startswith("dry-"):
            repo.mark_pushed(session, a.domain, a.hubspot_id)
        results.append({"domain": a.domain, "hubspot_id": a.hubspot_id})

    return {"pushed": results, "count": len(results), "scoreboard": dashboard.build()}


def _contact_dict(c) -> dict:
    return {"name": c.name, "title": c.title, "email": c.email,
            "linkedin_url": c.linkedin_url, "seniority": c.seniority}


@app.post("/api/pursue")
def pursue(req: PushRequest, session=Depends(db_session)):
    """Operator commits to opportunities -> find & enrich the decision-makers (Apollo)
    for each company, store them, flag it pursued. Dry mode (no APOLLO_API_KEY) returns
    0 contacts. Credits are spent here, on the shortlist — never the haystack."""
    from engine.apollo.client import ApolloClient
    apollo = ApolloClient()
    out = []
    for domain in req.domains:
        contacts = apollo.find_contacts(domain, limit=5)
        n = repo.store_contacts(session, domain, contacts)
        out.append({"domain": domain, "contacts_found": n,
                    "contacts": [_contact_dict(c) for c in contacts]})
    return {"pursued": out, "apollo_configured": not apollo.dry}


@app.get("/api/contacts")
def contacts(domain: str, session=Depends(db_session)):
    """The decision-makers sourced for a pursued company (empty until pursued)."""
    return {"domain": domain,
            "contacts": [_contact_dict(c) for c in repo.get_contacts(session, domain)]}


# SPA deep-link routes: each nav item has a real URL (bookmarkable, refresh-safe,
# back/forward works). The console is a client-routed single page, so a hard hit on
# any of these must serve index.html and let the app render the right view from the
# path. Registered BEFORE the "/" StaticFiles mount so they win over its catch-all.
_CONSOLE_INDEX = os.path.join(WEB_DIR, "console", "index.html")
for _spa_path in ("/ingestion", "/queue", "/triage", "/scoreboard", "/accounts"):
    app.add_api_route(_spa_path, lambda: FileResponse(_CONSOLE_INDEX),
                      methods=["GET"], include_in_schema=False)

# Earlier vanilla design prototype, kept under /design.
app.mount("/design", StaticFiles(directory=os.path.join(WEB_DIR, "design"), html=True),
          name="design")

# The designed ingestion-engine console (Sixth City Marketing Design System) is the
# product UI. Mounted LAST at "/" so the explicit /api/* routes above take precedence;
# html=True serves console/index.html at "/" and resolves its ds/ + app/ assets.
app.mount("/", RevalidateStaticFiles(directory=os.path.join(WEB_DIR, "console"), html=True),
          name="console")
