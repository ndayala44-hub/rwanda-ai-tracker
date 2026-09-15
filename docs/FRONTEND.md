# Frontend

The dashboard is a deliberate no-build single page: no bundler, no transpile step, no dependency tree,
and it opens from disk with no server. Apache ECharts is the only runtime dependency and it loads from a
CDN. That choice is what lets the whole platform be handed to someone as one file.

It should not mean editing a 500 KB generated file by hand, so the source lives in `apps/web/src/` as
ordered modules and `npm run build:web` concatenates them.

## Module order

The numeric prefix **is** the load order.

| Module | Responsibility |
|---|---|
| `shell.html` | Markup, design tokens, the full CSS. Ends with an opening `<script>` tag |
| `00-embedded-dataset.js` | **Generated.** Offline dataset fallback — never edit by hand |
| `01-config.js` | `META`, and how the data layer is resolved (API → snapshot → embedded) |
| `02-data-layer.js` | Live bindings, `applyDataset`, `buildIndicators`, `loadDataset` |
| `03-engine.js` | `normalise` → `aggregate` → coverage → confidence → maturity gates, `bindYear` |
| `04-api-client.js` | The service layer every view calls; proxies to the live API when configured |
| `05-ui-foundation.js` | Formatting, chart helpers, drawers, nav, router, i18n, theme |
| `06-interactions.js` | Year scrubber, cross-filters, command palette, counters, shared chart builders |
| `10-view-overview-journey.js` | Overview, insight engine, Rwanda AI Journey |
| `11-view-readiness-adoption.js` | Readiness & Maturity, AI Adoption |
| `12-view-investment-sectors.js` | Investment & Economic Opportunity, Sectors |
| `13-view-ecosystem-geo-policy-talent.js` | Ecosystem, Geographic Intelligence (`RwandaMap`), Policy, Talent, Research |
| `14-view-explorer-sources.js` | Data Explorer, Sources & Evidence |
| `15-view-about-admin-drawers.js` | About/Methodology, Administration, contribute flow, shared drawers |
| `16-view-global-position.js` | Global Position — continental and global comparison |
| `99-boot.js` | `loadDataset → applyDataset → runEngine → render` |

Everything lives in one global scope, which is why the order matters and why the modules are numbered
rather than named alphabetically.

## Building

```bash
npm run build:web      # snapshot the data, then assemble apps/web/index.html
```

CI fails if the committed `index.html` does not match a fresh build, so the artefact can never drift from
its source.

## Adding a view

1. Create `apps/web/src/17-view-<name>.js`.
2. Define `VIEWS.<key> = async function(){ return vh(...) + cards }` and, if it draws charts,
   `MOUNT.<key> = async function(){ ... }`.
3. Add `["<key>","Nav label"]` to `NAV` in `05-ui-foundation.js`.
4. `npm run build:web && npm run test:web`.

The render test picks the new view up automatically — it iterates `VIEWS` rather than a fixed list.

## Conventions that hold throughout

- **Views resolve data through `api.*`, never from a global directly.** That indirection is what allowed
  the whole data layer to be replaced without touching a view.
- **Every figure carries provenance.** Use `srcLine(sourceId)`, `qbadge(state)` and `unavailable(reason)`
  rather than printing a bare number.
- **A gap is never a zero.** If a value is missing, render `unavailable(...)`.
- **Charts are built with `ec(el, option, height)`**, which applies the theme tokens and registers the
  instance for disposal on navigation. Never call `echarts.init` directly.
- **Colours come from CSS variables** via `cssVar("--token")` or the `PAL` array, so both themes work. Dark is
  the default (`data-theme="dark"` on `<html>`); switching rebuilds the charts, because ECharts reads its
  colours at construction time rather than from live CSS.

## Two features held back deliberately

**Administration.** The public shell carries no sign-in control. `VIEWS.admin` still exists and is reachable
at `#/admin` for development, but it is not linked from anywhere and the role selector inside it is a
preview of the permission model, not a security control — the backend bearer token is the only real
boundary. The next iteration moves this to a separate authenticated page.

**Contributions.** `openContribute()` renders the real form — type, organisation, subject, value, and the
method-and-source field — then holds it behind a glass veil marked *Coming soon*. Showing the form rather
than an empty placeholder tells a prospective contributor exactly what will be asked of them, which is the
part that takes thought. Every control is `disabled` so nothing is focusable inside the veil and the
dialog's focus trap cannot strand a keyboard user in a dead field, and the form carries `aria-hidden`.

To open contributions: remove the `cs-veil` block, drop the `disabled` attributes, restore the submit
button's `data-act="submitContribution"`, and re-register that action in `07-actions.js`. The API method
`api.addContribution` and the review queue behind it are already working and tested.

## Testing

```bash
npm run test:web
```

Loads the built `index.html` exactly as a browser would, boots against the embedded dataset, then renders
every view, mounts every chart and opens every drawer — plus the three behaviours that break silently:
the year scrubber re-scoring the platform, a write recomputing the composites, and a public role being
refused a write.
