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
from engine.hubspot.client import HubSpotClient
from engine.jobs import find_accounts, score_accounts, route_accounts
from engine.jobs import push_to_hubspot
from engine.modules import draft_cold_email
from engine.models import Route, Stage
from engine.sources.clay_payload import ClayPayloadSource, has_domain_column


class PushRequest(BaseModel):
    domains: list[str]

app = FastAPI(title="Sixth City Pipeline Engine")

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


@app.get("/")
def index():
    return FileResponse(os.path.join(WEB_DIR, "triage.html"))


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

    client = HubSpotClient()
    net_new = client.filter_net_new(routed)
    repo.upsert_accounts(session, net_new)

    closer_bound = sum(1 for a in net_new if a.route and a.route.effective == Route.CLOSER)
    parked = sum(1 for a in net_new if a.route and a.route.effective == Route.NURTURE)
    return {
        "ingested": len(rows),
        "scored": len(scored),
        "closer_bound": closer_bound,
        "parked_nurture": parked,
        "dropped_not_net_new": len(routed) - len(net_new),
    }


@app.get("/api/candidates")
def candidates(session=Depends(db_session)):
    out = []
    for a in repo.get_candidates(session):
        outreach = draft_cold_email.draft(a)
        out.append({
            "domain": a.domain,
            "name": a.name,
            "city": a.city,
            "vertical": a.vertical.value,
            "fit": a.score.fit if a.score else 0.0,
            "timing": a.score.timing if a.score else 0.0,
            "total": a.score.total if a.score else 0.0,
            "band": a.score.band if a.score else "R",
            "signals": [{"kind": s.kind.value, "detail": s.detail} for s in a.signals],
            "outreach": {"subject": outreach.subject, "body": outreach.body},
        })
    out.sort(key=lambda c: c["total"], reverse=True)
    return {"candidates": out, "count": len(out)}


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


# Serve the Claude Design app + assets under /design (presentation-layer pass).
app.mount("/design", StaticFiles(directory=os.path.join(WEB_DIR, "design"), html=True),
          name="design")
