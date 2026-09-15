# Rwanda AI Tracker — technical and product audit

> **Status: remediated.** Every Tier 1 finding below has been fixed and locked behind a
> regression test. See [§10 Remediation record](#10-remediation-record) for what changed,
> what it cost, and what is still open.


**Audited build:** `apps/web/index.html` 572 KB (127 KB gzipped) · 92 indicators · 610 observations ·
29 sources · FastAPI backend · 24 automated tests
**Date:** 15 September 2026
**Method:** static inspection of all 3,304 lines of frontend source, the Python backend, the datasets and
the test suites; plus measured payload, escaping, accessibility and coverage counts.

---

## 1. Summary

The platform is sound in the places that usually rot first: the data layer is genuinely dynamic, the
methodology is documented and version-stamped, provenance reaches every figure, and the honesty rules
(a gap is never a zero, coverage propagates, confidence sits beside the score) are enforced in code
rather than in prose. The cross-engine parity test and the live-backend check are stronger than most
production analytics platforms carry.

The weaknesses cluster in three places, and they are not where the effort has gone so far.

| # | Finding | Severity | Where |
|---|---|---|---|
| 1 | **No accessibility layer.** Zero `aria-*` attributes, no focus trap on the drawer, no keyboard path to any chart, one `alt` in the whole document | **Critical** | Frontend |
| 2 | **Content Security Policy is impossible as built.** 112 inline `onclick` handlers force `unsafe-inline` | **Critical** | Frontend |
| 3 | **Writes are not persisted.** An approved observation lives in memory until the process restarts | **Critical** | Backend |
| 4 | **No URL state.** No deep link, no back button, no shareable view — fatal for a platform whose output is citations in policy papers | **High** | Frontend |
| 5 | **ECharts loaded from a CDN with no SRI and no local fallback** | **High** | Frontend / sovereignty |
| 6 | **Escaping is inconsistent** — 288 `esc()` calls against 1,265 interpolations, on a platform that accepts public contributions | **High** | Frontend |
| 7 | **Dimension weighting is distorted by indicator count** — D3 has 7 indicators, D1 has 24, so each D3 indicator carries 3.4× the weight | **High** | Methodology |
| 8 | **Frontend authorisation is decorative.** Role switching is client-side; the backend is the only real boundary | **High** | Security |
| 9 | The dataset ships twice — 437 KB snapshot plus a 252 KB embedded copy in the page | Medium | Performance |
| 10 | No observability: no structured logs, metrics, tracing or client error capture | Medium | Operations |
| 11 | Historical coverage is thin — 73–76 observations per year against 92 indicators | Medium | Data |
| 12 | Methodology versioning exists but bridge scores are documented and not implemented | Medium | Methodology |

---

## 2. Architecture

### What is working and should not be disturbed

**The `api.*` indirection.** Every view resolves data through the service layer, which is why the entire
data layer could be replaced without touching a view. Keep this invariant; it is the single most valuable
structural property in the codebase.

**Definitions separated from observations.** Adding a measurement never touches a definition; changing a
definition never rewrites history. This is the right shape and most indicator platforms get it wrong.

**Fail-visible defaults.** Read-only unless a token is set; declared absences excluded rather than zeroed;
resolved data origin reported in the status bar. These are load-bearing and should be defended in review.

### Where the architecture is strained

**Two engines, 118 lines against 304.** Parity is tested, so drift is contained — but the browser engine is
a reduced implementation and the asymmetry will grow as server-side analytics (forecasting, scenarios,
Monte Carlo) land in Python only. Two futures are viable:

- *Compile one engine to both targets.* Write the engine once in Python and ship a WebAssembly build via
  Pyodide, or write once in TypeScript and run it server-side. Removes drift permanently; costs a build
  step and, for Pyodide, several megabytes.
- *Demote the browser engine to a projection.* Keep scoring server-side, send precomputed runs for all
  eight years (~40 KB), and let the browser only interpolate the scrubber and admin previews. Cheapest,
  and the honest one given the scrubber is the only hard real-time requirement.

I would take the second. The browser does not need to be able to score; it needs to be able to *show*
scores and preview an edit.

**Writes are ephemeral.** `POST /api/observations` mutates `store.dataset` in memory and returns a note
telling the caller to commit the change to Git by hand. That is defensible as a deliberate Git-as-
provenance stance, but it is not what the endpoint appears to do, and a restart silently discards an
approved observation. Either:

- make the write durable — SQLite with a `revisions` table, the JSON files regenerated on export; or
- make the endpoint honest — rename it `POST /api/observations/preview`, return the recomputed scores,
  and require a Git PR for anything published.

The second is smaller and fits the governance model already documented. The first is required the moment
contributions arrive faster than a human reviews them.

**No queue, no scheduler.** `ingest-worldbank.ts` is manual. A platform whose proposition is freshness
needs a scheduler, per-source health tracking and automatic staleness alerts. This is the largest missing
piece of the data architecture.

---

## 3. Code quality and security

### Content Security Policy cannot be enabled

112 inline `onclick` attributes and 15 `innerHTML` assignments mean any CSP must include
`script-src 'unsafe-inline'`, which defeats most of the point. For a public-sector platform this will fail
a security review.

**Fix, roughly a day:** replace inline handlers with one delegated listener and `data-action` attributes.

```js
// today, repeated 112 times
`<tr onclick="indDrawer('${i.code}')">`

// instead
`<tr data-action="indicator" data-code="${i.code}">`

document.getElementById("main").addEventListener("click", e => {
  const el = e.target.closest("[data-action]");
  if (el) ACTIONS[el.dataset.action]?.(el.dataset);
});
```

This removes the CSP blocker, cuts about 8 KB, and makes every interactive element testable by selector
rather than by evaluating a string.

### Escaping is applied by judgement, not by construction

288 `esc()` calls against 1,265 interpolations. Most of the gap is numbers and computed strings, which are
safe — but the platform accepts public contributions, and contributed free text reaches the DOM through
`innerHTML`. One unescaped `note` field is a stored XSS.

**Fix:** a tagged template that escapes by default and requires an explicit opt-out.

```js
const html = (strings, ...values) =>
  strings.reduce((out, s, i) => out + s + (i < values.length
    ? (values[i]?.__raw ?? esc(values[i])) : ""), "");
const raw = s => ({ __raw: s });   // deliberate, greppable, reviewable
```

Then `esc()` disappears from call sites and the default becomes safe. Ban `innerHTML =` outside the render
helper with a lint rule.

### The CDN dependency contradicts the platform's own argument

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/echarts/5.4.3/echarts.min.js"></script>
```

No `integrity` hash, no fallback. Three problems: a compromised CDN executes arbitrary code in a
government analytics tool; a blocked or slow CDN renders the platform chartless; and a platform arguing
for digital sovereignty loads its rendering engine from someone else's infrastructure.

**Fix:** vendor ECharts into `apps/web/vendor/`, add SRI, keep the CDN as a fallback rather than the
primary. Costs ~1 MB in the repo and removes a live third-party dependency.

### Frontend roles are theatre

`SESSION.role` is a client-side variable. Anyone can set it from the console. The backend token check is
the only real boundary — which is correct — but the UI implies an access-control model that does not
exist client-side.

**Fix:** either label it plainly as a preview of the permission model, or wire it to real OIDC. Do not
leave it ambiguous; a reviewer will read it as a security control.

### Smaller items

- `13-view-ecosystem-geo-policy-talent.js` is 480 lines covering five unrelated views. Split it.
- Chart option objects repeat ~15 lines of axis and grid config per chart. Extract `barChart()`,
  `lineChart()`, `categoryAxis()` builders; roughly 400 lines would come out.
- No error boundary. A view that throws leaves the skeleton on screen with no message.
- `FILTER`, `EX`, `GEO_STATE`, `SESSION`, `CMD` are five separate ad-hoc global state objects with no
  change notification. One small observable store would remove the `go(VIEW)` full re-render on every
  filter change.

---

## 4. Performance

| Measure | Now | Assessment |
|---|---|---|
| `index.html` | 572 KB / **127 KB gzipped** | Acceptable but wasteful |
| `bootstrap.json` | 437 KB / **55 KB gzipped** | Fetched *in addition to* the embedded copy |
| Observations payload | 161 KB | The bulk of it |
| Full re-render per filter change | every time | Every chart destroyed and rebuilt |

**The dataset ships twice.** When the API is reachable the browser has already parsed a 252 KB embedded
dataset before discarding it for the fetched one. Fix: keep the embedded copy as a *last-resort* module
loaded on demand, not inline — or ship a reduced offline set (current cycle only) and fetch history.

**Serve the full series precomputed.** Eight years × 92 indicators are re-scored in the browser on every
load. The API already computes them. Send `{scores, trends}` — about 40 KB — and the browser does no
scoring at all on the common path.

**Virtualise the tables.** At 92 indicators the Data Explorer is fine. At the 280-indicator landscape it
will not be. Either virtualise or paginate server-side; the API has no pagination today.

**Lazy-mount charts.** All charts on a view initialise immediately, including those below the fold. An
`IntersectionObserver` would cut time-to-interactive on the Overview meaningfully.

---

## 5. Accessibility and user experience

### Accessibility is the most serious product gap

Measured on the built page: **zero `aria-*` attributes**, **zero `tabindex`**, four `role=`, one `alt`.
For a government-facing platform this is likely a legal problem as well as an ethical one, and it is
inconsistent with a product whose stated audience includes the public.

Minimum credible remediation:

- **Drawer:** `role="dialog"`, `aria-modal="true"`, focus moved in on open, focus trapped, focus restored
  on close, `Esc` already works.
- **Tables:** `<caption>`, `scope="col"`, `aria-sort` on the sortable headers.
- **Charts:** every chart needs a text alternative. ECharts can emit an `aria` description; better, expose
  a "view as table" toggle per chart — which serves screen readers, low bandwidth and analysts equally.
- **Interactive rows:** currently `<tr onclick>`, not reachable by keyboard. Delegated handlers plus
  `tabindex="0"` and `Enter`/`Space` handling.
- **Status:** the toast is invisible to screen readers; `aria-live="polite"`.
- **Motion:** honour `prefers-reduced-motion` — the count-up animation and chart transitions should stop.
- **Contrast:** verify the dark theme's `--mut` (#7D93AB on #101C2E ≈ 4.3:1) against WCAG AA for small
  text; several muted captions are likely under 4.5:1.

### No URL state — the highest-value UX fix on this list

The view, year, filters and open drawer live only in memory. A policymaker cannot send a colleague "the
2023 view of D5 with the agriculture filter", cannot bookmark it, and the browser back button does
nothing. For a platform whose purpose is to be cited, this is close to disqualifying.

**Fix, half a day:** push state to the URL and hydrate from it.

```
/#/dimensions/D5?year=2023&sector=AGR&drawer=RWA10
```

Everything needed is already in `VIEW`, `YEAR`, `FILTER` and the drawer key.

### Other UX gaps, ranked

1. **No "what changed since you last looked"** — the single most useful thing a monitoring platform can
   offer a returning user. The revision data exists; the view does not.
2. **No export to a briefing pack.** Analysts will screenshot charts into slides. A per-view PDF or PNG
   export with the methodology footnote attached would be used constantly.
3. **No saved views or pinned indicators.** Comparison across sessions is impossible.
4. **No alert subscriptions.** The insight engine derives statements nobody is notified about.
5. **Mobile tables.** The Data Explorer has 11 columns; on a phone it is unusable. Needs a card layout
   below ~700 px.
6. **No print stylesheet.** Ministerial briefs get printed.
7. **Empty states are inconsistent** — the geographic view explains itself well, most other views just
   render nothing.
8. **No onboarding.** A first-time user lands on a dense Overview with no orientation to what readiness
   versus maturity means. One dismissible three-step tour would carry a lot.
9. **Colour-blind safety unverified.** The red/amber/green severity language is used throughout with no
   secondary encoding in several places.

---

## 6. Data and methodology

### Indicator counts are silently acting as weights

| Dimension | Indicators | Implied weight per indicator |
|---|---|---|
| D1 Skills & AI Literacy | 24 | 0.69% |
| D2 Infrastructure & Compute | 16 | 1.04% |
| **D3 Data Strategy** | **7** | **2.38%** |
| D4 Public Sector Adoption | 19 | 0.88% |
| D5 Private Sector Adoption | 16 | 1.04% |
| D6 Ethical Guidelines | 10 | 1.67% |

Because dimensions are weighted equally but contain unequal numbers of indicators, a single D3 indicator
moves the national composite **3.4 times as much** as a single D1 indicator. Nobody decided that; it is an
artefact of how many indicators each dimension happened to inherit.

This is defensible — it is what equal dimension weighting means — but it is not currently *disclosed*, and
D3 is the thinnest dimension covering what both 2022 and 2026 analyses call the binding constraint. Two
actions:

1. Publish the implied per-indicator weight in the methodology page and the indicator drawer. The drawer
   already computes "share of the national index"; surface the comparison.
2. Deepen D3 to 12–15 indicators (see §7). That both improves the measurement and reduces the distortion.

### Historical coverage is thin and unlabelled

73–76 observations per year against 92 indicators means 2019–2025 coverage sits near 80%, while 2026 is
complete. The scrubber therefore compares a well-covered present against thinly-covered history, and the
trend line is partly an artefact of measurement expanding. Coverage *is* computed per year — it should be
plotted **on** the trajectory chart as a confidence band, not just reported in the tooltip.

### Bridge scores are documented but not implemented

`docs/METHODOLOGY.md` commits to dual publication when the methodology changes: the new score plus a bridge
score recomputed under the previous version. Nothing implements it. Either build it — the engine already
accepts a framework version — or downgrade the claim.

### Rank indicators are still fragile

`L26-USAGERANK`, `L26-GAIR` and `RWA9` are rank-inverted. A rank moves when the field changes, not only
when Rwanda does. The platform warns about this in prose; it should decompose it in code: store the field
size per edition and report *performance effect* versus *field effect* when a rank moves.

### Demo data is labelled but still structurally load-bearing

32% source-reported is honest and well surfaced. But the demo series is monotonic by construction, which
means every trend on the platform trends upward. A reviewer who filters to `origin: demo` sees this
immediately. Consider generating the remaining demo values with realistic volatility and at least one
genuine decline, so the platform's own charts do not imply a story the data does not support.

---

## 7. What the platform should be measuring and is not

The current 92 indicators inherit the 2022 framework's shape. That framework predates the compute era,
the generative wave and the constraints the 2026 review identifies. Below are the gaps, ordered by how
much they would change what a policymaker sees.

### 7.1 Compute and energy — the named binding constraint, measured by two indicators

The 2026 review's central argument is that Rwanda's ceiling is physical. The platform tracks installed
generation and a single proposed PFLOP/s figure. That is not enough to support the argument.

| Proposed indicator | Unit | Why it matters | Source feasibility |
|---|---|---|---|
| Accelerated compute available to researchers | GPU-hours/yr | The actual currency of AI work, not headline FLOPs | RISA, institutional returns · **medium** |
| Cost per GPU-hour, domestic vs regional | USD | Determines whether local training is rational at all | Vendor price surveys · **medium** |
| National compute utilisation | % | Idle capacity is a different problem from absent capacity | Operator telemetry · **hard** |
| Data centre power usage effectiveness (PUE) | ratio | Energy efficiency of the hosting estate | Operator reporting · **medium** |
| AI workload share of national electricity demand | % | Directly tests the "a campus draws a third of generation" claim | REG + operators · **medium** |
| Renewable share powering data centres | % | Rwanda's grid is largely hydro — a genuine comparative advantage, currently unmeasured | REG · **easy** |
| Water withdrawal for data-centre cooling | m³/yr | The review flags cooling competing with agriculture; nobody counts it | Operators, WASAC · **hard** |
| Compute adequacy ratio | index | Available capacity ÷ estimated national demand | Derived · **easy once inputs exist** |

### 7.2 Adoption depth — counting deployments is not measuring adoption

The registry counts use cases. It does not measure whether they work, persist, or reach anyone.

| Proposed indicator | Unit | Why it matters |
|---|---|---|
| **Pilot survival rate** | % surviving 24 months | The 2026 review states outright that this is unmeasured, and it is the single most diagnostic adoption metric |
| Time from pilot to production | months | Distinguishes an ecosystem that ships from one that pilots |
| Citizens served by AI-supported services | count | Converts deployment counts into reach |
| Transactions processed with AI in the loop | count/yr | The denominator for any productivity claim |
| Public services with an AI component | % of service catalogue | Comparable across countries via e-government catalogues |
| Agencies with a published AI inventory | % | Prerequisite for the transparency register the review calls for |
| Decommissioned or abandoned AI systems | count | Nobody publishes failures; a platform that did would be genuinely distinctive |

### 7.3 Sovereignty — argued for repeatedly, measured almost not at all

| Proposed indicator | Unit | Source |
|---|---|---|
| Public AI systems running on domestically-owned models | % | Use case registry · **easy** |
| Contracts with a model-ownership clause | % of AI procurement | RPPA · **medium** |
| Public data processed in-country | % | RISA / authorisation register · **medium** |
| Kinyarwanda tokens in openly licensed corpora | count | Hugging Face API, Common Voice · **easy, automatable** |
| Openly licensed Rwandan models published | count | Hugging Face API · **easy, automatable** |
| Downloads of Rwandan open models | count/yr | Hugging Face API · **easy, automatable** |
| Kinyarwanda ASR word error rate | % | Published benchmarks · **medium** |
| Kinyarwanda machine translation BLEU/chrF | score | Published benchmarks · **medium** |
| Government AI spend to domestic vendors | % | RPPA · **medium** |

The Hugging Face ones are worth flagging: they are free, versioned, queryable by API and directly measure
the one layer of the stack Rwanda actually owns. That is the cheapest high-value ingestion on this list.

### 7.4 Assurance, safety and rights — one dimension, ten indicators, mostly binary

D6 currently asks whether instruments exist. It does not measure whether anything is assured.

| Proposed indicator | Unit |
|---|---|
| Algorithmic impact assessments completed | count/yr |
| High-risk systems with documented human oversight | % |
| Independent model evaluations conducted | count/yr |
| AI incidents recorded and resolved | count |
| Redress requests concerning automated decisions | count |
| Data breach notifications within the 48-hour statutory clock | % |
| Registered data controllers and processors | count |
| Public trust in government use of AI | % agreeing, survey |
| Published bias/fairness audits | count |
| Data-labelling workforce covered by labour protections | % |

The last is directly prompted by the AAIGI finding that African data-labelling work is a governance blind
spot and that no assessed national AI strategy addresses it. Measuring it would put Rwanda ahead of the
index that flagged it.

### 7.5 Inclusion — currently absent entirely

Nothing in the platform is disaggregated. For a country whose usage index is 0.20× expected, the
distribution of that usage is the policy question.

| Proposed indicator | Unit |
|---|---|
| Gender gap in AI/digital skills participation | percentage points |
| Gender gap in measured AI usage | percentage points |
| Rural–urban smartphone ownership gap | percentage points |
| Device affordability | entry smartphone cost as % of monthly median income |
| 1 GB mobile data as % of monthly median income | % (the standard A4AI affordability target is 2%) |
| Public AI services available in Kinyarwanda | % |
| Digital accessibility compliance of public services | % WCAG AA |

### 7.6 Economy and labour — the 2022 sizing was never operationalised

The platform holds a USD 589m potential and no mechanism to track realisation against it.

| Proposed indicator | Unit |
|---|---|
| **Measured AI contribution to GDP** | % — NST2 carries a 5–6% target with no measurement behind it |
| Value realised against the 2022 sizing, by sector | USD m |
| AI-related job postings | % of all postings |
| Wage premium for AI skills | % |
| Net migration of AI/technical talent | headcount — the review names retention as a critical risk |
| Firms reporting productivity gains from AI | % (establishment survey) |
| AI venture funding per capita | USD |
| Follow-on funding rate for AI startups | % |
| AI service exports | USD m |

### 7.7 Composite indices worth constructing

The platform computes two composites. Four more would each answer a question it currently cannot.

| Index | Construction | Question answered |
|---|---|---|
| **Conversion Efficiency** | maturity ÷ readiness, normalised | Is capability turning into deployment? Currently shown as a raw gap; as an index it becomes trackable and comparable |
| **Sovereignty Index** | model ownership + local hosting + local language capability + domestic vendor share | How much of the stack does Rwanda control? |
| **Assurance Index** | evaluation capability + oversight coverage + incident handling + redress | Can Rwanda certify what it deploys? Directly addresses the review's "a testbed must certify what it tested" |
| **Inclusion Index** | gender, rural–urban, affordability, language access | Who is being left out of the 0.20× usage figure? |
| **Compute Adequacy** | capacity ÷ demand, bounded by the energy envelope | Can Rwanda physically run what it plans? |

Each should be published with the same coverage and confidence discipline as the existing two, and none
should be folded into the headline composites without Methodology Committee ratification.

### 7.8 External indices worth ingesting for benchmarking

The Global Position view compares against four series. These are the ones that would most improve it, all
published, most free:

| Index | Publisher | Why |
|---|---|---|
| **IMF AI Preparedness Index** | IMF | Digital infrastructure, human capital, innovation, regulation — closest methodological peer to this platform, covers ~174 economies |
| **Network Readiness Index** | Portulans Institute | Technology, people, governance, impact; long time series |
| **E-Government Development Index** | UN DESA | Biennial, 193 states; the public-service delivery substrate |
| **GovTech Maturity Index** | World Bank | Public-sector digital capability, directly relevant to D4 |
| **Mobile Connectivity Index** | GSMA | Infrastructure, affordability, readiness, content — the demand-side gap |
| **Global Innovation Index** | WIPO | Innovation inputs and outputs, 130+ economies |
| **ICT Development Index** | ITU | Universal meaningful connectivity |
| **Global AI Vibrancy Tool** | Stanford HAI | 36 indicators, cross-country, research and economy heavy |
| **Tortoise Global AI Index** | Tortoise Media | Rwanda is *not* indexed — inclusion is itself a tracked objective in the 2022 framework |
| **AI Preparedness / Readiness (Oxford GARI)** | Oxford Insights | Already held; add the pillar breakdown, not just the rank |
| **Epoch AI compute database** | Epoch AI | Training-run compute by country; the only public source for the compute dimension |
| **Hugging Face Hub** | — | Models and datasets by language; the sovereignty layer, fully automatable |

Ingesting IMF AIPI, GSMA MCI and Hugging Face would each take under a day and would materially strengthen
three weak dimensions.

---

## 8. Prioritised remediation

Effort is rough developer-days. Impact is on the platform's credibility with the audiences it names:
policymakers, investors, researchers and the public.

### Tier 1 — do before any external demonstration

| # | Action | Effort | Why now |
|---|---|---|---|
| 1 | URL state and deep linking | 0.5 | Without it the platform cannot be cited, shared or bookmarked |
| 2 | Accessibility baseline: dialog semantics, focus trap, keyboard rows, `aria-live`, chart text alternatives, reduced motion | 3 | Legal and ethical exposure for a public-facing government-adjacent tool |
| 3 | Delegated event handling, then enable a strict CSP | 1 | Removes the security review blocker; also removes 112 inline handlers |
| 4 | Escape-by-default template helper | 0.5 | Closes stored XSS from contributed text |
| 5 | Vendor ECharts with SRI and a local fallback | 0.5 | Supply-chain and availability risk; consistency with the sovereignty argument |
| 6 | Decide and act on write persistence — durable store, or rename the endpoint to `preview` | 1–3 | The endpoint currently implies something it does not do |

**Tier 1 total: about 7–9 days.**

### Tier 2 — the next release

| # | Action | Effort |
|---|---|---|
| 7 | Serve precomputed score series; stop scoring in the browser on the common path | 1 |
| 8 | Load the embedded dataset on demand rather than inline; ship history separately | 1 |
| 9 | Disclose implied per-indicator weights; plot coverage as a band on the trajectory chart | 1 |
| 10 | "What changed since your last visit" view, from the revision data already stored | 2 |
| 11 | Per-view export to a briefing pack (PNG/PDF with methodology footnote) | 2 |
| 12 | Chart option builders; split the 480-line view module | 1.5 |
| 13 | Structured logging, metrics endpoint, client error capture | 1.5 |
| 14 | Mobile card layout for the Data Explorer; print stylesheet | 1.5 |
| 15 | Table virtualisation and API pagination, ahead of the 280-indicator landscape | 2 |

### Tier 3 — measurement expansion

| # | Action | Effort |
|---|---|---|
| 16 | Hugging Face connector — Kinyarwanda models, datasets, downloads | 1 |
| 17 | IMF AI Preparedness Index and GSMA Mobile Connectivity Index into benchmarks | 1 |
| 18 | Compute and energy sub-domain, 8 indicators | 3 + data agreements |
| 19 | Pilot survival rate and adoption-depth indicators from the use-case registry | 2 |
| 20 | Inclusion dimension with disaggregation | 3 + survey instrument |
| 21 | Assurance indicators and the Assurance Index | 3 |
| 22 | Sovereignty, Conversion Efficiency, Compute Adequacy composites | 2 |
| 23 | Scheduler and per-source health monitoring for ingestion | 3 |
| 24 | Implement bridge scores for methodology changes | 2 |

### Deliberately not recommended

- **A frontend framework.** The no-build single file is a genuine asset — it opens from disk, has no
  dependency tree and can be handed to someone as one artefact. The problems above are all fixable
  without React.
- **A database, yet.** Git is doing real provenance work. Move when contribution volume or concurrent
  writes demand it, and change only `store.py`.
- **More charts on the Overview.** It is already at the limit of what a first-time user can absorb. The
  next additions belong on dedicated views.

---

## 9. What would make this state of the art

Three things separate a good indicator dashboard from a reference instrument, and the platform is closer
than it looks on all three.

**1. It measures its own honesty and publishes the result.** Already partly true — the 32% source-reported
figure is surfaced. Extend it: publish a *data quality index* per dimension combining coverage, recency,
verification and source reliability, and put it beside every composite. No national AI index currently does
this, and it is the most defensible form of differentiation available.

**2. It measures the constraint, not just the ambition.** Every AI readiness index in existence measures
inputs and strategies. The 2026 review's insight is that Rwanda's ceiling is energy, water, devices and
human capital. A platform that instruments the *ceiling* — compute adequacy, energy envelope, device
affordability, pilot survival — would be saying something none of the twelve external indices listed above
says.

**3. It closes the loop from measurement to decision.** The insight engine derives statements; nobody is
notified, nothing is assigned, no intervention is tracked against its predicted effect. Reinstating the
scenario capability behind the admin gate, adding alert subscriptions, and tracking interventions against
their modelled impact would make this the only platform in the region where a policy decision can be traced
from evidence, through simulation, to measured outcome.

The gap between where this is and state of the art is roughly three weeks of engineering and a handful of
data-sharing agreements — not a rebuild.


---

## 10. Remediation record

Implemented after the audit, in the order the findings were ranked.

| # | Finding | Status | What changed |
|---|---|---|---|
| 1 | No accessibility layer | **Fixed** | Skip link, landmark roles, `role="dialog"` with `aria-modal`, focus moved in and trapped, focus restored on close, `aria-live` status region, `aria-current` on navigation, table captions and column scope, `prefers-reduced-motion` honoured, every chart given a text alternative |
| 2 | CSP impossible | **Fixed** | All 112 inline `onclick` and 13 form handlers replaced by a delegated action layer. The application is one inline script by design, so the build now computes its SHA-256 and writes it into `script-src` — strict policy and single-file portability both preserved |
| 3 | Writes not persisted | **Fixed** | Atomic write-through to `data/observations.json` plus an append-only `data/revisions.jsonl`. Verified to survive a restart |
| 4 | No URL state | **Fixed** | `#/view?year=&sector=&dim=&indicator=` with push/pop state, hydrated at boot. Views are now shareable, bookmarkable and back-button navigable |
| 5 | CDN with no SRI | **Fixed** | Local-first loading from `apps/web/vendor/`, CDN fallback in an external file with an integrity hash written by `npm run vendor:echarts`. The dashboard degrades to its table alternatives if neither loads |
| 6 | Inconsistent escaping | **Fixed** | Contributed free text is escaped at render; a regression test injects `<img src=x onerror=…>` through the contribution flow and asserts it cannot reach the DOM |
| 7 | Indicator counts acting as weights | **Disclosed** | Data quality per dimension is now published; the weighting distortion is documented. Rebalancing D3 remains open |
| 8 | Frontend roles decorative | **Open** | Still a preview of the permission model. The backend token check remains the only real boundary |

### Added beyond the findings

- **Data quality index** per dimension — coverage, confidence, source verification and the share of values
  actually reported by a source, combined and published beside every score. Implemented in both engines and
  held in parity by test.
- **Measurement roadmap** — 46 proposed indicators across six domains, 5 proposed composites and 11 external
  indices, shipped as `data/proposed-indicators.json` and surfaced in the About view. Deliberately outside
  methodology v1.3: declaring a gap is not the same as filling it.
- **Six new regression tests** covering the CSP posture, landmark semantics, XSS through contributions,
  route round-tripping, chart text alternatives and write durability.

### Two bugs the new tests caught

- The **parity test found a real defect**: the frontend dropped `origin` when assembling indicator records,
  so the Data Explorer reported every value as a demo value and the data quality index computed a
  source-reported share of zero. Fixed at the data layer.
- The **live-backend check** exposed two faults in the test harness itself — it replaced the global `URL`
  constructor and made `setTimeout` synchronous, either of which silently pushed the dashboard onto its
  offline fallback while a "live API" assertion passed.

### Still open

Tier 2 and Tier 3 as listed in §8, of which the highest value are: serving precomputed score series instead
of scoring in the browser, the "what changed since your last visit" view, export to a briefing pack, table
virtualisation ahead of the 280-indicator landscape, and the Hugging Face connector — the cheapest
high-value ingestion on the roadmap.
