"""
HubSpot Pro API client. System of record + the machine-sourced flag writer.

The flag this client writes is the SOLE scoreboard (design §3). Nothing owed to
Danny exists outside it; John can audit any time. So two rules are baked in here:
  1. Dedupe net-new against HubSpot's existing book — 'net-new logo only' is a
     rev-share gate, we never claim an account that already existed.
  2. Stamp provenance (which source first surfaced them) so 'machine-sourced' is
     provable, not asserted.

Stub status: dry-run mode (no token) logs what it WOULD write. Re-granting Danny
HubSpot access is BUILD step one (inputs.md).
"""

from __future__ import annotations

from engine.config import CONFIG
from engine.models import Account, Attribution, Outreach


# The HubSpot custom property that IS the scoreboard. Agreed in the proposal, not
# litigated later. Source-stamped at point of entry.
MACHINE_SOURCED_PROPERTY = "machine_sourced"
SOURCE_PROVENANCE_PROPERTY = "machine_source_origin"


class HubSpotClient:
    def __init__(self) -> None:
        self._dry = CONFIG.dry_run

    def existing_domains(self) -> set[str]:
        """Domains already in HubSpot's book — anything here is NOT net-new."""
        if self._dry:
            return set()  # stub: pretend the book is empty
        # TODO: real GET /crm/v3/objects/companies paginated, collect domains
        return set()

    def filter_net_new(self, accounts: list[Account]) -> list[Account]:
        book = self.existing_domains()
        return [a for a in accounts if a.domain not in book]

    def push(self, account: Account, outreach: Outreach) -> str:
        """Create/find the company, stamp it machine-sourced + provenance, drop the
        tailored outreach into a sequence. Returns the HubSpot object id."""
        if self._dry:
            print(
                f"  [DRY] HubSpot upsert {account.domain} "
                f"| {MACHINE_SOURCED_PROPERTY}=true "
                f"| origin={account.discovered_by} "
                f"| seq subject={outreach.subject!r}"
            )
            return f"dry-{account.domain}"
        # TODO: real upsert + property write + sequence enrollment
        return ""

    def attribution_rows(self) -> list[Attribution]:
        """Read back the scoreboard: every machine-sourced account + its stage/
        revenue. This is what the dashboard renders and John audits."""
        if self._dry:
            return []
        # TODO: real query filtered on MACHINE_SOURCED_PROPERTY=true
        return []
