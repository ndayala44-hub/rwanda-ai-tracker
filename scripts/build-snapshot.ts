/**
 * Bake the versioned datasets into the two artefacts the frontend can load:
 *   1. apps/web/data/bootstrap.json          — what a static deployment serves
 *   2. apps/web/src/00-embedded-dataset.js   — the offline fallback module
 *
 * Run after any data change:  npm run snapshot
 * (npm run build:web runs this first, then assembles index.html.)
 */
import { repoRoot, writeSnapshot, summarise } from "./lib/dataset.js";

const { dataset, kb } = writeSnapshot(repoRoot());

console.log("snapshot written");
console.log(`  ${summarise(dataset)}`);
console.log(`  apps/web/data/bootstrap.json          ${kb} KB`);
console.log(`  apps/web/src/00-embedded-dataset.js   ${kb} KB (offline fallback)`);
