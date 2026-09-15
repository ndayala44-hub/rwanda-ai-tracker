# Methodology

**Methodology version v1.3 · engine `tracker-scoring-engine 2.5.0` · weight set `equal-v1`**

## The caveat that governs everything else

The 2022 national framework defines the indicators **but not a scoring system**. There is no published
normalisation rule, no indicator weighting, no aggregation formula, no composite score and no maturity
thresholds in the source document.

Everything below is therefore **this platform's computation**, not an official national figure. It is
documented so it can be argued with, and the underlying observations are exported in full so anyone who
disagrees with the weights can recompute them. Every score in the interface carries its methodology
version, coverage and confidence for the same reason.

## 1. Normalisation

One method per indicator, declared in its record.

| Method | Applied to | Formula |
|---|---|---|
| `goalpost` | Continuous measures with a target | `100 × (clip(x, L, U) − L) / (U − L)` |
| `log` | Skewed counts — commits, citations, trainees, firms | `100 × [ln(1+x) − ln(1+L)] / [ln(1+U) − ln(1+L)]` |
| `binary` | Yes/no instruments | `100` if true, else `0` |
| `ordinal` | Institutional instruments with partial credit | `0` not in place · `50` drafted · `100` in force |
| `passthrough` | External composite indices | Rescaled by the index's own bounds, never recomputed |
| `rank` | Position in a ranked field | `100 × (N − rank + 1) / N`, `N` per indicator |

`L` is the baseline, `U` the 2030 reference target. Inverted goalposts (`U < L`) handle negative polarity —
visa processing time scores higher as it falls. Values beyond a goalpost are clipped, never extrapolated.

**Why log for counts.** GitHub commits rose more than 400 percent in one year. On a linear scale a single
indicator like that saturates and then contributes nothing further; in log space the same growth stays
legible across three orders of magnitude.

**Why `rank` needs a per-indicator universe.** Rank 111 in a field of 121 is near the bottom; rank 111 of 195
is mid-table. Using one fixed universe would have scored those identically.

## 2. Aggregation

```
indicator → policy output → dimension → index
```

Each level is a weighted mean over the children that actually reported, with the weights of the missing
ones renormalised away. Weight set `equal-v1` gives every indicator equal weight within its output and
every output equal weight within its dimension.

**Coverage propagates.** A dimension assembled from partial outputs inherits that partiality rather than
resetting to full. This is the most commonly mis-implemented part of a composite index and the reason the
platform can state coverage honestly at every level.

**Readiness and maturity come from the same register**, split by indicator membership. Dimensions are
weighted into each composite by how many member indicators they contribute, so a dimension with two
maturity indicators does not carry the same weight as one with eleven.

A **geometric** composite is published beside the arithmetic one. The gap between them is the balance
indicator: a wide gap means progress is lopsided rather than broad.

## 3. Missing data

Nothing is imputed into a published figure.

```
observation present            → scored
observation flagged not_reported → excluded, coverage falls, rendered "Data unavailable"
no observation for the year      → excluded, coverage falls
```

Publication gates: coverage ≥ 0.75 published · 0.50–0.75 provisional · below 0.50 not published.

An indicator introduced in 2026 has no 2019 observation, and that is correct — it lowers 2019 coverage
rather than pretending the measurement existed.

## 4. Confidence

```
confidence = 0.30·source reliability + 0.20·accessibility + 0.25·recency + 0.25·verification
recency    = exp(−0.35 × cycles since the observation)
```

Accessibility reuses the 1–3 expert ratings from the 2022 assessment. Verification maps
`verified 0.9 · in_review 0.6 · unverified 0.4 · not_reported 0.2`.

**Confidence is published beside a score and never used to adjust it.** "This is the value" and "this is how
much we trust it" are two different claims, and collapsing them into one number makes both unreadable.

## 5. Maturity level

```
assigned = min(score band, capability gate)
```

| Level | Band | Capability gates |
|---|---|---|
| L1 Exploring | 0–20 | — |
| L2 Emerging | 20–40 | National AI policy in force · dedicated AI body · data protection regulation in force |
| L3 Operational | 40–60 | Ethics framework published · dedicated public AI budget line · ≥10 AI solutions in public value chains |
| L4 Integrated | 60–80 | Sector AI deployment plans implemented · regulatory sandbox operating |
| L5 Leading | 80–100 | ISO AI committee participation · Open Data Charter signatory · top-3 African index position |

A country should not reach a higher level by accumulating easy indicators while foundational institutions
are missing. When a gate binds, the platform names the specific indicator responsible — which is how the
dashboard can state that Rwanda is held at L2 by two administrative decisions rather than by its score.

## 6. What is deliberately kept out of the composites

**Qualitative assessment is never converted into a score.** The 2026 landscape review's fourteen-dimension
maturity assessment (national average 2.4 of 5) is expert judgement. It is stored as structured contextual
intelligence and displayed beside the computed indices, never inside them.

**Historical estimates are never merged with current measurement.** The 2022 economic sizing figures are
tagged as 2022 full-potential estimates and are visually separated everywhere they appear. They are never
combined with live measurement into a single number.

## 7. Reproducibility

`scoreYear(input, year)` is pure: the same dataset and the same methodology version always produce the same
output. The test suite asserts this directly, and asserts the properties above — that a missing child lowers
coverage rather than scoring zero, that coverage propagates, that the assigned level is the minimum of band
and gate, and that every indicator resolves to a registered source.

## 8. Changing the methodology

Bump `methodologyVersion` in `data/framework.json` and record what changed. Published figures carry the
version that produced them, so a methodology change is visible as a methodology change rather than as
apparent progress.
