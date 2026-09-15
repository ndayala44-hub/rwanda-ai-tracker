# Quickstart

Three ways to run this, in increasing order of completeness.

## 1. Look at it now — no install

Open `apps/web/index.html` in a browser.

No server, no build, no dependencies. The page falls back to the dataset embedded inside it and says so in
the status bar (`Backend offline`). Everything works: all sixteen views, the charts, the year scrubber, the
command palette, exports.

## 2. Run it properly — dashboard served by the FastAPI backend

```bash
# prerequisites: Node 20+ and Python 3.12+
npm install
pip install -r services/api/requirements-dev.txt

npm run check          # validate data → rebuild dashboard → run every test
npm run dev            # FastAPI on :4010, dashboard on :4000
```

Then open **http://localhost:4000**. The status bar should read `Backend FastAPI · live`.

- API docs: http://localhost:4010/docs
- Bootstrap payload: http://localhost:4010/api/bootstrap
- Provenance: http://localhost:4010/api/provenance

If the status bar says `snapshot` or `offline`, the dashboard could not reach the API. Confirm with
`npm run test:live`, which asserts the live path rather than accepting a silent fallback.

## 3. Deploy it — Docker

```bash
cp .env.example .env            # set ADMIN_API_TOKEN to enable writes; leave unset for read-only
docker compose up --build
```

Dashboard on :4000, API on :4010. nginx proxies `/api` to the backend, so the browser talks to one origin
and CORS never arises. The dataset is mounted read-only — the service serves the data, it does not own it.

---

## 4. Share it publicly

Seven platforms have working configuration in the repository. The short version:

| Want | Use | Command |
|---|---|---|
| Just share it for review | **GitHub Pages** | push to `main`, then Settings → Pages → Source → GitHub Actions |
| A live API with working writes | **Render** | New → Blueprint, pick the repo — `render.yaml` does the rest |
| Reach the AI research community | **Hugging Face Spaces** | copy `deploy/huggingface/*` to a Docker Space |

Full step-by-step for all seven, including Cloudflare, Netlify, Vercel and Fly.io, is in
**[docs/HOSTING.md](docs/HOSTING.md)**.

## 5. Host it — Vercel

```bash
npm i -g vercel
vercel --prod
```

`vercel.json` builds the dashboard and deploys the FastAPI backend as a serverless function. No
configuration is needed — on any host other than localhost the dashboard defaults to the same origin.

One constraint: Vercel's filesystem is read-only, so **writes are disabled** and contributions go through
the repository. See [docs/VERCEL.md](docs/VERCEL.md).

## Commands

| Command | What it does |
|---|---|
| `npm run check` | Validate, rebuild, run everything. Use this before committing |
| `npm run validate` | Referential integrity of the datasets |
| `npm run build:web` | Assemble `apps/web/index.html` from `apps/web/src/` |
| `npm run dev` | Backend and dashboard together |
| `npm test` | 36 tests across the engine, parity, persistence and the dashboard |
| `npm run test:api` | 12 FastAPI contract tests |
| `npm run test:live` | Asserts the dashboard really loads from the backend |
| `npm run vendor:echarts` | Vendor the charting library and pin it with an SRI hash |
| `npm run ingest:worldbank` | Pull mapped World Bank series (dry run by default) |
| `npm run parity:snapshot` | Regenerate the cross-engine parity expectations |

## Change a number, see it everywhere

```bash
# edit any observation
$EDITOR data/observations.json

npm run validate && npm run build:web
```

Every score, chart, table, drawer and export updates. With the API running the change is picked up within
three seconds, no restart needed.

## First things worth looking at

1. **Overview** — the six dimensions, the constraint stack, and what the data is saying.
2. **Global Position** — where two indices disagree about Rwanda and both are right.
3. **About / Methodology** — the data quality table, and how much of the dataset is demo rather than
   source-reported. Read this before citing any figure.
4. **Data Explorer** — filter `Value origin → Demo` to see exactly which numbers are placeholders.

## If something does not work

| Symptom | Cause |
|---|---|
| Blank page, console says an inline script was blocked | The build's CSP hash did not match the script. Rebuild with `npm run build:web` — the build now verifies the hash against the written file and fails rather than shipping a blank page |
| `Loading failed for <script> app-config.js / vendor/echarts.min.js` when opened from disk | Harmless and expected. Both are optional and loaded at boot; the dashboard falls back to its defaults and to the CDN for charts |
| Status bar says `offline` when the API is running | The dashboard defaults to `http://localhost:4010`. Override with `?api=<url>` or edit `apps/web/app-config.js` |
| Charts are missing, tables appear instead | The charting library did not load. Run `npm run vendor:echarts`, or check network access to the CDN |
| `npm run validate` fails | Intended. It reports exactly which record is wrong and why |
| CI fails on "dashboard is stale" | `apps/web/index.html` is out of date. Run `npm run build:web` and commit it |
