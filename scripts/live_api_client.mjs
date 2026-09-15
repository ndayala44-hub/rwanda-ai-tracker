/**
 * Loads the built dashboard and points it at the live backend, exactly as a
 * browser would. Driven by scripts/live_api_check.py, which starts the server.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const ROOT = resolve(import.meta.dirname, "..");
const { installStubs } = await import(resolve(ROOT, "apps/web/test/dom-stub.mjs"));
const realFetch = globalThis.fetch;          // capture before the stub replaces it
installStubs(globalThis);
globalThis.fetch = realFetch;                // the dashboard must talk to the backend for real
globalThis.window = { addEventListener(){}, scrollTo(){}, TRACKER_API_BASE: "http://127.0.0.1:4010" };

// Probe directly first, so a server problem is never mistaken for a
// dashboard problem.
const probe = await fetch("http://127.0.0.1:4010/api/bootstrap");
console.log(`  direct probe: HTTP ${probe.status}, ${(await probe.text()).length} bytes`);

const html = readFileSync(resolve(ROOT, "apps/web/index.html"), "utf8");
const code = html.slice(html.lastIndexOf("<script>") + 8, html.lastIndexOf("</script>"));
(0, eval)(code + ";globalThis.__h={loadDataset,applyDataset,runEngine,bindDB,VIEWS," +
  "get META(){return META},get RUN(){return RUN},get ML(){return ML},get IND(){return IND}," +
  "get OBSERVATIONS(){return OBSERVATIONS},get SOURCES(){return SOURCES}};");
const h = globalThis.__h;
const ds = await h.loadDataset();
h.applyDataset(ds); h.runEngine(); h.bindDB();

console.log(`  data origin: ${h.META.dataOrigin}  (apiBase ${h.META.apiBase})`);
console.log(`  loaded ${h.IND.length} indicators, ${h.OBSERVATIONS.length} observations, ${Object.keys(h.SOURCES).length} sources over HTTP`);
console.log(`  scores: readiness ${h.RUN.readiness.score.toFixed(2)} · maturity ${h.RUN.maturity.score.toFixed(2)} · L${h.ML.assigned}`);
console.log(`  provenance surfaced: ${(h.META.provenance.observations.sourceReportedShare*100).toFixed(0)}% source-reported`);
const overview = await h.VIEWS.overview();
console.log(`  overview renders from live data: ${overview.length > 5000 ? "yes" : "NO"}`);
if (h.META.dataOrigin !== "api") { console.error("  FAIL — dashboard did not use the live API"); process.exit(1); }
