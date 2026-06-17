from engine.sources.domain_age import parse
from engine.models import SignalKind


def _rdap(date_iso):
    return {"events": [{"eventAction": "registration", "eventDate": date_iso}]}


def test_recent_registration_yields_new_location():
    sigs = parse(_rdap("2026-01-15T00:00:00Z"), "x.com", now="2026-06-16T00:00:00Z")
    assert sigs and sigs[0].kind is SignalKind.NEW_LOCATION


def test_old_registration_yields_nothing():
    assert parse(_rdap("2009-04-01T00:00:00Z"), "x.com", now="2026-06-16T00:00:00Z") == []


def test_missing_event_yields_nothing_no_raise():
    assert parse({}, "x.com", now="2026-06-16T00:00:00Z") == []
