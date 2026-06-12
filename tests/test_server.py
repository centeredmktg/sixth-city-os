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
