/**
 * Vendor the charting library and pin it with a Subresource Integrity hash.
 *
 * The dashboard loads ./vendor/echarts.min.js first and only falls back to the
 * CDN if that fails. Two reasons: a government analytics tool should not stop
 * working because a third party is unreachable, and an unpinned third-party
 * script is an unreviewed code path into a platform that senior officials read.
 *
 *   node scripts/vendor-echarts.mjs
 *
 * Writes apps/web/vendor/echarts.min.js and rewrites the integrity attribute in
 * apps/web/src/shell.html, then rebuild with `npm run build:web`.
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const VERSION = process.env.ECHARTS_VERSION ?? "5.4.3";
const URL_ = `https://cdnjs.cloudflare.com/ajax/libs/echarts/${VERSION}/echarts.min.js`;

const res = await fetch(URL_);
if (!res.ok) throw new Error(`Could not fetch ECharts ${VERSION}: HTTP ${res.status}`);
const body = Buffer.from(await res.arrayBuffer());

mkdirSync(join(ROOT, "apps/web/vendor"), { recursive: true });
writeFileSync(join(ROOT, "apps/web/vendor/echarts.min.js"), body);

const sri = "sha512-" + createHash("sha512").update(body).digest("base64");
const shellPath = join(ROOT, "apps/web/src/shell.html");
const shell = readFileSync(shellPath, "utf8").replace(/integrity="sha512-[^"]*"/, `integrity="${sri}"`);
writeFileSync(shellPath, shell);

console.log(`vendored ECharts ${VERSION}  ${(body.length / 1024).toFixed(0)} KB`);
console.log(`integrity ${sri}`);
console.log("now run: npm run build:web");
