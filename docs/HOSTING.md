# Hosting for public review

Five platforms, all with working configuration already in the repository. Pick one from the table, then
follow its section.

## Which one

| Platform | Backend | Writes | Free tier | Best for |
|---|---|---|---|---|
| **GitHub Pages** | none | no | permanent, unlimited | **Sharing work for review.** Simplest, no account beyond GitHub, never sleeps |
| **Cloudflare Pages** | none | no | generous | The same, but faster worldwide and with a custom domain |
| **Netlify** | none | no | 100 GB/month | The same, with deploy previews on pull requests |
| **Vercel** | serverless FastAPI | **no** — read-only filesystem | generous | A live API and `/docs` without managing a server |
| **Render** | full FastAPI | **yes** | free, sleeps after 15 min idle | A working API with durable writes |
| **Fly.io** | full FastAPI | **yes**, with a volume | small free allowance | Running close to Rwanda, with a writable disk |
| **Hugging Face Spaces** | full FastAPI | yes, with persistent storage | free | Reaching the AI research community directly |

**If you only want people to look at it, use GitHub Pages.** The dashboard was built to work without a
backend: it serves from a published snapshot and says so in the status bar. You lose live writes and
`/docs`, nothing else.

**If you want the live API, use Render.** It runs an ordinary process with a writable disk, so
`POST /api/observations` actually persists — which serverless hosts cannot do.

---

## Before any deployment

```bash
npm install
npm run check                 # validate data → rebuild → run every test
npm run vendor:echarts        # optional but recommended: self-host the charts
npm run build:web
npm run serve:static          # http://localhost:8000 — exactly what a static host serves
```

`serve:static` matters. Opening `index.html` from disk uses the `file://` origin, which behaves
differently from HTTP. This is the closest local approximation of what a visitor will see.

Then put the project on GitHub — every platform below deploys from a repository:

```bash
git init && git add -A && git commit -m "Rwanda AI Tracker"
git branch -M main
git remote add origin https://github.com/<you>/rwanda-ai-tracker.git
git push -u origin main
```

---

## 1. GitHub Pages — simplest

`.github/workflows/pages.yml` is already in the repository. It validates the datasets, builds the
dashboard, configures it for static hosting and publishes.

1. Push to `main`.
2. On GitHub: **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. Go to **Actions** and watch the `pages` workflow. It takes about a minute.
4. Your URL appears in the workflow summary:
   `https://<you>.github.io/rwanda-ai-tracker/`

Updating data is a push:

```bash
$EDITOR data/observations.json
npm run validate && npm run build:web
git commit -am "update RWA10 for 2026" && git push
```

The workflow **fails the deployment if the dataset does not validate**, so a broken figure never reaches
the public URL.

**Custom domain:** Settings → Pages → Custom domain, then a CNAME record at your DNS provider.

---

## 2. Cloudflare Pages — fastest

1. **dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git**, choose the repository.
2. Build settings:

   | Field | Value |
   |---|---|
   | Framework preset | **None** |
   | Build command | `npm run build:web && cp deploy/app-config.static.js apps/web/app-config.js` |
   | Build output directory | `apps/web` |

3. **Environment variables → Add**: `NODE_VERSION` = `20`.
4. **Save and Deploy.**

You get `https://<project>.pages.dev`. Every push redeploys; pull requests get their own preview URL.

---

## 3. Netlify

`netlify.toml` already carries the build command, publish directory and security headers.

1. **app.netlify.com → Add new site → Import an existing project**, choose the repository.
2. Leave every setting alone — `netlify.toml` supplies them.
3. **Deploy.**

---

## 4. Vercel — live API, read-only

See **[VERCEL.md](VERCEL.md)** for the full walkthrough.

```bash
npm i -g vercel && vercel login
vercel --prod
```

The one constraint: Vercel's filesystem is read-only, so writes are disabled and `api/index.py` forces
read-only mode. Contributions go through the repository.

---

## 5. Render — live API with durable writes

`render.yaml` is a blueprint; Render reads it and configures everything.

1. **dashboard.render.com → New → Blueprint**.
2. Connect the repository. Render finds `render.yaml` and shows one web service.
3. **Apply.** The first build takes three to five minutes — it installs Python and Node, then builds
   the dashboard.
