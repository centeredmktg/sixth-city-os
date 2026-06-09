"""
PageSpeed / Lighthouse source — FALLBACK EVAL (not the spine).

Clay's free payload already carries a PageSpeed score, so the Clay funnel doesn't
need this. Its job is the "run ANY list of domains through the evaluation machine"
feature: for domains that arrive WITHOUT a score (a CSV someone hands John, a
partner's book, a conference list), this fetches one live.

It only fires when an account has no SITE_QUALITY signal yet — see enrich().

No token tax: PageSpeed Insights is a plain REST API, not an LLM. The constraint
is Google's rate limit (~25k/day with a key), so this is for arbitrary lists at
modest volume, not for re-evaluating Clay's 50k (Clay already did that, free).

How it works:
  - Hits Google's PageSpeed Insights REST API (free; keyless works for dev, a key
    just raises quota). No self-hosted Lighthouse, no infra.
  - Mobile strategy: their clients' customers are on phones and Google ranks
    mobile-first. A bad mobile score is the strongest "you're leaking money" hook.
  - parse() is a PURE function (API json -> Signals) so it's testable without the
    network. fetch() is the only side-effecting part.

Signal.value = Lighthouse performance score 0-100 (lower = worse = warmer lead).
The scoring + routing layers read SITE_QUALITY identically whether the score came
from here or from Clay's payload — source-agnostic at the signal level.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request

from engine.config import CONFIG
from engine.models import Account, Signal, SignalKind
from engine.sources.base import DataSource

API = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"


def fetch(domain: str, strategy: str = "mobile", timeout: int = 60) -> dict:
    """Call PageSpeed Insights for a domain. Side-effecting; isolated so parse()
    stays pure. Raises urllib errors / TimeoutError — callers decide how to fail."""
    url = domain if domain.startswith("http") else f"https://{domain}"
    params = {"url": url, "strategy": strategy, "category": "performance"}
    if CONFIG.pagespeed_key:
        params["key"] = CONFIG.pagespeed_key
    req = urllib.request.Request(
        f"{API}?{urllib.parse.urlencode(params)}",
        headers={"User-Agent": "sixth-city-pipeline-engine"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _audit_value(audits: dict, key: str) -> str:
    """Human-readable metric value (e.g. '4.2 s' for LCP), or '' if absent."""
    return audits.get(key, {}).get("displayValue", "")


def parse(payload: dict, domain: str) -> list[Signal]:
    """PURE: PageSpeed Insights json -> SITE_QUALITY signal(s).

    Returns [] when the API couldn't analyze the site (no score) — a missing
    score is not a zero score; we don't invent a signal we didn't measure.
    """
    lh = payload.get("lighthouseResult", {})
    perf = lh.get("categories", {}).get("performance", {})
    raw_score = perf.get("score")
    if raw_score is None:
        return []

    score = round(raw_score * 100)  # API returns 0-1; normalize to 0-100
    audits = lh.get("audits", {})
    lcp = _audit_value(audits, "largest-contentful-paint")
    cls = _audit_value(audits, "cumulative-layout-shift")

    # The detail string is reused VERBATIM as the outreach "why this account"
    # reason, so it has to read like a human wrote it, not a metrics dump.
    metric_bits = [b for b in (f"LCP {lcp}" if lcp else "", f"CLS {cls}" if cls else "") if b]
    metric_str = (" — " + ", ".join(metric_bits)) if metric_bits else ""
    detail = (
        f"Mobile site scores {score}/100 on Google's performance audit"
        f"{metric_str}. Slow, clunky load is quietly leaking conversions."
    )

    return [
        Signal(
            kind=SignalKind.SITE_QUALITY,
            source="pagespeed",
            value=float(score),
            detail=detail,
        )
    ]


class PageSpeedSource(DataSource):
    name = "pagespeed"
    provides_accounts = False
    provides_signals = True

    def discover(self) -> list[Account]:
        return []

    def enrich(self, account: Account) -> list[Signal]:
        # Fallback only: skip if Clay (or anything) already provided a site score.
        if any(s.kind == SignalKind.SITE_QUALITY for s in account.signals):
            return []
        try:
            payload = fetch(account.domain)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
            # A site we can't reach/analyze yields no signal — never crash the run.
            print(f"  [pagespeed] skip {account.domain}: {type(e).__name__}")
            return []
        return parse(payload, account.domain)
