from engine.hubspot import create_context_properties as m


def test_payloads_cover_all_five_with_team_facing_labels():
    payloads = m.property_payloads()
    names = {p["name"] for p in payloads}
    assert names == {"engine_score", "engine_band", "engine_route", "engine_why_now", "engine_last_synced"}
    assert all(p["groupName"] == "pipeline_engine" for p in payloads)
    band = next(p for p in payloads if p["name"] == "engine_band")
    assert {o["value"] for o in band["options"]} == {"A", "B", "C", "R"}
    # no rev-share / machine-sourced language anywhere in labels
    blob = " ".join(p["label"].lower() for p in payloads)
    assert "rev-share" not in blob and "credit" not in blob and "machine-sourced" not in blob
