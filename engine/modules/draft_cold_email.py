"""
Cold-email drafter — two tiers, one entry point.

`draft(account)` returns a deterministic, token-free template (instant; used by
the candidates/Accounts list where it renders per-row). `draft(account, live=True)`
— called only at push time, for the committed net-new shortlist — generates a
voice-matched email via the Anthropic API, and degrades to the template on no-key,
dry-run, or any API failure. The template is therefore both the default and the
always-available floor; the live tier never crashes a run.

Cost model: live drafting uses Danny's ANTHROPIC_API_KEY (retainer-billed, same as
Apollo). Gated to push so spend lands on the shortlist, never the haystack. The
system prompt is large and identical every call → prompt-cached (~10% cost after
the first call).
"""

from __future__ import annotations

import json

from engine.config import CONFIG
from engine.models import Account, Outreach, Signal, Vertical
from engine.modules import outreach_hooks

MODEL = "claude-opus-4-8"

# The drafting methodology (Centered `outbound-engine/draft-cold-email`) plus the
# LOCKED Sixth City solution frame: a TEAM, not a tool. Stable every call → cached.
_SYSTEM_PROMPT = """You write one send-ready cold email for Sixth City Marketing, an Ohio digital-marketing agency, to a small/local business owner or office manager.

WHO YOU ARE: a peer operator sharing a take, not a seller. No fake warmth, no "I hope this finds you well," no enthusiasm. Direct, not aggressive. Occasionally dry.

THE DIAGNOSIS: you'll be given one specific signal about the prospect's site (the "reason"). Open on it — a concrete observation about their business, not their job title or company name.

THE SOLUTION FRAME (do not deviate): the offer is a TEAM, not a tool. Competitors sell a plugin, a speed app, an ad tweak — a point fix for one number. Sixth City sells alignment: the right team pointing the whole digital footprint at where the business is actually trying to go. The signal is the symptom; the pitch is the gap between what their site is doing and what the business needs.

STRUCTURE: Opener = the signal observation. Body = one problem, named precisely (never three softly). Close = a soft question that assumes interest and survives being forwarded ("Worth 15 minutes?"). Land on the team-not-tool frame before the ask.

HARD RULES:
- Under 80 words total. Every word that isn't signal is friction.
- Banned words: leverage, utilize, robust, unlock, delve, game-changer, cutting-edge, seamlessly, innovative, excited, "love to", "would be amazing", "In today's fast-paced world".
- Do not open the body with "I".
- No scraper-feel lines ("I noticed you recently..."). Observational, not researched.
- Use the prospect's vertical/region as light proof only if given; never claim specifics you weren't handed.

Return the subject line and body. The subject is understated, not salesy."""

# Structured output → guaranteed parse, no regex on prose.
_OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "subject": {"type": "string"},
        "body": {"type": "string"},
    },
    "required": ["subject", "body"],
    "additionalProperties": False,
}


def draft(account: Account, live: bool = False) -> Outreach:
    """One Outreach for an account. Precedence: a pre-generated draft stored on
    the account (extra['outreach']) wins — it was already voice-matched, so we
    surface it in the list AND reuse it at push instead of re-spending the key.
    Otherwise `live=True` attempts a fresh Anthropic draft (push only); everything
    else, and any failure, returns the deterministic template."""
    stored = _stored_outreach(account)
    if stored is not None:
        return stored

    strongest = max(account.signals, key=_urgency, default=None)
    reason = strongest.detail if strongest else "we noticed an opportunity on your site"

    if live:
        ai = _draft_live(account, strongest, reason)
        if ai is not None:
            return ai

    # --- Deterministic template (default + fallback) -------------------------
    # SOLUTION FRAME (locked): team, not tool — align the digital footprint to
    # the business's goals. See _SYSTEM_PROMPT for the live-tier equivalent.
    vertical = account.vertical.value.replace("_", "/")
    who = "businesses across Ohio" if account.vertical is Vertical.UNKNOWN \
        else f"{vertical} businesses across Ohio"
    subject = f"Quick note on {account.name}'s website"
    paragraphs = [
        f"Hi — ran {account.name} through our site evaluation. {reason}",
        "The usual pitch when something like this turns up is a quick fix — a plugin, "
        "a new ad set, a redesign. But a point fix doesn't ask the bigger question: is "
        "your digital footprint actually pointed at where the business is trying to go?",
        "That's the part we handle — the right team aligning your whole digital footprint "
        f"with your business goals, not chasing one number. We do it for {who}.",
    ]
    # Personalization layer: each fired hook (in-person offer, competitor mention, …)
    # contributes its own paragraph, slotted before the close so the ask lands last.
    paragraphs += [h.line for h in outreach_hooks.collect(account)]
    paragraphs.append("Worth 15 minutes?")
    body = "\n\n".join(paragraphs)
    return Outreach(
        account_domain=account.domain,
        subject=subject,
        body=body,
        reason_signal=strongest.kind if strongest else None,
    )


