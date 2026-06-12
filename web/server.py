"""
FastAPI app: the deployment that ingests a Clay pull, lets the operator triage
net-new closer-bound firms, and pushes them to HubSpot. State lives in Postgres
(SQLite locally). Serves the minimal triage UI at /.
"""

from __future__ import annotations

import os

from fastapi import Depends, FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from engine.db.base import make_engine, create_all, make_session_factory

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


# Serve the Claude Design app + assets under /design (presentation-layer pass).
app.mount("/design", StaticFiles(directory=os.path.join(WEB_DIR, "design"), html=True),
          name="design")
