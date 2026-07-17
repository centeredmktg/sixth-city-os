from engine.hubspot import create_engine_status_property as m


def test_property_payload_shape():
    payload = m.property_payload()
    assert payload["name"] == "engine_status"
    assert payload["groupName"] == "pipeline_engine"
    opts = {o["value"] for o in payload["options"]}
    assert opts == {"discovered", "working"}
