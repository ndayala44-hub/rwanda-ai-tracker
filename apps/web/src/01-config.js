/* ============================================================================
   RWANDA AI TRACKER — application configuration
   ----------------------------------------------------------------------------
   The UI is unchanged. What changed underneath it: nothing on screen is a
   literal any more. Everything resolves through DATA_SOURCES below, in order:
     1. a live API            (?api=https://… or window.TRACKER_API_BASE)
     2. a published snapshot  (./data/bootstrap.json)
     3. the embedded dataset  (so the single file still opens offline)
   ==========================================================================*/
/* Where to look for the backend when nothing else says.
   On localhost the API runs on its own port; anywhere else — a Vercel
   deployment, a reverse proxy, a container — it is served from the same origin,
   so "" is correct and needs no configuration. Opened straight from disk this
   resolves to "" too, the fetch fails harmlessly, and the page falls back to
   the published snapshot and then to its embedded dataset. */
const DEFAULT_API_BASE = (() => {
  if (typeof location === "undefined") return "http://localhost:4010";
  const host = location.hostname;
  return (host === "localhost" || host === "127.0.0.1" || host === "") ? "http://localhost:4010" : "";
})();
const QS = (typeof location!=="undefined") ? new URLSearchParams(location.search) : new URLSearchParams("");
const META = {
  platform: "Rwanda AI Tracker",
  cycle: 2026, firstYear: 2019,
  built: "15 Sep 2026",
  methodology: "v1.3",
  weightSet: "equal-v1",
  engine: "tracker-scoring-engine 2.5.0",
  /* The dashboard is served BY the FastAPI backend in normal operation. The
     resolution order below still degrades gracefully: if the API is down or the
     file is opened straight from disk, the published snapshot and then the
     embedded dataset keep it usable — and the status bar names which one is in
     use, so a stale view can never masquerade as a live one. */
  /* An empty string is a legitimate value — it means "same origin", which is
     how the reverse-proxy deployment is configured. Testing truthiness here
     silently sent that deployment to localhost instead. */
  /* Three valid shapes:
       "https://…" or ""   an API to use, "" meaning same origin
       false               no API at all — a static deployment. Skips the
                           request entirely rather than failing one per load
       undefined           fall back to DEFAULT_API_BASE                     */
  apiBase: QS.get("api")
        ?? (typeof window!=="undefined" && window.TRACKER_API_BASE===false
              ? null
              : typeof window!=="undefined" && typeof window.TRACKER_API_BASE==="string"
                  ? window.TRACKER_API_BASE
                  : DEFAULT_API_BASE),
  snapshotUrl: QS.get("data") || "./data/bootstrap.json",
  registry: { candidate: 280, main: 89, backup: 61, notRelevant: 130 },
  dataOrigin: "embedded",         // set by the loader to api | snapshot | embedded
  provenance: null                // populated from /api/provenance or computed locally
};
