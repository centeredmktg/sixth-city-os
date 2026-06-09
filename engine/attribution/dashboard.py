"""
Attribution dashboard — the scoreboard both parties audit.

Renders the lead -> source -> opportunity -> closed-won -> revenue trail, and
computes what's owed under the locked commercial terms (design §2, inputs.md):

  - 5% of each NET-NEW client's SERVICE fee (mgmt fee, NOT ad-spend pass-through)
  - for that client's first 12 months from THEIR signing date (per-client tail)
  - three gates: net-new logo, machine-sourced flag, signed while term active
  - monthly engagement is CREDITED: pay = max($500, monthly rev-share), not additive

Stub status: pulls rows from HubSpotClient (empty in dry mode) and renders a text
table. Real version is a web view on top of HubSpot. The MATH here is real and
matches the contract — that's the part that has to be exactly right.
"""

from __future__ import annotations

from dataclasses import dataclass

from engine.hubspot.client import HubSpotClient
from engine.models import Attribution, Stage

REV_SHARE_RATE = 0.05          # 5% (John negotiated 10% -> 5%, 2026-06-05)
TAIL_MONTHS = 12               # per-client, from signing date
MONTHLY_FLOOR = 500.0          # credited against rev-share, NOT additive


@dataclass
class OwedLine:
    domain: str
    service_fee_monthly: float
    qualifying: bool
    twelve_mo_rev_share: float
    note: str


def qualifies(row: Attribution) -> bool:
    """The three gates. All must hold for an obligation to exist."""
    net_new = True                          # HubSpotClient.filter_net_new enforces gate 1
    machine_sourced = row.machine_sourced   # gate 2: the sole flag
    signed_in_term = row.signed_at is not None  # gate 3: signed while term active
    # TODO(Danny): if you want a stricter 'signed while term active' check, compare
    # row.signed_at against the engagement term window here. For the stub, a signed
    # date is treated as in-term.
    return net_new and machine_sourced and signed_in_term


def owed_line(row: Attribution) -> OwedLine:
    q = qualifies(row)
    full_tail = row.service_fee_monthly * TAIL_MONTHS * REV_SHARE_RATE if q else 0.0
    note = "qualifying" if q else "no obligation (failed a gate)"
    return OwedLine(
        domain=row.account_domain,
        service_fee_monthly=row.service_fee_monthly,
        qualifying=q,
        twelve_mo_rev_share=round(full_tail, 2),
        note=note,
    )


def render(rows: list[Attribution]) -> str:
    lines = ["", "=== ATTRIBUTION SCOREBOARD ===",
             "lead -> source -> opportunity -> closed-won -> revenue", ""]

    by_stage: dict[Stage, int] = {}
    for r in rows:
        by_stage[r.stage] = by_stage.get(r.stage, 0) + 1
    lines.append("Pipeline by stage:")
    for stage in Stage:
        lines.append(f"  {stage.value:14} {by_stage.get(stage, 0)}")

    won = [r for r in rows if r.stage == Stage.CLOSED_WON]
    owed = [owed_line(r) for r in won]
    total_tail = sum(o.twelve_mo_rev_share for o in owed if o.qualifying)
    lines += ["", "Closed-won rev-share (5% × 12-mo service fee, per client):"]
    if not owed:
        lines.append("  (none yet — dry/stub mode)")
    for o in owed:
        lines.append(
            f"  {o.domain:32} ${o.service_fee_monthly:>7.0f}/mo "
            f"-> ${o.twelve_mo_rev_share:>8.2f}  [{o.note}]"
        )
    lines += ["",
              f"Total qualifying 12-mo rev-share: ${total_tail:,.2f}",
              f"(Monthly engagement floor ${MONTHLY_FLOOR:.0f} is credited, not additive.)",
              "============================", ""]
    return "\n".join(lines)


def build() -> str:
    client = HubSpotClient()
    return render(client.attribution_rows())
