"""
Tests for Clay CSV ingestion — the one committed Clay->engine handoff (ADR-002).
Proves: hand the engine a real export and it produces Accounts + signals, no
network, no credits. Run: python -m unittest tests.test_clay_payload
"""

import os
import unittest

from engine.models import SignalKind, Vertical
from engine.routing import pain_qualified
from engine.sources.clay_payload import ClayPayloadSource

FIXTURE = os.path.join(os.path.dirname(__file__), "fixtures", "clay_sample.csv")


class TestClayCsvIngestion(unittest.TestCase):
    def setUp(self):
        self.source = ClayPayloadSource(csv_path=FIXTURE)
        self.accounts = {a.domain: a for a in self.source.discover()}

    def test_all_rows_become_accounts(self):
        self.assertEqual(len(self.accounts), 4)

    def test_core_fields_and_linkedin_captured(self):
        a = self.accounts["buckeyeindustrial.example"]
        self.assertEqual(a.name, "Buckeye Industrial Supply")
        self.assertEqual(a.vertical, Vertical.INDUSTRIAL_B2B)
        self.assertEqual(a.city, "Cleveland")
        self.assertIn("buckeye-industrial", a.linkedin_url)

    def test_unrecognized_vertical_falls_back_to_unknown(self):
        self.assertEqual(self.accounts["erieshoreboutique.example"].vertical, Vertical.UNKNOWN)

    def test_extra_firmographic_fields_kept_raw(self):
        # employee_count isn't a first-class field — should survive in extra{}
        self.assertEqual(self.accounts["buckeyeindustrial.example"].extra.get("employee_count"), "45")

    def test_clay_score_becomes_site_quality_signal_no_network(self):
        a = self.accounts["lakeshoredental.example"]
        signals = self.source.enrich(a)
        self.assertEqual(len(signals), 1)
        self.assertEqual(signals[0].kind, SignalKind.SITE_QUALITY)
        self.assertEqual(signals[0].source, "clay")
        self.assertEqual(signals[0].value, 61.0)

    def test_row_without_score_yields_no_clay_signal(self):
        # Maple City has no pagespeed_mobile or ads_active -> Clay emits nothing; the
        # in-house fallback (pagespeed.py) is what would handle it for a real domain.
        a = self.accounts["maplecitymovers.example"]
        self.assertEqual(self.source.enrich(a), [])

    def test_ads_active_becomes_second_signal_and_clears_two_source_gate(self):
        # Buckeye carries BOTH a PageSpeed score and a live ad count -> two distinct
        # signal kinds -> pain-qualified, closer-bound (not parked in nurture).
        a = self.accounts["buckeyeindustrial.example"]
        a.signals = self.source.enrich(a)
        kinds = {s.kind for s in a.signals}
        self.assertEqual(kinds, {SignalKind.SITE_QUALITY, SignalKind.ADS_ACTIVE})
        ads = next(s for s in a.signals if s.kind == SignalKind.ADS_ACTIVE)
        self.assertEqual(ads.value, 3.0)
        self.assertEqual(ads.source, "clay")
        self.assertTrue(pain_qualified(a))

    def test_one_signal_firm_does_not_pain_qualify(self):
        # Lakeshore has a score but no ads -> single signal -> stays in nurture.
        a = self.accounts["lakeshoredental.example"]
        a.signals = self.source.enrich(a)
        self.assertEqual(len(a.signals), 1)
        self.assertFalse(pain_qualified(a))

    def test_zero_ad_count_does_not_fire_ads_active(self):
        # Erie Shore has ads_active=0 -> threshold is >0, so no ADS_ACTIVE signal.
        a = self.accounts["erieshoreboutique.example"]
        kinds = {s.kind for s in self.source.enrich(a)}
        self.assertNotIn(SignalKind.ADS_ACTIVE, kinds)


if __name__ == "__main__":
    unittest.main()
