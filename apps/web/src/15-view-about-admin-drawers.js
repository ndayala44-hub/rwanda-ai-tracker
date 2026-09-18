
/* ========================== ABOUT / METHODOLOGY ========================== */
VIEWS.about=async function(){
  const g=await api.glossary();
  return vh("Understand","About and methodology",
    "What this platform is, what each measurement means, how it is calculated, and where it is weak. If you only read one page before citing a number, read this one.")
  +`<div class="row" style="grid-template-columns:1fr">
     ${card("What the Rwanda AI Tracker is","",
      `<div class="prose">
        <p>An <b>independent, multi-source intelligence platform</b> on Rwanda's AI ecosystem. It aggregates evidence from government, academia, industry, investors, international organisations and verified community contributors, and presents it with the provenance attached.</p>
        <p>It is <b>not a government publication</b>, and it does not speak for any institution. Where it computes a score, that score is the platform's own calculation under a declared methodology, not an official national figure.</p>
        <p>It exists because two substantial pieces of work were done in 2022, a national AI readiness and maturity framework, and a full economic sizing of AI's potential, and both were static documents. This turns them into something that can be kept current, argued with and built on.</p>
       </div>`)}
   </div>
   <div class="row" style="grid-template-columns:1fr 1fr">
     ${card("The measurement framework","six dimensions, 14 policy outputs, "+IND.length+" tracked indicators",
      `<div class="prose"><p>The structure comes directly from Rwanda's national AI policy as operationalised in the 2022 readiness framework: three enablers, two accelerators and one safeguard.</p></div>
       ${DIMS.map(D=>`<div class="kv" style="cursor:pointer" data-act="dimension" data-args="${D.id}">
         <span class="k"><b style="color:${D.color}">${D.id}</b> ${esc(D.short)}<div class="small muted">${esc(D.cls)} · ${IND.filter(i=>i.dim===D.id).length} indicators</div></span>
         <span class="v mono">${fmt(RUN.dS[D.id].score)}</span></div>`).join("")}
       ${srcLine("AIRM22")}`)}
     ${card("An honest statement about scoring","the most important caveat on this platform",
      `<div class="prose">
        <p>The 2022 national framework defines the indicators <b>but does not define a scoring system</b>. There is no published normalisation rule, no indicator weighting, no aggregation formula, no composite score and no maturity thresholds in the source document.</p>
        <p>So the readiness score, maturity score and maturity level shown here are <b>this platform's computation</b>, under methodology ${META.methodology}, using equal weights within each level of the framework's own hierarchy. They are reproducible and fully documented below, and they are not official.</p>
        <p>The alternative would have been to show 73 disconnected indicators and leave every reader to aggregate them privately. This is the more useful choice, but only if the caveat travels with the number. It does: every score on the platform carries its methodology version, coverage and confidence.</p>
       </div>`)}
   </div>
   <div class="row" style="grid-template-columns:1fr">
     ${card("How a score is calculated","step by step",
      `<div class="prose"><p><b>1. Normalise.</b> Each indicator is converted to 0–100 by a method declared in its record:</p></div>
       <table class="dt" style="margin:8px 0"><thead><tr><th>Method</th><th>Used for</th><th>Formula</th><th class="n">Indicators</th></tr></thead><tbody>
        ${[["Goalpost","continuous measures with a target","100 × (clip(x, L, U) − L) / (U − L)","goalpost"],
           ["Log goalpost","skewed counts, commits, citations, trainees, firms","100 × [ln(1+x) − ln(1+L)] / [ln(1+U) − ln(1+L)]","log"],
           ["Binary","yes/no instruments","100 if true, else 0","binary"],
           ["Ordinal","institutional instruments with partial credit","0 not in place · 50 drafted · 100 in force","ordinal"],
           ["Pass-through","external composite indices","rescaled by the index's own published bounds","passthrough"],
           ["Rank inversion","position in a global index","100 × (N − rank + 1) / N, N = 172","rank"]]
          .map(r=>`<tr><td><b>${r[0]}</b></td><td class="small muted">${r[1]}</td><td class="mono small">${r[2]}</td>
            <td class="n mono">${IND.filter(i=>i.method===r[3]).length}</td></tr>`).join("")}
       </tbody></table>
       <div class="prose">
        <p><b>2. Aggregate.</b> Indicator → policy output → dimension → index, as a weighted mean with weights renormalised over the indicators that actually reported. Coverage propagates up the tree, so a dimension that lost an indicator shows it.</p>
        <p><b>3. Handle what is missing.</b> Nothing is imputed into a published figure. An indicator with no observation is excluded and lowers coverage. Below 75% coverage a figure is marked provisional; below 50% it is not published at all.</p>
        <p><b>4. Score confidence separately.</b> Confidence is 0.30 × source reliability + 0.20 × accessibility + 0.25 × recency + 0.25 × verification level. It is published <i>beside</i> the score and never used to adjust it, those are two different claims.</p>
        <p><b>5. Assign a maturity level.</b> The level is the lower of the score band and the capability gates. A country should not reach a higher level by accumulating easy indicators while lacking foundational institutions.</p>
       </div>`)}
   </div>
   <div class="row" style="grid-template-columns:1fr">
     ${card("Corrections","what this platform got wrong, and when it changed",
      `<div class="prose"><p>A platform that publishes assertions of absence has to be willing to retract them.
        Corrections are listed here in full rather than edited away, because the change itself is information.</p></div>
       <table class="dt" style="margin-top:10px"><thead><tr><th class="n">Date</th><th>What was asserted</th><th>What changed</th><th>Trigger</th></tr></thead><tbody>
        <tr><td class="n mono">17 Sep 2026</td>
          <td><b>No public register of state AI systems</b><div class="small muted">L26-AIREG scored 0, and the 2026 review stated that Rwanda published no consolidated AI project inventory.</div></td>
          <td class="small">Indicator converted from binary to ordinal and raised to <b>50</b>. RAIA's national record publishes ${RAIA.record.useCases} verified use cases across ${RAIA.record.institutions} institutions. Not raised to 100: the record carries sector and stage, not risk classification, oversight arrangements or routes to redress.</td>
          <td class="small"><span class="src" data-act="source" data-args="RAIA_CATALOGUE">RAIA Digital AI Catalogue</span></td></tr>
        <tr><td class="n mono">15 Sep 2026</td>
          <td><b>Two comparator indices were unattributed</b><div class="small muted">The Africa AI Governance Index was recorded with no named publisher, and the 2025 readiness index under a generic name.</div></td>
          <td class="small">Corrected to the <b>Africa AI Policy Lab and Lawyers Hub</b> and to <b>Oxford Insights</b> respectively, each verified against the primary report and independent secondary coverage.</td>
          <td class="small">Source verification pass</td></tr>
       </tbody></table>`)}
   </div>

   <div class="row" style="grid-template-columns:1fr 1fr">
     ${card("Where the data comes from","the platform is data-driven, not hard-coded",
      `<div class="prose">
        <p>Nothing displayed on this platform is written into the interface. Every figure resolves through a data layer at runtime, in this order:</p>
        <ol style="margin:0 0 10px 18px"><li><b>A live API</b>, pass <span class="mono">?api=https://…</span> or set <span class="mono">TRACKER_API_BASE</span>.</li>
        <li><b>A published snapshot</b>. <span class="mono">${esc(META.snapshotUrl)}</span>, regenerated whenever the datasets change.</li>
        <li><b>The embedded dataset</b>, so the file still opens with no server at all.</li></ol>
        <p>This session is running on the <b>${esc(META.dataOrigin)}</b> layer.</p>
        <p>Indicator <i>definitions</i> and <i>observations</i> are stored separately. A new measurement never touches a definition, and a definition change never rewrites history. Adding an indicator means adding two records, no interface change.</p>
       </div>
       <div class="kv"><span class="k">Indicator definitions</span><span class="v mono">${INDICATOR_DEFS.length}</span></div>
       <div class="kv"><span class="k">Observations on record</span><span class="v mono">${OBSERVATIONS.length}</span></div>
       <div class="kv"><span class="k">Registered sources</span><span class="v mono">${Object.keys(SOURCES).length}</span></div>
       <div class="kv"><span class="k">Use case registry</span><span class="v mono">${USECASES.length} entries, ${USECASES.filter(u=>u.onNationalRecord).length} on the national record</span></div>
       <div class="kv"><span class="k">Scoring engine</span><span class="v mono">${esc(META.engine)}</span></div>
       <div class="kv"><span class="k">Methodology version</span><span class="v mono">${esc(META.methodology)}</span></div>`)}
     ${card("How much of this is real","the platform's own provenance, stated plainly",
      `<div class="prose">
        <p>A platform whose whole proposition is provenance has to be candid about its own. Of
          <b>${META.provenance?META.provenance.observations.total:OBSERVATIONS.length}</b> observations on record,
          <b>${META.provenance?(META.provenance.observations.byOrigin["source-reported"]||0):", "}</b>
          (<b>${META.provenance?(META.provenance.observations.sourceReportedShare*100).toFixed(0):", "}%</b>)
          are reported by a named source, the 2022 readiness assessment, the 2022 economic sizing study,
          the 2026 landscape review, or a published index.</p>
        <p>The remainder are <b>demo values</b>, generated to populate a complete eight-year series so the
          platform can be evaluated end to end. They are tagged <span class="qbadge q-modelled">Demo</span>
          in the Data Explorer, filterable, and carry a note on every observation record. They are not
          hidden and they are not presented as measurements.</p>
        <p>Replacing them is a data exercise, not a code one: drop real observations into
          <span class="mono">data/observations.json</span> with <span class="mono">"origin": "source-reported"</span>, or POST them to the API. Nothing in the interface changes.</p>
       </div>
       <div class="kv"><span class="k">Source-reported observations</span><span class="v mono">${META.provenance?(META.provenance.observations.byOrigin["source-reported"]||0):", "}</span></div>
       <div class="kv"><span class="k">Demo observations</span><span class="v mono">${META.provenance?(META.provenance.observations.byOrigin["demo"]||0):", "}</span></div>
       <div class="kv"><span class="k">Sources independently verified</span><span class="v mono">${META.provenance?META.provenance.sources.verified:", "} of ${Object.keys(SOURCES).length}</span></div>
       <button class="btn sm" style="margin-top:10px" data-act="showDemoValues">Show me the demo values</button>`)}
   </div>

   <div class="row" style="grid-template-columns:1fr 1fr">
     ${card("Qualitative intelligence, kept qualitative","how the 2026 landscape review is used",
      `<div class="prose">
        <p>The 2026 landscape review contributes two different kinds of content, and the platform keeps them apart deliberately.</p>
        <p><b>Where it reports a measurement</b>, usage index, Human Capital Index, installed generation, governance index score, committed funding, it becomes an indicator with a source, a period and a confidence weight, and it enters the composites like any other observation.</p>
        <p><b>Where it offers judgement</b>, the fourteen-dimension maturity assessment, the constraint stack, the proposition, the 2026–2030 agenda, it is stored as structured contextual intelligence and displayed as analyst assessment. It is never converted into a number that feeds a score.</p>
        <p>That boundary is why the review's national average of ${L26.maturityAssessment2026.nationalAverage} of 5 sits <i>beside</i> the computed maturity index of ${fmt(RUN.maturity.score)} of 100 rather than inside it.</p>
       </div>${srcLine("LANDSCAPE26")}`)}
   </div>

   <div class="row" style="grid-template-columns:1fr 1fr">
     ${card("Known limitations","stated, not buried",
      `<ul class="prose">
        <li><b>The scoring methodology is ours, not Rwanda's.</b> See above. Any institution is free to disagree with the weights; the underlying observations are exported in full so they can.</li>
        <li><b>Some indicators are estimated, not measured.</b> ${IND.filter(i=>i.evidenceType==="estimated").length} of ${IND.length} carry the "estimated" evidence type and correspondingly low confidence. They are marked everywhere they appear.</li>
        <li><b>Adoption counts depend on a registry.</b> Use-case counts measure what has been registered, not what exists. A deployment nobody tells us about is invisible, which is the honest limitation of any crowdsourced instrument.</li>
        <li><b>No subnational measurement exists.</b> All indicators are national. District views show recorded assets and deployments only.</li>
        <li><b>The 2022 economic sizing predates generative AI.</b> It explicitly measured only technology available at the time, so its 589m figure neither includes nor anticipates the current wave.</li>
        <li><b>Third-party sources drift.</b> Index editions change methodology and country sets; a rank movement is not automatically a performance movement.</li>
       </ul>`)}
     ${card("Data quality framework","what each badge means",
      `${[["verified","Corroborated against a named source or administrative record."],
          ["in_review","Submitted and plausible, but not yet confirmed by a reviewer or a second source."],
          ["unverified","Published with the contributor's attribution only. Treat as indicative."],
          ["not_reported","No observation for this cycle. Excluded from aggregation and counted against coverage."],
          ["modelled","Produced by a model or formula rather than observed directly."],
          ["historical","A figure from a past study, shown as historical evidence and never as a current statistic."]]
         .map(([k,d])=>`<div class="kv"><span class="k">${qbadge(k)}</span><span class="v" style="max-width:68%;text-align:right">${d}</span></div>`).join("")}
       <hr class="sep">
       <div class="prose"><p>Where a value does not exist, the platform says <span class="unavail">◌ Data unavailable</span> rather than showing a zero or a placeholder. An empty chart with an explanation is more useful than a full one that is wrong.</p></div>`)}
   </div>
   <div class="row" style="grid-template-columns:1fr 1fr">
     ${cardF("Data quality by dimension","how well each dimension is measured, not how well Rwanda is doing",
      `<table class="dt"><thead><tr><th>Dimension</th><th class="n">Quality</th><th class="n">Coverage</th>
        <th class="n">Confidence</th><th class="n">Verified</th><th class="n">Source-reported</th></tr></thead><tbody>
       ${DIMS.map(D=>{const q=dataQuality(D.id);
         return `<tr data-act="dimension" data-args="${D.id}"><td>${esc(D.short)}</td>
          <td class="n"><b style="color:${q.band==="strong"?"var(--green)":q.band==="adequate"?"var(--teal)":"var(--amber)"}">${q.score.toFixed(0)}</b></td>
          <td class="n mono">${pct(q.coverage)}</td><td class="n mono">${pct(q.confidence)}</td>
          <td class="n mono">${pct(q.verified)}</td><td class="n mono">${pct(q.sourceReported)}</td></tr>`}).join("")}
      </tbody></table>
      <div style="padding:12px 15px" class="small muted">A score of 60 on 95% coverage of verified sources is a different claim from 60 on 55% coverage of estimates. No national AI index publishes this distinction; without it the two look identical.</div>`)}
     ${card("What this platform does not yet measure","the measurement roadmap",
      `<div class="prose"><p>${esc(ROADMAP.note)}</p></div>
       ${[...new Set(ROADMAP.items.map(i=>i.domain))].map(dom=>{
         const items=ROADMAP.items.filter(i=>i.domain===dom);
         const easy=items.filter(i=>i.feasibility==="easy").length;
         return `<div class="kv"><span class="k"><b>${esc(dom)}</b>
           <div class="small muted">${items.length} proposed · ${easy} obtainable from existing sources</div></span>
           <span class="v"><button class="btn sm" data-act="roadmap" data-args="${esc(dom)}">See them</button></span></div>`}).join("")}
       <div class="small muted" style="margin-top:10px">${ROADMAP.proposedComposites.length} further composite indices and ${ROADMAP.externalIndicesToIngest.length} external indices are proposed for ingestion.</div>`)}
   </div>

   <div class="row" style="grid-template-columns:1fr">
     ${card("Key concepts","plain-language definitions for non-technical readers",
      `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:14px">
       ${g.map(x=>`<div style="border-left:3px solid var(--brand);padding-left:12px">
         <b style="font-size:13.5px">${esc(x.t)}</b>
         <div class="prose" style="margin-top:4px;font-size:13px">${esc(x.d)}</div>
         <div class="prov" style="margin-top:5px"><span class="src" data-act="source" data-args="${x.src}">${esc(SRC(x.src).org)}, ${SRC(x.src).year}</span></div>
       </div>`).join("")}</div>`)}
   </div>
   <div class="row" style="grid-template-columns:1fr 1fr">
     ${card("Methodology versions","",
      `${[["v1.0","12 Mar 2024","Superseded","Initial digitisation of the 2022 framework. Equal weights, linear goalposts, no composite published."],
          ["v1.1","28 Jan 2025","Superseded","Log-goalpost normalisation for skewed counts; readiness and maturity separated by indicator membership; coverage publication gates introduced."],
          ["v1.2","04 Jun 2026","Superseded","Partial credit for institutional instruments; capability gates on the maturity ladder; compound indicator OXF12 decomposed; one compute indicator added."],
          ["v1.3","15 Sep 2026","In force","Rank normalisation takes a per-indicator universe, so a position in a 121-country field is no longer scored as if it were a 195-country field. A declared absence in any year is excluded from aggregation rather than only in the current cycle. Data quality published per dimension alongside every score."]]
        .map(([v,d,s,n])=>`<div class="kv"><span class="k"><b>${v}</b> <span class="tag ${s==="In force"?"g":""}">${s}</span>
          <div class="small muted" style="max-width:340px;margin-top:3px">${n}</div></span><span class="v mono">${d}</span></div>`).join("")}
       <div class="small muted" style="margin-top:10px">Historical results are never rewritten when the methodology changes. Each figure carries the version that produced it.</div>`)}
     ${card("Reuse and citation","",
      `<div class="prose">
        <p>Data on this platform is open. Export it from the Data Explorer as CSV or JSON, both of which carry source attribution and verification state per row.</p>
        <p><b>Suggested citation:</b> Rwanda AI Tracker, ${META.built}, indicator export, methodology ${META.methodology}. Cite the underlying source alongside, for example, the Rwanda AI Economic Sizing Report, 2022, for any monetary figure.</p>
       </div>
       <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
        <button class="btn" data-act="go" data-args="explorer">Open the Data Explorer</button>
        <button class="btn" data-act="go" data-args="sources">Source register</button>
        <button class="btn pri" data-act="contribute">Contribute or correct</button></div>`)}
   </div>`;
};

