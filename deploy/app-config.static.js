/* Static deployment — GitHub Pages, Cloudflare Pages, Netlify, an object store.
   There is no backend, so the dashboard skips the API entirely and serves from
   ./data/bootstrap.json. Without this it would attempt one request per load and
   log a failure before falling back. */
window.TRACKER_API_BASE = false;
