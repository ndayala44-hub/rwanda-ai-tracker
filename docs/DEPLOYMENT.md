# Deployment and configuration

## Configuration

All configuration is environment-driven. Copy `.env.example` to `.env`; never commit `.env`.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` / `HOST` | `4010` / `0.0.0.0` | API bind address |
| `NODE_ENV` | `development` | `production` disables the dataset file-watch poll |
| `DATA_DIR` | `./data` | Dataset directory |
| `CORS_ORIGINS` | `http://localhost:4000` | Explicit allow-list. `*` is development only |
| `CACHE_TTL_SECONDS` | `300` | `cache-control` max-age on `/api/bootstrap` |
| `ADMIN_API_TOKEN` | *(unset)* | Bearer token for writes. **Unset means read-only** |
| `TRACKER_API_BASE` | — | Where the dashboard looks for a live API |

Generate a token with `openssl rand -hex 32`. Tokens under 16 characters are rejected, so a placeholder
cannot accidentally enable writes.

## Option 1 — static, no server

```bash
npm run snapshot
# publish apps/web/ to any static host
```

The dashboard runs on `data/bootstrap.json`, falling back to the embedded dataset. No API, no runtime
dependency, no writes. Appropriate for a public deployment where data is updated by redeploying.

## Option 2 — FastAPI backend plus static frontend

```bash
npm install
pip install -r services/api/requirements-dev.txt
npm run build:web
npm run dev            # uvicorn on :4010, dashboard on :4000
# API docs: http://localhost:4010/docs
```

The dashboard defaults to `http://localhost:4010`. Override with `?api=<url>` or by setting
`window.TRACKER_API_BASE` before the page script runs — which is what the nginx config in
`deploy/nginx.conf` does, so the browser talks to `/api/*` on the same origin and CORS never arises.

Confirm it is actually live rather than falling back:

```bash
npm run test:live      # asserts dataOrigin == "api"
curl localhost:4010/api/provenance
```

## Option 3 — Docker

```bash
docker compose up --build
# dashboard http://localhost:4000 · API http://localhost:4010/api/bootstrap
```

The dataset is mounted **read-only** into the container: the service serves the data, it does not own it.
Updating data means editing `data/`, running `npm run snapshot` and restarting the web container — no image
rebuild.

## API surface

Interactive documentation is generated from the Pydantic models at `/docs`, with the raw schema at
`/openapi.json`.

| Endpoint | Purpose |
|---|---|
| `GET /health` | Liveness, load time, whether writes are enabled |
| `GET /api/provenance` | How much of the published data is source-reported versus demo |
| `GET /api/meta` | Counts, methodology version, engine version, ETag |
| `GET /api/bootstrap` | Everything the dashboard needs, ETag-cached |
| `GET /api/framework` · `/api/dimensions/:id` · `/api/outputs` | Framework structure and dimension scores |
| `GET /api/indicators` · `/api/indicators/:code` | Register; a single indicator with source, observations and scored history |
| `GET /api/observations?indicator=` | Raw observation store |
| `GET /api/scores?year=` · `/api/readiness` · `/api/maturity` · `/api/trends` | Computed scores |
| `GET /api/analytics/sensitivity?index=` | Index points gained per indicator moved to target |
| `GET /api/sources` · `/organisations` · `/sectors` · `/geography` · `/use-cases` · `/policies` · `/journey` · `/glossary` | Reference data |
| `GET /api/economic-sizing` · `/api/landscape/2026` | Intelligence datasets |
| `POST /api/observations` | Upsert an observation — **bearer token required** |
| `POST /api/reload` · `GET /api/audit` | Reload from disk; audit trail — **bearer token required** |

`/api/bootstrap` honours `If-None-Match` and returns 304, so a returning visitor transfers nothing when
the dataset has not changed.

## Security

- Writes fail closed: no token configured means no writes, whatever is sent.
- Bearer comparison is constant-time; a mismatched length short-circuits before comparison.
- CORS is an allow-list, not a wildcard, outside development.
- Bodies are capped at 2 MB; malformed JSON returns 400.
- `x-content-type-options: nosniff` and `referrer-policy: no-referrer` on every response.
- No secret is read outside `config.ts`, and none is logged or returned.
- Put TLS termination and rate limiting at the reverse proxy; the service assumes it sits behind one.

## When to introduce a database

The current store reads versioned JSON and Git provides history, diffs, review and rollback. Move to
Postgres when any of these becomes true:

- Contributions arrive faster than a human can review them into Git.
- Concurrent writes need row-level locking.
- Observation volume passes roughly 100,000 rows, where full-file rewrites stop being cheap.
- Per-contributor accounts and row-level permissions are required.

`services/api/app/store.py` is the only file that would change. The engine, the routes and the dashboard
would not.

## Operations

- `npm run validate` in CI on every data change — it fails the build on referential errors.
- `npm test` runs 22 tests across the engine and the API.
- The API polls for dataset changes every three seconds outside production; in production use
  `POST /api/reload` or restart after a deploy.
- Health check: `GET /health`, already wired into the compose file.