/* ================================= ADMIN ================================= */
VIEWS.admin=async function(){
  if(SESSION.role==="Public Viewer"){
    return vh("Restricted","Sign in",
      "The administrative environment is access-controlled. The public platform shows only approved data.")
    +`<div class="row" style="grid-template-columns:minmax(0,460px)">
      ${card("Sign in","demo roles, no credentials are transmitted",
        `<div class="prose"><p>Choose a role to see the permissions it grants. In production this is a real identity provider with MFA; roles map to the same permission set.</p></div>
         <label class="fl">Role</label>
         <select class="sel" id="roleSel" style="width:100%">${Object.keys(ROLES).map(r=>`<option>${r}</option>`).join("")}</select>
         <div style="margin-top:10px"><button class="btn pri" data-act="signIn">Sign in</button></div>
         <hr class="sep">
         ${Object.entries(ROLES).map(([r,v])=>`<div class="kv"><span class="k">${r}</span>
           <span class="v small">${v.can.join(", ")}</span></div>`).join("")}`)}
     </div>`;
  }
  const aud=await api.audit();
  return vh("Restricted","Administration",
    `Signed in as <b>${esc(SESSION.user)}</b> · role <b>${esc(SESSION.role)}</b>. Actions are limited to this role's permissions and every write is audited.`,
    `<button class="btn" data-act="signOut">Sign out</button>`)
  +`<div class="row" style="grid-template-columns:1fr 1fr">
     ${card("Edit an observation",can("write")?"writes recompute every score on the platform":"read-only for your role",
       can("write")?`<label class="fl">Indicator</label>
        <select class="sel" id="edCode" style="width:100%">${IND.map(i=>`<option value="${i.code}">${i.code}. ${esc(i.name.slice(0,48))}</option>`).join("")}</select>
        <div style="display:flex;gap:10px;margin-top:10px">
          <div style="flex:1"><label class="fl">Year</label><select class="sel" id="edYear" style="width:100%">${YEARS.slice().reverse().map(y=>`<option>${y}</option>`).join("")}</select></div>
          <div style="flex:1"><label class="fl">New value</label><input class="txt" id="edVal" style="width:100%" placeholder="numeric"></div></div>
        <label class="fl" style="margin-top:10px">Reason for change</label>
        <input class="txt" id="edWhy" style="width:100%" placeholder="e.g. corrected from RURA Q2 return">
        <div style="margin-top:10px"><button class="btn pri" data-act="applyEdit">Apply and recompute</button></div>
        <div class="small muted" style="margin-top:8px">This is a genuine write. The scores on every other page recalculate immediately, which is the point: nothing on this platform is hard-coded.</div>`
        :`<div class="empty">${unavailable("Your role cannot edit observations")}</div>`)}
     ${card("Load a dataset",can("load")?"replaces observations in bulk":"restricted",
       can("load")?`<div class="prose"><p>Upload a JSON file of the form <span class="mono">{"observations":[{"code":"RWA10","year":2026,"value":12}]}</span>. Every matching observation is applied and the platform recomputes.</p></div>
        <input type="file" id="dsFile" accept=".json" class="txt" style="width:100%">
        <div style="margin-top:10px"><button class="btn pri" data-act="loadDataset">Load dataset</button>
          <button class="btn" data-act="exportJSON">Download current dataset as a template</button></div>`
        :`<div class="empty">${unavailable("Your role cannot load datasets")}</div>`)}
   </div>
   <div class="row" style="grid-template-columns:1fr">
     ${cardF("Verification queue",can("review")?"approve or reject contributed values":"read-only",
      `<table class="dt"><thead><tr><th>Indicator</th><th>Evidence type</th><th>Source</th><th>Status</th><th>Last updated</th><th></th></tr></thead><tbody>
       ${IND.filter(i=>i.verification!=="verified").map(i=>`<tr>
         <td><b class="mono">${i.code}</b><div class="small">${esc(i.name)}</div></td>
         <td class="small">${EVIDENCE_LABEL[i.evidenceType]}</td>
         <td class="small">${esc(SRC(i.sourceId).org)}</td>
         <td>${qbadge(i.verification)}</td><td class="small mono">${i.lastUpdated}</td>
         <td>${can("review")?`<button class="btn sm" data-act="verify" data-args="${i.code}|verified">Verify</button>
           <button class="btn sm" data-act="verify" data-args="${i.code}|unverified">Reject</button>`:""}</td></tr>`).join("")}
      </tbody></table>`)}
   </div>
   <div class="row" style="grid-template-columns:1fr">
     ${cardF("Audit log",aud.length+" events this session",
      aud.length?`<table class="dt"><thead><tr><th>Time</th><th>Actor</th><th>Role</th><th>Action</th><th>Entity</th><th>Before → after</th></tr></thead><tbody>
       ${aud.map(a=>`<tr><td class="mono small">${a.t}</td><td class="small">${esc(a.actor)}</td><td class="small">${esc(a.role)}</td>
         <td><span class="tag b">${a.action}</span></td><td class="mono small">${esc(a.entity)}</td>
         <td class="small muted">${esc(String(a.before))} → ${esc(String(a.after))}</td></tr>`).join("")}
      </tbody></table>`:`<div class="empty">No changes made in this session yet. Edit an observation and it will appear here.</div>`)}
   </div>`;
};
function signIn(){
  const r=document.getElementById("roleSel").value;
  SESSION.role=r;SESSION.user=r==="Public Viewer"?"Public visitor":"Demo "+r.toLowerCase();
  logAudit("SIGN_IN","session",null,r);toast("Signed in as "+r);go("admin");
}
function signOut(){logAudit("SIGN_OUT","session",SESSION.role,null);SESSION.role="Public Viewer";SESSION.user="Public visitor";toast("Signed out");go("admin")}
async function doEdit(){
  const code=document.getElementById("edCode").value,year=+document.getElementById("edYear").value;
  const v=parseFloat(document.getElementById("edVal").value),why=document.getElementById("edWhy").value;
  if(isNaN(v))return toast("Enter a numeric value");
  try{await api.updateObservation(code,year,v,why);toast(code+" updated, all scores recomputed");go("admin")}
  catch(e){toast(e.message)}
}
async function doVerify(code,state){
  try{await api.setVerification(code,state);toast(code+" marked "+VSTATE[state][1].toLowerCase());go("admin")}
  catch(e){toast(e.message)}
}
function doLoad(){
  const f=document.getElementById("dsFile").files[0];
  if(!f)return toast("Choose a JSON file first");
  const rd=new FileReader();
  rd.onload=async()=>{try{const j=JSON.parse(rd.result);const r=await api.loadDataset(j);
    toast("Applied "+r.applied+" observations, platform recomputed");go("admin")}
    catch(e){toast("Could not load: "+e.message)}};
  rd.readAsText(f);
}

