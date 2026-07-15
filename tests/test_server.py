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


def test_ingest_flags_in_book_via_hubspot_on_upload(client, monkeypatch):
    """The net-new check runs AT UPLOAD: a domain already in the HubSpot book is
    flagged net_new=False (no rev-share credit) the moment the list lands; the rest
    are net-new — before any enrichment spend."""
    import web.server as server
    monkeypatch.setattr(server.HubSpotClient, "existing_domains",
                        lambda self, domains: {"buckeye.example"})
    r = client.post("/api/ingest",
                    files={"file": ("clay.csv", io.BytesIO(CSV.encode()), "text/csv")})
    assert r.status_code == 200
    body = r.json()
    assert body["in_book"] == 1 and body["net_new"] == 1
    cands = {c["domain"]: c for c in client.get("/api/candidates").json()["candidates"]}
    assert cands["buckeye.example"]["net_new"] is False   # already in CRM
    assert cands["lakeshore.example"]["net_new"] is True   # net-new -> creditable


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
    # Net-new is decided AT INGEST now (the HubSpot check runs on upload). With no
    # token the client is in dry mode -> existing book is empty -> every row is
    # net-new, nothing pending.
    assert counts["net_new"] == 2
    assert counts["pending"] == 0
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


def test_push_claims_selected_and_drops_them(client, session, monkeypatch):
    import web.server as server
    from engine.db import settings_repo
    settings_repo.save_default_owner_id(session, "999")
    # Fake the promote: return a deterministic id, no HubSpot call.
    monkeypatch.setattr(server.HubSpotClient, "promote_to_working",
                        lambda self, account, owner_id: f"hs-{account.domain}")
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


def test_push_with_route_override_claims_nurture_domain(client, session, monkeypatch):
    """Bug B: the operator's route choice must reach the server. A nurture-recommended
    firm the operator elects as closer (LFG) gets claimed. Without the override the
    server reads the stored route (nurture) and silently pushes nothing."""
    import web.server as server
    from engine.db import settings_repo
    settings_repo.save_default_owner_id(session, "999")
    monkeypatch.setattr(server.HubSpotClient, "promote_to_working",
                        lambda self, account, owner_id: f"hs-{account.domain}")
    monkeypatch.setattr("web.server.dashboard.build", lambda: "SCOREBOARD")
    client.post("/api/ingest",
                files={"file": ("clay.csv", io.BytesIO(CSV.encode()), "text/csv")})

    # lakeshore is recommended nurture (1 signal); elect it closer and claim it.
    r = client.post("/api/push", json={"domains": ["lakeshore.example"], "route": "closer"})
    assert r.status_code == 200
    body = r.json()
    res = {x["domain"]: x for x in body["results"]}
    assert res["lakeshore.example"]["status"] == "claimed"
    assert res["lakeshore.example"]["hubspot_id"] == "hs-lakeshore.example"
    assert body["claimed"] == 1
    # claimed -> dropped from the queue
    cands = {c["domain"] for c in client.get("/api/candidates").json()["candidates"]}
    assert "lakeshore.example" not in cands


def test_push_without_override_reports_skip_not_silent_success(client, session, monkeypatch):
    """Bug A: a nurture firm pushed WITHOUT electing closer is NOT claimed. The server
    reports it skipped (with a reason) so the UI can't misread a no-op as 'Pushed'.
    The firm stays in the queue — not falsely dropped."""
    import web.server as server
    from engine.db import settings_repo
    settings_repo.save_default_owner_id(session, "999")
    monkeypatch.setattr(server.HubSpotClient, "promote_to_working",
                        lambda self, account, owner_id: f"hs-{account.domain}")
    monkeypatch.setattr("web.server.dashboard.build", lambda: "SCOREBOARD")
    client.post("/api/ingest",
                files={"file": ("clay.csv", io.BytesIO(CSV.encode()), "text/csv")})

    r = client.post("/api/push", json={"domains": ["lakeshore.example"]})
    assert r.status_code == 200
    body = r.json()
    res = {x["domain"]: x for x in body["results"]}
    assert res["lakeshore.example"]["status"] == "skipped"
    assert "nurture" in res["lakeshore.example"]["reason"]
    assert body["claimed"] == 0
    cands = {c["domain"] for c in client.get("/api/candidates").json()["candidates"]}
    assert "lakeshore.example" in cands   # not falsely dropped


