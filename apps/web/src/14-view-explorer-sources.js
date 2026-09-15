
/* ============================= DATA EXPLORER ============================= */
let EX={q:"",dim:"",sector:"",source:"",org:"",evidence:"",status:"",origin:"",year:META.cycle,view:"table",sort:"code",dir:1};
VIEWS.explorer=async function(){
  const sources=await api.sources();
  const opt=(v,l,cur)=>`<option value="${v}" ${cur===v?"selected":""}>${l}</option>`;
  return vh("Data","Data explorer",
    "Every indicator in the platform, with its value, source, contributor, method, verification state and full history. Filter it, chart it, map it, export it.",
    `<div class="seg"><button class="${EX.view==="table"?"on":""}" data-act="exView" data-args="table">Table</button>
      <button class="${EX.view==="chart"?"on":""}" data-act="exView" data-args="chart">Chart</button>
      <button class="${EX.view==="meta"?"on":""}" data-act="exView" data-args="meta">Metadata</button></div>
     <button class="btn" data-act="exportCSV">Export CSV</button>
     <button class="btn" data-act="exportJSON">Export JSON</button>`)
  +`<div class="card" style="margin-bottom:14px"><div class="bd">
     <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:10px">
       <div><label class="fl">Search</label><input class="txt" style="width:100%" value="${esc(EX.q)}" placeholder="indicator, code, owner…" data-act="exQuery" data-on="input"></div>
       <div><label class="fl">Dimension</label><select class="sel" style="width:100%" data-act="exSet" data-args="dim" data-on="change">
         ${opt("","All dimensions",EX.dim)}${DIMS.map(d=>opt(d.id,d.id+" · "+d.short,EX.dim)).join("")}</select></div>
       <div><label class="fl">Year</label><select class="sel" style="width:100%" data-act="exSet" data-args="year" data-on="change">
         ${YEARS.slice().reverse().map(y=>opt(y,y,EX.year)).join("")}</select></div>
       <div><label class="fl">Data source</label><select class="sel" style="width:100%" data-act="exSet" data-args="source" data-on="change">
         ${opt("","All sources",EX.source)}${sources.map(s=>opt(s.id,s.org,EX.source)).join("")}</select></div>
       <div><label class="fl">Reporting organisation</label><select class="sel" style="width:100%" data-act="exSet" data-args="org" data-on="change">
         ${opt("","All organisations",EX.org)}${[...new Set(IND.map(i=>i.owner))].map(o=>opt(o,ORG[o]?ORG[o].name:o,EX.org)).join("")}</select></div>
       <div><label class="fl">Evidence type</label><select class="sel" style="width:100%" data-act="exSet" data-args="evidence" data-on="change">
         ${opt("","All types",EX.evidence)}${Object.keys(EVIDENCE_LABEL).map(k=>opt(k,EVIDENCE_LABEL[k],EX.evidence)).join("")}</select></div>
       <div><label class="fl">Value origin</label><select class="sel" style="width:100%" data-act="exSet" data-args="origin" data-on="change">
         ${opt("","Any origin",EX.origin)}${opt("source-reported","Source-reported",EX.origin)}${opt("demo","Demo value",EX.origin)}</select></div>
       <div><label class="fl">Data status</label><select class="sel" style="width:100%" data-act="exSet" data-args="status" data-on="change">
         ${opt("","Any status",EX.status)}${["verified","in_review","unverified","not_reported"].map(k=>opt(k,VSTATE[k][1],EX.status)).join("")}</select></div>
       <div style="display:flex;align-items:flex-end"><button class="btn" style="width:100%" data-act="exReset">Clear filters</button></div>
     </div></div></div>
   <div class="row" style="grid-template-columns:1fr 1fr">
     ${cardF("Score distribution","all indicators matching your filters",`<div id="exHist" style="height:220px"></div>`)}
     ${cardF("Evidence quality mix","how these indicators are actually known",`<div id="exQual" style="height:220px"></div>`)}
   </div>
   <div class="card"><div class="bd flush"><div id="exBody"></div>
     <div style="padding:12px 15px;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
       <span class="small muted" id="exCount"></span>
       <span class="small muted">Click any row to open the full indicator record, including formula, history and evidence.</span></div>
   </div></div>`;
};
MOUNT.explorer=async function(){await renderEX();await exCharts()};
async function exCharts(){
  const rows=await exRows(),run=RUNS[EX.year];
  histogram(document.getElementById("exHist"),rows.map(r=>run.iS[r.code].score));
  const types=Object.keys(EVIDENCE_LABEL);
  const states=["verified","in_review","unverified","not_reported"];
  const el=document.getElementById("exQual");if(!el)return;
  const old=CHARTS.find(c=>c.getDom()===el);if(old){old.dispose();CHARTS=CHARTS.filter(c=>c!==old)}
  ec(el,{tooltip:{trigger:"axis",axisPointer:{type:"shadow"}},
    legend:{top:2,textStyle:{color:cssVar("--ec-axis"),fontSize:10.5}},
    grid:{left:120,right:20,top:34,bottom:26},
    xAxis:axis({type:"value",minInterval:1}),
    yAxis:axis({type:"category",data:types.map(t=>EVIDENCE_LABEL[t]).reverse(),axisLabel:{fontSize:11,color:cssVar("--txt2")}}),
    series:states.map((st,i)=>({name:VSTATE[st][1],type:"bar",stack:"q",barWidth:"62%",
      itemStyle:{color:[PAL[5],PAL[2],PAL[7],cssVar("--line2")][i]},
      data:types.map(t=>rows.filter(r=>r.evidenceType===t&&r.verification===st).length).reverse()}))},220);
}
async function exRows(){
  let rows=await api.indicators({q:EX.q,dim:EX.dim,source:EX.source,org:EX.org,evidence:EX.evidence,status:EX.status});
  if(EX.origin){
    const yr=EX.year;
    rows=rows.filter(i=>{const o=i.obs.find(x=>x.year===yr);return o&&(o.origin||"demo")===EX.origin});
  }
  const k=EX.sort;
  rows=rows.slice().sort((a,b)=>{
    const g=x=>k==="score"?(RUNS[EX.year].iS[x.code].score===null?-1:RUNS[EX.year].iS[x.code].score)
      :k==="conf"?RUNS[EX.year].iS[x.code].confidence:k==="updated"?x.lastUpdated:x[k];
    const va=g(a),vb=g(b);return (va>vb?1:va<vb?-1:0)*EX.dir});
  return rows;
}
function exSort(k){EX.dir=EX.sort===k?-EX.dir:1;EX.sort=k;renderEX()}
function exRefresh(){renderEX();exCharts()}
async function renderEX(){
  const rows=await exRows(),run=RUNS[EX.year];
  const box=document.getElementById("exBody");if(!box)return;
  document.getElementById("exCount").textContent=
    `${rows.length} of ${IND.length} indicators · reporting year ${EX.year} · ${rows.filter(r=>r.verification==="verified").length} verified, ${rows.filter(r=>r.notReported).length} not reported`;
  if(EX.view==="chart"){
    box.innerHTML=`<div id="exChart" style="height:${Math.max(340,rows.length*17)}px;padding:10px"></div>`;
    const old=CHARTS.find(c=>c.getDom()===document.getElementById("exChart"));if(old)old.dispose();
    ec(document.getElementById("exChart"),{
      tooltip:{trigger:"item",formatter:p=>{const I=rows[rows.length-1-p.dataIndex];const s=run.iS[I.code];
        return `<b>${I.name}</b><br>${I.code}<br>Value: <b>${rawFmt(I,s.raw)}</b> ${I.unit}<br>Score: <b>${s.assessed?fmt(s.score):"not reported"}</b><br><span style="font-size:11px;color:${cssVar("--mut")}">${SRC(I.sourceId).org}</span>`}},
      grid:{left:280,right:40,top:10,bottom:30},
      xAxis:axis({type:"value",max:100,name:"normalised score"}),
      yAxis:axis({type:"category",data:rows.map(r=>r.code+" · "+r.name.slice(0,32)).reverse(),axisLabel:{fontSize:10,color:cssVar("--ec-axis")}}),
      series:[{type:"bar",barWidth:"64%",data:rows.slice().reverse().map(r=>{const s=run.iS[r.code];
        return {value:s.assessed?+s.score.toFixed(1):0,itemStyle:{color:s.assessed?scColor(s.score):cssVar("--line2"),borderRadius:[0,3,3,0]}}})}]},
      Math.max(340,rows.length*17));
    return;
  }
  if(EX.view==="meta"){
    box.innerHTML=`<div class="scrollbox" style="max-height:66vh"><table class="dt"><thead><tr>
      <th>Indicator</th><th>Definition basis</th><th>Unit</th><th>Method</th><th>Geographic level</th><th>Reporting period</th>
      <th>Collection</th><th>Source</th><th>Contributor</th><th>Confidence</th><th>Last updated</th></tr></thead><tbody>
      ${rows.map(I=>{const s=run.iS[I.code];return `<tr class="clickable" data-act="indicator" data-args="${I.code}">
        <td><b class="mono">${I.code}</b><div class="small">${esc(I.name)}</div></td>
        <td class="small muted">${I.origin==="RWA"?"National AI policy implementation plan":I.origin==="NEW"?"Proposed addition, v1.2":I.origin+" global index"}</td>
        <td class="small">${esc(I.unit)}</td>
        <td class="small">${EVIDENCE_LABEL[I.evidenceType]}</td>
        <td class="small">${I.geoLevel}</td><td class="small mono">${EX.year}</td>
        <td class="small mono">${(I.obs.find(o=>o.year===EX.year)||{}).collected||"—"}</td>
        <td class="small"><span class="src" data-act="source" data-args="${I.sourceId}">${esc(SRC(I.sourceId).org)}</span></td>
        <td class="small muted">${esc(I.contributor)}</td>
        <td class="small mono">${pct(s.confidence)}</td>
        <td class="small mono">${I.lastUpdated}</td></tr>`}).join("")}
    </tbody></table></div>`;
    return;
  }
  const th=(k,l,n)=>`<th class="${n?"n":""}" style="cursor:pointer" data-act="exSort" data-args="${k}">${l}${EX.sort===k?(EX.dir>0?" ▲":" ▼"):""}</th>`;
  box.innerHTML=`<div class="scrollbox" style="max-height:66vh"><table class="dt"><thead><tr>
    ${th("code","Indicator")}${th("dim","Dim")}<th class="n">Value (${EX.year})</th>${th("score","Score",1)}<th class="n">Change</th>
    <th class="n">Trend</th><th class="n">Target</th>${th("conf","Confidence",1)}<th>Evidence type</th><th>Status</th><th>Source</th></tr></thead><tbody>
    ${rows.map(I=>{const s=run.iS[I.code],p=RUNS[Math.max(META.firstYear,EX.year-1)].iS[I.code];
      return `<tr class="clickable" data-act="indicator" data-args="${I.code}">
        <td><b class="mono" style="color:var(--brand)">${I.code}</b><div style="font-size:12.5px">${esc(I.name)}</div></td>
        <td><span class="tag" style="color:${DIMS.find(d=>d.id===I.dim).color}">${I.dim}</span></td>
        <td class="n mono">${s.raw===null?unavailable("not reported"):rawFmt(I,s.raw)+' <span class="muted small">'+esc(I.unit)+"</span>"}</td>
        <td class="n"><b style="color:${scColor(s.score)}">${s.assessed?fmt(s.score):"—"}</b></td>
        <td class="n">${deltaHtml(s.score,p.score)}</td>
        <td class="n">${spark(YEARS.map(y=>RUNS[y].iS[I.code].score||0),64,18)}</td>
        <td class="n mono muted">${rawFmt(I,I.target)}</td>
        <td class="n mono">${pct(s.confidence)}</td>
        <td class="small">${EVIDENCE_LABEL[I.evidenceType]}</td>
        <td>${(()=>{const o=I.obs.find(x=>x.year===EX.year);const org=o?(o.origin||"demo"):null;
          return org==="source-reported"?'<span class="qbadge q-verified">Source</span>'
               : org==="demo"?'<span class="qbadge q-modelled">Demo</span>':'<span class="small muted">—</span>'})()}</td>
        <td>${qbadge(I.verification)}</td>
        <td class="small"><span class="src" data-act="source" data-args="${I.sourceId}">${esc(SRC(I.sourceId).org)}</span></td></tr>`}).join("")}
  </tbody></table></div>`;
}
async function exportCSV(){
  const rows=await exRows(),run=RUNS[EX.year];
  const head=["code","name","dimension","output","year","value","unit","normalised_score","target","confidence",
    "evidence_type","verification","source","source_organisation","reporting_organisation","geographic_level","last_updated","methodology_version"];
  const body=rows.map(I=>{const s=run.iS[I.code];
    return [I.code,'"'+I.name+'"',I.dim,I.output,EX.year,s.raw===null?"":s.raw,I.unit,s.assessed?s.score.toFixed(2):"",
      I.target,s.confidence.toFixed(3),I.evidenceType,I.verification,I.sourceId,'"'+SRC(I.sourceId).org+'"',
      '"'+(ORG[I.owner]||{name:I.owner}).name+'"',I.geoLevel,I.lastUpdated,META.methodology].join(",")});
  download("rwanda-ai-tracker-indicators-"+EX.year+".csv",[head.join(",")].concat(body).join("\n"),"text/csv");
}
async function exportJSON(){
  const rows=await exRows(),run=RUNS[EX.year];
  const payload={platform:META.platform,generated:new Date().toISOString(),methodology:META.methodology,
    reportingYear:EX.year,licence:"Open — attribute Rwanda AI Tracker and the underlying source",
    observations:rows.map(I=>{const s=run.iS[I.code];return {code:I.code,name:I.name,dimension:I.dim,output:I.output,
      year:EX.year,value:s.raw,unit:I.unit,score:s.assessed?+s.score.toFixed(2):null,target:I.target,
      confidence:+s.confidence.toFixed(3),evidenceType:I.evidenceType,verification:I.verification,
      source:{id:I.sourceId,name:SRC(I.sourceId).name,organisation:SRC(I.sourceId).org,url:SRC(I.sourceId).url},
      reportingOrganisation:(ORG[I.owner]||{name:I.owner}).name,geographicLevel:I.geoLevel,lastUpdated:I.lastUpdated}})};
  download("rwanda-ai-tracker-"+EX.year+".json",JSON.stringify(payload,null,2),"application/json");
}
function download(name,content,type){
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1500);toast("Downloaded "+name);
}

