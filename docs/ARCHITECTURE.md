# Architecture

## 1. What was inspected before anything changed

The existing application was a single self-contained HTML file: a custom CSS design system driven by
CSS variables with a light and dark theme, a hash-free view router, fifteen view modules, twelve drawer
modules, Apache ECharts for every visualisation, and a hand-written scoring engine. There was no build
step, no framework, no bundler and no backend. State lived in module-scope constants; an `api` object
already existed as a thin service layer in front of those constants, and every view already resolved its
data through it.

Two properties of that design turned out to matter:

- **The `api` indirection was already there.** Views never touched the data constants directly. That meant
  the data source could be replaced without editing a single view.
- **The scoring engine was already pure.** Given observations and a framework it produced scores with no
  side effects, so it could be lifted into a shared package and reused server-side unchanged.

Both were kept. Neither was rewritten.

## 2. What changed, and what deliberately did not

| Layer | Before | After | Rationale |
|---|---|---|---|
| UI, CSS, router, views, drawers, charts | Single file | **Unchanged** | The brief was to improve the intelligence behind the dashboard, not the dashboard |
| Data | ~1,200 lines of constants in the file | 14 versioned JSON datasets in `data/` | Data becomes editable, reviewable, diffable and ingestible without touching code |
| Indicator records | One object per indicator with an inline series | Definitions and observations stored **separately**, joined at load | A new measurement never touches a definition; a definition change never rewrites history |
| Scoring | In-file functions | Two implementations, held in parity by a test | The browser needs sub-100ms recomputation; the API needs to serve integrators |
| Serving | None | **FastAPI** (`services/api`) | Read-mostly service with ETag caching, OpenAPI docs and token-gated writes |
| Config | Hard-coded | Environment variables, `.env.example` | No secrets in source |
| Tests | Headless render harness | Render harness **plus** 11 engine and 11 API tests | The methodology and the contract are now both pinned |

### Why FastAPI

The backend is Python and the framework is FastAPI. Three reasons, in order of weight:

- **The analytical work belongs in Python.** Scoring, sensitivity analysis, forecasting and the scenario
  modelling on the roadmap are all better served by the Python numerical ecosystem than by a Node service.
- **The schema is the documentation.** Pydantic models generate OpenAPI, so `/docs` is always accurate and
  integrators get a typed contract without a separate spec to maintain.
- **It is small.** `app/main.py` is a thin routing layer over `app/store.py`; the engine, store and
  validation modules import nothing outside the standard library, which is why the methodology can be
  tested without installing anything.

### Two engines, and how the drift is contained

The methodology exists twice: `services/api/app/engine.py` on the server and `apps/web/src/03-engine.js`
in the browser. That is a genuine risk, taken deliberately — the year scrubber, the admin edits and the
offline fallback all need recomputation without a network round trip, and integrators need authoritative
scores without running a browser.

The risk is managed rather than tolerated. `services/api/tests/test_parity.py` asserts that both engines
produce identical composites, coverage, maturity level and all six dimension scores on the committed
dataset, to two decimal places. If either drifts, CI fails. Regenerate the expected values with
`npm run parity:snapshot` — and only after a deliberate methodology change.

### Why no database

The dataset is small, entirely public, versioned in Git, and reviewed by humans before publication. Git is
already doing the job a database would: history, diffs, review, rollback, provenance. A database earns its
place when writes become concurrent and frequent; the store is written so that day is a substitution behind
`store.ts`, not a rewrite. `docs/DEPLOYMENT.md` sets out the trigger conditions.

## 3. Runtime data flow

