"""GUARDED prod-setup (run ONCE by hand, never in CI / auto_migrate): extend the
company property `engine_status` with nurture | hold | rejected.

CRITICAL: HubSpot's PATCH on a select property REPLACES the options array — it does
not append. Writing only the new options would delete discovered/working and orphan
every record already stamped with them. So: read live, assert both survivors are
present, carry them forward untouched, then write all five.

Prints the plan unless --run is passed; refuses under DRY_RUN."""
from __future__ import annotations

import sys

from engine.hubspot.client import HubSpotClient
from engine.config import CONFIG

_PATH = "/crm/v3/properties/companies/engine_status"

_NEW = [
    {"label": "Nurture", "value": "nurture", "displayOrder": 2},
    {"label": "Hold", "value": "hold", "displayOrder": 3},
    {"label": "Rejected", "value": "rejected", "displayOrder": 4},
]
_REQUIRED = ("discovered", "working")


def merged_options(live: dict) -> list[dict]:
    """The full five-option array. Raises rather than write a partial one."""
    existing = list(live.get("options") or [])
    by_value = {o.get("value"): o for o in existing}
    for required in _REQUIRED:
        if required not in by_value:
            raise ValueError(
                f"live engine_status is missing {required!r} — refusing to write a "
                f"partial options array that would orphan existing records")
    merged = [by_value["discovered"], by_value["working"]]
    for option in _NEW:
        merged.append(by_value.get(option["value"], option))
    return merged


def main(argv=None) -> None:
    argv = argv if argv is not None else sys.argv[1:]
    if "--run" not in argv:
        print("[guarded] would read engine_status, then PATCH it with all five options "
              "(discovered, working, nurture, hold, rejected). Re-run with --run to apply.")
        return
    if CONFIG.dry_run:
        print("[guarded] DRY_RUN set — refusing to write. Unset DRY_RUN and provide HUBSPOT_TOKEN.")
        return
    client = HubSpotClient()
    live = client._get(_PATH)
    options = merged_options(live)
    client._patch(_PATH, {"options": options})
    print(f"  engine_status extended -> {[o['value'] for o in options]}")


if __name__ == "__main__":
    main()
