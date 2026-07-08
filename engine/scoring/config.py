"""
ScoringConfig — the ABCR rubric as adjustable data.

Every lever the Sixth City team can tune lives here, with the historical constants as
DEFAULTS so an un-configured system scores exactly as it did before this feature. The
active config is a swappable module global (same pattern as `geo.OFFICE_HUBS`): scoring
reads it and never touches the DB; the web/job layer loads it at startup and swaps it on
save. `validate()` is the single source of truth for what a coherent rubric is — the API
and the console UI both defer to it.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from engine.models import Vertical

# Historical win-rate-weighted vertical bonuses (see abcr.VERTICAL_FIT_BONUS), keyed by the
# Vertical string value so they JSON-serialize cleanly. Floats so dict round-trips are exact.
DEFAULT_VERTICAL_FIT_BONUS: dict[str, float] = {
    Vertical.INDUSTRIAL_MANUFACTURING.value: 16.0,
    Vertical.REAL_ESTATE.value:              16.0,
    Vertical.EDUCATION.value:                15.0,
    Vertical.PROFESSIONAL_B2B.value:         13.0,
    Vertical.HEALTHCARE.value:               10.0,
    Vertical.AUTOMOTIVE.value:                8.0,
    Vertical.LEGAL.value:                     8.0,
    Vertical.HOME_CONSTRUCTION.value:         7.0,
    Vertical.RETAIL_ECOMMERCE.value:          2.0,
    Vertical.UNKNOWN.value:                  10.0,
}

VERTICAL_BONUS_MAX = 40.0   # UI + validation ceiling per vertical


@dataclass(frozen=True)
class ScoringConfig:
    """All tunable ABCR levers. Frozen — swap the whole object, never mutate in place."""
    fit_weight: float = 0.4                 # timing_weight is the complement
    band_a: float = 75.0
    band_b: float = 55.0
    band_c: float = 35.0
    proximity_boost: float = 1.12
    staffed_proximity_boost: float = 1.20
    radius_miles: float = 50.0
    vertical_fit_bonus: dict[str, float] = field(
        default_factory=lambda: dict(DEFAULT_VERTICAL_FIT_BONUS))

    @property
    def timing_weight(self) -> float:
        return 1.0 - self.fit_weight

    def validate(self) -> list[str]:
        """Human-readable errors; empty list = a coherent rubric."""
        errs: list[str] = []
        if not (0.0 <= self.fit_weight <= 1.0):
            errs.append("Fit/Timing balance must be between 0 and 1.")
        if not (100.0 >= self.band_a > self.band_b > self.band_c >= 0.0):
            errs.append("Band cutoffs must satisfy 100 ≥ A > B > C ≥ 0.")
        if self.proximity_boost < 1.0:
            errs.append("Proximity boost must be at least 1.0 (a boost never penalizes).")
        if self.staffed_proximity_boost < self.proximity_boost:
            errs.append("Staffed-hub boost must be at least the proximity boost.")
        if self.radius_miles <= 0:
            errs.append("Hub radius must be greater than 0 miles.")
        expected = {v.value for v in Vertical}
        if set(self.vertical_fit_bonus) != expected:
            errs.append("Vertical bonuses must cover exactly the 10 verticals.")
        else:
            for k, val in self.vertical_fit_bonus.items():
                if not (0.0 <= val <= VERTICAL_BONUS_MAX):
                    errs.append(f"Vertical bonus for {k} must be between 0 and {VERTICAL_BONUS_MAX:.0f}.")
        return errs

    def to_dict(self) -> dict:
        return {
            "fit_weight": self.fit_weight,
            "band_a": self.band_a,
            "band_b": self.band_b,
            "band_c": self.band_c,
            "proximity_boost": self.proximity_boost,
            "staffed_proximity_boost": self.staffed_proximity_boost,
            "radius_miles": self.radius_miles,
            "vertical_fit_bonus": dict(self.vertical_fit_bonus),
        }

    @classmethod
    def from_dict(cls, d: dict) -> "ScoringConfig":
        """Build from a (possibly partial) dict — missing keys keep defaults, unknown keys
        are ignored, scalars are coerced to float. Never raises on a well-typed payload;
        coherence is a separate validate() concern."""
        base = cls().to_dict()
        if isinstance(d, dict):
            for k in base:
                if k in d and d[k] is not None:
                    base[k] = d[k]
        vfb = base["vertical_fit_bonus"]
        return cls(
            fit_weight=float(base["fit_weight"]),
            band_a=float(base["band_a"]),
            band_b=float(base["band_b"]),
            band_c=float(base["band_c"]),
            proximity_boost=float(base["proximity_boost"]),
            staffed_proximity_boost=float(base["staffed_proximity_boost"]),
            radius_miles=float(base["radius_miles"]),
            vertical_fit_bonus={str(k): float(v) for k, v in dict(vfb).items()},
        )


DEFAULT_CONFIG = ScoringConfig()

# --- Active config: a swappable module global (mirrors geo.OFFICE_HUBS) -------
_active: ScoringConfig = ScoringConfig()


def get_active_config() -> ScoringConfig:
    return _active


def set_active_config(cfg: ScoringConfig) -> None:
    global _active
    _active = cfg
