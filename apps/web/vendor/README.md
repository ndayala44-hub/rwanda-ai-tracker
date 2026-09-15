# Vendored charting library

`echarts.min.js` is intentionally **not committed** — it is a ~1 MB build artefact. Fetch and pin it with:

```bash
npm run vendor:echarts
npm run build:web
```

That downloads Apache ECharts, writes it here, computes a SHA-512 Subresource Integrity hash and inserts
it into `echarts-fallback.js`.

Until then the page falls back to the CDN, and if that is also unreachable the dashboard renders every
chart as its table alternative rather than failing. Nothing breaks; the sovereignty and supply-chain
argument is simply weaker until the library is vendored.
