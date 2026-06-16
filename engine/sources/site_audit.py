"""
Site-audit source — the rich, free, deterministic enrichment core. ONE homepage
GET + pure HTML parse yields several signals at once. No API key, no token tax;
fetch() is the only side effect, parse() is pure (testable offline).

Doubles as the per-domain core for a future "free website audit" lead magnet.
"""
from __future__ import annotations

import re

import requests

from engine.models import Account, Signal, SignalKind
from engine.sources.base import DataSource

_AD_PIXELS = [
    (r"AW-\d", "Google Ads conversion tag"),
    (r"googleadservices\.com|googlesyndication\.com", "Google Ads / remarketing"),
    (r"connect\.facebook\.net|fbq\(", "Meta (Facebook) Pixel"),
]
_ANALYTICS = r"gtag\(|googletagmanager\.com|google-analytics\.com|analytics\.js|gtm\.js"


def fetch(domain: str, timeout: int = 15) -> tuple[str, dict]:
    """Side-effecting GET of the homepage. Returns (html, headers). Raises on
    network error — the source's enrich() decides how to fail."""
    url = domain if domain.startswith("http") else f"https://{domain}"
    r = requests.get(url, timeout=timeout, headers={"User-Agent": "sixth-city-pipeline-engine/1.0"})
    return r.text or "", dict(r.headers)


def parse(html: str, headers: dict, url: str) -> list[Signal]:
    """PURE: homepage HTML/headers -> signals. Never raises."""
    html = html or ""
    low = html.lower()
    sigs: list[Signal] = []

    for pat, label in _AD_PIXELS:
        if re.search(pat, html):
            sigs.append(Signal(
                kind=SignalKind.ADS_ACTIVE, source="site_audit", value=1.0,
                detail=(f"{label} is installed on the site — they're already spending on "
                        f"paid traffic. Budget exists; the question is conversion."),
            ))
            break

    missing = []
    if not re.search(r"<title[^>]*>\s*\S", low):
        missing.append("page title")
    if not re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\']\s*\S', low):
        missing.append("meta description")
    if "<h1" not in low:
        missing.append("an H1 heading")
    if "application/ld+json" not in low:
        missing.append("schema markup")
    if missing:
        sigs.append(Signal(
            kind=SignalKind.SEO_GAP, source="site_audit", value=float(len(missing)),
            detail=("The homepage is missing " + ", ".join(missing) +
                    " — basics that decide how the page shows up in search and AI answers."),
        ))

    if not re.search(_ANALYTICS, low):
        sigs.append(Signal(
            kind=SignalKind.CONTENT_GAP, source="site_audit", value=1.0,
            detail=("No analytics tag detected — they can't see what their site is doing, "
                    "so every other channel is flying blind."),
        ))

    return sigs


class SiteAuditSource(DataSource):
    name = "site_audit"
    provides_accounts = False
    provides_signals = True

    def discover(self) -> list[Account]:
        return []

    def enrich(self, account: Account) -> list[Signal]:
        try:
            html, headers = fetch(account.domain)
        except Exception as e:
            print(f"  [site_audit] skip {account.domain}: {type(e).__name__}")
            return []
        return parse(html, headers, account.domain)