```
                      ┌──────────────────────────────────────────┐
 data/*.json ────────►│ validate-data.ts   (schema + referential) │
 (source of truth)    └───────────────┬──────────────────────────┘
                                      ▼
                       ┌─────────────────────────────┐
                       │ @tracker/engine             │
                       │  normalise → aggregate →    │
                       │  coverage → confidence →    │
                       │  maturity gates             │
                       └───────┬─────────────┬───────┘
                               ▼             ▼
              ┌────────────────────┐   ┌──────────────────────────┐
              │ services/api       │   │ build-snapshot.ts        │
              │  /api/bootstrap    │   │  bootstrap.json +        │
              │  /api/scores …     │   │  EMBEDDED_DATASET        │
              └─────────┬──────────┘   └───────────┬──────────────┘
                        │                          │
                        └──────────┬───────────────┘
                                   ▼
                        apps/web/index.html
                        loadDataset(): api → snapshot → embedded
                        applyDataset() → runEngine() → render
```

The browser runs the same engine logic as the server. That is intentional: the year scrubber, the scenario
edits in the admin panel and the sensitivity analysis all need sub-100ms recomputation without a round trip,
and the API needs to serve authoritative scores to integrators who are not running a browser. The two are
kept in step by the shared test corpus — both are asserted against the same dataset and the same expected
outputs.

## 4. Frontend internals (unchanged UI, new plumbing)

`apps/web/index.html` is assembled from ordered modules:

| Block | Responsibility |
|---|---|
| `EMBEDDED_DATASET` | Generated offline fallback |
| config | `META`, including how to resolve the data layer |
| data layer | `let` bindings, `applyDataset()`, `buildIndicators()`, `loadDataset()` |
| engine | `normalise`, `confidence`, `aggregate`, `scoreAll`, ladder, `bindYear` |
| api | Service layer the views call; proxies to the live API when one is configured |
| ui foundation | Helpers, formatting, charts, drawers, router |
| interaction layer | Year scrubber, cross-filters, command palette, counters |
| views ×15 | Overview → Administration, untouched |
| boot | `loadDataset → applyDataset → runEngine → render` |

The only structural change in the view layer is that `go()` and the view functions are `async`, and boot
waits for the dataset. Everything else — every card, chart, drawer, filter and animation — is byte-identical
in behaviour.

## 5. How the dashboard gets its data

```
data/*.json ──► app/store.py ──► app/engine.py ──► FastAPI /api/bootstrap
                                                            │  one request on load
                                                            ▼
                                              apps/web loadDataset()
                                              1. the API          → dataOrigin "api"
                                              2. ./data/bootstrap.json → "snapshot"
                                              3. EMBEDDED_DATASET      → "embedded"
```

The fallbacks exist so the platform degrades instead of breaking, but a silent fallback is worse than an
error — a stale view looks exactly like a live one. So the resolved origin is reported in the status bar
on every page, and `scripts/live_api_check.py` asserts in CI that the dashboard actually reaches the
backend rather than quietly serving the embedded copy.

## 6. The map component

`RwandaMap` in the geographic view is an adapter of **knowbee/react-rwanda-map** (MIT, Igwaneza Bruce). The
library's prop contract is preserved — `selectedColor`, `defaultColor`, `strokeColor`, `nameColor`, `height`,
`scale`, `position`, `onSelect` — along with hover tooltips and click-to-select, rendered with this
platform's design tokens instead of the library's Tailwind classes.

Two departures were necessary:

- **District as well as province level.** The library renders Rwanda's five provinces. Every record here is
  held at district level, so the adapter renders all 30 districts and aggregates to provinces on demand.
- **Geometry at runtime rather than bundled.** The library ships its province paths inside the package. This
  platform loads official GeoJSON from a configured path or an uploaded file, because it applies a rule to
  itself: it will not ship approximated borders for a real country. Until a boundary file resolves, the map
  plots clickable district centroids and says why.

## 7. Security posture

- Writes require a bearer token of at least 16 characters, compared in constant time. **Unset means the API
  is read-only**, so a misconfigured deployment fails closed.
- CORS is an explicit allow-list; `*` is development only.
- Request bodies are capped at 2 MB; malformed JSON returns 400 rather than throwing.
- No secret is read anywhere except `config.ts`, and none is logged or returned by any endpoint.
- The dataset volume is mounted read-only in the container: the service serves the data, it does not own it.
- Every write appends to an audit trail recording actor, entity, before and after.
