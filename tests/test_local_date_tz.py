"""Derived dates are Cleveland's, not the server's. Railway runs UTC, so an evening
claim was landing on tomorrow's date and disagreeing with HubSpot's own createdate."""
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from engine import clock
from engine.hubspot import client as hs
from engine.modules import hubspot_context


def _at(monkeypatch, instant_utc):
    """Freeze wall-clock at a given UTC instant, for engine.clock only."""
    class _DT(datetime):
        @classmethod
        def now(cls, tz=None):
            return instant_utc.astimezone(tz) if tz else instant_utc
    monkeypatch.setattr(clock, "datetime", _DT)


def test_evening_in_cleveland_is_still_today(monkeypatch):
    """2026-07-29 02:00 UTC is 2026-07-28 22:00 EDT — the date must be the 28th."""
    _at(monkeypatch, datetime(2026, 7, 29, 2, 0, tzinfo=timezone.utc))
    assert clock.local_today() == "2026-07-28"


def test_midday_is_unambiguous(monkeypatch):
    _at(monkeypatch, datetime(2026, 7, 29, 16, 0, tzinfo=timezone.utc))
    assert clock.local_today() == "2026-07-29"


def test_follows_dst_in_summer(monkeypatch):
    """July is EDT (UTC-4): 03:30 UTC is still the previous day locally."""
    _at(monkeypatch, datetime(2026, 7, 15, 3, 30, tzinfo=timezone.utc))
    assert clock.local_today() == "2026-07-14"


def test_follows_dst_in_winter(monkeypatch):
    """January is EST (UTC-5): 04:30 UTC is still the previous day locally."""
    _at(monkeypatch, datetime(2026, 1, 15, 4, 30, tzinfo=timezone.utc))
    assert clock.local_today() == "2026-01-14"


def test_is_not_a_fixed_offset():
    """A hardcoded -5 would be wrong for eight months of the year."""
    summer = datetime(2026, 7, 15, 12, tzinfo=ZoneInfo("America/New_York")).utcoffset()
    winter = datetime(2026, 1, 15, 12, tzinfo=ZoneInfo("America/New_York")).utcoffset()
    assert summer != winter


def test_claim_stamps_the_eastern_date(monkeypatch):
    _at(monkeypatch, datetime(2026, 7, 29, 2, 0, tzinfo=timezone.utc))
    from engine.models import Account

    posted = {}

    class _C(hs.HubSpotClient):
        def __init__(self):
            self._dry = False

        def _find_company_ours(self, domain):
            return (None, False)

        def _post(self, path, payload):
            posted.update(payload["properties"])
            return {"id": "1"}

    _C().claim_company(Account(name="Buckeye", domain="buckeye.example"), owner_id="42")
    assert posted[hs.MACHINE_SOURCED_DATE_PROPERTY] == "2026-07-28"


def test_context_properties_stamps_the_eastern_date(monkeypatch):
    """The fourth call site — engine_last_synced had the same UTC bug."""
    _at(monkeypatch, datetime(2026, 7, 29, 2, 0, tzinfo=timezone.utc))
    from engine.models import Account

    props = hubspot_context.context_properties(Account(name="Buckeye", domain="buckeye.example"))
    assert props[hubspot_context.PROP_SYNCED] == "2026-07-28"


def test_context_hash_ignores_the_synced_date(monkeypatch):
    """Changing the date must not make unchanged accounts look dirty and re-sync."""
    from engine.models import Account
    a = Account(name="Buckeye", domain="buckeye.example")
    _at(monkeypatch, datetime(2026, 7, 29, 2, 0, tzinfo=timezone.utc))
    first = hubspot_context.context_hash(a)
    _at(monkeypatch, datetime(2026, 8, 14, 16, 0, tzinfo=timezone.utc))
    assert hubspot_context.context_hash(a) == first
