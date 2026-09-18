# ai.gov.rw — findings and dashboard update plan

> **Status: implemented, 17 September 2026.** Sections 1–7 are built and shipped. The one item still open is
> **Update, 17 September 2026:** the record's entries were transcribed from the published pages and the
> reconciliation is done. Of 34 entries on the national record and 24 held independently here, **only three
> describe the same deployment** — Zipline's drone delivery, Viebeg's stock optimisation and the Tunga
> advisory — and even those carry different names in each register. Both sets are now merged, with every
> entry flagged for whether it appears on the national record.


**Reviewed:** 17 September 2026. Home, The Record, Enablement hub, all eight pillar pages, Partners.
**Site:** *Rwanda Digital AI Catalogue*, coordinated by the **Rwanda Artificial Intelligence Agency (RAIA)**.
Last modified dates on the pages run 12–16 September 2026, so this is days old.

---

## 1. What the site actually is

It is **not** a statistics portal or a monitoring dashboard. It is an **investment catalogue** with three
jobs: convince capital that Rwanda is AI-ready, show where that capital fits, and capture leads through
`/express-interest/`. Reading it as a data source without that framing would be a mistake, and it changes
how each figure on it should be treated.

Its structure is consistent and, for our purposes, unusually useful:

| Section | What it contains | Why it matters to us |
|---|---|---|
| **Home** | Positioning, six advantages, four investor archetypes, five participation models, headline stats | National targets and self-reported figures |
| **The Record** | 34 verified use cases, 43 institutions, 10 enablers, filterable by sector and stage | **A government AI inventory — which our platform says does not exist** |
| **Enablement** | 8 pillars × a fixed 7-part template | Each pillar separates *What Exists Today* from *What Needs To Be Built* |
| **Partners** | ~32 named organisations across 9 activity areas | Ecosystem register we can reconcile against |

**The template is the gift.** Every pillar page carries the same seven sections, and sections 03 and 04 are
literally *What Exists Today* and *What Needs To Be Built*. That is the government stating, on the record,
what it has and what it lacks. It maps directly onto the distinction our platform already enforces between
a measurement and a gap.

---

## 2. The finding that requires a correction, not an addition

Our dataset currently asserts two things that this site contradicts.

**`L26-AIREG` — "Public register of state AI systems" — scored 0, "not in place".**
The Record is a public, filterable inventory of 34 AI use cases across 43 institutions, and the page states
each entry is *"reviewed against primary documentation and dated"*.

**`landscape-2026.json` → `nationalPortfolio.caveat`** currently reads: *"Rwanda does not publish a
consolidated AI project inventory, so this portfolio understates total activity by an unknown margin."*
That sentence is now false.

This is the most important outcome of the review, and it should be handled as a visible correction rather
than a quiet edit. But not as a flat 0 → 1 either, because the Record is **not** what that indicator was
defined to measure. A transparency register for automated decision-making would carry, per system: the
deploying authority, the model and version, the legal basis, a risk classification, the human-oversight
arrangement, and a route to redress. The Record carries sector, stage and institution, for an investor
audience.

**Recommendation:** convert `L26-AIREG` from binary to **ordinal**, score it **50 (drafted / partial)**, and
rewrite its definition to distinguish the two things:

```json
{
  "code": "L26-AIREG",
  "name": "Public register of state AI systems",
  "normalisation": "ordinal",
  "definition": "Whether a public register of AI systems used by the state is published, covering the deploying institution, model, legal basis, risk classification, human oversight arrangement and route to redress.",
  "methodology": "Ordinal. 0 none; 50 a public inventory exists but without risk, oversight or redress metadata; 100 a transparency register meeting the full definition.",
  "note": "Raised from 0 to 50 on 17 Sep 2026. RAIA's national record at ai.gov.rw/record publishes 34 verified use cases across 43 institutions, dated and reviewed against primary documentation. It is an investment catalogue rather than an accountability register: it carries sector and stage, not risk classification, oversight arrangements or redress routes."
}
```

That keeps the capability gate unsatisfied — correctly, since oversight metadata is what the gate is about —
while recording real progress. And it preserves the more interesting claim: Rwanda now publishes *what* it
is deploying, but not *how those systems are governed*.

The `nationalPortfolio.caveat` should be rewritten to say the inventory now exists, name it, and note that
our registry and theirs use different inclusion criteria.

---

## 3. The finding that strengthens what we already publish

Three of the five "missing instruments" our platform reports are now **confirmed absent by the government's
own site**, in its own words, on its *What Needs To Be Built* lists.

