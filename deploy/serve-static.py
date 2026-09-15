#!/usr/bin/env python3
"""
Serve the built dashboard locally, exactly as a static host would.

Useful before deploying: opening index.html from disk uses the file:// origin,
which behaves differently from an HTTP origin. This is the closest local
approximation of GitHub Pages or Cloudflare Pages.

    python3 deploy/serve-static.py           # http://localhost:8000
    python3 deploy/serve-static.py 9000
"""
import http.server
import socketserver
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "apps/web"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        super().end_headers()


if not (ROOT / "index.html").exists():
    sys.exit("apps/web/index.html is missing — run: npm run build:web")

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving {ROOT} at http://localhost:{PORT}")
    print("The status bar should read 'Backend offline' — there is no API here, by design.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")
