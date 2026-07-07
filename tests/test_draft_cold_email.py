"""
Tests for the cold-email drafter. The deterministic template is the default and
the always-available fallback; the live (Anthropic) path is gated and degrades to
the template on no-key / dry-run / API error. We never hit the network in tests —
conftest forces DRY_RUN=1, so `_ai_enabled()` is False by default, and the live
mapping is exercised by monkeypatching the gate + the network seam.
"""

from engine.models import Account, Outreach, Signal, SignalKind, Vertical
from engine.modules import draft_cold_email


def _account(vertical=Vertical.INDUSTRIAL_MANUFACTURING):
    a = Account(domain="acmetool.com", name="Acme Tool & Die", vertical=vertical)
    a.signals.append(Signal(
        kind=SignalKind.SITE_QUALITY, source="pagespeed", value=34.0,
        detail="Mobile homepage scores 34/100 on Google's speed test — in Google's red zone.",
    ))
    return a


def test_default_is_deterministic_template():
    # No `live` flag → the instant template (used by the candidates list). The
    # locked solution frame ("digital footprint") must be present.
    o = draft_cold_email.draft(_account())
    assert isinstance(o, Outreach)
    assert "digital footprint" in o.body
    assert o.reason_signal == SignalKind.SITE_QUALITY


def test_live_falls_back_to_template_when_disabled():
    # Under conftest's DRY_RUN=1 (and no key), _ai_enabled() is False, so live=True
    # still yields the deterministic template — no network, no crash.
    assert draft_cold_email._ai_enabled() is False
    o = draft_cold_email.draft(_account(), live=True)
    assert "digital footprint" in o.body          # template, not an LLM draft


def test_live_maps_anthropic_payload_to_outreach(monkeypatch):
    monkeypatch.setattr(draft_cold_email, "_ai_enabled", lambda: True)
    monkeypatch.setattr(draft_cold_email, "_call_anthropic",
                        lambda account, strongest, reason: {"subject": "S", "body": "B"})
    o = draft_cold_email.draft(_account(), live=True)
    assert o.subject == "S" and o.body == "B"
    assert o.reason_signal == SignalKind.SITE_QUALITY   # signal still attributed


def test_live_falls_back_to_template_on_api_failure(monkeypatch):
    # _call_anthropic swallows its own errors and returns None — draft must then
    # fall back to the template, never propagate the failure.
    monkeypatch.setattr(draft_cold_email, "_ai_enabled", lambda: True)
    monkeypatch.setattr(draft_cold_email, "_call_anthropic",
                        lambda account, strongest, reason: None)
    o = draft_cold_email.draft(_account(), live=True)
    assert "digital footprint" in o.body


def test_stored_outreach_takes_precedence(monkeypatch):
    # A pre-generated draft in extra wins over BOTH the template and a live call —
    # so the offline backlog pass surfaces in the list and reuses at push (no spend).
    a = _account()
    a.extra = {"outreach": {"subject": "STORED SUBJ", "body": "STORED BODY"}}
    assert draft_cold_email.draft(a).subject == "STORED SUBJ"           # over template
    # even with live enabled, stored short-circuits before _call_anthropic
    monkeypatch.setattr(draft_cold_email, "_ai_enabled", lambda: True)
    monkeypatch.setattr(draft_cold_email, "_call_anthropic",
                        lambda *a, **k: {"subject": "LIVE", "body": "LIVE"})
    o = draft_cold_email.draft(a, live=True)
    assert o.subject == "STORED SUBJ" and o.body == "STORED BODY"
    assert o.reason_signal == SignalKind.SITE_QUALITY


def test_partial_stored_outreach_ignored():
    # Missing body → not a usable stored draft → fall through to template.
    a = _account()
    a.extra = {"outreach": {"subject": "only subject"}}
    assert "digital footprint" in draft_cold_email.draft(a).body


def test_unknown_vertical_proof_line_guarded():
    o = draft_cold_email.draft(_account(Vertical.UNKNOWN))
    assert "unknown businesses" not in o.body
    assert "businesses across Ohio" in o.body
