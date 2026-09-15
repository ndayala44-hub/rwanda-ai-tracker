/**
 * Minimal DOM and ECharts stubs.
 *
 * The dashboard is deliberately framework-free, so it can be exercised in Node
 * with a stub this small. Every view, chart mount and drawer is executed for
 * real — only the rendering surface is faked, which is enough to catch the
 * failure that actually happens in practice: a template or reference error in
 * a view that nobody clicked before shipping.
 */
export function installStubs(global) {
  // A stub element that tolerates the full set of DOM calls the dashboard
  // makes. Anything missing here surfaces as a confusing "not a function"
  // deep inside a view, so the surface is kept deliberately complete.
  const el = () => {
    const attrs = { "data-dim": "D1", "data-chart": "dimTrend", "data-code": "RWA10" };
    return {
      innerHTML: "", textContent: "", style: {}, value: "", files: [], children: [],
      dataset: {}, scrollTop: 0, scrollHeight: 0, offsetParent: null, tagName: "DIV",
      parentNode: { insertBefore() {} },
      classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
      querySelectorAll: () => [], querySelector: () => null, closest: () => null,
      insertAdjacentHTML() {}, removeChild() {}, appendChild() {}, remove() {},
      addEventListener() {}, removeEventListener() {},
      getAttribute: (k) => attrs[k] ?? "D1",
      setAttribute(k, v) { attrs[k] = v; }, hasAttribute: (k) => k in attrs,
      removeAttribute(k) { delete attrs[k]; },
      focus() {}, blur() {}, click() {}, scrollIntoView() {},
      getBoundingClientRect: () => ({ top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 })
    };
  };

  // Scripts appended at boot (the deployment config and the charting library)
  // are optional, so the stub reports failure immediately and the dashboard
  // proceeds without them — which is the path a file:// visitor takes.
  const scriptEl = () => {
    const node = el();
    Object.defineProperty(node, "src", {
      set(value) { node._src = value; queueMicrotask(() => node.onerror?.(new Error("offline"))); },
      get() { return node._src; }
    });
    return node;
  };

  const chart = {
    setOption() {}, resize() {}, dispose() {},
    getDom: () => ({ id: "stub" }),
    on() { return chart; }
  };

  global.requestAnimationFrame = (f) => f();
  // Collapse timer delays to zero so deferred UI work runs promptly, but keep
  // real asynchronous semantics. A synchronous setTimeout looks harmless and
  // sends fetch's internals into unbounded recursion, which silently forces the
  // dashboard onto its offline fallback.
  const realSetTimeout = global.setTimeout;
  global.setTimeout = (fn, _ms, ...args) => realSetTimeout(fn, 0, ...args);
  global.setInterval = () => 0;
  global.clearInterval = () => {};
  global.alert = () => {};
  global.performance = global.performance ?? { now: () => 0 };
  global.fetch = () => Promise.reject(new Error("offline — exercising the embedded fallback"));
  // A couple of well-known nodes persist, so a test can read back what the
  // application rendered into them.
  const named = {};
  global.document = {
    querySelector: (sel) => (named[sel] ??= el()),
    querySelectorAll: () => [],
    getElementById: (id) => (named["#" + id] ??= el()),
    addEventListener() {}, createElement: () => scriptEl(), body: el(), head: el(),
    activeElement: el(),
    // Mirrors the shipped default so a theme regression is visible in test.
    documentElement: (() => {
      const root = el();
      root.setAttribute("data-theme", "dark");
      return root;
    })()
  };
  global.getComputedStyle = () => ({ getPropertyValue: () => "#000000" });
  global.window = { addEventListener() {}, scrollTo() {} };
  global.echarts = { init: () => chart, registerMap() {} };
  // Augment the real URL and Blob rather than replacing them. Replacing URL
  // breaks fetch (undici parses request URLs with `new URL`), which silently
  // pushes the dashboard onto its offline fallback and makes a live-API test
  // pass for the wrong reason. Node's native Blob satisfies createObjectURL,
  // so exports exercise the real code path.
  global.URL.createObjectURL ??= () => "blob:";
  global.URL.revokeObjectURL ??= () => {};
  global.FileReader = function () { this.readAsText = () => {}; };
  // `location` and `navigator` are getter-only on modern Node globals, so they
  // are defined rather than assigned.
  for (const [name, value] of [["location", { search: "", hash: "" }],
                               ["navigator", { userAgent: "node" }]]) {
    if (!(name in global)) global[name] = value;
  }
  // History is what the router writes the view, year and filters into; without
  // it the deep-linking path is untested.
  global.history = {
    state: null,
    pushState(state, _title, url) { this.state = state; global.location.hash = url; },
    replaceState(state, _title, url) { this.state = state; global.location.hash = url; }
  };
}