def _stored_outreach(account: Account) -> Outreach | None:
    """A draft pre-generated into extra['outreach'] (e.g. the offline backlog pass).
    Returned as-is so both the list preview and push reuse it — no token spend."""
    extra = getattr(account, "extra", None)
    o = extra.get("outreach") if isinstance(extra, dict) else None
    if isinstance(o, dict) and o.get("subject") and o.get("body"):
        strongest = max(account.signals, key=_urgency, default=None)
        return Outreach(
            account_domain=account.domain,
            subject=str(o["subject"]),
            body=str(o["body"]),
            reason_signal=strongest.kind if strongest else None,
        )
    return None


def _ai_enabled() -> bool:
    """Live drafting fires only when Danny's key is set and we're not in dry mode
    (dry/local/test = no token spend). Decoupled gate so it's monkeypatchable."""
    return bool(CONFIG.anthropic_api_key) and not CONFIG.dry_run


def _draft_live(account: Account, strongest, reason: str) -> Outreach | None:
    """Voice-matched draft via Anthropic. Returns None (→ template fallback) when
    disabled or on any failure — never raises."""
    if not _ai_enabled():
        return None
    data = _call_anthropic(account, strongest, reason)
    if not data:
        return None
    return Outreach(
        account_domain=account.domain,
        subject=data["subject"],
        body=data["body"],
        reason_signal=strongest.kind if strongest else None,
    )


def _user_message(account: Account, reason: str) -> str:
    """The live prompt's user turn: the prospect, the signal to open on, and any
    personalization facts the hook layer surfaced. Facts are OPTIONAL material — the
    system prompt caps the email at 80 words and forbids fabricating specifics, so we
    hand the model only true facts and let it decide what fits. Pure (no network) so
    the fact injection is unit-testable without mocking the SDK."""
    vertical = account.vertical.value.replace("_", "/")
    region = "across Ohio" if account.vertical is Vertical.UNKNOWN else f"a {vertical} business in Ohio"
    msg = (
        f"Prospect: {account.name} ({account.domain}), {region}.\n"
        f"Signal to open on: {reason}"
    )
    facts = [h.fact for h in outreach_hooks.collect(account)]
    if facts:
        msg += ("\n\nAdditional true context you MAY use, in your own words, only if it "
                "fits under the word limit:\n" + "\n".join(f"- {f}" for f in facts))
    return msg


def _call_anthropic(account: Account, strongest, reason: str) -> dict | None:
    """The only side effect. Opus 4.8 + adaptive thinking + low effort + a cached
    system prompt + structured output. Swallows every error → None (like the
    sources' fetch())."""
    user = _user_message(account, reason)
    try:
        import anthropic

        client = anthropic.Anthropic(api_key=CONFIG.anthropic_api_key)
        resp = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            thinking={"type": "adaptive"},
            output_config={"effort": "low", "format": {"type": "json_schema", "schema": _OUTPUT_SCHEMA}},
            system=[{"type": "text", "text": _SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": user}],
        )
        if resp.stop_reason == "refusal":       # safety decline → template floor
            return None
        text = next((b.text for b in resp.content if b.type == "text"), "")
        data = json.loads(text)
        if isinstance(data, dict) and data.get("subject") and data.get("body"):
            return {"subject": str(data["subject"]), "body": str(data["body"])}
        return None
    except Exception as e:  # no dep / network / parse / API — degrade silently
        print(f"  [draft_cold_email] live draft skipped for {account.domain}: {type(e).__name__}")
        return None


def _urgency(signal: Signal) -> float:
    """Lower site-quality score = more urgent. Other signals: higher value = more
    urgent. Normalized so the strongest reason wins."""
    from engine.models import SignalKind
    if signal.kind == SignalKind.SITE_QUALITY:
        return 100 - signal.value   # 34/100 site -> urgency 66
    return signal.value
