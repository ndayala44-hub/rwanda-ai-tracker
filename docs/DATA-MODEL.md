# Data model

Fourteen datasets under `data/`. Each is `{ "version": n, "items": [...] }` unless noted. They are the
source of truth: the API reads them, the snapshot builder bakes them, the validator gates them.

## Why definitions and observations are separate files

`indicators.json` says what a thing *means*. `observations.json` says what it *was* in a given year.
Keeping them apart has three consequences that matter in practice:

- Adding a measurement is a one-line append to `observations.json`. Nothing else moves.
- Changing a definition never rewrites history — the old observations stay attached to the old periods.
- An observation can carry its own source and verification state. The 2020 Human Capital Index value is
  `verified`; the 2026 carry-forward of the same figure is `in_review` with a note explaining why.

## `indicators.json`

| Field | Meaning |
|---|---|
| `code` | Stable identifier, e.g. `L26-USAGE` |
| `name` | Short label shown in the UI |
| `definition` | **Required.** What is counted, over what period, with what boundary conditions |
| `methodology` | How the value is produced, and its known weaknesses |
| `dimension` / `output` | Position in the six-dimension framework |
| `unit` | persons, %, MW, USD m, index, rank … |
| `normalisation` | `goalpost` · `log` · `binary` · `ordinal` · `passthrough` · `rank` |
| `polarity` | `positive` or `negative` (lower is better) |
| `baseline` / `target` | The goalposts. For `passthrough` these are the scale bounds |
| `universe` | Size of the ranked field — required for `rank`, since fields differ (121 vs 172 vs 195) |
| `indexMembership` | `readiness` or `maturity` |
| `capabilityGate` | Maturity level this indicator gates, if any |
| `evidenceType` | `measured` · `administrative` · `third-party` · `estimated` · `modelled` |
| `relevance` / `accessibility` | Expert ratings carried from the 2022 assessment, 1–3. Feed the confidence model |
| `sourceId` | Foreign key into `sources.json` |
| `reportingOrganisation` | Who is accountable for reporting it |
| `geographicScope` / `updateFrequency` | National; annual unless stated |

## `observations.json`

| Field | Meaning |
|---|---|
| `indicator` | FK to `indicators.json` |
| `year` / `period` | Reference period of the measurement |
| `value` | The reported value. `null` is only valid with `verification: not_reported` |
| `sourceId` | Where **this observation** came from — may differ from the indicator's default |
| `verification` | `verified` · `in_review` · `unverified` · `not_reported` |
| `collectedOn` | When it was captured |
| `note` | Why a value was carried forward, revised or flagged |

**`not_reported` is a first-class value.** It records a stated absence: the engine excludes it from
aggregation, coverage falls, and the UI renders "Data unavailable". It is never scored as zero.

## Reference datasets

| File | Contents |
|---|---|
| `sources.json` | 28 sources: name, publisher, year, type, URL, `reliability` (0–1, feeds confidence), caveat note |
| `framework.json` | 6 dimensions, 14 policy outputs, the 5-level maturity ladder with its capability gates, reference targets |
| `organisations.json` | 53 government bodies, regulators, universities, firms, investors and development partners |
| `use-cases.json` | 27 AI deployments with sector, lifecycle stage, district, risk class and source |
| `policies.json` | 18 policy and regulatory instruments — including instruments that are **absent**, which is itself the finding |
| `journey.json` | 20 milestones, each with a source and a verification status |
| `sectors.json` · `geography.json` | Sector taxonomy; 5 provinces and 30 districts with centroids and boundary-file configuration |
| `glossary.json` | Plain-language definitions for non-technical readers |
| `contributions.json` | The public contribution queue |

## Intelligence datasets

These two are shaped by their source rather than by a generic schema, because flattening them would
destroy the argument they carry.

**`economic-sizing-2022.json`** — the 2022 full-potential study: USD 589m headline and method, the
ten-sector split with share-of-sector-GDP, five lighthouse use cases with value ranges and mechanisms,
the five-dimension social impact grading, five enabler initiatives with indicative costs, baseline context
and the study's own five caveats. One field is deliberately negative: `domainSplit.available: false`, with
a note explaining that the 15-domain matrix exists in the source but could not be recovered reliably, so it
is not published.

**`benchmarks.json`** — comparator series for the Global Position view: the Africa AI Governance Index 2026,
the Global AI Readiness Index 2025, the Government AI Readiness Index 2021 with Rwanda's pillar scores and
the surrounding rank band, and measured usage against expected. Each series carries its own comparability
tier, because these indices measure different constructs and must never be blended into one ranking.

**`landscape-2026.json`** — the 2026 review: five findings, the governance/adoption/compute divergence
series, the fourteen-dimension maturity assessment, policy sequencing, the National AI Agency mandate,
comparative index positions, measured adoption with usage composition and distinctive topics, the
nine-initiative national portfolio, health/agriculture/social-protection deep dives, partnership
architecture, the deployment base, the four-layer constraint stack, human capital, the physical ceiling,
governance gaps, the partner proposition, the 2026–2030 agenda and the verdict.

## Referential integrity

`npm run validate` fails the build on any of:

- duplicate indicator codes
- an indicator or observation referencing an unregistered `sourceId`
- an indicator referencing an unknown dimension or output
- `baseline === target`, which would make the score immovable
- `rank` normalisation without a `universe`
- **a missing `definition`** — an indicator nobody can explain does not belong in the platform
- a maturity gate pointing at an indicator that does not exist
- an invalid `verification` value