| Our indicator | Our score | What ai.gov.rw says |
|---|---|---|
| `L26-AIEVAL` National model evaluation capability | 0 | Policy & Responsible AI, *needs to be built*: "Model assurance and AI testing & evaluation capability: tools and institutions that verify AI systems before and during deployment" |
| `L26-AILAW` AI-specific legislation | 0 | Listed under *What Exists Today* is only "Rwanda's data protection and cybersecurity legal framework" — no AI statute |
| `L26-AIPROC` AI procurement standard | 0 | Not present anywhere; the Financing pillar names outcome-based payment machinery as still to be built |

This matters more than it might appear. Our weakest indicators are the ones a sceptical reader is most
likely to dispute, because they are assertions of absence sourced to an independent review. They can now be
corroborated against an official government publication.

**Action:** add `RAIA_CATALOGUE` as a second `sourceId` on the observations for those three indicators, and
quote the *What Needs To Be Built* line in each indicator's note. An absence confirmed by the institution
responsible for filling it is about as strong as evidence of absence gets.

---

## 4. Figures to ingest, with the treatment each needs

The site publishes numbers with a "·" marker that appears to denote a footnote whose source is not rendered
in the page. **None of them should be ingested as a verified measurement.** They are official self-reported
figures with no stated definition, method or reference date. The right verification state is `in_review`,
with `RAIA_CATALOGUE` as the source and a note recording that the underlying basis is not published.

### 4.1 Straightforward updates

| Figure | Our indicator | Treatment |
|---|---|---|
| **98% 4G population coverage** | `RWA5-4G` (currently 95%, 2022) | New 2026 observation, `in_review` |
| **25,000+ km national fibre** | none | New indicator `RAIA-FIBRE`, D2 |
| **Near-universal digital ID** | none | New indicator `RAIA-DIGITALID`, D3 — the identity rail for trusted data services |
| **50,000+ STEM graduates, 2024** | `OXF20`, `TOR36` (per-capita) | New absolute-count indicator; keep the per-capita ones, they are the comparable form |
| **34 verified use cases** | `RWA10` | New observation. Note the definitional difference: ours counts production deployments, theirs counts verified entries at any stage |
| **43 institutions on the record** | `RWA10-SUBd` | New observation |
| **8+ applied AI projects, 10+ funded researchers** | `RWA2-SUBb-FND`, `TOR82` | Corroborates the TAIRI figure already held; add as a second source |

### 4.2 The figure that needs an argument, not an update

**"More than 134,000 government officials trained in AI."**

Our register holds two prior figures for this: `RWA8` at 41 civil servants, and the 2026 review's
"50 civil servants across 24 institutions". The site's number is roughly **2,700 times larger**.

That is not a data refresh. It is a definitional conflict, and resolving it silently in either direction
would be the single worst thing we could do with it. Almost certainly the figures measure different things —
a short awareness or digital-literacy module counted per head, against a structured AI policy or technical
programme. Both may be accurate.

**Recommendation:** create a **separate** indicator rather than overwriting `RWA8`.

```json
{
  "code": "RAIA-OFFICIALS-AI",
  "name": "Government officials reached by AI training",
  "dimension": "D1",
  "definition": "Cumulative government officials recorded as having received AI training of any depth, as reported by RAIA.",
  "methodology": "Self-reported by RAIA in the national AI catalogue. The programme definition, contact hours and deduplication basis are not published.",
  "note": "Held separately from RWA8 (civil servants completing AI policy or regulatory training, 41 in the 2022 assessment) and from the 2026 review's figure of 50 officials across 24 institutions. The three differ by orders of magnitude and almost certainly measure different depths of training. The platform publishes all three rather than choosing between them."
}
```

Then surface the conflict in the Talent view as a card: three sources, three figures, one unresolved
definition. **That is a more useful output than a number.** It is exactly the kind of thing an independent
platform can say and an official catalogue cannot, and it is a concrete, publishable finding.

### 4.3 Targets, which are not observations

Several headline figures are **ambitions**, and the site is honest about labelling them so. They belong in
the targets register, never in an observation.

| Ambition | Where |
|---|---|
| **1 Million Coders** | Skills & Delivery |
| **100+ AI-ready datasets** | Data |
| **24–48+ sovereign GPUs by 2028**, 3× cloud utilisation | Compute |
| **National Data Hub** | Data — explicitly still to be built |
| **Outcome-based fund, USD 3–6m** | Financing |
| **30+ use-case pipeline** | Financing |

