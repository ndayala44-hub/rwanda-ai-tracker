/**
 * Integration test for the built dashboard.
 *
 * It loads apps/web/index.html exactly as a browser would, boots the data
 * layer against the embedded fallback, then renders every view, mounts every
 * chart and opens every drawer. It also asserts the three behaviours that are
 * easy to break silently: the year scrubber re-scores the whole platform, a
 * write recomputes the composites, and a public role cannot write.
 *
 *   node --test apps/web/test/
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { installStubs } from "./dom-stub.mjs";

const ROOT = resolve(import.meta.dirname, "../../..");
let app;

before(async () => {
  installStubs(globalThis);
  const html = readFileSync(join(ROOT, "apps/web/index.html"), "utf8");
  // The shell loads the charting library in earlier script tags, so the
  // application bundle is the LAST script block, not the first.
  const code = html.slice(html.lastIndexOf("<script>") + 8, html.lastIndexOf("</script>"));
  // The dashboard is one script in global scope; indirect eval reproduces that.
  // The dashboard's live bindings are reassigned when a dataset loads, so the
  // handle exposes getters rather than a snapshot of values.
  (0, eval)(code + `
;globalThis.currentRoute = currentRoute;
globalThis.parseRoute = parseRoute;
globalThis.CHART_TABLES = CHART_TABLES;
globalThis.__app = {
  VIEWS, MOUNT, DRAWER_CHARTS, api, SESSION,
  loadDataset, applyDataset, runEngine, bindDB, bindYear, palIndex,
  indDrawer, dimDrawer, sourceDrawer, ucDrawer, sectorDrawer, lighthouseDrawer,
  orgDrawer, districtDrawer, policyDrawer, ladderDrawer, insightDrawer,
  openContribute, benchDrawer, mapCreditDrawer, exportCSV, exportJSON,
  get IND(){return IND}, get OBSERVATIONS(){return OBSERVATIONS},
  get SOURCES(){return SOURCES}, get META(){return META},
  get RUN(){return RUN}, get ML(){return ML}, get YEARS(){return YEARS},
  get SESSION(){return SESSION}, get FILTER(){return FILTER}, go
};`);
  app = globalThis.__app;
  app.applyDataset(await app.loadDataset());
  app.runEngine(); app.bindDB();
});

test("the data layer loads and the engine produces plausible scores", () => {
  assert.ok(app.IND.length >= 90, "indicator register should be populated");
  assert.ok(app.OBSERVATIONS.length >= 600);
  assert.equal(app.META.dataOrigin, "embedded", "offline run must use the embedded fallback");
  const run = app.RUN;
  assert.ok(run.readiness.score > 0 && run.readiness.score < 100);
  assert.ok(run.readiness.score > run.maturity.score, "readiness should exceed maturity");
});

test("every view renders", async () => {
  for (const key of Object.keys(app.VIEWS)) {
    const html = await app.VIEWS[key]();
    assert.equal(typeof html, "string", `${key} returned no markup`);
    assert.ok(html.length > 200, `${key} rendered suspiciously little markup`);
  }
});

test("every chart mount runs", async () => {
  for (const key of Object.keys(app.MOUNT)) await app.MOUNT[key]();
});

test("every drawer opens", () => {
  const cases = [
    ["indicator", () => app.indDrawer("RWA10")],
    ["dimension", () => app.dimDrawer("D5")],
    ["source", () => app.sourceDrawer("ECON22")],
    ["use case", () => app.ucDrawer("UC-001")],
    ["sector", () => app.sectorDrawer("AGR")],
    ["lighthouse", () => app.lighthouseDrawer("LH3")],
    ["organisation", () => app.orgDrawer("BABYL")],
    ["district", () => app.districtDrawer("RW-KG-NYA")],
    ["policy", () => app.policyDrawer(0)],
    ["maturity ladder", () => app.ladderDrawer()],
    ["insight", () => app.insightDrawer(0)],
    ["contribute", () => app.openContribute()],
    ["benchmark", () => app.benchDrawer("africa-governance-2026")],
    ["map credit", () => app.mapCreditDrawer()]
  ];
  for (const [name, fn] of cases) assert.doesNotThrow(fn, `${name} drawer failed`);
});

test("the year scrubber re-scores the whole platform", async () => {
  const now = app.RUN.readiness.score;
  app.bindYear(2021);
  const then = app.RUN.readiness.score;
  assert.notEqual(then, now, "moving the reporting year must change the scores");
  for (const key of ["overview", "readiness", "position"]) await app.VIEWS[key]();
  app.bindYear(app.META.cycle);
});

test("an observation write recomputes the composites", async () => {
  app.SESSION.role = "Data Administrator";
  const before = app.RUN.maturity.score;
  await app.api.updateObservation("RWA10", 2026, 25, "render test");
  assert.notEqual(app.RUN.maturity.score, before);
});

test("a public role cannot write", async () => {
  app.SESSION.role = "Public Viewer";
  await assert.rejects(() => app.api.updateObservation("RWA10", 2026, 30, "should fail"),
    /Permission denied/);
});

test("the command palette indexes the whole platform", () => {
  assert.ok(app.palIndex().length > 200, "palette should index indicators, orgs, sources and pages");
});

test("exports produce a file without throwing", async () => {
  await assert.doesNotReject(app.exportCSV());
  await assert.doesNotReject(app.exportJSON());
});

/* ---------------------------------------------------------------- hardening
   These lock in the audit fixes so they cannot silently regress.
   ------------------------------------------------------------------------ */
