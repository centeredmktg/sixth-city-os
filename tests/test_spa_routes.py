"""SPA deep-link coverage: server.py's route allowlist has to be manually kept
in sync with the client-side route map in app.jsx. That's exactly the kind of
hardcoded list this codebase has been bitten by before — in-app nav still works
because it never hits the server, so a missing entry only shows up as a 404 on
a bookmark/refresh/pasted link. Derive the expected paths from the client source
of truth (PATH_VIEW) so a new view can't ship without server coverage.
"""
import os
import re

APP_JSX = os.path.join(os.path.dirname(__file__), "..", "web", "console", "app", "app.jsx")


def _client_paths():
    """Extract path keys from the PATH_VIEW object literal in app.jsx.

    Not a JS parser — just pulls the object body by name, then regexes out
    the quoted-string keys. Good enough for a flat literal like PATH_VIEW.
    """
    src = open(APP_JSX).read()
    m = re.search(r"const PATH_VIEW\s*=\s*\{(.*?)\};", src)
    assert m, "could not locate PATH_VIEW object literal in app.jsx — extraction regex is stale"
    body = m.group(1)
    return re.findall(r'"(/[^"]*)"\s*:', body)


def test_extraction_finds_a_real_route_set():
    # If this regex ever silently matches nothing, the coverage test below
    # would vacuously pass — worse than no test at all. Guard against that.
    paths = _client_paths()
    assert len(paths) >= 5, (
        f"only extracted {len(paths)} paths from PATH_VIEW ({paths!r}) — "
        "regex likely broke against app.jsx, not a real drop in routes"
    )


def test_every_client_route_is_served_by_the_server(client):
    for path in _client_paths():
        resp = client.get(path)
        assert resp.status_code == 200, (
            f"server does not serve {path} — deep link (bookmark/refresh/paste) "
            f"returns {resp.status_code} instead of the console shell. Add it to "
            f"the SPA fallback tuple in web/server.py."
        )
        assert "text/html" in resp.headers.get("content-type", ""), (
            f"server does not serve {path} as HTML — got content-type "
            f"{resp.headers.get('content-type')!r} (likely a JSON 404 body)"
        )
