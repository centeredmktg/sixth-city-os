"""HubSpot PATCH REPLACES a select property's options — a partial write would
orphan every record stamped discovered/working."""
import pytest

from engine.hubspot import extend_engine_status_options as ext


def _live(options):
    return {"name": "engine_status", "options": options}


DISCOVERED = {"label": "Discovered", "value": "discovered", "displayOrder": 0}
WORKING = {"label": "Working", "value": "working", "displayOrder": 1}


def test_carries_existing_options_forward():
    merged = ext.merged_options(_live([DISCOVERED, WORKING]))
    values = [o["value"] for o in merged]
    assert values == ["discovered", "working", "nurture", "hold", "rejected"]


def test_preserves_original_value_and_display_order():
    merged = ext.merged_options(_live([DISCOVERED, WORKING]))
    assert merged[0] == DISCOVERED
    assert merged[1] == WORKING


def test_aborts_when_discovered_is_missing():
    with pytest.raises(ValueError, match="discovered"):
        ext.merged_options(_live([WORKING]))


def test_aborts_when_working_is_missing():
    with pytest.raises(ValueError, match="working"):
        ext.merged_options(_live([DISCOVERED]))


def test_is_idempotent_when_options_already_extended():
    already = [DISCOVERED, WORKING,
               {"label": "Nurture", "value": "nurture", "displayOrder": 2},
               {"label": "Hold", "value": "hold", "displayOrder": 3},
               {"label": "Rejected", "value": "rejected", "displayOrder": 4}]
    assert [o["value"] for o in ext.merged_options(_live(already))] == \
        ["discovered", "working", "nurture", "hold", "rejected"]


def test_is_not_registered_for_auto_migration():
    from engine.db.auto_migrate import _MIGRATIONS
    assert "engine_status" not in " ".join(m.__name__ for m in _MIGRATIONS)
