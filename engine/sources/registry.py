"""
Source registry — the live list of data sources the ingest/score jobs iterate.

Add a source: write a module under engine/sources/ that subclasses DataSource,
then register an instance here. Nothing downstream changes.

  - clay      : REAL primary funnel — ingests Clay's free payload
                (domain + LinkedIn + PageSpeed score). No API calls, no credits.
  - pagespeed : fallback eval — fires only for domains that arrive WITHOUT a
                score (the "run any list through the machine" feature).

Discovery (find ~50k firms) lives in Clay, not here — it's Clay's superpower and
credit-cheap. The engine owns scoring, routing, and the attribution scoreboard.
"""

from __future__ import annotations

from engine.sources.base import DataSource
from engine.sources.clay_payload import ClayPayloadSource
from engine.sources.pagespeed import PageSpeedSource
from engine.sources.public_signals import PublicSignalsSource
from engine.sources.seo_gap import SeoGapSource

REGISTRY: list[DataSource] = [
    ClayPayloadSource(),     # primary: accounts + site-quality signal from Clay's export
    PageSpeedSource(),       # fallback: site-quality for un-scored domains
    SeoGapSource(),          # SEO-gap signals (keyword/local/backlink/content)
    PublicSignalsSource(),   # Blueprint moat: AI-citation gap, stale ads, review velocity
]


def account_sources() -> list[DataSource]:
    return [s for s in REGISTRY if s.provides_accounts]


def signal_sources() -> list[DataSource]:
    return [s for s in REGISTRY if s.provides_signals]
