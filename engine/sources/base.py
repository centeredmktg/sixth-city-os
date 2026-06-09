"""
DataSource base — one interface every source implements.

A source either discovers accounts, enriches them with signals, or both. The
find/score jobs never care where data came from, so adding a source is: subclass
this, implement discover()/enrich(), register it in registry.REGISTRY.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from engine.models import Account, Signal


class DataSource(ABC):
    name: str = "unnamed"
    provides_accounts: bool = False   # can it surface net-new accounts?
    provides_signals: bool = False    # can it attach buying signals?

    @abstractmethod
    def discover(self) -> list[Account]:
        """Return candidate accounts. The source knows its own scope — a Clay
        export is already targeted, a CSV is whatever it is — so no vertical/geo
        args here. No-op for signal-only sources."""
        ...

    @abstractmethod
    def enrich(self, account: Account) -> list[Signal]:
        """Return buying signals for an account. No-op for list-only sources."""
        ...
