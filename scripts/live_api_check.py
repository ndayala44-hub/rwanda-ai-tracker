"""
End-to-end check: the dashboard really does load from the backend.

Starts the Python data layer over HTTP in-process, then drives the built
dashboard against it with a real fetch and asserts that it reports
`dataOrigin: api` — not the snapshot, and not the embedded fallback.

This exists because a dashboard that silently falls back looks identical to one
that is live. The only way to tell them apart is to assert which path was taken.

    npm run test:live       (or: python3 scripts/live_api_check.py)

It serves the same store and the same engine as services/api/app/main.py, using
the standard library, so it runs without FastAPI installed.
"""
import json, os, subprocess, sys, threading, time, urllib.request
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from datetime import datetime, timezone

ROOT = str(Path(__file__).resolve().parents[1])
os.environ["DATA_DIR"] = ROOT + "/data"
sys.path.insert(0, ROOT + "/services/api")
from app.store import store
store.load()

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        routes = {
            "/health": lambda: {"status": "ok", "writeEnabled": False},
            "/api/meta": store.meta,
            "/api/provenance": store.provenance,
            "/api/scores": lambda: store.run(),
            "/api/bootstrap": lambda: {**store.dataset,
                                       "generated": datetime.now(timezone.utc).isoformat(),
                                       "meta": store.meta()},
        }
        fn = routes.get(self.path.split("?")[0])
        if not fn:
            self.send_response(404); self.end_headers(); self.wfile.write(b'{}'); return
        body = json.dumps(fn()).encode()
        self.send_response(200)
        for k, v in (("content-type", "application/json"), ("access-control-allow-origin", "*"),
                     ("etag", '"%s"' % store.etag), ("content-length", str(len(body)))):
            self.send_header(k, v)
        self.end_headers(); self.wfile.write(body)

H.protocol_version = "HTTP/1.1"   # undici keeps connections alive; HTTP/1.0 responses abort mid-body
srv = ThreadingHTTPServer(("127.0.0.1", 4010), H)
threading.Thread(target=srv.serve_forever, daemon=True).start()
time.sleep(0.5)

def get(path):
    return json.load(urllib.request.urlopen("http://127.0.0.1:4010" + path, timeout=10))

print("BACKEND")
m = get("/api/meta")
print(f"  {m['backend']} · {m['engineVersion']}")
print(f"  {m['indicators']} indicators · {m['observations']} observations · {m['sources']} sources")
p = get("/api/provenance")
o = p["observations"]
print(f"  provenance: {o['byOrigin'].get('source-reported',0)} source-reported, "
      f"{o['byOrigin'].get('demo',0)} demo ({o['sourceReportedShare']:.0%} real)")
print(f"  sources verified: {p['sources']['verified']} of {p['sources']['total']}")
s = get("/api/scores")
print(f"  scores: readiness {s['readiness']['score']:.2f} · maturity {s['maturity']['score']:.2f} "
      f"· L{s['maturityLevel']['assigned']} · coverage {s['readiness']['coverage']:.1%}")

print("\nDASHBOARD AGAINST THE LIVE BACKEND")
client = str(Path(__file__).resolve().parent / "live_api_client.mjs")
r = subprocess.run(["node", client], capture_output=True, text=True, timeout=180)
print(r.stdout.strip())
if r.stderr.strip(): print("  [stderr]", r.stderr.strip()[:800])
srv.shutdown()
sys.exit(r.returncode)
