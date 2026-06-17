def test_health_ok(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


import io

CSV = (
    "company,domain,vertical,city,pagespeed_mobile,ads_active\n"
    "Buckeye Industrial,buckeye.example,industrial_manufacturing,Cleveland,34,3\n"
    "Lakeshore Dental,lakeshore.example,healthcare,Toledo,61,\n"
)


def test_ingest_stores_all_rows_fast(client, monkeypatch):
    r = client.post("/api/ingest",
                    files={"file": ("clay.csv", io.BytesIO(CSV.encode()), "text/csv")})
    assert r.status_code == 200
    body = r.json()
    assert body["ingested"] == 2
    assert body["stored"] == 2


def test_ingest_rejects_csv_without_domain(client, monkeypatch):
    bad = "company,city\nNoDomain,Cleveland\n"
    r = client.post("/api/ingest",
                    files={"file": ("bad.csv", io.BytesIO(bad.encode()), "text/csv")})
    assert r.status_code == 400


def test_candidates_lists_all_ranked_with_route_badge(client, monkeypatch):
    """Dump-and-sort: the queue surfaces EVERY net-new firm ranked best-first —
    routing is a badge, not a gate. A 1-signal firm still shows (as nurture), it
    just ranks below a 2-signal closer-bound firm."""
    client.post("/api/ingest",
                files={"file": ("clay.csv", io.BytesIO(CSV.encode()), "text/csv")})
    r = client.get("/api/candidates")
    assert r.status_code == 200
    cands = r.json()["candidates"]
    domains = [c["domain"] for c in cands]
    assert "buckeye.example" in domains            # 2 signals -> closer
    assert "lakeshore.example" in domains          # 1 signal -> nurture, still shown
    assert domains.index("buckeye.example") < domains.index("lakeshore.example")  # ranked
    buckeye = next(c for c in cands if c["domain"] == "buckeye.example")
    lakeshore = next(c for c in cands if c["domain"] == "lakeshore.example")
    assert buckeye["route"] == "closer"
    assert lakeshore["route"] == "nurture"
    assert buckeye["signals"] and "outreach" in buckeye

    body = r.json()
    assert "counts" in body
    counts = body["counts"]
    assert "net_new" in counts
    assert "in_book" in counts
    assert "pending" in counts
    # All ingested rows have net_new=None (pending) since enrich hasn't run
    assert counts["pending"] == 2
    # Each candidate dict has the net_new field
    for c in body["candidates"]:
        assert "net_new" in c


def test_candidates_net_new_ranks_before_pending_and_in_book(client, monkeypatch):
    """Net-new rows sort first, then pending, then in_book — each group by score desc."""
    from engine.db.base import make_engine, create_all, make_session_factory
    from engine.db.models import AccountRow
    import web.server as server

    eng = make_engine("sqlite:///:memory:")
    create_all(eng)
    s = make_session_factory(eng)()

    # net_new=True, high score
    s.add(AccountRow(domain="nn-high.com", name="NN High", net_new=True,
                     total=80.0, band="A", fit=80.0, timing=80.0))
    # net_new=None, medium score
    s.add(AccountRow(domain="pending.com", name="Pending", net_new=None,
                     total=60.0, band="B", fit=60.0, timing=60.0))
    # net_new=False, high score (in book — shouldn't be first despite score)
    s.add(AccountRow(domain="inbook.com", name="In Book", net_new=False,
                     total=90.0, band="A", fit=90.0, timing=90.0))
    s.commit()

    server.app.dependency_overrides[server.db_session] = lambda: s
    from fastapi.testclient import TestClient
    c = TestClient(server.app)
    r = c.get("/api/candidates")
    server.app.dependency_overrides.clear()

    assert r.status_code == 200
    body = r.json()
    domains = [x["domain"] for x in body["candidates"]]
    assert domains[0] == "nn-high.com"    # net_new=True ranks first
    assert domains[1] == "pending.com"    # None ranks second
    assert domains[2] == "inbook.com"     # False ranks last

    counts = body["counts"]
    assert counts["net_new"] == 1
    assert counts["pending"] == 1
    assert counts["in_book"] == 1


def test_push_claims_selected_and_drops_them(client, monkeypatch):
    import web.server as server
    # Fake the claim: return a deterministic id, no HubSpot call.
    monkeypatch.setattr(server.HubSpotClient, "push",
                        lambda self, account, outreach: f"hs-{account.domain}")
    # Scoreboard text is read from HubSpot; stub it to avoid a network call.
    monkeypatch.setattr("web.server.dashboard.build", lambda: "SCOREBOARD")

    client.post("/api/ingest",
                files={"file": ("clay.csv", io.BytesIO(CSV.encode()), "text/csv")})

    r = client.post("/api/push", json={"domains": ["buckeye.example"]})
    assert r.status_code == 200
    body = r.json()
    assert {p["domain"] for p in body["pushed"]} == {"buckeye.example"}
    assert body["pushed"][0]["hubspot_id"] == "hs-buckeye.example"
    assert body["scoreboard"] == "SCOREBOARD"

    # No longer a candidate after the claim.
    cands = client.get("/api/candidates").json()["candidates"]
    assert "buckeye.example" not in {c["domain"] for c in cands}


def test_enrich_endpoint_returns_progress(client, monkeypatch):
    import engine.jobs.enrich as enrichmod
    monkeypatch.setattr(enrichmod, "default_sources", lambda: [])  # no network in test
    csv = "Name,Domain\nAcme,acme.example\n"
    client.post("/api/ingest", files={"file": ("c.csv", io.BytesIO(csv.encode()), "text/csv")})
    r = client.post("/api/enrich?limit=10")
    assert r.status_code == 200
    body = r.json()
    assert "enriched" in body and "remaining" in body
