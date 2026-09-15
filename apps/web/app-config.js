/**
 * Deployment configuration.
 *
 * Loaded before the application and kept in its own file because the page runs
 * under a strict Content-Security-Policy — an inline <script> injected by a
 * reverse proxy would be blocked.
 *
 * Set TRACKER_API_BASE to the backend:
 *   ""                        same origin — the proxy forwards /api to the API
 *   "http://localhost:4010"   a separate host and port
 *   leave undefined           use the built-in default, then fall back to the
 *                             published snapshot and finally to the dataset
 *                             embedded in the page
 *
 * An empty string is a valid value and means "same origin". The resolved data
 * layer is always named in the status bar.
 */
// window.TRACKER_API_BASE = "";
