"""
Adapter -> Centered skill `outbound-engine/csv-lead-enrichment`.

Fills in contact-level data (decision-maker name, email, phone, LinkedIn) once an
account is worth pursuing. Runs AFTER scoring so we only spend enrichment credits
on accounts that clear the bar.

Stub status: stamps a placeholder contact. Real version runs the enrichment skill
against Apollo / People Data Labs (SOURCES.md Layer 1).
"""

from __future__ import annotations

from engine.models import Account


def enrich_contacts(account: Account) -> dict[str, str]:
    """Return contact fields for the account's decision-maker. Stub = placeholder."""
    # TODO: wire csv-lead-enrichment skill + Apollo/PDL
    return {
        "contact_name": "TBD",
        "contact_email": f"info@{account.domain}",
        "contact_title": "Owner",
    }
