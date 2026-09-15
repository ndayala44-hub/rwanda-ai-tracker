# Rwanda AI Tracker

An independent, multi-source policy and decision-intelligence platform on Rwanda's AI ecosystem.

The dashboard is unchanged from the version you already know — same navigation, same fourteen sections,
same charts, filters, drawers, year scrubber, command palette and design system. What changed is
everything underneath it: **no figure in the interface is a literal any more.** Every number resolves
through a versioned data layer at runtime, carries its source and verification state, and can be
updated without touching a line of UI code.

```
npm install                 # dashboard build tooling
pip install -r services/api/requirements-dev.txt

npm run check               # validate → rebuild dashboard → run every suite
npm run dev                 # FastAPI on :4010, dashboard on :4000
open http://localhost:4000
```

The dashboard loads its data from the FastAPI backend. It degrades rather than
breaks: if the API is unreachable it falls back to the published snapshot, then
to the dataset embedded in the page — and the status bar always names which one
is in use, so a stale view can never pass itself off as a live one.

| Command | What it does |
|---|---|
| `npm run validate` | Referential integrity of the datasets — fails on a dangling source, a duplicate code or a missing definition |
| `npm run build:web` | Snapshot the data, then assemble `apps/web/index.html` from `apps/web/src/` |
| `npm test` | 36 tests: 12 engine, 4 cross-engine parity, 5 persistence, 15 dashboard, plus the live-backend check |
| `npm run test:api` | 12 FastAPI contract tests (needs `requirements-dev.txt`) |
| `npm run vendor:echarts` | Vendor the charting library locally and pin it with an SRI hash |
| `npm run test:live` | Starts the backend and asserts the dashboard reports `dataOrigin: api` |
| `npm run ingest:worldbank` | Pull mapped World Bank series into the observation store (dry run by default) |
| `npm start` | Build the dashboard and serve it with uvicorn |

Or just open `apps/web/index.html`. With no server reachable it falls back to the dataset embedded in
the file, and says so in the status bar.

---

## What is in here

```
rwanda-ai-tracker/
├── data/                    the source of truth — 14 versioned JSON datasets
├── services/api/            FastAPI backend — data layer, scoring engine, REST
├── apps/web/
│   ├── src/                 the dashboard source — ordered modules, no bundler
│   ├── index.html           built artefact (CI fails if it drifts from src)
│   ├── data/bootstrap.json  published snapshot
│   └── test/                render suite over the built artefact
├── scripts/                 validation, snapshot build, World Bank ingestion
└── docs/                    architecture, data model, methodology, how to add data
```

| Document | What it covers |
|---|---|
| [QUICKSTART.md](QUICKSTART.md) | Run it in three ways, the commands, and what to do when something breaks |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | What was inspected, what was kept, what changed, and why |
| [docs/DATA-MODEL.md](docs/DATA-MODEL.md) | Every dataset, every field, provenance and quality semantics |
| [docs/METHODOLOGY.md](docs/METHODOLOGY.md) | Normalisation, weighting, aggregation, coverage, confidence, maturity gates |
| [docs/ADDING-DATA.md](docs/ADDING-DATA.md) | Adding an indicator, an observation, a source or a connector |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Configuration, Docker, static hosting, security posture |
| [docs/HOSTING.md](docs/HOSTING.md) | **Deploy it publicly** — GitHub Pages, Cloudflare, Netlify, Vercel, Render, Fly.io, Hugging Face |
| [docs/VERCEL.md](docs/VERCEL.md) | The Vercel walkthrough in detail |
| [docs/FRONTEND.md](docs/FRONTEND.md) | Module order, build, adding a view, frontend conventions |

---

## The data flow

```
data/*.json ──► validate ──► @tracker/engine ──► services/api ──┐
   (source of truth)          (scores)          (REST + ETag)   │
                                                                 ▼
scripts/build-snapshot ──► apps/web/data/bootstrap.json ──► dashboard
                       └──► EMBEDDED_DATASET in index.html ──► offline fallback
```

The dashboard resolves its data layer in this order, and reports which one it is using in the status bar:

1. **A live API** — `?api=https://…` or `window.TRACKER_API_BASE`
2. **A published snapshot** — `./data/bootstrap.json`
3. **The embedded dataset** — so a single file still works with no server

Change a value in `data/observations.json`, run `npm run snapshot`, and the platform reflects it —
every score, chart, table, drawer and export. No frontend rebuild, no component edits.

---

## Evidence base

| Source | Contribution |
|---|---|
| **AI Readiness and Maturity Framework for Rwanda, 2022** (MINICT / C4IR / GIZ FAIR Forward) | The six-dimension framework, 14 policy outputs and the original 73-indicator register |
| **Rwanda AI Economic Sizing Report, 2022** (C4IR) | USD 589m full-potential estimate, sector split, five lighthouse use cases, social impact grading, enabler costings |
| **Rwanda AI Landscape Review 2026** (Aurasoft Ltd, independent) | 19 new indicators, the 2026 national portfolio, partnership architecture, the constraint stack, governance gaps, the 2026–2030 agenda |
| **WEF press release, March 2022** | Confirms C4IR Rwanda was set up in 2020 and officially launched 31 March 2022 — Africa's first |
| World Bank · UNESCO · ITU · ODIN · UNCTAD · OECD · Scimago · Speedtest · Anthropic Economic Index | Third-party comparable series, ingested with attribution |

