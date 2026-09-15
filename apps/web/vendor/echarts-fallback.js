/**
 * Falls back to the CDN only if the vendored charting library is absent.
 *
 * This lives in its own file rather than in an inline attribute or an inline
 * <script> because the page runs under a strict Content-Security-Policy: no
 * inline handlers, and inline scripts only by hash. Injecting a <script> element
 * whose src is on the allow-list is permitted.
 *
 * Populate the vendored copy and the integrity hash with:
 *   npm run vendor:echarts
 */
(function () {
  if (typeof window.echarts !== "undefined") return;

  var VERSION = "5.4.3";
  var s = document.createElement("script");
  s.src = "https://cdnjs.cloudflare.com/ajax/libs/echarts/" + VERSION + "/echarts.min.js";
  // Replaced by scripts/vendor-echarts.mjs once the library has been fetched and hashed.
  s.integrity = "";
  if (s.integrity) { s.crossOrigin = "anonymous"; s.referrerPolicy = "no-referrer"; }
  s.async = false;
  s.onerror = function () {
    // The dashboard degrades to its table alternatives rather than failing.
    console.warn("Charting library unavailable — the dashboard will render figures as tables.");
  };
  document.head.appendChild(s);
})();
