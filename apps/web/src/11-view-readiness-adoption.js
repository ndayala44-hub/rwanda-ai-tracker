
/* ====================== AI READINESS & MATURITY ========================== */
VIEWS.readiness=async function(){
  const R=RUN.readiness,M=RUN.maturity;
  const strengths=IND.filter(i=>RUN.iS[i.code].assessed).sort((a,b)=>RUN.iS[b.code].score-RUN.iS[a.code].score);
  const rows=DIMS.map(D=>{const d=RUN.dS[D.id],p=PREV.dS[D.id];
    const outs=D.outputs.map(o=>({O:OUTPUTS.find(x=>x.id===o),s:RUN.oS[o]})).sort((a,b)=>a.s.score-b.s.score);
    return `<tr class="clickable" data-act="dimension" data-args="${D.id}">
      <td><b>${D.id}</b> ${esc(D.short)}<div class="small muted">${D.cls} · ${IND.filter(i=>i.dim===D.id).length} indicators</div></td>
      <td class="n"><b style="color:${scColor(d.score)};font-size:15px">${fmt(d.score)}</b></td>
      <td class="n">${deltaHtml(d.score,p.score)}</td>
      <td class="n">${spark(YEARS.map(y=>RUNS[y].dS[D.id].score||0),70,20,D.color)}</td>
      <td class="n mono">${(70-d.score).toFixed(1)}</td>
      <td class="n mono">${pct(d.coverage)}</td>
      <td>${confLabel(d.confidence)}</td>
      <td>${(()=>{const q=dataQuality(D.id);return `<span class="qbadge ${q.band==="strong"?"q-verified":q.band==="adequate"?"q-review":"q-unverified"}"
        title="Coverage ${pct(q.coverage)} · confidence ${pct(q.confidence)} · verified ${pct(q.verified)} · source-reported ${pct(q.sourceReported)}">${q.score.toFixed(0)}</span>`})()}</td>
      <td class="small muted">${esc(outs[0].O.n.slice(0,52))}…</td></tr>`}).join("");
  return vh("Measurement","AI readiness and maturity",
    "Two composites built from the same indicator register: readiness measures whether the preconditions exist; maturity measures whether AI is actually deployed, funded and governed. The distance between them is the story.",
    `<button class="btn" data-act="go" data-args="about">Methodology</button><button class="btn" data-act="go" data-args="explorer">All indicators</button>`)
  +`<div class="banner note"><b>How to read these numbers.</b> The national framework published in 2022 defines the indicators but not a scoring system, no weights, no aggregation rule and no maturity thresholds. Everything below is computed by this platform's declared methodology (${META.methodology}) and is labelled as such. It is an independent computation, not an official government score.
     <span class="src" data-act="go" data-args="about">Read the full methodology</span></div>
   <div class="row" style="grid-template-columns:1fr 1fr 1fr">
     ${card("AI Readiness Index","preconditions",
       `<div style="font-size:40px;font-weight:700;letter-spacing:-2px;color:${scColor(R.score)}">${fmt(R.score)}<span style="font-size:15px;color:var(--mut);font-weight:400"> / 100</span></div>
        <div class="small" style="margin-top:4px">${deltaHtml(R.score,PREV.readiness.score," pts")} since ${META.cycle-1}</div>
        <hr class="sep">
        <div class="kv"><span class="k">Member indicators</span><span class="v mono">${IND.filter(i=>i.mem==="R").length}</span></div>
        <div class="kv"><span class="k">Coverage</span><span class="v mono">${pct(R.coverage)}</span></div>
        <div class="kv"><span class="k">Confidence</span><span class="v">${confLabel(R.confidence)} (${pct(R.confidence)})</span></div>
        <div class="kv"><span class="k">Balance-adjusted</span><span class="v mono">${fmt(R.geometric)}</span></div>
        <div class="kv"><span class="k">Publication status</span><span class="v">${R.status}</span></div>`)}
     ${card("AI Maturity Index","observed adoption",
       `<div style="font-size:40px;font-weight:700;letter-spacing:-2px;color:${scColor(M.score)}">${fmt(M.score)}<span style="font-size:15px;color:var(--mut);font-weight:400"> / 100</span></div>
        <div class="small" style="margin-top:4px">${deltaHtml(M.score,PREV.maturity.score," pts")} since ${META.cycle-1}</div>
        <hr class="sep">
        <div class="kv"><span class="k">Member indicators</span><span class="v mono">${IND.filter(i=>i.mem==="M").length}</span></div>
        <div class="kv"><span class="k">Coverage</span><span class="v mono">${pct(M.coverage)}</span></div>
        <div class="kv"><span class="k">Confidence</span><span class="v">${confLabel(M.confidence)} (${pct(M.confidence)})</span></div>
        <div class="kv"><span class="k">Balance-adjusted</span><span class="v mono">${fmt(M.geometric)}</span></div>
        <div class="kv"><span class="k">Publication status</span><span class="v">${M.status}</span></div>`)}
     ${card("Maturity level","score band × capability gates",
       `<div style="display:flex;align-items:baseline;gap:10px">
          <span style="font-size:40px;font-weight:700;letter-spacing:-2px;color:var(--brand)">L${ML.assigned}</span>
          <span style="font-size:16px;font-weight:600">${ML.def.n}</span></div>
        <div class="small muted" style="margin-top:4px">${esc(ML.def.d)}</div>
        <hr class="sep">
        <div class="kv"><span class="k">Score band</span><span class="v mono">L${ML.band}</span></div>
        <div class="kv"><span class="k">Capability gate</span><span class="v mono">L${ML.gate}</span></div>
        ${ML.binding.length?`<div style="margin-top:9px;font-size:12.5px;color:var(--amber)"><b>Held back by:</b> ${ML.binding.map(b=>esc(b.label)).join("; ")}. These are decisions, not investments.</div>`
          :`<div style="margin-top:9px;font-size:12.5px;color:var(--green)">No unmet capability gate, the level is limited by the score itself.</div>`}
        <button class="btn sm" style="margin-top:10px" data-act="ladder">See the full ladder</button>`)}
   </div>
   <div class="row" style="grid-template-columns:1.2fr 1fr">
     ${cardF("Dimension performance","click any row for the full assessment",
       `<div class="scrollbox"><table class="dt"><thead><tr><th>Dimension</th><th class="n">Score</th><th class="n">Change</th>
        <th class="n">Trend</th><th class="n">Gap to 70</th><th class="n">Coverage</th><th>Confidence</th><th>Data quality<span class="info" data-tip="How well the dimension is measured, as distinct from how well Rwanda is doing. 30% coverage, 30% confidence, 20% source verification, 20% share of values actually reported by a source.">i</span></th><th>Weakest output</th></tr></thead>
        <tbody>${rows}</tbody></table></div>`)}
     ${cardF("Dimension profile","readiness contribution",`<div id="rdRadar" style="height:330px"></div>`)}
   </div>
   <div class="row" style="grid-template-columns:1.25fr 1fr">
     ${cardF("Independent expert assessment, 2026","fourteen dimensions, 1 to 5, analyst judgement, not a computed index",
       `<div id="rdL26" style="height:360px"></div>
        <div style="padding:0 15px 13px" class="small muted">${esc(L26.maturityAssessment2026.note)} ${srcLine("LANDSCAPE26")}</div>`)}
     ${card("Reading the bimodality","national average "+L26.maturityAssessment2026.nationalAverage+" of 5",
       `<div class="prose"><p>${esc(L26.maturityAssessment2026.reading)}</p></div>
        <hr class="sep">
        <div class="kv"><span class="k">Institutional pole (≥3.0)</span><span class="v mono">${L26.maturityAssessment2026.dimensions.filter(d=>d.score>=3).length} dimensions</span></div>
        <div class="kv"><span class="k">Capability and capital pole (≤2.2)</span><span class="v mono">${L26.maturityAssessment2026.dimensions.filter(d=>d.score<=2.2).length} dimensions</span></div>
        <div class="kv"><span class="k">Between 2.2 and 3.0</span><span class="v mono">${L26.maturityAssessment2026.dimensions.filter(d=>d.score>2.2&&d.score<3).length} dimensions</span></div>
        <div class="small muted" style="margin-top:10px">This assessment is deliberately kept beside the platform's computed readiness (${fmt(RUN.readiness.score)}) and maturity (${fmt(RUN.maturity.score)}) scores rather than merged into them. It is qualitative expert judgement; the composites are calculated from observations. Presenting them as one number would hide which is which.</div>`)}
   </div>

   <div class="row" style="grid-template-columns:1.2fr 1fr">
     ${cardF("Every indicator, scored against how much we trust it","bubble size = share of the national index · click any point",
       `<div id="rdBubble" style="height:340px"></div>
        <div style="padding:0 15px 13px" class="small muted">The bottom-left quadrant is the real problem area: weak scores we are also not confident about. Hover for the indicator, click to open its record.</div>`)}
     ${cardF("Six dimensions, eight years","small multiples, same scale",`<div id="rdSmall" style="height:340px"></div>`)}
   </div>

   <div class="row" style="grid-template-columns:1fr 1fr">
     ${cardF("Strongest indicators","top 8 by normalised score",
       strengths.slice(0,8).map(i=>indRow(i)).join(""))}
     ${cardF("Weakest indicators","bottom 8, where intervention would move the index",
       strengths.slice(-8).reverse().map(i=>indRow(i)).join(""))}
   </div>`;
};
function indRow(i){
  const s=RUN.iS[i.code],p=PREV.iS[i.code];
  return `<div style="padding:10px 15px;border-bottom:1px solid var(--line);cursor:pointer" data-act="indicator" data-args="${i.code}">
    <div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline">
      <span style="font-size:13px">${esc(i.name)}</span>
      <b style="color:${scColor(s.score)}">${s.assessed?fmt(s.score):"n/a"}</b></div>
    <div class="prov" style="margin-top:4px"><span class="mono">${i.code}</span> · ${rawFmt(i,s.raw)} ${esc(i.unit)} · ${deltaHtml(s.score,p.score)}
      · ${qbadge(i.verification)} · ${esc(SRC(i.sourceId).org)}</div></div>`;
}
MOUNT.readiness=async function(){
  const L=L26.maturityAssessment2026.dimensions.slice().sort((a,b)=>a.score-b.score);
  ec(document.getElementById("rdL26"),{
    tooltip:{trigger:"axis",axisPointer:{type:"shadow"},formatter:ps=>`<b>${ps[0].name}</b><br>Assessed at <b>${ps[0].value}</b> of 5<br><span style="font-size:11px;color:${cssVar("--mut")}">${L[ps[0].dataIndex].pole} pole · analyst judgement</span>`},
    grid:{left:150,right:44,top:14,bottom:32},
    xAxis:axis({type:"value",max:5,name:"assessed score",nameTextStyle:{color:cssVar("--ec-axis"),fontSize:10}}),
    yAxis:axis({type:"category",data:L.map(d=>d.name),axisLabel:{fontSize:11,color:cssVar("--txt2")}}),
    series:[{type:"bar",barWidth:"66%",itemStyle:{borderRadius:[0,4,4,0]},
      data:L.map(d=>({value:d.score,itemStyle:{color:d.pole==="institutional"?PAL[0]:d.pole==="capability"?PAL[2]:PAL[3]}})),
      label:{show:true,position:"right",fontSize:10.5,color:cssVar("--ec-axis")},
      markLine:{silent:true,symbol:"none",label:{formatter:"national average "+L26.maturityAssessment2026.nationalAverage,fontSize:10,color:cssVar("--mut")},
        lineStyle:{color:cssVar("--line2"),type:"dashed"},data:[{xAxis:L26.maturityAssessment2026.nationalAverage}]}}]},360);
  const pts=IND.filter(i=>RUN.iS[i.code].assessed).map(i=>{
    const sc=RUN.iS[i.code],D=DIMS.find(d=>d.id===i.dim);
    const share=100/IND.filter(x=>x.output===i.output).length/D.outputs.length/6;
    return {value:[+sc.score.toFixed(1),+(sc.confidence*100).toFixed(1),+share.toFixed(2)],code:i.code,name:i.name,dim:i.dim,color:D.color};
  });
  ec(document.getElementById("rdBubble"),{
    tooltip:{trigger:"item",formatter:p=>`<b>${p.data.name}</b><br>${p.data.code} · ${p.data.dim}<br>Score <b>${p.data.value[0]}</b> · confidence <b>${p.data.value[1]}%</b><br><span style="font-size:11px;color:${cssVar("--mut")}">${p.data.value[2]}% of the national index</span>`},
    grid:{left:52,right:26,top:22,bottom:46},
    xAxis:axis({type:"value",min:0,max:100,name:"normalised score →",nameLocation:"middle",nameGap:28,nameTextStyle:{color:cssVar("--ec-axis")}}),
    yAxis:axis({type:"value",min:20,max:100,name:"confidence % →",nameLocation:"middle",nameGap:36,nameTextStyle:{color:cssVar("--ec-axis")}}),
    series:[{type:"scatter",data:pts,symbolSize:d=>10+d[2]*9,
      itemStyle:{color:p=>p.data.color,opacity:.78,borderColor:cssVar("--surface"),borderWidth:1},
      emphasis:{focus:"self",itemStyle:{opacity:1}},
      markArea:{silent:true,itemStyle:{color:"rgba(192,57,43.07)"},
        data:[[{xAxis:0,yAxis:20,name:"weak and uncertain"},{xAxis:45,yAxis:60}]],
        label:{color:cssVar("--mut"),fontSize:10,position:"insideBottomLeft"}}}]},340)
   .on("click",p=>indDrawer(p.data.code));
  ec(document.getElementById("rdSmall"),{
    tooltip:{trigger:"axis"},
    grid:DIMS.map((D,i)=>({left:(i%3)*33+6+"%",top:i<3?"8%":"56%",width:"25%",height:"32%"})),
    xAxis:DIMS.map((D,i)=>axis({gridIndex:i,type:"category",data:YEARS,axisLabel:{show:i>2,fontSize:9},boundaryGap:false})),
    yAxis:DIMS.map((D,i)=>axis({gridIndex:i,type:"value",max:100,axisLabel:{fontSize:9},splitLine:{show:false}})),
    title:DIMS.map((D,i)=>({text:D.short,left:(i%3)*33+6+"%",top:i<3?"1%":"49%",textStyle:{fontSize:11,color:cssVar("--txt2"),fontWeight:600}})),
    series:DIMS.map((D,i)=>({type:"line",xAxisIndex:i,yAxisIndex:i,smooth:.3,symbol:"none",
      data:YEARS.map(y=>+(RUNS[y].dS[D.id].score||0).toFixed(1)),
      lineStyle:{width:2,color:D.color},areaStyle:{color:D.color,opacity:.12}}))},340);
  ec(document.getElementById("rdRadar"),{
    tooltip:{trigger:"item"},legend:{bottom:0,textStyle:{color:cssVar("--ec-axis"),fontSize:11}},
    radar:{center:["50%","46%"],radius:"66%",
      indicator:DIMS.map(D=>({name:D.short,max:100})),
      axisName:{color:cssVar("--ec-axis"),fontSize:10.5},
      splitLine:{lineStyle:{color:cssVar("--ec-split")}},axisLine:{lineStyle:{color:cssVar("--ec-split")}},
      splitArea:{areaStyle:{color:["transparent",cssVar("--surface2")]}}},
    series:[{type:"radar",symbolSize:4,data:[
      {name:"Current "+META.cycle,value:DIMS.map(D=>+(RUN.dS[D.id].score||0).toFixed(1)),
        lineStyle:{width:2.4,color:PAL[0]},itemStyle:{color:PAL[0]},areaStyle:{color:"rgba(14,136,204.15)"}},
      {name:META.cycle-3,value:DIMS.map(D=>+(RUNS[META.cycle-3].dS[D.id].score||0).toFixed(1)),
        lineStyle:{width:1.5,color:cssVar("--mut"),type:"dashed"},itemStyle:{color:cssVar("--mut")}}]}]},330);
};
function ladderDrawer(){
  openDrawer("AI maturity ladder","Assigned level = min(score band, capability gate)",
    LADDER.map(L=>{const unmet=L.gates.filter(g=>!gateOK(g[0],RUN));
      const state=L.l<ML.assigned?"passed":L.l===ML.assigned?"current":"not reached";
      return `<div class="card" style="margin-bottom:10px"><div class="bd">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline">
          <div><b style="font-size:15px">L${L.l} · ${L.n}</b>
            <span class="tag ${state==="current"?"b":state==="passed"?"g":""}" style="margin-left:6px">${state}</span></div>
          <span class="mono muted">${L.min}–${L.max}</span></div>
        <div class="small muted" style="margin-top:5px">${esc(L.d)}</div>
        ${L.gates.length?`<div style="margin-top:9px">${L.gates.map(g=>{const ok=gateOK(g[0],RUN);
          return `<div class="kv" style="cursor:pointer" data-act="indicator" data-args="${g[0]}">
            <span class="k">${ok?'<span style="color:var(--green)">✔</span>':'<span style="color:var(--red)">✗</span>'} ${esc(g[1])}</span>
            <span class="v mono">${rawFmt(BYCODE[g[0]],RUN.iS[g[0]].raw)}</span></div>`}).join("")}</div>`:""}
      </div></div>`}).join("")
    +card("Why gates as well as a score","",`<div class="prose">A country should not be able to reach a higher maturity level by accumulating easy indicators while lacking foundational institutions. Each level therefore carries capability gates that must all be satisfied, and the assigned level is the lower of the score band and the gate level. Right now Rwanda's score band would place it at L${ML.band}; the gates hold it at L${ML.gate}.</div>`));
}

