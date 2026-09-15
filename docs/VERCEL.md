# Hosting on Vercel — step by step

Takes about ten minutes. At the end you will have a public URL anyone can open.

Everything Vercel needs is already in the repository: `vercel.json`, `api/index.py`, `requirements.txt`
and `.vercelignore`. You should not need to write any configuration.

---

## Before you start

- **Node 20 or later** — check with `node -v`
- **A Vercel account** — free tier is enough. Sign up at vercel.com
- **A GitHub, GitLab or Bitbucket account** if you want automatic redeploys on push. Optional; the CLI
  path below works without one.

---

## Step 1 — get the project onto your machine

```bash
unzip rwanda-ai-tracker.zip
cd rwanda-ai-tracker
```

## Step 2 — verify it works locally first

Never deploy something you have not seen run.

```bash
npm install
npm run build:web
```

Open `apps/web/index.html` in a browser. You should see the dashboard, and the status bar should say
`Backend offline` — correct, because no API is running yet. If this does not work, deploying will not fix it.

## Step 3 — vendor the charting library (recommended)

```bash
npm run vendor:echarts
npm run build:web
```

This downloads Apache ECharts into `apps/web/vendor/`, pins it with an integrity hash and rebuilds.

Skip it and the page falls back to a public CDN; if that is blocked, every chart renders as a table
instead. Nothing breaks either way, but a self-hosted copy is faster and removes a third-party dependency
from a platform that argues for digital sovereignty.

## Step 4 — deploy

Two paths. **A** is faster to a first URL. **B** gives you automatic redeploys on every push.

### Path A — from your machine, no Git required

```bash
npm i -g vercel
vercel login
vercel                 # preview deployment, asks a few questions
```

Answer the prompts:

| Prompt | Answer |
|---|---|
| Set up and deploy? | **Y** |
| Which scope? | your account |
| Link to existing project? | **N** |
| Project name? | `rwanda-ai-tracker` (or anything) |
| In which directory is your code located? | **`./`** |
| Want to modify the settings? | **N** — `vercel.json` already has them |

You get a preview URL. When it looks right:

```bash
vercel --prod
```

### Path B — via GitHub, with automatic redeploys

```bash
git init
git add -A
git commit -m "Rwanda AI Tracker"
git branch -M main
git remote add origin https://github.com/<you>/rwanda-ai-tracker.git
git push -u origin main
```

Then in Vercel: **Add New → Project → Import** your repository → **Deploy**. Leave every build setting
alone; `vercel.json` supplies them.

From then on, `git push` redeploys. Updating a number becomes:

```bash
$EDITOR data/observations.json
npm run validate && npm run build:web
git commit -am "update RWA10 for 2026" && git push
```

## Step 5 — check the deployment

Open your URL. Three things to confirm, in order:

1. **The dashboard loads** and the six dimension cards show scores.
2. **The status bar reads `Backend FastAPI · live`.** If it says `snapshot`, the Python function did not
   answer — the dashboard is still correct, but it is serving the figures baked in at build time rather
   than from the live store.
3. **The API answers**:

```bash
curl https://<your-deployment>.vercel.app/api/meta
curl https://<your-deployment>.vercel.app/api/provenance
```

Interactive API documentation is at `https://<your-deployment>.vercel.app/docs`.

## Step 6 — add a custom domain (optional)

**Project → Settings → Domains → Add**, then point your DNS at Vercel as instructed.

Nothing in the application changes. The dashboard defaults to the same origin it is served from, so it
follows the domain automatically.

---

## What you should know before making it public

### Writes are disabled, by design

Vercel's filesystem is read-only outside `/tmp`. A durable write is therefore impossible, so
`api/index.py` forces the service into read-only mode and a write attempt returns `503` with an
explanation rather than a false success.

**Contributions go through the repository instead** — which is the governance model the platform already
documents, with Git as the provenance record. If you need live writes, host the API where there is a disk
(Fly.io, Railway, Render, a VM, or the Docker compose file in this repo) and point the dashboard at it by
editing `apps/web/app-config.js`:

```js
window.TRACKER_API_BASE = "https://api.your-domain.rw";
```

### Say plainly what the data is

32% of observations are reported by a named source; the rest are demo values. The About page states this
and the Data Explorer lets anyone filter to `Value origin → Demo`. On a public deployment that candour is
the asset — but do not describe it as official measurement, and keep the "not a government publication"
line in the footer.

### Environment variables

None is required. Set these under **Settings → Environment Variables** only if you need them:

| Variable | When you need it |
|---|---|
| `CORS_ORIGINS` | Only if another website calls your API |
| `DATA_DIR` | Leave unset. Defaults to the bundled `data/` |
| `ADMIN_API_TOKEN` | **Do not set.** Ignored on Vercel; the filesystem is read-only |

### Cost and limits

A deployment of this size sits inside the free tier. Each cold invocation reads about 440 KB of JSON and
scores eight years — a few hundred milliseconds, and the dashboard fetches once on load. If that becomes
noticeable, precompute the scores at build time and serve them as static JSON; the engine already produces
exactly that payload.

---

## Static-only, if you would rather not run the function

The dashboard works without any backend. Delete the `functions` and `rewrites` blocks from `vercel.json`
and deploy. The page serves data from `apps/web/data/bootstrap.json`, which the build regenerates from
`data/`, and the status bar will say `snapshot`.

No cold starts, no runtime cost, no API. Updating data is still a commit and a push.

---

## Troubleshooting

| Symptom | What it means |
|---|---|
| Build fails on `tsx: not found` | Vercel skipped devDependencies. Set `NPM_CONFIG_PRODUCTION=false` in environment variables |
| `FUNCTION_INVOCATION_FAILED` | The bundle is missing files. Confirm `includeFiles` in `vercel.json` reads `{data/**,services/api/app/**}` |
| Every API route returns 404 | The rewrite lost the original path. `api/index.py` normalises this; check the function logs to see the path it received |
| Status bar says `snapshot`, not `live` | The function did not answer. Check **Deployments → your deployment → Functions → Logs** |
| Charts missing, tables shown instead | The charting library is not vendored and the CDN is unreachable. Run step 3 and redeploy |
| Blank page after deploying | The inline script was blocked by the page's own CSP. Rebuild: `npm run build:web` verifies the hash against the file it writes and refuses to ship a mismatch |
| A write returns `503` | Expected on Vercel. Contribute through the repository |
| Python errors mentioning `X | None` | The function is running Python 3.9. Set Python 3.12 under **Settings → General → Node.js/Python Version** |

## Rolling back

**Deployments → the last good one → ⋯ → Promote to Production.** Every deployment is immutable, so a bad
data change is one click to undo.
