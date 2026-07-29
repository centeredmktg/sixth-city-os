"""engine_status writes only ever touch companies we sourced."""
import pytest

from engine.hubspot.client import HubSpotClient, ENGINE_STATUS_BY_DECISION


class _Client(HubSpotClient):
    """Real method under test, network stubbed."""
    def __init__(self, found=("123", True)):
        self._dry = False
        self._found = found
        self.patched = []

    def _find_company_ours(self, domain):
        return self._found

    def _patch(self, path, payload):
        self.patched.append((path, payload))
        return {}


def test_decision_keys_map_to_hubspot_options():
    assert ENGINE_STATUS_BY_DECISION == {
        "hold": "hold", "nurture": "nurture", "reject": "rejected"}


def test_writes_engine_status_on_our_company():
    c = _Client(found=("123", True))
    assert c.set_engine_status("buckeye.example", "hold") is True
    path, payload = c.patched[0]
    assert path == "/crm/v3/objects/companies/123"
    assert payload["properties"]["engine_status"] == "hold"


def test_refuses_a_company_that_is_not_ours():
    """John's pre-existing book is never written to — the SLA guard."""
    c = _Client(found=("456", False))
    assert c.set_engine_status("theirs.example", "hold") is False
    assert c.patched == []


def test_refuses_a_company_not_in_hubspot():
    c = _Client(found=(None, False))
    assert c.set_engine_status("ghost.example", "hold") is False
    assert c.patched == []


def test_dry_mode_writes_nothing():
    c = _Client()
    c._dry = True
    assert c.set_engine_status("buckeye.example", "hold") is False
    assert c.patched == []


def test_rejects_an_unknown_status():
    c = _Client()
    with pytest.raises(ValueError):
        c.set_engine_status("buckeye.example", "banana")
    assert c.patched == []
