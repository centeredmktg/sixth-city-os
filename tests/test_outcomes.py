"""HubSpotClient.outcomes() aggregates engine-impact (reached out / meetings /
open pipeline $) from associations + deals. Parsing is verified against the real
API shapes (probed live): results[].to[].toObjectId, deal props amount/
hs_is_closed_won/dealstage."""
import engine.hubspot.client as hc
from engine.hubspot.client import HubSpotClient


def _client(monkeypatch, post):
    c = HubSpotClient.__new__(HubSpotClient)   # skip __init__ (no token needed)
    c._dry = False
    monkeypatch.setattr(c, "_post", post)
    monkeypatch.setattr(hc.time, "sleep", lambda *a, **k: None)
    return c


def test_outcomes_aggregates_pipeline_and_activity(monkeypatch):
    def post(path, payload):
        if path.endswith("/companies/search"):
            return {"results": [{"id": "1"}, {"id": "2"}]}
        if "associations/companies/deals" in path:
            return {"results": [{"from": {"id": "1"}, "to": [{"toObjectId": 10}]},
                                {"from": {"id": "2"}, "to": [{"toObjectId": 11}, {"toObjectId": 12}]}]}
        if "associations/companies/emails" in path:
            return {"results": [{"from": {"id": "1"}, "to": [{"toObjectId": 99}]}]}
        if "associations/companies/calls" in path:
            return {"results": [{"from": {"id": "2"}, "to": [{"toObjectId": 98}]}]}
        if "associations/companies/meetings" in path:
            return {"results": [{"from": {"id": "1"}, "to": [{"toObjectId": 1}]},
                                {"from": {"id": "2"}, "to": [{"toObjectId": 2}, {"toObjectId": 3}]}]}
        if path.endswith("/deals/batch/read"):
            return {"results": [
                {"properties": {"amount": "1000", "hs_is_closed_won": "false", "dealstage": "qualifiedtobuy"}},
                {"properties": {"amount": "5000", "hs_is_closed_won": "true", "dealstage": "closedwon"}},   # won -> excluded
                {"properties": {"amount": "2000", "hs_is_closed_won": "false", "dealstage": "closedlost"}},  # lost -> excluded
            ]}
        return {}
    o = _client(monkeypatch, post).outcomes()
    assert o["reached_out"] == 2          # co1 emailed + co2 called
    assert o["meetings"] == 3             # 1 + 2 meetings
    assert o["pipeline_value"] == 1000.0  # only the open deal counts


def test_outcomes_zero_when_no_machine_sourced(monkeypatch):
    o = _client(monkeypatch, lambda path, payload: {"results": []}).outcomes()
    assert o == {"reached_out": 0, "meetings": 0, "pipeline_value": 0.0}


def test_outcomes_pending_in_dry_mode():
    c = HubSpotClient.__new__(HubSpotClient)
    c._dry = True
    assert c.outcomes() == {"reached_out": None, "meetings": None, "pipeline_value": None}