/* ================================ AI ADOPTION ============================ */
VIEWS.adoption=async function(){
  const ucs=await api.useCases();
  const verified=ucs.filter(u=>u.status==="verified");
  const stages=["PoC","Pilot","Production","Scaled"];
  const R=RUN.readiness,M=RUN.maturity;
  return vh("Measurement","AI adoption",
    "Where AI is actually running in Rwanda, by sector, lifecycle stage and organisation, and how far observed adoption lags the enabling capability already in place.")
  +`<div class="row" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
    ${kpi("Registered deployments",verified.length,`${ucs.length-verified.length} contributed records awaiting verification`)}
    ${kpi("In production or scaled",verified.filter(u=>["Production","Scaled"].includes(u.stage)).length,"past pilot stage")}
    ${kpi("Public sector",verified.filter(u=>u.publicSector).length,"government and state deployments")}
    ${kpi("Conversion deficit",(R.score-M.score).toFixed(1)+" pts","readiness minus maturity","var(--amber)",
      "Capability that has not yet become deployment.")}
    ${kpi("Sectors with any adoption",[...new Set(verified.map(u=>u.sector))].length+" of "+SECTORS.length,"sectors represented in the registry")}
   </div>
   <div class="row" style="grid-template-columns:1fr 1fr 1fr">
     ${cardF("Adoption funnel","registered use cases by lifecycle stage",`<div id="adFunnel" style="height:290px"></div>`)}
     ${cardF("Sector → stage","click a segment to filter the platform",`<div id="adSun" style="height:290px"></div>`)}
     ${cardF("Capability against deployment","enablers vs accelerators",`<div id="adGap" style="height:290px"></div>`)}
   </div>
   <div class="row" style="grid-template-columns:1fr 1fr 1fr">
     ${card("Measured frontier AI usage","the demand-side gap",
       `<div style="display:flex;align-items:baseline;gap:10px">
          <span style="font-size:38px;font-weight:700;letter-spacing:-1.6px;color:var(--red)">${L26.measuredAdoption.usageIndex.toFixed(2)}x</span>
          <span class="muted">of the expected 1.00</span></div>
        <div class="small muted" style="margin-top:4px">Ranked ${L26.measuredAdoption.usageRank} of ${L26.measuredAdoption.usageUniverse} economies</div>
        <div class="bar" style="margin-top:10px"><i style="width:${L26.measuredAdoption.usageIndex*100}%;background:var(--red)"></i></div>
        <hr class="sep">
        <div class="prose" style="font-size:12.5px"><p><b>Why it matters.</b> ${esc(L26.measuredAdoption.whyItMatters)}</p>
         <p><b>What drives it.</b> ${esc(L26.measuredAdoption.whatDrivesIt)}</p>
         <p><b>The opportunity.</b> ${esc(L26.measuredAdoption.opportunity)}</p></div>
        ${srcLine("ANTHROPIC_EI")}
        <div class="small muted" style="margin-top:6px">${esc(L26.measuredAdoption.caveat)}</div>`)}
     ${cardF("What Rwandans use AI for","share of conversations by category",
       `<div id="adUse" style="height:300px"></div>
        <div style="padding:0 15px 13px" class="small muted">${esc(L26.measuredAdoption.composition)}</div>`)}
     ${cardF("Distinctive topics versus the global average","multiple of global use",
       `<div id="adTopics" style="height:300px"></div>
        <div style="padding:0 15px 13px" class="small muted">${esc(L26.measuredAdoption.launchpadSignal)}</div>`)}
   </div>
   <div class="row" style="grid-template-columns:1fr">
     ${card("Where these use cases come from","the registry draws on four sources, reconciled into one view",
      `<div class="prose">
        <p>The use case registry is assembled from named sources rather than compiled by this platform alone.
         <b>RAIA's national record is the largest contributor</b>, supplying ${RECORD.useCases.length} verified
         entries. This platform's register has been reconciled against it: every entry now carries whether it
         appears on the national record, and the three deployments common to both have been merged rather than
         double counted.</p></div>
       <table class="dt" style="margin:10px 0"><thead><tr><th>Source</th><th class="n">Entries</th><th>What it covers</th><th>Status</th></tr></thead><tbody>
        <tr data-act="source" data-args="RAIA_CATALOGUE"><td><b>RAIA national record</b><div class="small muted">Rwanda Artificial Intelligence Agency</div></td>
          <td class="n mono">${USECASES.filter(u=>u.onNationalRecord).length}</td>
          <td class="small muted">Verified public and private deployments across six sectors, reviewed against primary documentation and dated</td>
          <td>${qbadge("verified")}</td></tr>
        <tr data-act="source" data-args="LANDSCAPE26"><td><b>2026 landscape review</b><div class="small muted">Aurasoft Ltd, independent</div></td>
          <td class="n mono">${USECASES.filter(u=>u.src==="LANDSCAPE26").length}</td>
          <td class="small muted">National flagship initiatives and the partnership programmes behind them</td>
          <td>${qbadge("verified")}</td></tr>
        <tr data-act="source" data-args="AIRM22"><td><b>2022 readiness assessment</b><div class="small muted">MINICT / C4IR / GIZ</div></td>
          <td class="n mono">${USECASES.filter(u=>u.src==="AIRM22").length}</td>
          <td class="small muted">Deployments recorded at the time of the national assessment</td>
          <td>${qbadge("unverified")}</td></tr>
        <tr data-act="contribute" data-args="Use case"><td><b>Contributed</b><div class="small muted">Open submission</div></td>
          <td class="n mono">${USECASES.filter(u=>u.src==="CONTRIB").length}</td>
          <td class="small muted">Submitted by organisations working in the ecosystem, published after review</td>
          <td>${qbadge("in_review")}</td></tr>
       </tbody></table>
       <div class="small muted">${esc(RAIA.record.retrievalNote)}</div>
       ${srcLine("RAIA_CATALOGUE","reconciled against the platform's own register")}`)}
   </div>

   <div class="row" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
     ${kpi("Deployed at national scale",RECORD.useCases.filter(u=>u.raiaStage==="Deployed at scale").length,
        "operating, not piloting","var(--green)",
        "Entries RAIA records as deployed at scale. These are the proven deployments a partner can build on rather than fund from scratch.")}
     ${kpi("In pilot or scaling",RECORD.useCases.filter(u=>["Pilot/MVP","Scaling"].includes(u.raiaStage)).length,
        "proven enough to evaluate, not yet national","var(--teal)",
        "The stage where capital and delivery capacity make the most difference to whether a deployment survives.")}
     ${kpi("At concept or research",RECORD.useCases.filter(u=>["Concept","User research"].includes(u.raiaStage)).length,
        "earliest stage on the record","var(--amber)")}
     ${kpi("Health share of the record",Math.round(100*RECORD.useCases.filter(u=>u.raiaSector==="Health").length/RECORD.useCases.length),
        `${RECORD.useCases.filter(u=>u.raiaSector==="Health").length} of ${RECORD.useCases.length} entries`,"var(--amber)",
        "Concentration is a risk as well as a strength: one sector carries a large share of national AI delivery experience.",{suf:"%"})}
     ${kpi("Institutions delivering",RECORD.institutions.length,
        `across ${RECORD.taxonomy.sectors.length} sectors`,"var(--txt)")}
   </div>

   <div class="row" style="grid-template-columns:1.2fr 1fr">
     ${cardF("The national record by sector and stage",RECORD.useCases.length+" verified entries",
       `<div id="adRecord" style="height:320px"></div>
        <div style="padding:0 15px 13px" class="small muted">${esc(RECORD.taxonomy.stageNote)}</div>`)}
     ${cardF("Who owns the national record","institutions by entries on record",
       `<div class="scrollbox" style="max-height:320px"><table class="dt"><thead><tr>
         <th>Institution</th><th>Type</th><th class="n">Entries</th></tr></thead><tbody>
        ${RECORD.institutions.slice().sort((a,b)=>b.entriesOnRecord-a.entriesOnRecord).map(x=>`<tr>
          <td><b>${esc(x.name)}</b><div class="small muted">${esc(x.role)}</div></td>
          <td><span class="tag">${esc(x.type)}</span></td>
          <td class="n mono">${x.entriesOnRecord}</td></tr>`).join("")}
       </tbody></table></div>`)}
   </div>

   <div class="row" style="grid-template-columns:1fr">
     ${cardF("Every entry on the national record","what is running, who owns it, and how far along it is",
       `<div class="scrollbox" style="max-height:480px"><table class="dt"><thead><tr>
         <th>Use case</th><th>Sector</th><th>Owner</th><th>Stage</th></tr></thead><tbody>
        ${RECORD.useCases.slice().sort((a,b)=>a.raiaSector.localeCompare(b.raiaSector)||a.name.localeCompare(b.name))
          .map(x=>`<tr><td><b>${esc(x.name)}</b><div class="small muted" style="max-width:640px">${esc(x.description)}</div></td>
            <td class="small">${esc(x.raiaSector)}</td><td class="small">${esc(x.owner)}</td>
            <td><span class="tag ${x.raiaStage==="Deployed at scale"?"g":x.raiaStage==="Scaling"?"b":x.raiaStage==="Pilot/MVP"?"a":""}">${esc(x.raiaStage)}</span></td></tr>`).join("")}
       </tbody></table></div>
       <div style="padding:12px 15px;border-top:1px solid var(--line)" class="small muted">
        Read stage as readiness for capital. <b>Deployed at scale</b> means a working system with operational
        history. <b>Scaling</b> and <b>Pilot/MVP</b> are where delivery capacity and financing decide whether a
        deployment survives. <b>Concept</b> and <b>User research</b> are design-stage. Source: RAIA's national
        record, reconciled against this platform's register.</div>`)}
   </div>

   <div class="row" style="grid-template-columns:1fr">
     ${cardF("When each deployment started","every registered use case on one timeline",
       `<div id="adTime" style="height:250px"></div>
        <div style="padding:0 15px 13px" class="small muted">Deployment began years before Rwanda had an AI policy. The cluster after 2019 is when the ecosystem, rather than individual firms, started producing use cases.</div>`)}
   </div>
   <div class="row" style="grid-template-columns:1fr">
     ${cardF("Use case registry",verified.length+" verified · "+(ucs.length-verified.length)+" pending",
      `<div class="scrollbox" style="max-height:460px"><table class="dt"><thead><tr>
        <th>Use case</th><th>Organisation</th><th>Sector</th><th>Stage</th><th class="n">Since</th><th>Risk</th><th>District</th><th>Status</th></tr></thead><tbody>
        ${ucs.filter(u=>!FILTER.sector||u.sector===FILTER.sector).map(u=>`<tr class="clickable" data-act="useCase" data-args="${u.id}">
          <td><b>${esc(u.name)}</b><div class="small muted">${esc(u.desc.slice(0,78))}…</div></td>
          <td>${esc((ORG[u.org]||{name:u.org}).name)}</td>
          <td><span class="tag">${esc(SECTOR[u.sector].name)}</span></td>
          <td><span class="tag ${u.stage==="Scaled"?"g":u.stage==="Production"?"b":""}">${u.stage}</span></td>
          <td class="n mono">${u.since}</td>
          <td>${u.risk==="High"?'<span class="tag a">High</span>':u.risk}</td>
          <td class="small">${esc((DISTRICTS.find(d=>d.code===u.district)||{name:", "}).name)}</td>
          <td>${qbadge(u.status==="verified"?"verified":"in_review")}</td></tr>`).join("")}
       </tbody></table></div>
       <div style="padding:12px 15px;border-top:1px solid var(--line)" class="small muted">
         The registry is the measurement instrument behind six indicators. RWA10, RWA10-SUBd, RWA11-SUBe, RWA11-SUBa, RWA12-SUBa and RWA12-SUBf-C.
         Counts here are what those indicators report. ${srcLine("AIRM22","plus contributed records")}</div>`)}
   </div>`;
};
MOUNT.adoption=async function(){
  const ucs=(await api.useCases()).filter(u=>u.status==="verified");
  const stages=["PoC","Pilot","Production","Scaled"];
  ec(document.getElementById("adFunnel"),{
    tooltip:{trigger:"item"},grid:{left:90,right:40,top:14,bottom:26},
    xAxis:axis({type:"value",minInterval:1}),
    yAxis:axis({type:"category",data:stages.slice().reverse(),axisLabel:{color:cssVar("--txt2"),fontSize:12}}),
    series:[{type:"bar",barWidth:"56%",itemStyle:{borderRadius:[0,4,4,0]},
      data:stages.slice().reverse().map((s,i)=>({value:ucs.filter(u=>u.stage===s).length,
        itemStyle:{color:PAL[[1,0,2,3][i]]}})),
      label:{show:true,position:"right",color:cssVar("--ec-axis"),fontSize:11}}]},280);
  // the national record, by sector and stage
  const recStages=RECORD.taxonomy.stages, recSectors=RECORD.taxonomy.sectors;
  ec(document.getElementById("adRecord"),{
    tooltip:{trigger:"axis",axisPointer:{type:"shadow"}},
    legend:{top:2,type:"scroll",textStyle:{color:cssVar("--ec-axis"),fontSize:10.5}},
    grid:{left:130,right:20,top:34,bottom:28},
    xAxis:axis({type:"value",minInterval:1}),
    yAxis:axis({type:"category",data:recSectors.slice().reverse(),axisLabel:{fontSize:11,color:cssVar("--txt2")}}),
    series:recStages.map((st,i)=>({name:st,type:"bar",stack:"r",barWidth:"62%",
      itemStyle:{color:[cssVar("--line2"),PAL[7],PAL[2],PAL[0],PAL[5]][i]},
      data:recSectors.slice().reverse().map(sec=>RECORD.useCases.filter(u=>u.raiaSector===sec&&u.raiaStage===st).length)}))},320);

  const ua=L26.measuredAdoption;
  ec(document.getElementById("adUse"),{
    tooltip:{trigger:"item",formatter:p=>`<b>${p.name}</b><br>${p.value}% of conversations`},
    legend:{bottom:0,type:"scroll",textStyle:{color:cssVar("--ec-axis"),fontSize:10.5}},
    series:[{type:"pie",radius:["42%","70%"],center:["50%","42%"],
      itemStyle:{borderColor:cssVar("--surface"),borderWidth:2},label:{show:false},
      data:ua.byCategory.map((c,i)=>({name:c.name,value:c.share,itemStyle:{color:PAL[i%PAL.length]}}))}]},300);
  const tp=ua.distinctiveTopics.slice().sort((a,b)=>a.multiple-b.multiple);
  ec(document.getElementById("adTopics"),{
    tooltip:{trigger:"axis",axisPointer:{type:"shadow"},formatter:ps=>`<b>${ps[0].name}</b><br><b>${ps[0].value}x</b> the global average`},
    grid:{left:150,right:40,top:14,bottom:30},
    xAxis:axis({type:"value",name:"× global average",nameTextStyle:{color:cssVar("--ec-axis"),fontSize:10}}),
    yAxis:axis({type:"category",data:tp.map(t=>t.name),axisLabel:{fontSize:10.5,color:cssVar("--txt2")}}),
    series:[{type:"bar",barWidth:"66%",itemStyle:{borderRadius:[0,4,4,0]},
      data:tp.map(t=>({value:t.multiple,itemStyle:{color:t.multiple>=2.5?PAL[1]:t.multiple>=2?PAL[0]:cssVar("--line2")}})),
      label:{show:true,position:"right",formatter:"{c}x",fontSize:10.5,color:cssVar("--ec-axis")},
      markLine:{silent:true,symbol:"none",label:{formatter:"global average",fontSize:10,color:cssVar("--mut")},
        lineStyle:{color:cssVar("--line2"),type:"dashed"},data:[{xAxis:1}]}}]},300);
  const all=await api.useCases();
  const sectorsWith=[...new Set(ucs.map(u=>u.sector))];
  ec(document.getElementById("adSun"),{
    tooltip:{trigger:"item",formatter:p=>`<b>${p.name}</b><br><b>${p.value}</b> use case${p.value>1?"s":""}`},
    series:[{type:"sunburst",radius:[18,"92%"],center:["50%","50%"],
      itemStyle:{borderColor:cssVar("--surface"),borderWidth:2},
      label:{fontSize:10,color:cssVar("--txt2"),minAngle:14},
      data:sectorsWith.map((sid,i)=>({name:SECTOR[sid].name,sid,itemStyle:{color:PAL[i%PAL.length]},
        children:stages.filter(st=>ucs.some(u=>u.sector===sid&&u.stage===st))
          .map(st=>({name:st,value:ucs.filter(u=>u.sector===sid&&u.stage===st).length,
            itemStyle:{color:PAL[i%PAL.length],opacity:.55}}))}))}]},290)
   .on("click",p=>{const s=SECTORS.find(x=>x.name===(p.treePathInfo&&p.treePathInfo[1]?p.treePathInfo[1].name:p.name));
     if(s)setFilter("sector",s.id)});
  ec(document.getElementById("adTime"),{
    tooltip:{trigger:"item",formatter:p=>`<b>${p.data.n}</b><br>${p.data.o}<br>${p.data.st} since ${p.data.value[0]}`},
    grid:{left:140,right:26,top:18,bottom:34},
    xAxis:axis({type:"value",min:2013,max:META.cycle+1,axisLabel:{formatter:v=>v}}),
    yAxis:axis({type:"category",data:sectorsWith.map(s=>SECTOR[s].name),axisLabel:{fontSize:11,color:cssVar("--txt2")}}),
    series:[{type:"scatter",symbolSize:d=>({PoC:10,Pilot:14,Production:18,Scaled:23})[d[2]]||12,
      data:all.map(u=>({value:[u.since,SECTOR[u.sector].name,u.stage],n:u.name,o:(ORG[u.org]||{name:u.org}).name,st:u.stage,id:u.id})),
      itemStyle:{color:p=>p.data.st==="Scaled"?PAL[5]:p.data.st==="Production"?PAL[0]:p.data.st==="Pilot"?PAL[2]:cssVar("--line2"),opacity:.85,
        borderColor:cssVar("--surface"),borderWidth:1.5},
      markLine:{silent:true,symbol:"none",label:{formatter:"National AI policy developed",fontSize:10,color:cssVar("--mut"),position:"insideEndTop"},
        lineStyle:{color:cssVar("--brand"),type:"dashed"},data:[{xAxis:2022}]}}]},250)
   .on("click",p=>ucDrawer(p.data.id));
  ec(document.getElementById("adGap"),{
    tooltip:{trigger:"axis",axisPointer:{type:"shadow"}},
    legend:{top:4,textStyle:{color:cssVar("--ec-axis"),fontSize:11}},
    grid:{left:44,right:16,top:40,bottom:56},
    xAxis:axis({type:"category",data:DIMS.map(d=>d.short),axisLabel:{color:cssVar("--ec-axis"),fontSize:10,interval:0,rotate:22}}),
    yAxis:axis({type:"value",max:100}),
    series:[{name:"Score",type:"bar",barWidth:"48%",itemStyle:{borderRadius:[4,4,0,0]},
      data:DIMS.map(D=>({value:+(RUN.dS[D.id].score||0).toFixed(1),itemStyle:{color:D.cls==="Enabler"?PAL[0]:D.cls==="Accelerator"?PAL[3]:PAL[4]}}))},
      {name:"Reference target",type:"line",data:DIMS.map(()=>70),symbol:"none",lineStyle:{type:"dashed",color:cssVar("--line2")}}]},280);
};
function ucDrawer(id){
  const u=USECASES.find(x=>x.id===id);if(!u)return;
  const o=ORG[u.org]||{name:u.org,type:", ",role:", "};
  const econ=ECON2022.lighthouse.find(l=>l.sector===u.sector);
  openDrawer(u.name,`USE CASE · ${SECTOR[u.sector].name} · ${u.stage}`,
    card("Record","",`
      <div class="kv"><span class="k">Organisation</span><span class="v">${esc(o.name)} <span class="muted">(${esc(o.type)})</span></span></div>
      <div class="kv"><span class="k">Sector</span><span class="v">${esc(SECTOR[u.sector].name)}</span></div>
      <div class="kv"><span class="k">Lifecycle stage</span><span class="v">${u.stage}</span></div>
      <div class="kv"><span class="k">Operating since</span><span class="v mono">${u.since}</span></div>
      <div class="kv"><span class="k">District</span><span class="v">${esc((DISTRICTS.find(d=>d.code===u.district)||{name:", "}).name)}</span></div>
      <div class="kv"><span class="k">Sector type</span><span class="v">${u.publicSector?"Public":"Private"}</span></div>
      <div class="kv"><span class="k">Risk classification</span><span class="v">${u.risk}</span></div>
      <div class="kv"><span class="k">Verification</span><span class="v">${qbadge(u.status==="verified"?"verified":"in_review")}</span></div>
      <div class="prose" style="margin-top:10px">${esc(u.desc)}</div>
      ${srcLine(u.src)}`)
    +`<div style="height:12px"></div>`+
    card("Contributes to these indicators","",
      ["RWA10","RWA10-SUBd","RWA11-SUBe"].filter(c=>u.publicSector||c==="RWA11-SUBe").map(c=>
        `<div class="kv" style="cursor:pointer" data-act="indicator" data-args="${c}"><span class="k mono">${c}</span>
          <span class="v">${esc(BYCODE[c].name)}</span></div>`).join(""))
    +(econ?`<div style="height:12px"></div>`+card("2022 economic sizing for this sector","historical estimate",
      `<div class="prose"><p>The 2022 study sized the full AI potential in ${esc(SECTOR[u.sector].name.toLowerCase())} at <b>$${ECON2022.sectors.find(s=>s.sector===u.sector).valueMn}m</b>, driven by ${esc(ECON2022.sectors.find(s=>s.sector===u.sector).driver.toLowerCase())}.</p></div>${srcLine("ECON22")}`):""),
    `<b data-act="go" data-args="adoption">AI Adoption</b> › Use case registry › <b>${u.id}</b>`);
}