def test_push_without_default_owner_returns_400(client, monkeypatch):
    """No default owner set (Settings) -> /api/push refuses rather than promoting an
    unassigned company."""
    import web.server as server
    monkeypatch.setattr(server.HubSpotClient, "promote_to_working",
                        lambda self, account, owner_id: f"hs-{account.domain}")
    client.post("/api/ingest",
                files={"file": ("clay.csv", io.BytesIO(CSV.encode()), "text/csv")})

    r = client.post("/api/push", json={"domains": ["buckeye.example"]})
    assert r.status_code == 400
    assert "default owner" in r.json()["detail"].lower()


def test_enrich_endpoint_returns_progress(client, monkeypatch):
    import engine.jobs.enrich as enrichmod
    monkeypatch.setattr(enrichmod, "default_sources", lambda: [])  # no network in test
    csv = "Name,Domain\nAcme,acme.example\n"
    client.post("/api/ingest", files={"file": ("c.csv", io.BytesIO(csv.encode()), "text/csv")})
    r = client.post("/api/enrich?limit=10")
    assert r.status_code == 200
    body = r.json()
    assert "enriched" in body and "remaining" in body


def test_enrich_places_endpoint_runs_second_pass(client, monkeypatch):
    import engine.jobs.enrich as enrichmod
    monkeypatch.setattr(enrichmod, "default_sources", lambda: [])  # pass 1: no network
    csv = "Name,Domain\nAcme,acme.example\n"
    client.post("/api/ingest", files={"file": ("c.csv", io.BytesIO(csv.encode()), "text/csv")})
    client.post("/api/enrich?limit=10")               # marks the row enriched + net_new
    # Places source is dry without GOOGLE_PLACES_KEY -> no network, no spend, but the
    # eligible row is still processed (places_enriched flag set, re-scored).
    r = client.post("/api/enrich-places?limit=10")
    assert r.status_code == 200
    body = r.json()
    assert body["enriched"] == 1 and "remaining" in body


def test_scoreboard_value_metrics_no_revshare(client):
    """Scoreboard reports THEIR engine-impact value (surfaced / perfect-fit / in-CRM)
    and a pending outcome funnel — never rev-share (that's backend-only)."""
    client.post("/api/ingest",
                files={"file": ("clay.csv", io.BytesIO(CSV.encode()), "text/csv")})
    body = client.get("/api/scoreboard").json()
    assert body["surfaced"] == 2
    assert "perfect_fit" in body and "net_new" in body and "in_crm" in body
    assert set(body["by_band"]) == {"A", "B", "C", "R"}
    # outcome funnel present but pending (not yet wired to HubSpot activity)
    assert body["outcomes"]["pipeline_value"] is None
    # no rev-share / attribution language leaks into the payload
    assert "rev" not in str(body).lower() and "owed" not in str(body).lower()


# --- Scoring rubric endpoints -------------------------------------------------
import pytest as _pytest
from engine.scoring.config import set_active_config as _set_active, DEFAULT_CONFIG as _DEF


@_pytest.fixture(autouse=True)
def _reset_active_config():
    """Restore the default active config after each test — PUT mutates a process global."""
    yield
    _set_active(_DEF)


def _seed_account(session, domain="a.com"):
    from engine.db import repo
    from engine.models import Account, Signal, SignalKind, Vertical
    a = Account(name="x", domain=domain, vertical=Vertical.INDUSTRIAL_MANUFACTURING, state="OH")
    a.signals = [Signal(kind=SignalKind.AI_CITATION_GAP, source="t", value=1.0)]
    repo.upsert_accounts(session, [a])


def test_get_scoring_config_returns_config_and_defaults(client):
    r = client.get("/api/scoring-config").json()
    assert r["config"]["fit_weight"] == 0.4
    assert r["defaults"]["band_a"] == 75.0
    assert len(r["config"]["vertical_fit_bonus"]) == 10


def test_put_bad_config_400_and_no_rescore(client, session):
    _seed_account(session)
    r = client.put("/api/scoring-config", json={"band_a": 10, "band_b": 20, "band_c": 30})
    assert r.status_code == 400
    # nothing saved: GET still shows defaults
    assert client.get("/api/scoring-config").json()["config"]["band_a"] == 75.0


def test_put_good_config_saves_active_and_rescores(client, session):
    _seed_account(session)
    body = {**client.get("/api/scoring-config").json()["config"], "fit_weight": 0.5}
    r = client.put("/api/scoring-config", json=body)
    assert r.status_code == 200
    j = r.json()
    assert j["saved"] is True and j["rescored"] == 1
    assert set(j["bands"]) == {"A", "B", "C", "R"} and sum(j["bands"].values()) == 1
    # persisted for the next GET
    assert client.get("/api/scoring-config").json()["config"]["fit_weight"] == 0.5


