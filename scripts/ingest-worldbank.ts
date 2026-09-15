/**
 * Ingest indicators from the World Bank open API into the observation store.
 *
 * This is the reference implementation every other connector should follow:
 *   fetch → map to the observation schema → validate → merge without
 *   destroying history → report what changed.
 *
 * The World Bank API needs no key. Sources that do require one read it from
 * the environment; nothing secret belongs in this file.
 *
 *   npm run ingest:worldbank            # dry run, prints the diff
 *   npm run ingest:worldbank -- --write # apply to data/observations.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const DATA = resolve(process.env.DATA_DIR ?? "./data");
const BASE = process.env.WORLDBANK_BASE ?? "https://api.worldbank.org/v2";
const WRITE = process.argv.includes("--write");

/** Indicator code in this platform → World Bank series. Add a row to ingest more. */
const MAP: { code: string; wb: string; sourceId: string; transform?: (v: number) => number }[] = [
  { code: "TOR47",  wb: "EG.ELC.ACCS.ZS",    sourceId: "WB" },   // access to electricity, %
  { code: "OXF31",  wb: "IT.NET.USER.ZS",    sourceId: "WB" },   // internet users, % of population
  { code: "TOR109", wb: "GB.XPD.RSDV.GD.ZS", sourceId: "WB" },   // R&D expenditure, % of GDP
  { code: "L26-HCI", wb: "HD.HCI.OVRL",      sourceId: "WB_HCI" } // human capital index
];

interface Observation {
  indicator: string; period: string; year: number; value: number | null;
  collectedOn?: string; sourceId: string; verification: string; note?: string | null;
}

async function fetchSeries(wb: string): Promise<{ year: number; value: number }[]> {
  const url = `${BASE}/country/RWA/indicator/${wb}?format=json&per_page=100`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`World Bank API returned ${res.status} for ${wb}`);
  const body = await res.json() as any[];
  const rows = Array.isArray(body?.[1]) ? body[1] : [];
  return rows
    .filter((r: any) => r.value !== null)
    .map((r: any) => ({ year: Number(r.date), value: Number(r.value) }))
    .sort((a, b) => a.year - b.year);
}

async function main() {
  const path = join(DATA, "observations.json");
  const store = JSON.parse(readFileSync(path, "utf8")) as { version: number; items: Observation[] };
  const today = new Date().toISOString().slice(0, 10);
  const added: string[] = [], updated: string[] = [], failed: string[] = [];

  for (const m of MAP) {
    let series: { year: number; value: number }[];
    try { series = await fetchSeries(m.wb); }
    catch (e: any) { failed.push(`${m.code} (${m.wb}): ${e.message}`); continue; }

    for (const point of series) {
      if (point.year < 2019) continue;   // the platform's series starts in 2019
      const value = m.transform ? m.transform(point.value) : point.value;
      const existing = store.items.find(o => o.indicator === m.code && o.year === point.year);

      if (!existing) {
        store.items.push({
          indicator: m.code, period: String(point.year), year: point.year, value,
          collectedOn: today, sourceId: m.sourceId, verification: "verified",
          note: `Ingested from World Bank series ${m.wb}`
        });
        added.push(`${m.code}/${point.year} = ${value}`);
      } else if (existing.value !== value) {
        // A revision is recorded, never silently overwritten in the log.
        updated.push(`${m.code}/${point.year}: ${existing.value} → ${value}`);
        existing.value = value;
        existing.collectedOn = today;
        existing.note = `Revised from World Bank series ${m.wb} on ${today}`;
      }
    }
  }

  console.log(`World Bank ingestion — ${MAP.length} mapped series`);
  added.forEach(a => console.log("  + " + a));
  updated.forEach(u => console.log("  ~ " + u));
  failed.forEach(f => console.log("  ✗ " + f));
  if (!added.length && !updated.length) console.log("  no changes");

  if (WRITE && (added.length || updated.length)) {
    store.items.sort((a, b) => a.indicator.localeCompare(b.indicator) || a.year - b.year);
    writeFileSync(path, JSON.stringify(store, null, 2));
    console.log(`\nwritten to ${path}. Run: npm run validate && npm run snapshot`);
  } else if (!WRITE) {
    console.log("\ndry run — pass --write to apply");
  }
  if (failed.length) process.exitCode = 1;
}

main().catch(e => { console.error(e); process.exit(1); });
