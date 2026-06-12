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

from engine.db import repo
from engine.db.base import make_engine, create_all, make_session_factory
from engine.hubspot.client import HubSpotClient
from engine.jobs import find_accounts, score_accounts, route_accounts
from engine.models import Route
from engine.sources.clay_payload import ClayPayloadSource

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
    if not rows or "domain" not in rows[0]:
        raise HTTPException(status_code=400, detail="CSV must have a 'domain' column")

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


# Serve the Claude Design app + assets under /design (presentation-layer pass).
app.mount("/design", StaticFiles(directory=os.path.join(WEB_DIR, "design"), html=True),
          name="design")