def test_preview_persists_nothing(client, session):
    from engine.db import settings_repo
    _seed_account(session)
    before = settings_repo.load_scoring_config(session)
    body = {**client.get("/api/scoring-config").json()["config"], "fit_weight": 0.9}
    r = client.post("/api/scoring-config/preview", json=body)
    assert r.status_code == 200
    assert r.json()["total"] == 1 and set(r.json()["bands"]) == {"A", "B", "C", "R"}
    assert settings_repo.load_scoring_config(session) == before   # unchanged


# --- Message compose/send queue endpoints ------------------------------------
def _seed_company_with_contact(session):
    from engine.db import repo
    from engine.models import Account, Contact, Vertical
    repo.upsert_accounts(session, [Account(name="Acme", domain="acme.com",
                                           vertical=Vertical.INDUSTRIAL_MANUFACTURING, state="OH")])
    repo.store_contacts(session, "acme.com", [
        Contact(name="Jane Doe", company_domain="acme.com", title="CMO", email="jane@acme.com")])


def test_message_compose_list_edit_discard(client, session):
    _seed_company_with_contact(session)
    m = client.post("/api/messages", json={"domain": "acme.com", "contact_email": "jane@acme.com"}).json()
    assert m["status"] == "draft" and m["contact_email"] == "jane@acme.com"
    assert m["body"].startswith("Hi Jane —")                     # contact-aware compose
    mid = m["id"]
    assert any(x["id"] == mid for x in client.get("/api/messages").json()["messages"])
    e = client.patch(f"/api/messages/{mid}", json={"subject": "Edited", "body": "Edited body"}).json()
    assert e["subject"] == "Edited" and e["edited"] is True
    assert e["original_body"].startswith("Hi Jane —")            # original preserved
    client.post(f"/api/messages/{mid}/discard")
    assert not any(x["id"] == mid for x in client.get("/api/messages").json()["messages"])


def test_compose_unknown_company_404(client):
    r = client.post("/api/messages", json={"domain": "nope.com", "contact_email": "x@nope.com"})
    assert r.status_code == 404


def test_compose_contact_not_found_404(client, session):
    from engine.db import repo
    from engine.models import Account, Vertical
    repo.upsert_accounts(session, [Account(name="Acme", domain="acme.com", vertical=Vertical.UNKNOWN)])
    r = client.post("/api/messages", json={"domain": "acme.com", "contact_email": "ghost@acme.com"})
    assert r.status_code == 404


def test_send_message_gated_without_gmail(client, session):
    _seed_company_with_contact(session)
    mid = client.post("/api/messages", json={"domain": "acme.com", "contact_email": "jane@acme.com"}).json()["id"]
    r = client.post(f"/api/messages/{mid}/send")
    assert r.status_code == 200 and r.json()["sent"] is False and r.json()["reason"] == "connect_gmail"
    assert any(x["id"] == mid for x in client.get("/api/messages").json()["messages"])   # draft kept


def test_send_message_success_stamps_and_drops(client, session, monkeypatch):
    _seed_company_with_contact(session)
    mid = client.post("/api/messages", json={"domain": "acme.com", "contact_email": "jane@acme.com"}).json()["id"]
    monkeypatch.setattr("engine.gmail.send.send", lambda *a, **k: {"id": "gm1", "threadId": "gt1"})
    r = client.post(f"/api/messages/{mid}/send").json()
    assert r["sent"] is True and r["gmail_message_id"] == "gm1"
    assert not any(x["id"] == mid for x in client.get("/api/messages").json()["messages"])  # sent → dropped


def test_send_unknown_message_404(client):
    assert client.post("/api/messages/99999/send").status_code == 404


def test_send_message_no_double_send(client, session, monkeypatch):
    _seed_company_with_contact(session)
    mid = client.post("/api/messages", json={"domain": "acme.com", "contact_email": "jane@acme.com"}).json()["id"]
    calls = {"n": 0}
    def _fake(*a, **k):
        calls["n"] += 1
        return {"id": "gm1", "threadId": "gt1"}
    monkeypatch.setattr("engine.gmail.send.send", _fake)
    r1 = client.post(f"/api/messages/{mid}/send").json()
    r2 = client.post(f"/api/messages/{mid}/send").json()
    assert r1["sent"] is True
    assert r2["reason"] == "already_sent"              # duplicate blocked
    assert calls["n"] == 1                              # exactly one real send
