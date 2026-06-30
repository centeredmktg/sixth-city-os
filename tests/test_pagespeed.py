"""
Tests for the PageSpeed spine. parse() is pure, so we test it against captured
API shapes — no network. Run: python -m unittest tests.test_pagespeed
"""

import unittest

from engine.models import SignalKind
from engine.sources import pagespeed

# Minimal slice of a real PageSpeed Insights v5 response (a struggling site).
FIXTURE_BAD = {
    "lighthouseResult": {
        "categories": {"performance": {"score": 0.34}},
        "audits": {
            "largest-contentful-paint": {"displayValue": "5.1 s"},
            "cumulative-layout-shift": {"displayValue": "0.28"},
        },
    }
}

# A healthy site — high score, still a valid signal (just not a warm one).
FIXTURE_GOOD = {
    "lighthouseResult": {
        "categories": {"performance": {"score": 0.96}},
        "audits": {"largest-contentful-paint": {"displayValue": "1.2 s"}},
    }
}

# API couldn't analyze the URL (e.g. site down): no performance score present.
FIXTURE_UNANALYZABLE = {"lighthouseResult": {"categories": {}, "audits": {}}}


class TestParse(unittest.TestCase):
    def test_bad_site_yields_low_value_site_quality_signal(self):
        signals = pagespeed.parse(FIXTURE_BAD, "slowsite.example")
        self.assertEqual(len(signals), 1)
        s = signals[0]
        self.assertEqual(s.kind, SignalKind.SITE_QUALITY)
        self.assertEqual(s.source, "pagespeed")
        self.assertEqual(s.value, 34.0)            # 0.34 -> 34/100
        # detail is reused as outreach copy — must carry the human-readable hook
        self.assertIn("34/100", s.detail)
        self.assertIn("LCP 5.1 s", s.detail)
        self.assertIn("CLS 0.28", s.detail)
        # a sub-50 score is in Google's "poor" band — say so as a verdict, not a number
        self.assertIn("red", s.detail.lower())
        # the WP-Engine insight: name the SEO/ranking hit, not just the conversion leak
        self.assertIn("rank", s.detail.lower())

    def test_good_site_still_produces_a_signal(self):
        signals = pagespeed.parse(FIXTURE_GOOD, "fastsite.example")
        self.assertEqual(len(signals), 1)
        self.assertEqual(signals[0].value, 96.0)
        # honest framing: a fast site is not the warm "your speed is leaking money" hook
        self.assertNotIn("red", signals[0].detail.lower())

    def test_missing_score_yields_no_signal(self):
        # A missing score is NOT a zero score — don't invent a signal we didn't measure.
        self.assertEqual(pagespeed.parse(FIXTURE_UNANALYZABLE, "down.example"), [])

    def test_no_cwv_metrics_still_parses(self):
        payload = {"lighthouseResult": {"categories": {"performance": {"score": 0.5}}, "audits": {}}}
        signals = pagespeed.parse(payload, "bare.example")
        self.assertEqual(len(signals), 1)
        self.assertIn("50/100", signals[0].detail)


if __name__ == "__main__":
    unittest.main()
