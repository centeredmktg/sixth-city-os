"""
Tests for the office-hub proximity weight. TestProximityWeight injects hubs
directly so the math is verified independent of configuration; TestRealHubs
guards the live production list itself.
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


class TestRealHubs(unittest.TestCase):
    """Guards the live OFFICE_HUBS list — not the math, the configuration."""

    EXPECTED_CITIES = {
        "Cleveland", "Columbus", "Pittsburgh",
        "Indianapolis", "Chicago", "Nashville",
    }

    def test_six_hubs_present(self):
        self.assertEqual(len(geo.OFFICE_HUBS), 6)
        self.assertEqual({h.city for h in geo.OFFICE_HUBS}, self.EXPECTED_CITIES)

    def test_every_hub_has_an_address(self):
        # The address is the local-SEO anchor — a hub without one is misconfigured.
        for h in geo.OFFICE_HUBS:
            self.assertTrue(h.address.strip(), f"{h.city} missing address")

    def test_coords_are_plausible(self):
        # Continental-US bounding box — catches a swapped/zeroed lat-lon.
        for h in geo.OFFICE_HUBS:
            self.assertTrue(24.0 < h.lat < 50.0, f"{h.city} lat off-continent")
            self.assertTrue(-93.0 < h.lon < -74.0, f"{h.city} lon off-continent")

    def test_hubs_do_not_overlap(self):
        # The non-overlap invariant: every pair is >2*RADIUS_MILES apart, so each
        # in-radius account maps to exactly one hub and min() can't double-count.
        hubs = geo.OFFICE_HUBS
        for i in range(len(hubs)):
            for j in range(i + 1, len(hubs)):
                d = geo._haversine_miles(hubs[i].lat, hubs[i].lon,
                                         hubs[j].lat, hubs[j].lon)
                self.assertGreater(d, 2 * geo.RADIUS_MILES,
                                   f"{hubs[i].city} and {hubs[j].city} circles overlap")


if __name__ == "__main__":
    unittest.main()
