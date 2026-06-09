"""
Adapter -> Centered skill `outbound-engine/draft-cold-email`.

The engine doesn't reimplement copywriting — it calls the existing skill with the
account's strongest signal as the 'why this account' hook. One signal -> one
tailored reason -> consistent personalized outreach without hand-building emails.

Stub status: returns a templated message built from the signal detail. Real
version invokes the skill (Anthropic API w/ the draft-cold-email prompt).
"""

from __future__ import annotations

from engine.models import Account, Outreach


def draft(account: Account) -> Outreach:
    strongest = max(account.signals, key=lambda s: _urgency(s), default=None)
    reason = strongest.detail if strongest else "we noticed an opportunity on your site"

    # TODO: replace with real draft-cold-email skill call (pass account + signal,
    # get back voice-matched copy). This template just proves the seam.
    subject = f"Quick note on {account.name}'s website"
    body = (
        f"Hi — ran {account.name} through our website evaluation. {reason}\n\n"
        f"We help {account.vertical.value.replace('_', '/')} businesses in Ohio "
        f"turn that around. Worth a 15-min look?"
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
