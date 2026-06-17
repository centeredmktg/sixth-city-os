"""Domain-age source — RDAP (free, no key) -> NEW_LOCATION trigger for newly
registered domains (a fresh business is in-market for a first marketing partner)."""
from __future__ import annotations

from datetime import datetime, timezone

import requests

from engine.models import Account, Signal, SignalKind
from engine.sources.base import DataSource

NEW_MONTHS = 18


def fetch(domain: str, timeout: int = 12) -> dict:
    r = requests.get(f"https://rdap.org/domain/{domain}", timeout=timeout,
                     headers={"User-Agent": "sixth-city-pipeline-engine/1.0"})
    return r.json() if r.content else {}


def _reg_date(payload: dict):
    for ev in payload.get("events", []) or []:
        if ev.get("eventAction") == "registration" and ev.get("eventDate"):
            try:
                return datetime.fromisoformat(ev["eventDate"].replace("Z", "+00:00"))
            except ValueError:
                return None
    return None


def parse(payload: dict, domain: str, now: str | None = None) -> list[Signal]:
    """PURE: RDAP json -> [NEW_LOCATION] if registered within NEW_MONTHS, else []."""
    reg = _reg_date(payload or {})
    if reg is None:
        return []
    ref = datetime.fromisoformat(now.replace("Z", "+00:00")) if now else datetime.now(timezone.utc)
    months = (ref - reg).days / 30.44
    if months > NEW_MONTHS:
        return []
    return [Signal(
        kind=SignalKind.NEW_LOCATION, source="domain_age", value=round(months, 1),
        detail=(f"Domain registered ~{round(months)} months ago — a new business "
                f"standing up its first real web presence."),
    )]


class DomainAgeSource(DataSource):
    name = "domain_age"
    provides_accounts = False
    provides_signals = True

    def discover(self) -> list[Account]:
        return []

    def enrich(self, account: Account) -> list[Signal]:
        try:
            payload = fetch(account.domain)
        except Exception as e:
            print(f"  [domain_age] skip {account.domain}: {type(e).__name__}")
            return []
        return parse(payload, account.domain)
