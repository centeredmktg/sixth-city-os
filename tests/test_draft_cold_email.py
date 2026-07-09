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
                        lambda account, strongest, reason, contact=None: {"subject": "S", "body": "B"})
    o = draft_cold_email.draft(_account(), live=True)
    assert o.subject == "S" and o.body == "B"
    assert o.reason_signal == SignalKind.SITE_QUALITY   # signal still attributed


def test_live_falls_back_to_template_on_api_failure(monkeypatch):
    # _call_anthropic swallows its own errors and returns None — draft must then
    # fall back to the template, never propagate the failure.
    monkeypatch.setattr(draft_cold_email, "_ai_enabled", lambda: True)
    monkeypatch.setattr(draft_cold_email, "_call_anthropic",
                        lambda account, strongest, reason, contact=None: None)
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


# --- personalization hook layer (#4/#1/#2) -----------------------------------
def _staffed_account():
    a = _account()
    a.city = "Cleveland"          # within the staffed Cleveland hub
    return a


def test_template_appends_in_person_line_for_staffed_city():
    o = draft_cold_email.draft(_staffed_account())
    assert "Cleveland" in o.body and "in person" in o.body
    assert o.body.rstrip().endswith("Worth 15 minutes?")   # ask still lands last


def test_template_no_in_person_line_for_unstaffed_city():
    a = _account()
    a.city = "Columbus"           # a hub, but unstaffed → no in-person offer
    assert "in person" not in draft_cold_email.draft(a).body


def test_stored_outreach_skips_hooks():
    # Stored draft short-circuits before the hook layer — no in-person line grafted on.
    a = _staffed_account()
    a.extra = {"outreach": {"subject": "STORED", "body": "STORED BODY"}}
    assert draft_cold_email.draft(a).body == "STORED BODY"


def test_user_message_injects_hook_facts():
    # The live prompt carries the in-person FACT so the model can weave it in voice.
    msg = draft_cold_email._user_message(_staffed_account(), "reason here")
    assert "staff in Cleveland" in msg and "Signal to open on: reason here" in msg


def test_user_message_omits_facts_when_no_hooks_fire():
    msg = draft_cold_email._user_message(_account(), "reason here")
    assert "Additional true context" not in msg


# --- contact-aware drafting (Company → Contact → Message) ---------------------
def test_draft_greets_contact_by_first_name():
    from engine.models import Contact
    c = Contact(name="Jane Doe", company_domain="acmetool.com", title="CMO")
    o = draft_cold_email.draft(_account(), contact=c)
    assert o.body.startswith("Hi Jane —")


def test_draft_without_contact_unchanged():
    o = draft_cold_email.draft(_account())
    assert o.body.startswith("Hi —")          # regression: no contact = generic greeting


def test_user_message_includes_contact():
    from engine.models import Contact
    c = Contact(name="Jane Doe", company_domain="acmetool.com", title="CMO")
    msg = draft_cold_email._user_message(_account(), "reason here", c)
    assert "Jane Doe" in msg and "CMO" in msg