function roadmapDrawer(domain){
  const items=ROADMAP.items.filter(i=>i.domain===domain);
  openDrawer(domain,"MEASUREMENT ROADMAP · proposed, not yet measured",
    card("Why these are listed","",
      `<div class="prose"><p>${esc(ROADMAP.note)}</p></div>`)
    +`<div style="height:12px"></div>`
    +cardF(items.length+" proposed indicators","",
      `<table class="dt"><thead><tr><th>Indicator</th><th>Unit</th><th>Proposed source</th><th>Feasibility</th></tr></thead><tbody>
       ${items.map(i=>`<tr><td><b>${esc(i.name)}</b><div class="small muted">${esc(i.rationale)}</div></td>
         <td class="small">${esc(i.unit)}</td><td class="small muted">${esc(i.proposedSource)}</td>
         <td><span class="tag ${i.feasibility==="easy"?"g":i.feasibility==="medium"?"a":"r"}">${esc(i.feasibility)}</span></td></tr>`).join("")}
      </tbody></table>`),
    `<b data-act="go" data-args="about">About</b> › Measurement roadmap › <b>${esc(domain)}</b>`);
}

/* ============================ CONTRIBUTE FLOW =========================== */
function openContribute(kind){
  /* The contribution form is built and shown, but held behind a glass veil
     until the review workflow that stands behind it is ready. Showing the real
     form rather than an empty placeholder tells a prospective contributor
     exactly what will be asked of them, method, source and attribution, which
     is the part that takes thought. Fields are disabled so they stay out of the
     tab order, and the whole form is hidden from assistive technology. */
  const field = (label, control) =>
    `<label class="fl">${label}</label>${control}`;

  openDrawer("Contribute data","HELP KEEP THIS PLATFORM CURRENT",
    card("What you can contribute","",
      `<div class="prose"><p>Rwanda AI Tracker is multi-source by design. Government agencies, universities,
        companies, investors and researchers each hold pieces of the picture that no single institution has.</p>
        <p>Everything submitted will go into a review queue with your attribution, and will be published only
        once a reviewer confirms the method and the source. From that point it carries your organisation's
        name wherever the figure appears.</p></div>`)
    +`<div style="height:12px"></div>`
    +`<div class="card"><header><h3>Submit</h3><span class="sub">preview</span></header>
      <div class="bd">
        <div class="comingsoon">
          <div class="cs-form" aria-hidden="true">
            ${field("Contribution type",
              `<select class="sel" style="width:100%" disabled>${["Indicator observation","Use case","Organisation","Investment record","Correction","Source"]
                .map(k=>`<option ${k===kind?"selected":""}>${k}</option>`).join("")}</select>`)}
            <div style="display:flex;gap:10px;margin-top:10px">
              <div style="flex:1">${field("Your organisation",`<input class="txt" style="width:100%" placeholder="e.g. Rwanda ICT Chamber" disabled>`)}</div>
              <div style="flex:1">${field("Subject or indicator code",`<input class="txt" style="width:100%" placeholder="e.g. RWA10" disabled>`)}</div>
            </div>
            <div style="margin-top:10px">${field("Value or statement",
              `<input class="txt" style="width:100%" placeholder="e.g. 14 AI solutions in public value chains, 2026" disabled>`)}</div>
            <div style="margin-top:10px">${field("Method and source, how do you know this?",
              `<textarea class="txt" style="width:100%;height:74px" placeholder="Collection method, sample, reference period, and any document that can be checked." disabled></textarea>`)}</div>
            <div style="margin-top:12px"><button class="btn pri" disabled>Submit for review</button></div>
          </div>
          <div class="cs-veil">
            <span class="cs-badge">Coming soon</span>
            <h4>Be part of the project</h4>
            <p>Data contribution is opening soon. The form above shows what a submission will require, so
               you can prepare the figure, its source and the method behind it in advance.</p>
          </div>
        </div>
        <div class="small muted" style="margin-top:12px">In the meantime, corrections and additions can be
          raised against the dataset directly, see <span class="src" data-act="closeAndGo" data-args="about">the methodology</span>
          for how observations are sourced and verified.</div>
      </div></div>`);
}

