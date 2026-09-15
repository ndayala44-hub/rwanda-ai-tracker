/* Same-origin deployment: the reverse proxy forwards /api to the FastAPI
   service, so the browser never makes a cross-origin request and CORS never
   arises. */
window.TRACKER_API_BASE = "";
