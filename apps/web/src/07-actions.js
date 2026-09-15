
/* ===================== DELEGATED ACTION LAYER ==========================
   Every interactive element declares what it does with data-act / data-args
   instead of an inline handler. Three things follow:

     · a strict Content-Security-Policy becomes possible — there is no inline
       script left to allow;
     · anything clickable is automatically keyboard-operable, because one
       handler applies Enter and Space uniformly;
     · interactions are testable by selector rather than by evaluating a string.

   Args are pipe-separated because they are always short identifiers — an
   indicator code, a view key, a dimension id.
   ====================================================================== */
const ACTIONS = {
  /* navigation */
  go:            ([view]) => go(view),
  closeDrawer:   () => closeDrawer(),
  closeAndGo:    ([view]) => { closeDrawer(); go(view); },
  closeAndContribute: ([kind]) => { closeDrawer(); openContribute(kind || undefined); },

  /* drawers */
  indicator:     ([code]) => indDrawer(code),
  dimension:     ([id])   => dimDrawer(id),
  source:        ([id])   => sourceDrawer(id),
  useCase:       ([id])   => ucDrawer(id),
  sector:        ([id])   => sectorDrawer(id),
  organisation:  ([id])   => orgDrawer(id),
  district:      ([code]) => districtDrawer(code),
  policy:        ([i])    => policyDrawer(+i),
  lighthouse:    ([id])   => lighthouseDrawer(id),
  benchmark:     ([id])   => benchDrawer(id),
  insight:       ([n])    => insightDrawer(+n),
  ladder:        () => ladderDrawer(),
  roadmap:       ([domain]) => roadmapDrawer(domain),
  mapCredit:     () => mapCreditDrawer(),
  contribute:    ([kind]) => openContribute(kind || undefined),

  /* state */
  filter:        ([key, value]) => setFilter(key, value),
  clearFilters:  () => clearFilters(),
  resetAll:      () => { clearFilters(); setYear(META.cycle); },
  setYear:       ([y]) => setYear(+y),
  geoLevel:      ([level]) => { GEO_STATE.level = level; go("geo"); },
  exView:        ([view]) => { EX.view = view; go("explorer"); },
  exReset:       () => { EX = { q:"", dim:"", sector:"", source:"", org:"", evidence:"",
                                status:"", origin:"", year: META.cycle, view: EX.view,
                                sort:"code", dir:1 }; go("explorer"); },
  exSort:        ([key]) => exSort(key),
  showDemoValues: () => { go("explorer").then(() => { EX.origin = "demo"; exRefresh(); }); },

  /* form controls — declared the same way as clicks, so one policy covers both */
  exQuery:       (_a, el) => { EX.q = el.value; exRefresh(); },
  exSet:         ([key], el) => { EX[key] = key === "year" ? +el.value : el.value; exRefresh(); },
  yearPreview:   (_a, el) => { const l = document.getElementById("yearLab"); if (l) l.textContent = el.value; },
  setYearFromInput: (_a, el) => setYear(+el.value),
  geoMetric:     (_a, el) => { GEO_STATE.metric = el.value; MOUNT.geo(); },
  geoFile:       (_a, el) => loadGeoFile(el),
  paletteSearch: () => palSearch(),
  paletteKey:    (_a, _el, ev) => palKey(ev),
  evidenceFilter:(_a, el) => filterEv(el.value),

  /* charts and tables */
  chartTable:    ([id]) => toggleChartTable(id),
  togglePeer:    ([iso]) => togglePeer(iso),

  /* admin */
  signIn:        () => signIn(),
  signOut:       () => signOut(),
  applyEdit:     () => doEdit(),
  loadDataset:   () => doLoad(),
  verify:        ([code, state]) => doVerify(code, state),
  loadGeoFile:   () => document.getElementById("geoFile")?.click(),
  exportCSV:     () => exportCSV(),
  exportJSON:    () => exportJSON(),
  openPalette:   () => openPalette(),
  paletteGo:     ([n]) => palGo(+n),
  toggleLang:    () => setLang(LANG === "en" ? "rw" : "en"),
  toggleTheme:   () => toggleTheme(),
  setLang:       ([l]) => setLang(l),
  note:          ([msg]) => toast(msg)
};

function runAction(el, event) {
  const name = el.getAttribute("data-act");
  const fn = ACTIONS[name];
  if (!fn) { console.warn("Unknown action:", name); return; }
  event?.preventDefault();
  event?.stopPropagation();
  const raw = el.getAttribute("data-args");
  fn(raw ? raw.split("|") : [], el, event);
}

// Input, change and keydown are delegated the same way clicks are, so no form
// control needs an inline attribute either.
["input", "change", "keydown"].forEach(type => {
  document.addEventListener(type, e => {
    const el = e.target.closest?.(`[data-act][data-on="${type}"]`);
    if (el) {
      const fn = ACTIONS[el.getAttribute("data-act")];
      if (fn) fn((el.getAttribute("data-args") || "").split("|").filter(Boolean), el, e);
    }
  }, true);
});

document.addEventListener("click", e => {
  const el = e.target.closest?.("[data-act]:not([data-on])");
  if (el) runAction(el, e);
});

// Enter and Space activate anything actionable, so keyboard users reach every
// control without a separate code path.
document.addEventListener("keydown", e => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const el = e.target.closest?.("[data-act]:not([data-on])");
  if (!el || ["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA"].includes(el.tagName)) return;
  runAction(el, e);
});

/* Elements that are not natively focusable still have to be reachable. This
   runs after every render rather than being written into 100+ templates. */
function makeActionablesFocusable(root) {
  (root || document).querySelectorAll("[data-act]:not([data-on])").forEach(el => {
    if (["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA"].includes(el.tagName)) return;
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
    if (!el.hasAttribute("role")) el.setAttribute("role", el.tagName === "TR" ? "row" : "button");
  });
}
