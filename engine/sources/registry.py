"""
Pluggable data-source layer.

Every source (Google Places, PageSpeed, Apollo, ...) implements one interface so
the find/score jobs never care where an account or signal came from. Add a
source by subclassing DataSource and registering it — nothing downstream changes.

Stub status: two illustrative sources return fake-but-shaped data so the loop
runs end-to-end. See SOURCES.md for the real to-find list + selection scorecard.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from engine.models import Account, Signal, SignalKind, Vertical


class DataSource(ABC):
    """One external data source. Either discovers accounts, enriches them with
    signals, or both."""

    name: str = "unnamed"
    provides_accounts: bool = False   # can it surface net-new accounts?
    provides_signals: bool = False    # can it attach buying signals?

    @abstractmethod
    def discover(self, vertical: Vertical, state: str) -> list[Account]:
        """Return candidate accounts. No-op for signal-only sources."""
        ...

    @abstractmethod
    def enrich(self, account: Account) -> list[Signal]:
        """Return buying signals for an account. No-op for list-only sources."""
        ...


class GooglePlacesStub(DataSource):
    """Firmographic / list-building: local businesses by vertical + geo.
    Real version hits the Places API. Stub returns one fake account."""

    name = "google_places"
    provides_accounts = True
    provides_signals = False

    def discover(self, vertical: Vertical, state: str) -> list[Account]:
        # TODO: real Places API call (text search by vertical keyword + region)
        return [
            Account(
                name="Buckeye Industrial Supply",
                domain="buckeyeindustrial.example",
                vertical=vertical,
                city="Cleveland",
                state=state,
                discovered_by=self.name,
            )
        ]

    def enrich(self, account: Account) -> list[Signal]:
        return []


class PageSpeedStub(DataSource):
    """The spine: automates Sixth City's 'free website evaluation'. A bad score
    is simultaneously the find-signal, the score input, and the outreach reason.
    Real version hits the Google PageSpeed/Lighthouse API."""

    name = "pagespeed"
    provides_accounts = False
    provides_signals = True

    def discover(self, vertical: Vertical, state: str) -> list[Account]:
        return []

    def enrich(self, account: Account) -> list[Signal]:
        # TODO: real Lighthouse run against account.domain
        fake_mobile_score = 34  # 0-100; low = hurting = in-market
        return [
            Signal(
                kind=SignalKind.SITE_QUALITY,
                source=self.name,
                value=fake_mobile_score,
                detail=(
                    f"Mobile site scores {fake_mobile_score}/100 on core web "
                    f"vitals — slow load is leaking conversions."
                ),
            )
        ]


# The live registry. Find/score jobs iterate this.
REGISTRY: list[DataSource] = [
    GooglePlacesStub(),
    PageSpeedStub(),
]


def account_sources() -> list[DataSource]:
    return [s for s in REGISTRY if s.provides_accounts]


def signal_sources() -> list[DataSource]:
    return [s for s in REGISTRY if s.provides_signals]