import { readFileSync as read } from "node:fs";

test("no inline event handlers survive — a strict CSP stays possible", () => {
  const html = read(join(ROOT, "apps/web/index.html"), "utf8");
  const inline = html.match(/\son\w+\s*=\s*"/g) || [];
  assert.equal(inline.length, 0,
    `found ${inline.length} inline handlers: ${[...new Set(inline)].join(", ")}`);
});

test("a Content-Security-Policy is declared and does not allow inline script", () => {
  const html = read(join(ROOT, "apps/web/index.html"), "utf8");
  const csp = html.match(/Content-Security-Policy"\s+content="([^"]+)"/s);
  assert.ok(csp, "no CSP meta tag");
  const scriptSrc = csp[1].match(/script-src([^;]*)/)[1];
  assert.ok(!scriptSrc.includes("unsafe-inline"), "script-src must not allow unsafe-inline");
  assert.ok(scriptSrc.includes("sha256-"), "the inline application script must be allow-listed by hash");
  assert.ok(csp[1].includes("form-action 'none'"));
});

test("the page carries landmarks, a skip link and dialog semantics", () => {
  const html = read(join(ROOT, "apps/web/index.html"), "utf8");
  for (const needle of ['class="skip"', 'role="banner"', 'role="main"', 'role="contentinfo"',
                        'role="dialog"', 'aria-modal="true"', 'aria-live="polite"']) {
    assert.ok(html.includes(needle), `missing ${needle}`);
  }
});

test("contributed free text cannot inject markup", async () => {
  const payload = '<img src=x onerror="alert(1)">';
  app.SESSION.role = "Contributor";
  await app.api.addContribution({
    who: payload, kind: "Indicator observation", target: "RWA10",
    value: payload, note: payload
  });
  const html = await app.VIEWS.sources();
  assert.ok(!html.includes('<img src=x'), "raw markup from a contribution reached the DOM");
  assert.ok(html.includes("&lt;img"), "the payload should appear escaped");
});

test("the route round-trips through the URL", async () => {
  await app.go("readiness");
  app.bindYear(2023);
  app.FILTER.sector = "AGR";
  const route = globalThis.currentRoute();
  assert.match(route, /^#\/readiness\?/);
  assert.match(route, /year=2023/);
  assert.match(route, /sector=AGR/);

  const parsed = globalThis.parseRoute.call(null);
  app.FILTER.sector = null;
  app.bindYear(app.META.cycle);
  assert.ok(parsed, "a route must be parseable back out");
});

test("charts expose a text alternative", async () => {
  await app.VIEWS.overview();
  await app.MOUNT.overview();
  assert.ok(globalThis.CHART_TABLES.ovTrend, "the trajectory chart has no table alternative");
  const t = globalThis.CHART_TABLES.ovTrend;
  assert.equal(t.rows.length, app.YEARS.length);
  assert.ok(t.caption.length > 10);
});

test("the backend address resolves correctly in every deployment shape", () => {
  // Evaluate the config module alone. Re-evaluating the whole bundle would
  // re-run boot() and leave a rejected promise behind after the test ends.
  const html = read(join(ROOT, "apps/web/index.html"), "utf8");
  const bundle = html.slice(html.lastIndexOf("<script>") + 8, html.lastIndexOf("</script>"));
  const start = bundle.indexOf("/* ===== 01-config.js ===== */");
  const end = bundle.indexOf("/* ===== 02-data-layer.js ===== */");
  assert.ok(start >= 0 && end > start, "module markers missing from the build");
  const code = bundle.slice(start, end);
  const resolve = (hostname, configured) => {
    globalThis.location = { search: "", hash: "", hostname };
    globalThis.window = { addEventListener() {}, scrollTo() {} };
    if (configured !== undefined) globalThis.window.TRACKER_API_BASE = configured;
    (0, eval)(code + ";globalThis.__m = META;");
    return globalThis.__m.apiBase;
  };
  assert.equal(resolve("localhost"), "http://localhost:4010", "local development");
  assert.equal(resolve("rwanda-ai-tracker.vercel.app"), "", "a hosted deployment is same-origin");
  assert.equal(resolve("example.com", ""), "", "an empty string means same origin, not unset");
  assert.equal(resolve("example.com", "https://api.example.com"), "https://api.example.com");
});

test("the CSP hash matches the inline script exactly, as a browser computes it", async () => {
  // A single character of drift here blocks the whole application: a blank page
  // with one console line and no other symptom.
  const { createHash } = await import("node:crypto");
  const html = read(join(ROOT, "apps/web/index.html"), "utf8");
  const declared = html.match(/'(sha256-[^']+)'/)[1];
  const end = html.lastIndexOf("</script>");
  const start = html.lastIndexOf("<script>", end) + "<script>".length;
  const actual = "sha256-" + createHash("sha256").update(html.slice(start, end), "utf8").digest("base64");
  assert.equal(actual, declared, "the declared CSP hash does not match the inline script");
});

test("the page needs no external file to work", () => {
  // The single-file artefact must run when opened from disk, where ./app-config.js
  // and ./vendor/* cannot resolve. Both are loaded at boot and tolerated if absent.
  const html = read(join(ROOT, "apps/web/index.html"), "utf8");
  const staticScripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(staticScripts, [], `page requires external scripts: ${staticScripts.join(", ")}`);
});

test("frame-ancestors is not delivered by meta, where it is ignored", () => {
  const html = read(join(ROOT, "apps/web/index.html"), "utf8");
  const meta = html.match(/Content-Security-Policy"\s+content="([^"]+)"/s)[1];
  assert.ok(!meta.includes("frame-ancestors"),
    "frame-ancestors only works as an HTTP header; in meta it just logs a warning");
});

test("the public header carries no sign-in control", () => {
  // Administration moves to a separate authenticated page. Nothing in the
  // public shell should suggest a login lives here.
  const html = read(join(ROOT, "apps/web/index.html"), "utf8");
  const header = html.slice(html.indexOf("<header"), html.indexOf("</header>"));
  assert.ok(!/sign in/i.test(header), "the header still offers a sign-in");
  assert.ok(!header.includes('data-args="admin"'), "the header still links to the admin view");
});

test("the contribute form is shown behind a coming-soon veil and cannot be submitted", () => {
  app.openContribute();
  const body = document.querySelector("#dbody").innerHTML;
  assert.ok(body.includes("cs-veil"), "the coming-soon veil is missing");
  assert.ok(/coming soon/i.test(body), "the veil does not say what it is");
  assert.ok(body.includes('aria-hidden="true"'), "the inert form must be hidden from assistive technology");
  // Every control disabled, so nothing is focusable inside the veiled form and
  // the dialog's focus trap does not land users in a dead field.
  const controls = body.match(/<(input|select|textarea|button)[^>]*>/g) || [];
  const formControls = controls.filter(c => !c.includes("data-act"));
  assert.ok(formControls.length >= 5, "the form should still be visible, not removed");
  for (const c of formControls) {
    assert.ok(c.includes("disabled"), `control is still interactive: ${c.slice(0, 60)}`);
  }
});

test("the dashboard loads in dark mode by default", () => {
  const html = read(join(ROOT, "apps/web/index.html"), "utf8");
  const root = html.match(/<html[^>]*>/)[0];
  assert.match(root, /data-theme="dark"/, "the document should open dark");
  // The light palette must still be defined — the toggle depends on it.
  assert.ok(html.includes(':root[data-theme="light"]'), "the light theme was removed, not just deprioritised");
  assert.ok(html.includes(':root[data-theme="dark"]'));
});

test("the contribute veil invites participation without overpromising", () => {
  app.openContribute();
  const body = document.querySelector("#dbody").innerHTML;
  assert.match(body, /be part of the project/i);
  assert.match(body, /coming soon/i);
});

test("a static deployment can switch the API off entirely", () => {
  // Without this the dashboard fires one request per load on a host that has no
  // backend, and logs a failure before falling back.
  const html = read(join(ROOT, "apps/web/index.html"), "utf8");
  const bundle = html.slice(html.lastIndexOf("<script>") + 8, html.lastIndexOf("</script>"));
  const start = bundle.indexOf("/* ===== 01-config.js ===== */");
  const end = bundle.indexOf("/* ===== 02-data-layer.js ===== */");
  const code = bundle.slice(start, end);

  globalThis.location = { search: "", hash: "", hostname: "example.pages.dev" };
  globalThis.window = { addEventListener() {}, scrollTo() {}, TRACKER_API_BASE: false };
  (0, eval)(code + ";globalThis.__m = META;");
  assert.equal(globalThis.__m.apiBase, null, "false must disable the API, not fall back to a default");
});
