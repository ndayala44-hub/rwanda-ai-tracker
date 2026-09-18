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
  get SESSION(){return SESSION}, get FILTER(){return FILTER}, get EX(){return EX}, go, renderEX
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

test("no banner carries the help-badge class", () => {
  // `.info` is a 15px round badge. A banner that also matches it collapses to
  // 15px wide and overlaps the page heading — visible only in a browser, so it
  // is asserted here instead.
  const html = read(join(ROOT, "apps/web/index.html"), "utf8");
  const collisions = html.match(/class="banner[^"]*\binfo\b[^"]*"/g) || [];
  assert.deepEqual(collisions, [], `banner/info class collision: ${collisions.join(", ")}`);
});

test("the methodology version in the data matches what the interface publishes", () => {
  const framework = JSON.parse(read(join(ROOT, "data/framework.json"), "utf8"));
  const html = read(join(ROOT, "apps/web/index.html"), "utf8");
  assert.match(framework.methodologyVersion, /^v\d+\.\d+$/);
  assert.ok(html.includes(`["${framework.methodologyVersion}"`),
    `the About page has no row for ${framework.methodologyVersion}`);
});

test("the RAIA catalogue is ingested and the register correction is recorded", () => {
  const raia = JSON.parse(read(join(ROOT, "data/raia-portfolio.json"), "utf8"));
  assert.equal(raia.pillars.length, 8);
  assert.equal(raia.record.useCases, 34);
  assert.ok(raia.pillars.every(p => p.exists.length && p.needs.length),
    "every pillar must carry both what exists and what is still missing");

  const indicators = JSON.parse(read(join(ROOT, "data/indicators.json"), "utf8")).items;
  const reg = indicators.find(i => i.code === "L26-AIREG");
  assert.equal(reg.normalisation, "ordinal", "the register indicator is no longer a yes/no");
  assert.match(reg.note, /Raised from 0 to 50/);

  // The three corroborated absences must still read zero — an official source
  // confirming a gap must never be mistaken for the gap being filled.
  const obs = JSON.parse(read(join(ROOT, "data/observations.json"), "utf8")).items;
  for (const code of ["L26-AIEVAL", "L26-AILAW", "L26-AIPROC"]) {
    const o = obs.find(x => x.indicator === code && x.year === 2026);
    assert.equal(o.value, 0, `${code} should still be absent`);
    assert.equal(indicators.find(i => i.code === code).corroboratedBy, "RAIA_CATALOGUE");
  }
});

test("conflicting figures for the same quantity are all retained", () => {
  // 134,000 / 41 / 50 officials trained. Adopting any one of them silently
  // would be the worst available outcome.
  const indicators = JSON.parse(read(join(ROOT, "data/indicators.json"), "utf8")).items;
  const raia = indicators.find(i => i.code === "RAIA-OFFICIALS-AI");
  const legacy = indicators.find(i => i.code === "RWA8");
  assert.ok(raia && legacy, "both indicators must survive");
  assert.match(raia.note, /Held separately from RWA8/);
  assert.notEqual(raia.definition, legacy.definition);
});

test("the national record is ingested with its provenance intact", () => {
  const rec = JSON.parse(read(join(ROOT, "data/raia-record.json"), "utf8"));
  assert.equal(rec.useCases.length, 34);
  assert.equal(rec.enablers.length, 10);
  assert.ok(rec.provenanceNote.includes("Transcribed"),
    "a transcription must say so — it is not a machine-readable export");
  assert.ok(rec.useCases.every(u => u.name && u.owner && u.raiaStage && u.sector && u.stage),
    "every entry needs both RAIA's taxonomy and the mapped one");

  const uc = JSON.parse(read(join(ROOT, "data/use-cases.json"), "utf8")).items;
  assert.equal(uc.filter(u => u.onNationalRecord).length, 34,
    "all 34 record entries should be flagged, including the three merged duplicates");
  assert.ok(uc.some(u => u.onNationalRecord === false),
    "entries held only by this platform must stay distinguishable");
});

test("the headline count is not mistaken for the indicator it does not define", () => {
  // RWA10 counts public-sector solutions in production. RAIA's 34 covers all
  // sectors and all stages, so adopting it wholesale would inflate the score.
  const obs = JSON.parse(read(join(ROOT, "data/observations.json"), "utf8")).items;
  const o = obs.find(x => x.indicator === "RWA10" && x.year === 2026);
  assert.ok(o.value < 34, `RWA10 should be a subset of the record's 34, got ${o.value}`);
  assert.match(o.note, /not the figure this indicator defines/);
});

test("RAIA is presented as a contributing data source, not a rival register", () => {
  const sources = JSON.parse(read(join(ROOT, "data/sources.json"), "utf8")).items;
  const raia = sources.find(s => s.id === "RAIA_CATALOGUE");
  assert.match(raia.note, /largest single contributor/);
  assert.match(raia.note, /reconciled against it/);
});

test("the copy carries no em dashes", () => {
  // They render inconsistently across the fonts and platforms this is read on.
  const src = ["11-view-readiness-adoption.js", "13-view-ecosystem-geo-policy-talent.js",
               "15-view-about-admin-drawers.js", "shell.html"]
    .map(f => read(join(ROOT, "apps/web/src", f), "utf8")).join("");
  assert.equal((src.match(/—/g) || []).length, 0);
});

test("the layout collapses to one column on small screens", () => {
  // Views set grid templates inline, so the mobile rules must override them.
  const html = read(join(ROOT, "apps/web/index.html"), "utf8");
  const css = html.slice(html.indexOf("<style>"), html.indexOf("</style>"));
  assert.match(css, /@media\(max-width:900px\)/);
  assert.match(css, /\.row\{grid-template-columns:1fr !important\}/,
    "inline grid templates would otherwise win over the media query");
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /\.drawer\{width:100vw/, "the drawer should be full width on a phone");
  assert.match(css, /\.dt th\.opt,\.dt td\.opt\{display:none\}/,
    "dense tables need a way to drop their least important columns");
});

test("tooltips are reachable without a mouse", () => {
  const html = read(join(ROOT, "apps/web/index.html"), "utf8");
  assert.ok(html.includes('addEventListener("touchstart"'),
    "hover-only tooltips are invisible on a phone, where much of the audience reads this");
});

test("the Data Explorer table is aligned and marks its optional columns", async () => {
  await app.go("explorer");
  const html = document.querySelector("#exBody").innerHTML;
  const headers = (html.match(/<th(?:\s[^>]*)?>/g) || []).length;   // not <thead>
  const firstRow = html.slice(html.indexOf("<tbody>"), html.indexOf("</tr>", html.indexOf("<tbody>")));
  const cells = (firstRow.match(/<td[^>]*>/g) || []).length;
  assert.equal(cells, headers,
    `header/body mismatch: ${headers} headers against ${cells} cells shifts every column`);
  assert.ok((html.match(/class="[^"]*\bopt\b/g) || []).length >= 8,
    "the wide table needs columns it can drop on a phone");
});

test("empty values render as a placeholder, not stray punctuation", async () => {
  // The em dash was doing double duty as prose punctuation and as the "no value"
  // marker. A blanket replacement turned every empty cell into ", ".
  const html = await app.VIEWS.readiness();
  assert.ok(!/>,\s*</.test(html), "an empty cell is rendering as a comma");
  assert.ok(!/\b,\s*<\/b>/.test(html), "an empty figure is rendering as a comma");
});
