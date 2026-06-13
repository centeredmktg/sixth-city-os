def test_health_ok(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


import io

CSV = (
    "company,domain,vertical,city,pagespeed_mobile,ads_active\n"
    "Buckeye Industrial,buckeye.example,industrial_b2b,Cleveland,34,3\n"
    "Lakeshore Dental,lakeshore.example,healthcare,Toledo,61,\n"
)


def _empty_book(monkeypatch):
    import web.server as server
    monkeypatch.setattr(server.HubSpotClient, "filter_net_new",
                        lambda self, accounts: accounts)


def test_ingest_writes_net_new_and_reports_counts(client, monkeypatch):
    _empty_book(monkeypatch)
    r = client.post("/api/ingest",
                    files={"file": ("clay.csv", io.BytesIO(CSV.encode()), "text/csv")})
    assert r.status_code == 200
    body = r.json()
    assert body["ingested"] == 2
    assert body["closer_bound"] >= 1   # Buckeye has 2 signals -> closer
    assert body["dropped_not_net_new"] == 0


def test_ingest_rejects_csv_without_domain(client, monkeypatch):
    _empty_book(monkeypatch)
    bad = "company,city\nNoDomain,Cleveland\n"
    r = client.post("/api/ingest",
                    files={"file": ("bad.csv", io.BytesIO(bad.encode()), "text/csv")})
    assert r.status_code == 400


def test_candidates_lists_closer_bound_with_signals(client, monkeypatch):
    _empty_book(monkeypatch)
    client.post("/api/ingest",
                files={"file": ("clay.csv", io.BytesIO(CSV.encode()), "text/csv")})
    r = client.get("/api/candidates")
    assert r.status_code == 200
    cands = r.json()["candidates"]
    domains = {c["domain"] for c in cands}
    assert "buckeye.example" in domains          # 2 signals -> closer
    assert "lakeshore.example" not in domains     # 1 signal -> nurture, not a candidate
    buckeye = next(c for c in cands if c["domain"] == "buckeye.example")
    assert buckeye["signals"]                      # has signal details
    assert "outreach" in buckeye


def test_push_claims_selected_and_drops_them(client, monkeypatch):
    _empty_book(monkeypatch)
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
