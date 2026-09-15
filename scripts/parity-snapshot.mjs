/**
 * Print the browser engine's figures on the committed dataset, in the shape the
 * Python parity test expects.
 *
 * The methodology has two implementations — Python on the server, TypeScript in
 * the browser — because the year scrubber and the offline fallback need
 * recomputation without a network round trip. This script is how the expected
 * values in services/api/tests/test_parity.py are regenerated after a
 * deliberate methodology change.
 *
 *   node scripts/parity-snapshot.mjs
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { installStubs } from "../apps/web/test/dom-stub.mjs";

const ROOT = resolve(import.meta.dirname, "..");
installStubs(globalThis);

// The dashboard logs its own boot line; silence it so this script emits clean
// JSON that can be piped straight into the parity expectations.
console.log = () => {};   // the dashboard logs a boot line asynchronously

const html = readFileSync(join(ROOT, "apps/web/index.html"), "utf8");
const code = html.slice(html.lastIndexOf("<script>") + 8, html.lastIndexOf("</script>"));
(0, eval)(code + ";globalThis.__h={loadDataset,applyDataset,runEngine,bindDB," +
  "dataQuality,get RUN(){return RUN},get ML(){return ML},get DIMS(){return DIMS}};");

const h = globalThis.__h;
h.applyDataset(await h.loadDataset());
h.runEngine();
h.bindDB();

process.stdout.write(JSON.stringify({
  readiness: +h.RUN.readiness.score.toFixed(2),
  maturity: +h.RUN.maturity.score.toFixed(2),
  coverage: +h.RUN.readiness.coverage.toFixed(3),
  level: h.ML.assigned,
  dimensions: Object.fromEntries(h.DIMS.map(d => [d.id, +h.RUN.dS[d.id].score.toFixed(2)])),
  dataQuality: Object.fromEntries(h.DIMS.map(d => [d.id, +h.dataQuality(d.id).score.toFixed(2)]))
}, null, 2) + "\n");