async function submitContribution(){
  const g=id=>(document.getElementById(id)||{value:""}).value.trim();
  if(!g("cbWho")||!g("cbVal"))return toast("Organisation and value are both required");
  await api.addContribution({who:g("cbWho"),kind:g("cbKind"),target:g("cbTarget")||", ",value:g("cbVal"),note:g("cbNote")||"No method supplied, reviewer will request one."});
  closeDrawer();toast("Submitted to the review queue");
  if(["overview","sources"].includes(VIEW))go(VIEW);
}

/* =============================== DRAWERS ================================ */
function dimDrawer(id){
  const D=DIMS.find(d=>d.id===id),d=RUN.dS[id],p=PREV.dS[id];
  const inds=IND.filter(i=>i.dim===id);
  const outs=D.outputs.map(o=>({O:OUTPUTS.find(x=>x.id===o),s:RUN.oS[o]})).sort((a,b)=>a.s.score-b.s.score);
  openDrawer(D.n,`DIMENSION ${D.id} · ${D.cls}`,
    `<div class="row" style="grid-template-columns:1fr 1fr 1fr;gap:10px">
      ${kpi("Score",fmt(d.score),deltaHtml(d.score,p.score," pts"),scColor(d.score))}
      ${kpi("Coverage",pct(d.coverage),`${inds.filter(i=>i.notReported).length} indicators not reported`)}
      ${kpi("Confidence",confLabel(d.confidence),pct(d.confidence))}
     </div>
     ${card("Why this dimension matters","",`<div class="prose"><p>${esc(D.why)}</p><p class="muted"><b>Policy objective:</b> ${esc(D.obj)}</p></div>`)}
     <div style="height:12px"></div>
     ${cardF("Trajectory","",`<div data-chart="dimTrend" data-dim="${id}" style="height:220px"></div>`)}
     <div style="height:12px"></div>
     ${card("Policy outputs","weakest first",outs.map(o=>`
       <div style="margin-bottom:10px">
         <div style="display:flex;justify-content:space-between;gap:10px;font-size:12.5px">
           <span><b class="mono">${o.O.id}</b> ${esc(o.O.n)}</span><b style="color:${scColor(o.s.score)}">${fmt(o.s.score)}</b></div>
         <div class="bar" style="margin-top:5px"><i style="width:${o.s.score||0}%;background:${scColor(o.s.score)}"></i></div>
         <div class="small muted" style="margin-top:3px">${o.s.children?"":""}${IND.filter(i=>i.output===o.O.id).length} indicators · coverage ${pct(o.s.coverage)}</div>
       </div>`).join(""))}
     <div style="height:12px"></div>
     ${cardF("All indicators in this dimension",inds.length+" tracked",inds.map(i=>indRow(i)).join(""))}`,
    `<b data-act="go" data-args="readiness">Readiness &amp; maturity</b> › <b>${D.id}</b>`);
}
DRAWER_CHARTS.dimTrend=function(el){
  const id=el.getAttribute("data-dim"),D=DIMS.find(d=>d.id===id);
  ec(el,{tooltip:{trigger:"axis"},grid:{left:40,right:16,top:16,bottom:26},
    xAxis:axis({type:"category",data:YEARS,boundaryGap:false}),yAxis:axis({type:"value",max:100}),
    series:[{type:"line",smooth:.3,symbolSize:5,data:YEARS.map(y=>+(RUNS[y].dS[id].score||0).toFixed(1)),
      lineStyle:{width:2.6,color:D.color},itemStyle:{color:D.color},areaStyle:{color:"rgba(14,136,204.10)"}},
      {type:"line",data:YEARS.map(()=>70),symbol:"none",lineStyle:{type:"dashed",color:cssVar("--line2")}}]},220);
};
DRAWER_CHARTS.indTrend=function(el){
  const code=el.getAttribute("data-code"),I=BYCODE[code];
  ec(el,{tooltip:{trigger:"axis",formatter:ps=>{const y=ps[0].axisValue,r=RUNS[y].iS[code];
      return `<b>${y}</b><br>Value: <b>${rawFmt(I,r.raw)}</b> ${I.unit}<br>Score: <b>${r.assessed?fmt(r.score):"not reported"}</b><br>
        <span style="font-size:11px;color:${cssVar("--mut")}">Confidence ${pct(r.confidence)} · ${SRC(I.sourceId).org}</span>`}},
    legend:{top:2,textStyle:{color:cssVar("--ec-axis"),fontSize:10.5}},
    grid:{left:48,right:48,top:34,bottom:26},
    xAxis:axis({type:"category",data:YEARS}),
    yAxis:[axis({type:"value",name:"value",nameTextStyle:{color:cssVar("--ec-axis"),fontSize:10}}),
           axis({type:"value",name:"score",min:0,max:100,splitLine:{show:false},nameTextStyle:{color:cssVar("--ec-axis"),fontSize:10}})],
    series:[{name:"Reported value",type:"bar",barWidth:"48%",itemStyle:{color:PAL[0],borderRadius:[3,3,0,0]},
      data:I.obs.map(o=>+o.value.toFixed(I.method==="log"?1:3))},
      {name:"Normalised score",type:"line",yAxisIndex:1,symbolSize:6,lineStyle:{width:2.4,color:PAL[3]},itemStyle:{color:PAL[3]},
       data:YEARS.map(y=>{const r=RUNS[y].iS[code];return r.assessed?+r.score.toFixed(1):null}),connectNulls:false}]},240);
};
function indDrawer(code){
  const I=BYCODE[code];if(!I)return;
  const s=RUN.iS[code],p=PREV.iS[code],O=OUTPUTS.find(o=>o.id===I.output),D=DIMS.find(d=>d.id===I.dim);
  const src=SRC(I.sourceId);
  const formula={log:"score = 100 × [ ln(1+x) − ln(1+L) ] ÷ [ ln(1+U) − ln(1+L) ]",
    goalpost:"score = 100 × ( clip(x, L, U) − L ) ÷ ( U − L )",
    binary:"score = 100 if true, else 0",
    ordinal:"score = ordinal state ∈ { 0 not in place, 50 drafted, 100 in force }",
    passthrough:"score = 100 × ( x − min ) ÷ ( max − min ), external composite, never recomputed",
    rank:"score = 100 × ( N − rank + 1 ) ÷ N, with N = 172"}[I.method];
  openDrawer(I.name,`INDICATOR · ${code} · ${D.short}`,
    `<div class="row" style="grid-template-columns:1fr 1fr 1fr;gap:10px">
      ${kpi("Reported value",s.raw===null?unavailable("not reported"):rawFmt(I,s.raw),esc(I.unit))}
      ${kpi("Normalised score",s.assessed?fmt(s.score):", ",deltaHtml(s.score,p.score," pts"),scColor(s.score))}
      ${kpi("Confidence",pct(s.confidence),confLabel(s.confidence))}
     </div>
     ${card("What it means and why it matters","",
       `${I.definition?`<div class="prose"><p><b>Definition.</b> ${esc(I.definition)}</p></div>`:""}
        ${I.methodology?`<div class="prose"><p><b>How it is measured.</b> ${esc(I.methodology)}</p></div>`:""}
        <div class="prose"><p>${esc(I.name)}, measured in ${esc(I.unit)}. ${I.pol==="+"?"Higher is better.":"Lower is better."}
         It contributes to <b>${esc(O.n)}</b> under <b>${esc(D.n)}</b>, and counts toward the ${I.mem==="R"?"readiness":"maturity"} index.</p>
         <p>${esc(D.why)}</p>
         ${I.gate?`<p style="color:var(--brand)"><b>This indicator is a capability gate for maturity level ${I.gate}</b>, the level cannot be reached while it is unmet, regardless of the score.</p>`:""}
         ${I.note?`<p style="color:var(--amber)"><b>Note:</b> ${esc(I.note)}</p>`:""}</div>`)}
     <div style="height:12px"></div>
     ${cardF("History","reported values and normalised score",
       `<div data-chart="indTrend" data-code="${code}" style="height:240px"></div>
        ${I.obs.filter(o=>o.note).length?`<div style="padding:0 15px 13px">${I.obs.filter(o=>o.note).map(o=>
          `<div class="small muted">· <b>${o.year}</b> ${esc(o.note)}</div>`).join("")}</div>`:""}`)}
     <div style="height:12px"></div>
     ${card("How it is measured","",
       `<div class="kv"><span class="k">Measurement type</span><span class="v">${EVIDENCE_LABEL[I.evidenceType]}</span></div>
        <div class="kv"><span class="k">Normalisation method</span><span class="v">${I.method}</span></div>
        <div class="mono" style="background:var(--surface2);border:1px solid var(--line);border-radius:8px;padding:11px;font-size:11.5px;margin:9px 0;line-height:1.9">
          ${formula}<br><span class="muted">L = ${rawFmt(I,I.baseline)} (baseline ${META.firstYear}) · U = ${rawFmt(I,I.target)} (reference target 2030)</span>
          ${s.assessed?`<br><span style="color:var(--brand)">with x = ${rawFmt(I,s.raw)} → score ${fmt(s.score)}</span>`:""}</div>
        <div class="kv"><span class="k">Weight within ${O.id}</span><span class="v mono">${(100/IND.filter(x=>x.output===I.output).length).toFixed(1)}%</span></div>
        <div class="kv"><span class="k">Share of the national index</span><span class="v mono">${(100/IND.filter(x=>x.output===I.output).length/D.outputs.length/6).toFixed(2)}%</span></div>
        <div class="kv"><span class="k">Methodology version</span><span class="v mono">${META.methodology}</span></div>`)}
     <div style="height:12px"></div>
     ${card("Provenance","",
       `<div class="kv"><span class="k">Source</span><span class="v"><span class="src" data-act="source" data-args="${I.sourceId}">${esc(src.name)}</span></span></div>
        <div class="kv"><span class="k">Publishing organisation</span><span class="v">${esc(src.org)}</span></div>
        <div class="kv"><span class="k">Reporting organisation</span><span class="v">${esc((ORG[I.owner]||{name:I.owner}).name)}</span></div>
        <div class="kv"><span class="k">Contributor</span><span class="v">${esc(I.contributor)}</span></div>
        <div class="kv"><span class="k">Reporting period</span><span class="v mono">${META.cycle-(I.stale||0)}</span></div>
        <div class="kv"><span class="k">Collection date</span><span class="v mono">${(I.obs.find(o=>o.year===META.cycle-(I.stale||0))||{}).collected||", "}</span></div>
        <div class="kv"><span class="k">Geographic scope</span><span class="v">${I.geoLevel}</span></div>
        <div class="kv"><span class="k">Update frequency</span><span class="v">${esc(I.updateFrequency)}</span></div>
        <div class="kv"><span class="k">Observations on record</span><span class="v mono">${I.obs.length} (${I.obs.length?I.obs[0].year+"–"+I.obs[I.obs.length-1].year:"none"})</span></div>
        <div class="kv"><span class="k">Verification status</span><span class="v">${qbadge(I.verification)}</span></div>
        <div class="kv"><span class="k">Last updated</span><span class="v mono">${I.lastUpdated}</span></div>
        ${src.url?`<div style="margin-top:10px"><a class="btn sm" href="${src.url}" target="_blank" rel="noopener">Open the source ↗</a></div>`:""}
        ${I.stale?`<div class="small" style="margin-top:9px;color:var(--amber)">This indicator is ${I.stale} reporting cycle${I.stale>1?"s":""} behind its expected refresh. Its confidence has been reduced accordingly.</div>`:""}
        ${I.notReported?`<div class="small" style="margin-top:9px;color:var(--red)">No observation was reported for ${META.cycle}. The indicator is excluded from aggregation and counts against coverage, it is not treated as zero.</div>`:""}`)}
     <div style="height:12px"></div>
     <div style="display:flex;gap:8px;flex-wrap:wrap">
       <button class="btn" data-act="closeAndGo" data-args="explorer">See it in the Data Explorer</button>
       <button class="btn" data-act="source" data-args="${I.sourceId}">About this source</button>
       <button class="btn pri" data-act="closeAndContribute" data-args="Correction">Contribute a correction</button></div>`,
    `<b data-act="go" data-args="readiness">Readiness</b> › <b data-act="dimension" data-args="${I.dim}">${I.dim}</b> › ${I.output} › <b>${code}</b>`);
}

