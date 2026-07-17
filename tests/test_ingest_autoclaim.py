"""AUTO_CLAIM_ENABLED flag + /api/ingest background claim trigger + /api/claim.

Hermetic (conftest forces DRY_RUN=1): never hits the live HubSpot portal. Uses the
`client`/`session` fixtures from conftest.py so the DB dependency is the in-memory
SQLite session, matching the other server tests.
"""
import io

import web.server as server

CSV = (
    "company,domain,vertical,city,pagespeed_mobile,ads_active\n"
    "Buckeye Industrial,buckeye.example,industrial_manufacturing,Cleveland,34,3\n"
)


def test_claim_endpoint_runs_job(client, monkeypatch):
    called = {}

    def fake_run(session, limit=None):
        called["ran"] = True
        return {"claimed": 0, "remaining": 0, "error": None}

    monkeypatch.setattr(server.claim, "run", fake_run)
    r = client.post("/api/claim")
    assert r.status_code == 200
    assert called.get("ran") is True
    assert r.json() == {"claimed": 0, "remaining": 0, "error": None}


def test_ingest_schedules_claim_only_when_flag_on(client, monkeypatch):
    scheduled = {"n": 0}
    # Count background tasks added by ingest, without letting them actually run
    # against a session that's closed by the time the request returns.
    import starlette.background as bg

    def spy(self, func, *a, **k):
        scheduled["n"] += 1

    monkeypatch.setattr(bg.BackgroundTasks, "add_task", spy)

    monkeypatch.setattr(type(server.CONFIG), "auto_claim_enabled", property(lambda self: False))
    r = client.post("/api/ingest", files={"file": ("x.csv", io.BytesIO(CSV.encode()), "text/csv")})
    assert r.status_code == 200
    assert scheduled["n"] == 0

    monkeypatch.setattr(type(server.CONFIG), "auto_claim_enabled", property(lambda self: True))
    r = client.post("/api/ingest", files={"file": ("x.csv", io.BytesIO(CSV.encode()), "text/csv")})
    assert r.status_code == 200
    assert scheduled["n"] == 1