4. Your URL: `https://rwanda-ai-tracker.onrender.com`

FastAPI serves both the API and the dashboard, so the status bar reads **`Backend FastAPI · live`** with no
configuration.

**To enable writes:** Settings → Environment → add `ADMIN_API_TOKEN` with a value from
`openssl rand -hex 32`. Then:

```bash
curl -X POST https://<your-app>.onrender.com/api/observations \
  -H "authorization: Bearer $ADMIN_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{"indicator":"RWA10","year":2026,"value":14,
       "sourceId":"RISA","verification":"verified","origin":"source-reported"}'
```

**Free tier caveat:** the service sleeps after fifteen minutes of inactivity, so the first visit after a
quiet period waits about thirty seconds. Fine for review, not for a launch. Also note that a free instance
has an ephemeral disk — writes survive until the next deploy, then the repository copy wins. Add a paid
disk if writes must be permanent.

---

## 6. Fly.io — close to Rwanda, writable volume

`fly.toml` targets Johannesburg, the nearest region to Kigali.

```bash
curl -L https://fly.io/install.sh | sh          # or: brew install flyctl
fly auth signup                                 # or: fly auth login

fly launch --no-deploy                          # keeps the committed fly.toml
fly volumes create tracker_data --size 1 --region jnb
fly deploy
fly open
```

The volume makes writes durable across restarts and deploys. To enable them:

```bash
fly secrets set ADMIN_API_TOKEN=$(openssl rand -hex 32)
```

`auto_stop_machines` is on, so the instance suspends when idle and wakes on the next request — a second or
two, rather than Render's thirty.

---

## 7. Hugging Face Spaces — reaching the AI community

A good fit if the audience is researchers and AI policy people rather than general web visitors.

1. **huggingface.co → New → Space.** Name it, choose **Docker** as the SDK, visibility **Public**.
2. Clone the Space and copy the project in:

   ```bash
   git clone https://huggingface.co/spaces/<you>/rwanda-ai-tracker hf-space
   cp -r rwanda-ai-tracker/* hf-space/
   cd hf-space
   cp deploy/huggingface/Dockerfile ./Dockerfile      # port 7860, non-root user
   cp deploy/huggingface/README.md ./README.md        # Space front matter
   git add -A && git commit -m "Rwanda AI Tracker" && git push
   ```

3. The Space builds and starts automatically. Watch **Logs** if it does not.

The front matter in `deploy/huggingface/README.md` configures the title, colours and port — do not remove
it, Hugging Face parses it.

---

## After deploying, check three things

1. **The dashboard loads** and the six dimension cards show scores.
2. **The status bar tells the truth.** `Backend FastAPI · live` means the API is serving. `snapshot` means
   static hosting, which is correct for options 1–3. `offline` on a hosted deployment means something is
   wrong.
3. **The data claim is visible.** Open **About / Methodology** and confirm the provenance card renders. On
   a public URL that candour is the point — about a third of observations are source-reported and the rest
   are labelled demo.

## Before sharing the link publicly

- Vendor the charting library (`npm run vendor:echarts`) so charts do not depend on a CDN.
- Keep the *not a government publication* line in the footer.
- Decide whether writes should be enabled at all. **Read-only is the default and the right choice for a
  public review deployment** — contributions can come through the repository, where they are reviewable.
- If you use a custom domain, nothing in the application changes: it follows whatever host serves it.

## Troubleshooting

| Symptom | Cause |
|---|---|
| Blank page | The inline script was blocked by the CSP. Rebuild with `npm run build:web`, which verifies the hash against the file it writes |
| Status bar reads `offline` on a hosted deployment | Neither the API nor `./data/bootstrap.json` resolved. Confirm `apps/web/data/bootstrap.json` was published |
| Charts missing, tables shown instead | The charting library is not vendored and the CDN is unreachable. Run `npm run vendor:echarts` and redeploy |
| Build fails on `tsx: not found` | The platform skipped devDependencies. Set `NPM_CONFIG_PRODUCTION=false` |
| Render or Fly returns 502 on first visit | The instance is waking from idle. Wait and retry |
| A write returns `503` | The filesystem is read-only. Expected on Vercel; on Render add a disk, on Fly add a volume |
