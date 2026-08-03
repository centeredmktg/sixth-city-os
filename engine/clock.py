"""
Wall-clock helpers.

Sixth City is in Cleveland; Railway runs its containers in UTC. Every date WE derive
and write outward has to be Cleveland's, or an evening claim lands on tomorrow and
disagrees with HubSpot's own createdate sitting beside it on the record.

Timestamps still STORE in UTC — this is only for dates at the edge.
"""
from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

# The zone, never a fixed -5: it has to follow DST or it's wrong eight months a year.
LOCAL_TZ = ZoneInfo("America/New_York")


def local_today() -> str:
    """Today's date where the business actually is, as YYYY-MM-DD."""
    return datetime.now(LOCAL_TZ).date().isoformat()
