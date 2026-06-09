"""
Tests for the office-hub proximity weight. Injects hubs directly (the real list
is a TODO for Danny) so the math is verified independent of configuration.
Run: python -m unittest tests.test_geo
"""

import unittest

from engine import geo
from engine.models import Account, Vertical


class TestProximityWeight(unittest.TestCase):
    def setUp(self):
        self._saved = geo.OFFICE_HUBS
        geo.OFFICE_HUBS = [geo.OfficeHub("Cleveland", 41.4993, -81.6944)]

    def tearDown(self):
        geo.OFFICE_HUBS = self._saved

    def _acct(self, **kw) -> Account:
        return Account(name="x", domain="x.example", vertical=Vertical.UNKNOWN, **kw)

    def test_neutral_when_no_hubs(self):
        geo.OFFICE_HUBS = []
        self.assertEqual(geo.proximity_weight(self._acct(city="Cleveland")), 1.0)

    def test_same_city_as_hub_gets_full_boost(self):
        # Coarse city match = treated as at the hub (0 mi) = max boost.
        self.assertAlmostEqual(geo.proximity_weight(self._acct(city="Cleveland")),
                               geo.PROXIMITY_BOOST)

    def test_far_account_is_neutral(self):
        # Coords well outside the radius -> no boost.
        far = self._acct(extra={"lat": "34.05", "lon": "-118.24"})  # Los Angeles
        self.assertEqual(geo.proximity_weight(far), 1.0)

    def test_unknown_location_never_penalizes(self):
        self.assertEqual(geo.proximity_weight(self._acct(city="Nowhere")), 1.0)

    def test_within_radius_falls_off_linearly(self):
        # ~25 mi from the Cleveland hub should land between neutral and full boost.
        near = self._acct(extra={"lat": "41.20", "lon": "-81.50"})
        w = geo.proximity_weight(near)
        self.assertGreater(w, 1.0)
        self.assertLess(w, geo.PROXIMITY_BOOST)


if __name__ == "__main__":
    unittest.main()
