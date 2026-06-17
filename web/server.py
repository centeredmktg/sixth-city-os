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
from engine.jobs import enrich as enrich_job
from engine.jobs import push_to_hubspot
from engine.modules import draft_cold_email
from engine.models import Route, Stage
from engine.sources.clay_payload import ClayPayloadSource, has_domain_column


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

    repo.upsert_accounts(session, routed)

    return {
        "ingested": len(rows),
        "stored": len(routed),
    }


@app.get("/api/candidates")
def candidates(session=Depends(db_session), limit: int = 250):
    all_unpushed = repo.get_candidates(session)   # sorted by score desc

    # Counts over the full unpushed set
    n_net_new = sum(1 for a in all_unpushed if a.net_new is True)
    n_in_book = sum(1 for a in all_unpushed if a.net_new is False)
    n_pending = sum(1 for a in all_unpushed if a.net_new is None)

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
        out.append({
            "domain": a.domain,
            "name": a.name,
            "city": a.city,
            "vertical": a.vertical.value,
            "route": a.route.effective.value if a.route else None,
            "fit": a.score.fit if a.score else 0.0,
            "timing": a.score.timing if a.score else 0.0,
            "total": a.score.total if a.score else 0.0,
            "band": a.score.band if a.score else "R",
            "net_new": a.net_new,
            "signals": [{"kind": s.kind.value, "detail": s.detail} for s in a.signals],
            "outreach": {"subject": outreach.subject, "body": outreach.body},
        })
    return {
        "candidates": out,
        "count": len(ranked),
        "shown": len(out),
        "counts": {"net_new": n_net_new, "in_book": n_in_book, "pending": n_pending},
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


# Earlier vanilla design prototype, kept under /design.
app.mount("/design", StaticFiles(directory=os.path.join(WEB_DIR, "design"), html=True),
          name="design")

# The designed ingestion-engine console (Sixth City Marketing Design System) is the
# product UI. Mounted LAST at "/" so the explicit /api/* routes above take precedence;
# html=True serves console/index.html at "/" and resolves its ds/ + app/ assets.
app.mount("/", RevalidateStaticFiles(directory=os.path.join(WEB_DIR, "console"), html=True),
          name="console")