/* =========================== SOURCES & EVIDENCE ========================== */
VIEWS.sources=async function(){
  const sources=await api.sources();
  const count=id=>IND.filter(i=>i.sourceId===id).length;
  return vh("Evidence","Sources and evidence",
    "Every figure on this platform resolves to a source. This is the full register: who produced it, when, how reliable it is, and how many indicators depend on it.")
  +`<div class="row" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
     ${kpi("Sources registered",sources.length,"across government, international bodies, academia and industry")}
     ${kpi("Indicators with a named source",IND.length,"100% of tracked indicators")}
     ${kpi("Third-party sourced",IND.filter(i=>i.evidenceType==="third-party").length,"independently published and comparable")}
     ${kpi("Estimated or contributed",IND.filter(i=>["estimated"].includes(i.evidenceType)).length,"lowest-confidence tier","var(--amber)")}
     ${kpi("Sources independently checked",Object.values(SOURCES).filter(s=>s.verification==="verified").length,
        "publisher and figures confirmed against the primary source","var(--green)",
        "Checked on 15 Sep 2026: the publisher was located and Rwanda's value cross-checked against at least two independent reports.")}
   </div>
   <div class="row" style="grid-template-columns:1fr">
     ${cardF("Source register","",
      `<table class="dt"><thead><tr><th>Source</th><th>Organisation</th><th>Class</th><th class="n">Year</th>
        <th class="n">Reliability</th><th class="n">Indicators</th><th>Checked</th><th>Reference</th></tr></thead><tbody>
       ${sources.map(s=>`<tr class="clickable" data-act="source" data-args="${s.id}">
         <td><b>${esc(s.name)}</b><div class="small muted">${esc(s.note)}</div></td>
         <td>${esc(s.org)}</td><td><span class="tag">${esc(s.provenanceClass||s.type)}</span></td>
         <td class="n mono">${s.year||"—"}</td>
         <td class="n"><div class="bar" style="width:70px;display:inline-block"><i style="width:${(s.reliability*100).toFixed(0)}%;background:${s.reliability>.85?"var(--green)":s.reliability>.7?"var(--teal)":"var(--amber)"}"></i></div>
           <span class="mono small"> ${(s.reliability*100).toFixed(0)}</span></td>
         <td class="n mono">${count(s.id)||""}</td>
         <td>${s.verification==="verified"?`<span class="qbadge q-verified" title="${esc(s.verifiedOn||"")}">Verified</span>`:`<span class="qbadge q-review">Not re-checked</span>`}</td>
         <td class="small">${s.url?`<a class="src" href="${s.url}" target="_blank" rel="noopener" >open ↗</a>`:unavailable("no public URL")}</td></tr>`).join("")}
      </tbody></table>`)}
   </div>
   <div class="row" style="grid-template-columns:1fr 1fr">
     ${card("How an indicator value is traced","",
       `<div class="prose"><p>Every published number follows the same chain, and every step is visible from the indicator record:</p></div>
        <div class="mono" style="background:var(--surface2);border:1px solid var(--line);border-radius:8px;padding:12px;font-size:11.5px;line-height:2">
          <b style="color:var(--brand)">SCORE</b> AI Maturity ${fmt(RUN.maturity.score)}<br>
          &nbsp;└─ <b style="color:var(--brand)">DIMENSION</b> D5 Private Sector Adoption ${fmt(RUN.dS.D5.score)}<br>
          &nbsp;&nbsp;&nbsp;&nbsp;└─ <b style="color:var(--brand)">OUTPUT</b> O11 ${fmt(RUN.oS.O11.score)}<br>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ <b style="color:var(--brand)">INDICATOR</b> RWA11-SUBe → ${fmt(RUN.iS["RWA11-SUBe"].score)}<br>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ <b style="color:var(--brand)">OBSERVATION</b> ${META.cycle} · ${rawFmt(BYCODE["RWA11-SUBe"],RUN.iS["RWA11-SUBe"].raw)} solutions<br>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ <b style="color:var(--brand)">SOURCE</b> use-case registry<br>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ <b style="color:var(--brand)">EVIDENCE</b> individual use-case records, each with its own source
        </div>`)}
     ${cardF("Contribution queue",CONTRIBUTIONS.length+" items",
       CONTRIBUTIONS.map(c=>`<div style="padding:12px 15px;border-bottom:1px solid var(--line)">
         <div style="display:flex;justify-content:space-between;gap:10px"><b>${esc(c.kind)}: ${esc(c.target)}</b>
           <span class="tag ${c.state.startsWith("Accepted")?"g":"a"}">${esc(c.state)}</span></div>
         <div class="small" style="margin-top:3px">${esc(c.value)}</div>
         <div class="small muted" style="margin-top:2px">${esc(c.who)} · submitted ${c.when} · reviewer ${esc(c.reviewer)}</div>
         <div class="small muted" style="margin-top:2px">${esc(c.note)}</div></div>`).join("")
       +`<div style="padding:12px 15px"><button class="btn pri sm" data-act="contribute">Submit a contribution</button></div>`)}
   </div>`;
};
function sourceDrawer(id){
  const s=SRC(id);if(!s)return;
  const inds=IND.filter(i=>i.sourceId===id);
  openDrawer(s.name,`SOURCE · ${s.type}`,
    card("About this source","",
      `<div class="prose"><p>${esc(s.note)}</p></div>
       <div class="kv"><span class="k">Publishing organisation</span><span class="v">${esc(s.org)}</span></div>
       <div class="kv"><span class="k">Reference year</span><span class="v mono">${s.year||"—"}</span></div>
       <div class="kv"><span class="k">Type</span><span class="v">${esc(s.type)}</span></div>
       <div class="kv"><span class="k">Reliability weighting</span><span class="v mono">${(s.reliability*100).toFixed(0)} / 100</span></div>
       <div class="kv"><span class="k">Indicators depending on it</span><span class="v mono">${inds.length}</span></div>
       <div class="kv"><span class="k">Provenance class</span><span class="v">${esc(s.provenanceClass||"unclassified")}</span></div>
       <div class="kv"><span class="k">Verification</span><span class="v">${s.verification==="verified"?`<span class="qbadge q-verified">Verified ${esc(s.verifiedOn||"")}</span>`:`<span class="qbadge q-review">Not re-checked</span>`}</span></div>
       ${s.verificationNote?`<div class="small muted" style="margin-top:8px">${esc(s.verificationNote)}</div>`:""}
       ${s.url?`<div style="margin-top:10px"><a class="btn sm" href="${s.url}" target="_blank" rel="noopener">Open the source ↗</a></div>`
         :`<div class="small muted" style="margin-top:10px">${unavailable("No public URL on record for this source")}</div>`}`)
    +(id==="ECON22"?`<div style="height:12px"></div>`+card("What this study contributes to the platform","",
      `<div class="prose"><p>The 2022 sizing study is the platform's evidence base for economic opportunity: the ${ECON2022.headline.totalMn}m full-potential figure, the sector split, the five lighthouse use cases, the social impact grading and the indicative cost of five ecosystem enabler initiatives.</p>
       <p>It is used strictly as <b>historical evidence</b>. Its figures are never presented as current statistics and never combined with live measurement into a single number.</p></div>
       <button class="btn sm" data-act="closeAndGo" data-args="investment">Open the investment view</button>`):"")
    +(inds.length?`<div style="height:12px"></div>`+cardF("Indicators from this source","",
      inds.map(i=>indRow(i)).join("")):""),
    `<b data-act="go" data-args="sources">Sources</b> › <b>${esc(s.org)}</b>`);
}