`NEW-GPU` currently carries a demo value of 12.7 PFLOP/s against an invented target. It should be redefined
in the unit the state actually plans in — **sovereign GPUs** — with baseline and target taken from the
published ambition, and the current value marked `not_reported` until someone publishes it. An honest
unknown against a real target beats a plausible number against an invented one.

---

## 5. Structural additions

### 5.1 The RAIA pillar crosswalk

The site organises national AI capability into **8 pillars**. Our framework uses **6 dimensions** from the
2022 readiness assessment. Both are legitimate; they answer different questions.

```
RAIA pillar                        Our dimension(s)
01 Governance                  →   D4 Public Sector Adoption, D6 Ethical Guidelines
02 Policy & Responsible AI     →   D6 Ethical Guidelines
03 Compute                     →   D2 Infrastructure & Compute
04 Data                        →   D3 Data Strategy
05 Platforms & Intelligence    →   D2, D4
06 Financing & Partnerships    →   D5 Private Sector Adoption
07 Skills & Delivery           →   D1 Skills & AI Literacy
08 Innovation & Research       →   D1, D5
```

**Do not restructure the framework.** Add a `raiaPillar` field to each indicator and a new
`data/raia-portfolio.json` holding the eight pillars with their ambitions, current state and gaps as the
site states them. Then offer a **toggle on the Readiness view: "view by dimension" / "view by RAIA pillar"**.

The payoff is specific: a government reader arrives with the eight pillars in their head, and can see our
92 indicators arranged the way they already think. It costs one field and one grouping function.

It also produces a finding on its own. Mapping our indicator scores onto their pillars shows which pillars
are **evidenced** and which are **asserted** — pillar 05 Platforms & Intelligence, for instance, has
substantial national ambition behind it and almost nothing in our register that measures it.

### 5.2 The sector AI-readiness ladder

The site repeatedly uses a four-stage sector progression:

> **Data → Consolidation → Intelligence → AI**

with health named as the working proof and agriculture, education and energy & climate as the sectors to
replicate it in. This is a genuinely useful model and we have nothing equivalent — our maturity ladder is
national, not sectoral.

**Recommendation:** add a `sectorStage` field to each sector, populated from the site, and render it on the
Sectors view as a four-step progress strip per sector. It slots into the existing Sectors page without a new
view, and it lets us track something concrete: *which sector moved a stage this year.*

### 5.3 Partners

The Partners page names roughly **32 organisations across 9 activity areas**. Many are already in our
register; a good number are not — Horus Labs, BSC, Liquid Home, Cenfri, Sand Technologies, AIMS, AISCA,
Norrsken, EPFL, GGGI, AIIB, Smart Africa, GPAI, JICA, Mastercard Foundation, Irembo, Oracle, Global Fund.

Add the missing ones with `sourceId: RAIA_CATALOGUE` and an `activityAreas` field carrying their pillar
mapping. The ecosystem view then shows a real distinction: organisations we have registered from research,
versus organisations the state itself names as active partners. Where those two sets differ is informative
in both directions.

### 5.4 National goals and anchoring

Three national goals appear on the home page and should be recorded as framing in
`landscape-2026.json` or a new `national-agenda` block:

1. **AI-enabled Development** — health, education, agriculture and other sectors
2. **AI-enabled Workforce & Society** — skills and education
3. **Competitive AI Industry** — net exporter of AI expertise

Plus the anchoring: AI sits inside **Vision 2050** and **NST2**, and RAIA's mandate now explicitly includes
**AI sovereignty** alongside deployment, research and talent, governance, industry development and
international engagement. Our `landscape-2026.json` records the mandate without the sovereignty limb; that
should be added.

---

## 6. New source record

```json
{
  "id": "RAIA_CATALOGUE",
  "name": "Rwanda Digital AI Catalogue",
  "org": "Rwanda Artificial Intelligence Agency (RAIA)",
  "year": 2026,
  "type": "Official government publication",
  "url": "https://ai.gov.rw/",
  "reliability": 0.82,
  "provenanceClass": "official-catalogue",
  "verification": "verified",
  "verifiedOn": "2026-09-17",
  "note": "Investment catalogue published by RAIA, comprising a verified national record of AI use cases and eight enablement pillars. Figures are official and self-reported: the pages carry footnote markers whose underlying sources, definitions and reference dates are not rendered. Treated as authoritative on what the state asserts and on institutional structure, and as in_review on quantities.",
  "verificationNote": "Site read in full on 17 September 2026 (home, record, enablement hub, eight pillars, partners). Page modification dates run 12–16 September 2026."
}
```

