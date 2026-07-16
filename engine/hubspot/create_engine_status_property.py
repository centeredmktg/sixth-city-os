"""GUARDED prod-setup (run ONCE by hand, never in CI / auto_migrate): create the
company property `engine_status` (select: discovered | working) in the pipeline_engine
group. Prints the plan unless --run is passed; requires a real HUBSPOT_TOKEN + not dry."""
from __future__ import annotations

import sys

from engine.hubspot.client import HubSpotClient
from engine.config import CONFIG


def property_payload() -> dict:
    return {
        "name": "engine_status",
        "label": "Engine Status",
        "type": "enumeration",
        "fieldType": "select",
        "groupName": "pipeline_engine",
        "options": [
            {"label": "Discovered", "value": "discovered", "displayOrder": 0},
            {"label": "Working", "value": "working", "displayOrder": 1},
        ],
    }


def main(argv=None) -> None:
    argv = argv if argv is not None else sys.argv[1:]
    payload = property_payload()
    if "--run" not in argv:
        print("[guarded] would create company property engine_status "
              "(discovered|working) in group pipeline_engine. Re-run with --run to apply.")
        print(payload)
        return
    if CONFIG.dry_run:
        print("[guarded] DRY_RUN set — refusing to write. Unset DRY_RUN and provide HUBSPOT_TOKEN.")
        return
    client = HubSpotClient()
    client._post("/crm/v3/properties/companies", payload)
    print("  engine_status property created")


if __name__ == "__main__":
    main()