**92 indicators · 610 observations · 29 registered sources · 27 use cases · 53 organisations · 4 comparator indices.**

### How much of this is real

Of the 610 observations, **195 (32%) are reported by a named source** — the 2022 readiness assessment,
the 2022 economic sizing study, the 2026 landscape review, or a published index. The remaining **415 are
demo values**, generated so the platform has a complete eight-year series to be evaluated against.

They are not hidden. Every observation carries `origin: "source-reported" | "demo"`, the Data Explorer has
an origin column and filter, the status bar shows the source-reported share, and the About page states the
split outright. `npm run validate` fails if any observation is missing an origin.

Replacing them is a data exercise, not a code one: drop real observations into `data/observations.json`
with `"origin": "source-reported"`, or POST them to the API.

### Source verification

Every source was checked on 15 September 2026 against its publisher. Two were misattributed and have been
corrected:

| Source | Finding |
|---|---|
| **Africa AI Governance Index** | Confirmed. Published July 2026 by the **Africa AI Policy Lab and Lawyers Hub** — 54 states, 80 indicators, 8 pillars, 0–4 scale. Rwanda 3.25 corroborated across four independent reports. Previously recorded with no named publisher. |
| **Government AI Readiness Index 2025** | Confirmed as an **Oxford Insights** product, 195 governments, 69 indicators. Rwanda rank 75 corroborated. Previously recorded as an unnamed "Global AI Readiness Index". Held separately from the 2021 edition because the methodology changed. |
| **C4IR Rwanda** | Established 2020, officially launched 31 March 2022 — Africa's first. Confirmed against the WEF press release. |
| **Anthropic Economic Index** | A real published country view. Rwanda's figures are as reported in the 2026 landscape review rather than re-fetched. |

Each source now carries a `provenanceClass`, a `verification` state and a dated verification note,
all visible in the Sources & Evidence view.

The 2026 review contributes two kinds of content and the platform keeps them apart deliberately. Where it
reports a **measurement** — usage index, Human Capital Index, installed generation, committed funding — it
becomes an indicator with a source, a period and a confidence weight, and it enters the composites. Where
it offers **judgement** — the fourteen-dimension assessment, the constraint stack, the 2026–2030 agenda —
it is stored as structured contextual intelligence and shown as analyst assessment. It never becomes a
number that feeds a score. That is why the review's national average of 2.4 of 5 sits *beside* the computed
maturity index rather than inside it.

---

## Current state of two features

- **Sign-in is not exposed.** Administration moves to a separate authenticated page in the next iteration.
  `#/admin` still resolves for development; it is not linked and grants nothing the backend does not.
- **Contributions are previewed, not open.** The form renders behind a glass *Coming soon* veil with every
  control disabled, so contributors can see what a submission will require before the review workflow is ready.
- **The dashboard opens in dark mode.** The light palette is fully maintained and one click away.

## Security and accessibility posture

- **Strict Content-Security-Policy.** No inline handlers anywhere; the application script is allow-listed
  by SHA-256 hash computed at build time, so the single-file artefact survives a strict policy.
- **Local-first charting.** `apps/web/vendor/` is authoritative, the CDN is a pinned fallback, and the
  dashboard degrades to table alternatives if neither loads.
- **Keyboard and screen reader.** Landmarks, a skip link, dialog semantics with a focus trap, live status
  regions, table captions and column scope, `prefers-reduced-motion`, and a text alternative for every chart.
- **Deep linking.** View, year, filters and the open indicator all live in the URL.
- **Durable writes.** Atomic write-through plus an append-only revision log; verified to survive a restart.

## Honesty rules the platform enforces in code

- **A gap is never a zero.** An observation flagged `not_reported` is a stated absence: excluded from
  aggregation, counted against coverage, rendered as "Data unavailable".
- **Coverage propagates.** A dimension built from partial outputs inherits that partiality instead of
  resetting to full.
- **Confidence is published beside a score, never folded into it.** They are two different claims.
- **A maturity level is the lower of the score band and the capability gates.** No accumulating easy
  indicators past missing institutions.
- **Historical figures are never merged with current ones.** 2022 economic estimates are tagged and kept
  visually separate from live measurement everywhere they appear.
- **Data quality is published beside every score.** Coverage, confidence, source verification and the share
  of values actually reported by a source — because 60 on 95% coverage of verified sources is a different
  claim from 60 on 55% coverage of estimates.
- **The scoring methodology is ours, not Rwanda's.** The 2022 national framework defines indicators but no
  scoring system. Every composite on the platform is labelled as the platform's own computation.

---

*Demo dataset where a real one is not yet published; every such value is labelled. Not a government
publication and not affiliated with any institution.*
