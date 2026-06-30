"""
Adapter -> Centered skill `outbound-engine/draft-cold-email`.

The engine doesn't reimplement copywriting — it calls the existing skill with the
account's strongest signal as the 'why this account' hook. One signal -> one
tailored reason -> consistent personalized outreach without hand-building emails.

Stub status: returns a templated message built from the signal detail. Real
version invokes the skill (Anthropic API w/ the draft-cold-email prompt).
"""

from __future__ import annotations

from engine.models import Account, Outreach, Vertical


def draft(account: Account) -> Outreach:
    strongest = max(account.signals, key=lambda s: _urgency(s), default=None)
    reason = strongest.detail if strongest else "we noticed an opportunity on your site"

    # TODO: replace with real draft-cold-email skill call (pass account + signal,
    # get back voice-matched copy). This template just proves the seam.
    #
    # SOLUTION FRAME (locked): the offer is a TEAM, not a tool. Competitors here
    # sell a plugin / speed app / ad tweak — a point fix for one number. Sixth
    # City sells alignment: the right team pointing the whole digital footprint at
    # the business's actual goals. The signal is the symptom; the pitch is the gap.
    # Vertical proof line, but only when we actually know the vertical — an
    # `unknown` tag would render "unknown businesses across Ohio" (worse than no
    # claim). Fall back to a clean, unqualified version.
    vertical = account.vertical.value.replace("_", "/")
    who = "businesses across Ohio" if account.vertical is Vertical.UNKNOWN \
        else f"{vertical} businesses across Ohio"
    subject = f"Quick note on {account.name}'s website"
    body = (
        f"Hi — ran {account.name} through our site evaluation. {reason}\n\n"
        f"The usual pitch when something like this turns up is a quick fix — a "
        f"plugin, a new ad set, a redesign. But a point fix doesn't ask the bigger "
        f"question: is your digital footprint actually pointed at where the business "
        f"is trying to go?\n\n"
        f"That's the part we handle — the right team aligning your whole digital "
        f"footprint with your business goals, not chasing one number. We do it for "
        f"{who}. Worth 15 minutes?"
    )
    return Outreach(
        account_domain=account.domain,
        subject=subject,
        body=body,
        reason_signal=strongest.kind if strongest else None,
    )


def _urgency(signal) -> float:
    """Lower site-quality score = more urgent. Other signals: higher value = more
    urgent. Normalized so the strongest reason wins."""
    from engine.models import SignalKind
    if signal.kind == SignalKind.SITE_QUALITY:
        return 100 - signal.value   # 34/100 site -> urgency 66
    return signal.value
