"""
Site-audit source — the rich, free, deterministic enrichment core. ONE homepage
GET + pure HTML parse yields several signals at once. No API key, no token tax;
fetch() is the only side effect, parse() is pure (testable offline).

Doubles as the per-domain core for a future "free website audit" lead magnet.
"""
from __future__ import annotations

import ipaddress
import re
import socket
from urllib.parse import urljoin, urlparse

import requests

from engine.models import Account, Signal, SignalKind
from engine.sources.base import DataSource

MAX_BYTES = 3 * 1024 * 1024  # cap homepage body at 3 MB (resource-exhaustion guard)
_CGNAT = ipaddress.ip_network("100.64.0.0/10")


class UnsafeURLError(Exception):
    """Raised when a target URL fails the SSRF guard (bad scheme / non-public host)."""

_AD_PIXELS = [
    (r"AW-\d", "Google Ads conversion tag"),
    (r"googleadservices\.com|googlesyndication\.com", "Google Ads / remarketing"),
    (r"connect\.facebook\.net|fbq\(", "Meta (Facebook) Pixel"),
]
_ANALYTICS = r"gtag\(|googletagmanager\.com|google-analytics\.com|analytics\.js|gtm\.js"


def _host_is_public(host: str) -> bool:
    """SSRF guard: resolve `host` and return False if it's localhost/internal or any
    resolved IP is private/loopback/link-local/CGNAT/reserved/multicast/unspecified
    (blocks 169.254.169.254 cloud metadata, 10.x, 127.x, *.internal, etc.)."""
    h = (host or "").strip().lower().rstrip(".")
    if not h or h == "localhost" or h.endswith((".localhost", ".internal", ".local")):
        return False
    try:
        infos = socket.getaddrinfo(h, None)
    except socket.gaierror:
        return False
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if (ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved
                or ip.is_multicast or ip.is_unspecified or ip in _CGNAT):
            return False
    return True


def _validate(url: str) -> str:
    p = urlparse(url)
    if p.scheme not in ("http", "https"):
        raise UnsafeURLError(f"scheme {p.scheme!r} not allowed")
    if not _host_is_public(p.hostname or ""):
        raise UnsafeURLError(f"host {p.hostname!r} is not a public address")
    return url


def fetch(domain: str, timeout: int = 15, max_redirects: int = 3) -> tuple[str, dict]:
    """SSRF-guarded, size-capped GET of the homepage. Only http/https; the host (and
    every redirect hop) must resolve to a public IP; body capped at MAX_BYTES. Raises
    UnsafeURLError / requests errors — the source's enrich() decides how to fail."""
    url = domain if domain.startswith("http") else f"https://{domain}"
    for _ in range(max_redirects + 1):
        _validate(url)
        r = requests.get(url, timeout=timeout, stream=True, allow_redirects=False,
                         headers={"User-Agent": "sixth-city-pipeline-engine/1.0"})
        if r.is_redirect and r.headers.get("location"):
            nxt = urljoin(url, r.headers["location"])
            r.close()
            url = nxt
            continue
        clen = r.headers.get("Content-Length")
        if clen and clen.isdigit() and int(clen) > MAX_BYTES:
            r.close()
            raise UnsafeURLError("response exceeds size cap")
        buf = bytearray()
        for chunk in r.iter_content(chunk_size=65536):
            buf.extend(chunk)
            if len(buf) > MAX_BYTES:
                break
        headers = dict(r.headers)
        r.close()
        return bytes(buf).decode("utf-8", errors="replace"), headers
    raise UnsafeURLError("too many redirects")


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
