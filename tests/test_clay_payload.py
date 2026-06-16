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
        self.assertEqual(a.vertical, Vertical.INDUSTRIAL_MANUFACTURING)
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


def test_malformed_numeric_values_do_not_raise():
    rows = [{"company": "Messy", "domain": "messy.example", "vertical": "industrial_manufacturing",
             "city": "Cleveland", "pagespeed_mobile": "n/a", "ads_active": "yes"}]
    src = ClayPayloadSource(rows=rows)
    a = src.discover()[0]
    # Should not raise; malformed values simply produce no signals.
    signals = src.enrich(a)
    assert signals == []


def test_discover_reads_vertical_as_field_not_inferred():
    from engine.models import Vertical
    from engine.sources.clay_payload import ClayPayloadSource
    rows = [{"company": "Acme Tool & Die", "domain": "acme.example",
             "vertical": "industrial_manufacturing", "city": "Cleveland"}]
    assert ClayPayloadSource(rows=rows).discover()[0].vertical is Vertical.INDUSTRIAL_MANUFACTURING


def test_discover_blank_vertical_is_unknown():
    from engine.models import Vertical
    from engine.sources.clay_payload import ClayPayloadSource
    rows = [{"company": "Mystery Co", "domain": "mystery.example", "vertical": ""}]
    assert ClayPayloadSource(rows=rows).discover()[0].vertical is Vertical.UNKNOWN


def test_ingests_real_clay_headers_and_maps_industry():
    """Real Clay export headers (TitleCase, 'Primary Industry', 'Location') ingest,
    domain is cleaned, vertical is mapped from industry, city parsed from Location."""
    from engine.models import Vertical
    from engine.sources.clay_payload import ClayPayloadSource, has_domain_column
    rows = [{
        "Name": "Westlake Tool & Die", "Domain": "https://www.westlaketool.com/",
        "Primary Industry": "Industrial Machinery Manufacturing",
        "LinkedIn URL": "https://linkedin.com/company/westlake-tool",
        "Location": "Avon, Ohio, United States", "Size": "11-50",
    }]
    assert has_domain_column(rows)
    a = ClayPayloadSource(rows=rows).discover()[0]
    assert a.domain == "westlaketool.com"                      # protocol/www stripped
    assert a.name == "Westlake Tool & Die"
    assert a.vertical is Vertical.INDUSTRIAL_MANUFACTURING     # mapped from Primary Industry
    assert a.city == "Avon"                                    # parsed from Location
    assert "westlake-tool" in a.linkedin_url
    assert a.extra.get("Size") == "11-50"                      # non-core column survives


def test_has_domain_column_rejects_missing():
    from engine.sources.clay_payload import has_domain_column
    assert not has_domain_column([{"Name": "X", "Primary Industry": "Construction"}])
    assert not has_domain_column([])


if __name__ == "__main__":
    unittest.main()
