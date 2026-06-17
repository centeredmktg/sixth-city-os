"""
Static endpoint for the Pipeline Engine dashboard.

Serves the Sixth City front-end (web/design) over HTTP so it can be shared as a
live link — this is the "show John" surface, not the engine itself. The engine
loop (run.py) and the demo builder (build_demo.py) are separate; this process
only hands out the already-built static app (HTML/JS/CSS + the in-browser React
bundle).

Railway provides the port via $PORT. Locally it defaults to 8000.

    python server.py            # -> http://localhost:8000  (serves web/design)
    PORT=9000 python server.py  # override port
"""

from __future__ import annotations

import functools
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
# The dashboard is the root of the share link: web/design/index.html is "/".
SERVE_DIR = os.environ.get("SERVE_DIR", os.path.join(HERE, "web", "design"))
PORT = int(os.environ.get("PORT", "8000"))


def main() -> None:
    handler = functools.partial(SimpleHTTPRequestHandler, directory=SERVE_DIR)
    # 0.0.0.0 so Railway's edge can reach it; ThreadingHTTPServer so a shared
    # link with a few concurrent viewers doesn't block on a single request.
    with ThreadingHTTPServer(("0.0.0.0", PORT), handler) as httpd:
        print(f"Serving {SERVE_DIR} on 0.0.0.0:{PORT}", flush=True)
        httpd.serve_forever()


if __name__ == "__main__":
    main()
