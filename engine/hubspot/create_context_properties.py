"""GUARDED prod-setup (run ONCE by hand, never in CI / auto_migrate): create the 5
engine_* context properties in the pipeline_engine group. Prints the plan unless --run
is passed; refuses in dry mode. Team-facing labels only."""
from __future__ import annotations

import sys

from engine.hubspot.client import HubSpotClient
from engine.config import CONFIG

_GROUP = "pipeline_engine"


def property_payloads() -> list[dict]:
    return [
        {"name": "engine_score", "label": "Engine Score", "type": "number",
         "fieldType": "number", "groupName": _GROUP},
        {"name": "engine_band", "label": "Engine Priority Band", "type": "enumeration",
         "fieldType": "select", "groupName": _GROUP, "options": [
             {"label": "A", "value": "A", "displayOrder": 0},
             {"label": "B", "value": "B", "displayOrder": 1},
             {"label": "C", "value": "C", "displayOrder": 2},
             {"label": "R", "value": "R", "displayOrder": 3}]},
        {"name": "engine_route", "label": "Engine Route", "type": "enumeration",
         "fieldType": "select", "groupName": _GROUP, "options": [
             {"label": "Closer", "value": "closer", "displayOrder": 0},
             {"label": "Nurture", "value": "nurture", "displayOrder": 1},
             {"label": "Hold", "value": "hold", "displayOrder": 2},
             {"label": "Reject", "value": "reject", "displayOrder": 3}]},
        {"name": "engine_why_now", "label": "Why Now", "type": "string",
         "fieldType": "textarea", "groupName": _GROUP},
        {"name": "engine_last_synced", "label": "Engine Last Synced", "type": "date",
         "fieldType": "date", "groupName": _GROUP},
    ]


def main(argv=None) -> None:
    argv = argv if argv is not None else sys.argv[1:]
    payloads = property_payloads()
    if "--run" not in argv:
        print("[guarded] would create 5 engine_* context properties in group pipeline_engine. "
              "Re-run with --run to apply.")
        for p in payloads:
            print(f"  {p['name']} ({p['fieldType']})")
        return
    if CONFIG.dry_run:
        print("[guarded] DRY_RUN set — refusing to write. Unset DRY_RUN and provide HUBSPOT_TOKEN.")
        return
    client = HubSpotClient()
    for p in payloads:
        try:
            client._post("/crm/v3/properties/companies", p)
            print(f"  created {p['name']}")
        except Exception as e:
            print(f"  {p['name']}: {type(e).__name__} {e} (already exists? 409 is fine)")


if __name__ == "__main__":
    main()
