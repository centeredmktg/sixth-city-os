"""
Google OAuth gate for the Pipeline Engine console.

The whole app — the console AND every /api/* route — sits behind Google sign-in,
restricted to an email allowlist (Sixth City's Workspace domain + Danny). Gating
only the HTML would leak data through the API, so the middleware guards both.

Auth turns ON only when the Google creds + a session secret are all configured.
With them unset (local dev, tests) the gate is OPEN so development isn't blocked —
a loud startup log says which mode is active.

ONE-TIME SETUP (Google Cloud Console, ~5 min):
  1. console.cloud.google.com -> APIs & Services -> OAuth consent screen:
     User type = Internal (if the project is in the Sixth City Workspace) or External;
     add the app name + your support email.
  2. Credentials -> Create credentials -> OAuth client ID -> Web application.
  3. Authorized redirect URI (exactly):
       https://sixth-city-os-production.up.railway.app/auth/callback
  4. Put these in Railway env (Service -> Variables):
       GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SESSION_SECRET (any long random string)
  5. Optional: ALLOWED_EMAIL_DOMAINS (csv, default "sixthcitymarketing.com"),
       ALLOWED_EMAILS (csv of extra individual addresses).
Redeploy and the gate is live.
"""
from __future__ import annotations

import os

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.sessions import SessionMiddleware

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
SESSION_SECRET = os.getenv("SESSION_SECRET", "")

AUTH_ENABLED = bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET and SESSION_SECRET)

_DOMAINS = {d.strip().lower() for d in
            os.getenv("ALLOWED_EMAIL_DOMAINS", "sixthcitymarketing.com").split(",") if d.strip()}
_EMAILS = {e.strip().lower() for e in
           os.getenv("ALLOWED_EMAILS", "dcox@centeredmktg.com").split(",") if e.strip()}

_OPEN_PREFIXES = ("/auth/",)
_OPEN_EXACT = {"/api/health"}

_LOGIN_HTML = """<!doctype html><html><head><meta charset=utf-8>
<title>Pipeline Engine — Sign in</title><meta name=viewport content="width=device-width,initial-scale=1">
<style>body{margin:0;height:100vh;display:grid;place-items:center;background:#24272D;
font-family:system-ui,sans-serif;color:#F4EEE7}.c{text-align:center}.t{font-weight:800;font-size:22px;margin-bottom:6px}
.s{color:#B0A597;font-size:13px;margin-bottom:24px}a{display:inline-flex;align-items:center;gap:10px;background:#fff;color:#24272D;
text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px;font-size:15px}</style></head>
<body><div class=c><div class=t>Sixth City · Pipeline Engine</div><div class=s>Sign in with your Sixth City account</div>
<a href="/auth/google"><svg width=18 height=18 viewBox="0 0 48 48"><path fill="#4285F4" d="M45 24c0-1.6-.1-3.1-.4-4.6H24v9.1h11.8c-.5 2.8-2 5.1-4.4 6.7v5.6h7.1C42.7 37 45 31 45 24z"/><path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-7.1-5.6c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.1 15.5 46 24 46z"/><path fill="#FBBC05" d="M11.8 28.2c-.4-1.3-.7-2.7-.7-4.2s.2-2.9.7-4.2v-5.7H4.5C3 17.1 2 20.4 2 24s1 6.9 2.5 9.9l7.3-5.7z"/><path fill="#EA4335" d="M24 11.4c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.8 29.9 3 24 3 15.5 3 8.1 7.9 4.5 14.1l7.3 5.7c1.7-5.1 6.5-8.4 12.2-8.4z"/></svg>Sign in with Google</a></div></body></html>"""

_DENIED_HTML = """<!doctype html><html><head><meta charset=utf-8><title>Access denied</title>
<style>body{{margin:0;height:100vh;display:grid;place-items:center;background:#24272D;font-family:system-ui,sans-serif;color:#F4EEE7;text-align:center}}
.s{{color:#B0A597;font-size:13px;margin-top:8px}}a{{color:#ED6A3C}}</style></head>
<body><div><div style="font-weight:800;font-size:20px">Access denied</div>
<div class=s>{email} isn't on the approved list for this workspace.<br><a href="/auth/logout">Try a different account</a></div></div></body></html>"""


def is_allowed(email: str) -> bool:
    """True if this verified Google email is on the allowlist (exact addr or domain)."""
    e = (email or "").strip().lower()
    if not e or "@" not in e:
        return False
    if e in _EMAILS:
        return True
    return e.split("@", 1)[1] in _DOMAINS


def setup_auth(app: FastAPI) -> bool:
    """Wire the Google-OAuth gate onto `app`. Returns whether auth is enforced.
    No-op (open app) when creds aren't configured — keeps local dev/tests working."""
    if not AUTH_ENABLED:
        print("[auth] DISABLED — GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / SESSION_SECRET "
              "not all set. Console + API are OPEN. Set all three in prod to gate access.")
        return False

    from authlib.integrations.starlette_client import OAuth

    oauth = OAuth()
    oauth.register(
        name="google",
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_id=GOOGLE_CLIENT_ID, client_secret=GOOGLE_CLIENT_SECRET,
        client_kwargs={"scope": "openid email profile"},
    )

    async def require_login(request: Request, call_next):
        path = request.url.path
        if (path.startswith(_OPEN_PREFIXES) or path in _OPEN_EXACT
                or request.session.get("user")):
            return await call_next(request)
        if path.startswith("/api/"):
            return JSONResponse({"detail": "authentication required"}, status_code=401)
        return RedirectResponse("/auth/login")

    # Order matters: SessionMiddleware must wrap (run before) the gate so request.session
    # is populated. add_middleware prepends, so the LAST added is outermost -> add the
    # gate first (inner), SessionMiddleware second (outer).
    app.add_middleware(BaseHTTPMiddleware, dispatch=require_login)
    app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET, https_only=True,
                       same_site="lax", max_age=60 * 60 * 12)

    @app.get("/auth/login", include_in_schema=False)
    async def login():
        return HTMLResponse(_LOGIN_HTML)

    @app.get("/auth/google", include_in_schema=False)
    async def google(request: Request):
        return await oauth.google.authorize_redirect(request, _callback_uri(request))

    @app.get("/auth/callback", name="callback", include_in_schema=False)
    async def callback(request: Request):
        try:
            token = await oauth.google.authorize_access_token(request)
        except Exception as e:
            print(f"[auth] callback failed: {type(e).__name__}")
            return RedirectResponse("/auth/login")
        info = token.get("userinfo") or {}
        email = info.get("email", "")
        if not info.get("email_verified") or not is_allowed(email):
            request.session.clear()
            return HTMLResponse(_DENIED_HTML.format(email=email or "that account"), status_code=403)
        request.session["user"] = email
        return RedirectResponse("/")

    @app.get("/auth/logout", include_in_schema=False)
    async def logout(request: Request):
        request.session.clear()
        return RedirectResponse("/auth/login")

    print(f"[auth] ENABLED — Google OAuth. allow domains={sorted(_DOMAINS)} emails={sorted(_EMAILS)}")
    return True


def _callback_uri(request: Request) -> str:
    """Absolute /auth/callback URL, forced to https in prod (Railway terminates TLS at
    its proxy, so the request scheme can look like http — but GCP's redirect URI is
    https, and they must match exactly)."""
    uri = str(request.url_for("callback"))
    if not uri.startswith(("http://localhost", "http://127.")):
        uri = uri.replace("http://", "https://", 1)
    return uri
