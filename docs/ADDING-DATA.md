# Adding and updating data

The whole point of the data layer: **none of this requires a frontend change.**

## Update a value

Edit `data/observations.json`:

```json
{
  "indicator": "RWA10",
  "period": "2026",
  "year": 2026,
  "value": 14,
  "collectedOn": "2026-10-02",
  "sourceId": "RISA",
  "verification": "verified",
  "note": "Quarterly return from the use-case registry"
}
```

```bash
npm run validate && npm run snapshot
```

Every score, chart, table, drawer and export updates. If the API is running it reloads automatically
within three seconds.

## Record that something was not measured

Do **not** delete the row and do not write a zero:

```json
{ "indicator": "RWA5", "period": "2026", "year": 2026, "value": null,
  "sourceId": "CONTRIB", "verification": "not_reported",
  "note": "Cloud cost basket not priced this cycle — no authorised vendor return" }
```

The indicator is excluded from aggregation, coverage falls, and the UI shows "Data unavailable".

## Add an indicator

1. Register the source in `data/sources.json` if it is new — `reliability` feeds the confidence model.
2. Add the definition to `data/indicators.json`. `definition` is mandatory; the validator rejects
   indicators nobody can explain. Choose `normalisation` deliberately (see `docs/METHODOLOGY.md`), and set
   `universe` if it is a rank.
3. Add at least one observation.
4. `npm run validate && npm run snapshot`.

The indicator appears in the Data Explorer, the dimension it belongs to, the relevant sector and talent
views, the command palette, the exports and the composites — with no code change.

## Add a use case, organisation, policy or milestone

Append to `data/use-cases.json`, `organisations.json`, `policies.json` or `journey.json`. Use-case records
are the measurement instrument behind six indicators (RWA10, RWA10-SUBd, RWA11-SUBe, RWA11-SUBa,
RWA12-SUBa, RWA12-SUBf-C), so adding one changes those counts.

A policy instrument that **does not exist** is still a record — with `status: "Not in place"`. The absence
of an AI law and a model ownership term are among the most important findings the platform carries.

## Write a connector

`scripts/ingest-worldbank.ts` is the reference implementation. The pattern is:

```
fetch → map to the observation schema → merge without destroying history → report the diff
```

```bash
npm run ingest:worldbank            # dry run, prints what would change
npm run ingest:worldbank -- --write # apply, then validate and snapshot
```

Rules for any connector:

- **Never overwrite silently.** A changed value is a revision: update it, note it, and print it.
- **Attribute every row.** `sourceId` is mandatory and must already be registered.
- **Set verification honestly.** An automated pull from an official series is `verified`; a scraped or
  derived value is not.
- **Keys come from the environment.** The World Bank API needs none; anything that does reads from `.env`.

To ingest a new series, add a row to the `MAP` array. No other change is needed.

## Write through the API

With `ADMIN_API_TOKEN` set:

```bash
curl -X POST http://localhost:4010/api/observations \
  -H "authorization: Bearer $ADMIN_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{"indicator":"RWA10","period":"2026","year":2026,"value":14,
       "sourceId":"RISA","verification":"verified"}'
```

Validation runs first and rejects with a message that says how to fix it — a binary indicator given `7`
is told it must be `0` or `1`. Accepted writes recompute the scores in memory and append to the audit
trail. **They do not persist**: the file remains the source of truth, so an accepted write should be
committed to `data/observations.json`. That is deliberate — it keeps Git as the provenance record.

## Ingesting RAIA's national record

The record at `ai.gov.rw/record` renders its 34 entries client-side, so they cannot be fetched from the page
source. The connector takes an export instead:

```bash
npm run ingest:raia -- record.json          # dry run, prints the reconciliation
npm run ingest:raia -- record.json --write  # add the entries RAIA lists and we do not
```

It accepts JSON or CSV with any subset of `name, sector, stage, institution, description, date, status`,
maps RAIA's sector and stage labels onto ours, and reports three columns: probable matches, entries only in
RAIA's record, and entries only on this platform. **Matches are proposed, never applied** — two registers
naming the same deployment differently is a judgement for a person, not a string comparison.

Three ways to obtain the export, easiest first:

1. Open the record in a desktop browser, DevTools → Network → reload, and save the response carrying the
   entries.
2. Ask RAIA for a machine-readable copy. A register that describes itself as verified is a reasonable thing
   to ask this of, and it is the only route that stays current.
3. Copy the visible entries into a CSV.

## Adding a comparator country or index

Append to `data/benchmarks.json`. A series needs an `id`, a `name`, an `edition`, a `scale`, a `sourceId`,
a `tier` and its `values`. Set `"invert": true` where a lower number is better, as with a rank.

Tier discipline is enforced by design, not by convention:

- **Tier A** — the same variable from the same publisher computed identically for every country. Safe to rank.
- **Tier B** — a published index. Comparable within an edition, never across editions, because country sets
  and methodology change.
- **Tier C** — Rwanda-specific, with no peer equivalent. Trend only; the interface will not place it in a
  cross-country chart.

## Adding a language

`I18N` in the web app holds the Kinyarwanda navigation dictionary and reports its own coverage percentage
when switched. Extend the dictionary; nothing else changes.

## Loading official district boundaries

The geographic view requests `./data/rw-districts.geojson`, then `/api/geography/districts.geojson`, and
offers a file upload. Drop an official NISR or RCMRD level-2 GeoJSON at the first path and the choropleth
renders, joined on district name. Until then the map plots centroids and says why — it will not draw an
approximated national border.
