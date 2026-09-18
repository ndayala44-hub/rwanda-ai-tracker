
/* ======================== RUNTIME DEPENDENCIES =========================
   The dashboard is a single portable file. Anything it loads from outside
   itself is therefore optional and every failure is tolerated:

     · app-config.js, deployment settings. Absent when the file is opened
                        from disk, which is fine: the defaults apply.
     · echarts, the charting library. Tried locally first, then from
                        the CDN. If neither resolves the dashboard renders
                        every chart as its table alternative instead.

   Loading these with static script tags meant the page depended on files
   that cannot exist under file://, and a blocked or missing script took the
   whole application with it.
   ====================================================================== */
function loadScript(src, { optional = true } = {}) {
  return new Promise(resolve => {
    const el = document.createElement("script");
    el.src = src;
    el.async = false;
    el.onload = () => resolve(true);
    el.onerror = () => {
      if (!optional) console.warn("Could not load", src);
      resolve(false);
    };
    (document.head || document.documentElement).appendChild(el);
  });
}

/** Deployment settings, if this build is being served rather than opened. */
async function loadDeploymentConfig() {
  const ok = await loadScript("./app-config.js");
  if (!ok) return false;
  if (typeof window.TRACKER_API_BASE === "string") META.apiBase = window.TRACKER_API_BASE;
  else if (window.TRACKER_API_BASE === false) META.apiBase = null;   // static deployment
  return true;
}

const ECHARTS_VERSION = "5.4.3";
const ECHARTS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/echarts/${ECHARTS_VERSION}/echarts.min.js`;

/**
 * Vendored copy first, CDN second, neither third.
 * A government analytics tool should not stop working because a third party is
 * unreachable, and it should not silently depend on one either.
 */
async function ensureCharts() {
  if (typeof echarts !== "undefined") return "already-loaded";
  if (await loadScript("./vendor/echarts.min.js")) return "vendored";
  if (await loadScript(ECHARTS_CDN)) return "cdn";
  console.warn("Charting library unavailable, figures will be rendered as tables.");
  return "unavailable";
}

const chartsAvailable = () => typeof echarts !== "undefined";