Reliability of 0.82 rather than 0.9 is deliberate, and the note says why: it is a primary source for
*institutional facts* and a self-reported one for *quantities*. Our confidence model should reflect that
difference rather than treat a government URL as automatically authoritative.

---

## 7. Where each change surfaces in the interface

No new top-level view is needed. Everything lands inside pages that already exist.

| View | Change |
|---|---|
| **Overview** | Insight engine gains one derived statement: the national record now exists, so the register gap our platform reported has partly closed. Source-reported share rises from 32% |
| **Rwanda AI Journey** | Two milestones: RAIA's Digital AI Catalogue published (Sept 2026), and the verified national record going live. Both `verified`, sourced to `RAIA_CATALOGUE` |
| **AI Readiness & Maturity** | The dimension / RAIA-pillar toggle. `L26-AIREG` moves 0 → 50, which lifts D6 slightly |
| **AI Adoption** | Registry reconciliation card: our 27 use cases against their 34, with the inclusion criteria for each stated. Where they differ is the interesting part |
| **Investment** | Outcome-based fund (USD 3–6m) and the 30+ pipeline join the partnership table. Note that this is domestic financing machinery, distinct from the external commitments already tracked |
| **AI Ecosystem** | ~18 new partner organisations, tagged by activity area |
| **Sectors** | Four-stage sector readiness strip: Data → Consolidation → Intelligence → AI |
| **Policy & Regulation** | The *What Needs To Be Built* lines quoted against each missing instrument. Official corroboration of three absences |
| **AI Talent & Skills** | The 134,000 figure, presented as a three-source definitional conflict rather than a headline |
| **Sources & Evidence** | `RAIA_CATALOGUE` added, verified, with the self-reporting caveat visible in its drawer |
| **About / Methodology** | A correction log entry: what we asserted, what changed, and when. The platform has not needed one until now |

---

## 8. What this does to the numbers

Expect modest movement, and all of it explicable:

- **D6 Ethical Guidelines** rises slightly on `L26-AIREG` 0 → 50. It is the weakest dimension at 21.7, so
  the change will be visible.
- **D4 Public Sector Adoption** rises on `RWA10` and `RWA10-SUBd` moving to source-reported values that are
  higher than our demo values.
- **Source-reported share rises from 32%** toward roughly 38–40%, which is the headline improvement.
- **Data quality improves in D1, D2 and D4**, because the new observations are `in_review` from a named
  official source rather than demo values.
- **The maturity level stays at L2.** The binding gates are the ethics framework and the dedicated AI budget
  line, and neither is addressed by this site.

That last point is worth stating publicly. A significant government publication landed, the platform
absorbed it, several dimensions improved — and the national maturity level did not move, because the two
specific things holding it are still not done. That is the system working.

---

## 9. Sequence

**First, because it is a correction:** `L26-AIREG` redefinition, the `nationalPortfolio.caveat` rewrite, the
`RAIA_CATALOGUE` source record, and a correction-log entry on the About page. Roughly half a day, and it
should go out before anything else, because the platform currently asserts something that is no longer true.

**Second, the data:** the observation updates, the three corroborations, `RAIA-OFFICIALS-AI` with its
definitional-conflict note, the new fibre and digital-ID indicators, the targets register, and the partner
organisations. Roughly a day.

**Third, the structure:** the `raiaPillar` field and the Readiness toggle, the sector stage strip, the
national goals block. Roughly a day and a half.

**Not yet:** scraping the Record's 34 entries. The list is rendered client-side and is not in the page
source, so it would need either the site's underlying API or a headless fetch. Worth doing — it would let us
reconcile use case by use case rather than count against count — but it is a connector, and it should be
written the way the World Bank one was: fetch, map, merge without destroying history, report the diff.

---

## 10. One thing to be careful about

The temptation with a source like this is to adopt its numbers wholesale, because they are official, recent
and flattering. Doing so would quietly convert our platform from an independent measurement layer into a
mirror of the government's investment prospectus.

The discipline that protects against it is already in the codebase: `origin`, `verification`, and a source
`reliability` that is allowed to be below 1.0 for an official publication. Use them. Every figure from this
site should enter as `in_review`, attributed, with its definition recorded and its conflicts with our
existing data made visible rather than resolved.

The most valuable output of this whole review is not the new figures. It is the three places where an
official source and an independent one disagree — the officials-trained count, the use-case inclusion
criteria, and what counts as a public register. Those disagreements are the thing nobody else is publishing.
