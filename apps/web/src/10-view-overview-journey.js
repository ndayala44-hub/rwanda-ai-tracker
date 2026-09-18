
/* ============================== INSIGHT ENGINE ==========================
   Derived statements only. Each carries the data that produced it.        */
function insights(){
  const out=[],R=RUN.readiness,M=RUN.maturity;
  out.push({kind:"Trend",tone:R.score>PREV.readiness.score?"g":"r",
    text:`AI readiness ${R.score>PREV.readiness.score?"rose":"fell"} ${Math.abs(R.score-PREV.readiness.score).toFixed(1)} points to ${fmt(R.score)} since ${META.cycle-1}, while maturity reached ${fmt(M.score)}.`,
    why:`Computed from ${IND.filter(i=>i.mem==="R").length} readiness and ${IND.filter(i=>i.mem==="M").length} maturity indicators at ${pct(R.coverage)} and ${pct(M.coverage)} coverage.`,
    goto:"readiness"});
  out.push({kind:"Gap",tone:"a",
    text:`Capability is running ahead of deployment: readiness exceeds maturity by ${(R.score-M.score).toFixed(1)} points.`,
    why:`Enabler dimensions average ${fmt((RUN.dS.D1.score+RUN.dS.D2.score+RUN.dS.D3.score)/3)} against ${fmt((RUN.dS.D4.score+RUN.dS.D5.score)/2)} for the accelerators. That difference is the conversion deficit.`,
    goto:"adoption"});
  const worst=DIMS.slice().sort((a,b)=>RUN.dS[a.id].score-RUN.dS[b.id].score)[0];
  out.push({kind:"Policy signal",tone:"r",
    text:`${worst.short} is the weakest dimension at ${fmt(RUN.dS[worst.id].score)} and is moving ${(RUN.dS[worst.id].score-PREV.dS[worst.id].score).toFixed(2)} points per cycle.`,
    why:worst.why,goto:"readiness"});
  if(ML.binding.length)out.push({kind:"Intervention",tone:"a",
    text:`Rwanda is held at maturity level ${ML.assigned} (${ML.def.n}) by ${ML.binding.length} unmet capability gate${ML.binding.length>1?"s":""}, not by its score.`,
    why:`Unmet: ${ML.binding.map(b=>b.label).join("; ")}. These are administrative decisions rather than investments, the score band alone would place Rwanda at level ${ML.band}.`,
    goto:"policy"});
  const hi=ECON2022.sectors.filter(s=>s.shareSectorGDP>=10);
  out.push({kind:"Opportunity",tone:"b",
    text:`${hi.map(s=>SECTOR[s.sector].name).join(" and ")} show the highest AI value relative to sector size, yet together account for ${USECASES.filter(u=>hi.some(h=>h.sector===u.sector)).length} of ${USECASES.length} registered use cases.`,
    why:`2022 sizing put AI potential at ${hi.map(s=>s.shareSectorGDP+"% of "+SECTOR[s.sector].name.toLowerCase()+" sector GDP").join(" and ")}. Adoption counts come from the live use-case registry.`,
    goto:"investment"});
  if(L26&&L26.measuredAdoption)out.push({kind:"Adoption signal",tone:"r",
    text:`Measured frontier AI usage ranks ${L26.measuredAdoption.usageRank} of ${L26.measuredAdoption.usageUniverse} globally, at ${L26.measuredAdoption.usageIndex.toFixed(2)}x the level expected for Rwanda's economic size.`,
    why:`${L26.measuredAdoption.whatDrivesIt} ${L26.measuredAdoption.opportunity}`,goto:"adoption"});
  if(typeof RAIA!=="undefined"&&RAIA.record&&RAIA.record.useCases)out.push({kind:"Gap closing",tone:"g",
    text:`Rwanda now publishes a national AI record. ${RAIA.record.useCases} verified use cases across ${RAIA.record.institutions} institutions, closing a transparency gap this platform had recorded as open.`,
    why:"The register indicator moves from 0 to 50 rather than to 100. RAIA's record carries sector and stage, not risk classification, oversight arrangements or routes to redress: Rwanda now publishes what it deploys, not how those systems are governed.",
    goto:"policy"});
  if(L26&&L26.governanceGaps)out.push({kind:"Cheap to close",tone:"a",
    text:`${L26.governanceGaps.missing.length} governance instruments are absent. AI legislation, a public register of state AI, evaluation capability, a procurement standard and a model ownership term.`,
    why:L26.governanceGaps.closingNote,goto:"policy"});
  const stale=IND.filter(i=>i.stale>0||i.notReported);
  out.push({kind:"Data signal",tone:"a",
    text:`${stale.length} indicators are stale or unreported, concentrated in private-sector and public-adoption measurement.`,
    why:`The 2022 assessment found accessibility good for third-party sources and poor for exactly the Rwanda-specific indicators that measure real adoption. That pattern persists.`,
    goto:"explorer"});
  return out;
}

/* ================================ OVERVIEW =============================== */
VIEWS.overview=async function(){
  const R=await api.readiness(), M=(await api.maturity()), econ=await api.econ();
  const ucs=await api.useCases({publishedOnly:true});
  const ins=insights();
  const dimStrip=DIMS.map(D=>{const d=RUN.dS[D.id],p=PREV.dS[D.id];
    return `<div class="hexcell" data-act="dimension" data-args="${D.id}">
      <div class="small muted">${D.id} · ${D.cls}</div>
      <div style="font-size:13px;font-weight:600;margin-top:2px;height:34px;line-height:1.3">${D.short}</div>
      <div style="display:flex;align-items:baseline;gap:8px;margin-top:6px">
        <span style="font-size:23px;font-weight:700;letter-spacing:-.8px;color:${scColor(d.score)}">${fmt(d.score)}</span>
        <span class="small">${deltaHtml(d.score,p.score)}</span></div>
      <div class="bar" style="margin-top:7px"><i style="width:${(d.score/70*100).toFixed(0)}%;background:${D.color}"></i></div>
      <div class="small muted" style="margin-top:5px">${(d.score/70*100).toFixed(0)}% of the 70.0 reference target · coverage ${pct(d.coverage)}</div>
    </div>`}).join("");
  return vh("National overview","Rwanda's AI ecosystem, measured",
    "An independent read on where Rwanda stands on AI, readiness, actual adoption, economic opportunity and the evidence behind each figure. Every number opens to its source.",
    `<button class="btn" data-act="go" data-args="explorer">Explore the data</button>
     <button class="btn pri" data-act="go" data-args="investment">Investment view</button>`)
  +`<div class="row" style="grid-template-columns:repeat(auto-fit,minmax(196px,1fr))">
     ${kpi("AI Readiness",+R.score.toFixed(1),
        `${deltaHtml(R.score,PREV.readiness.score," pts")} vs ${YEAR-1} · coverage ${pct(R.coverage)}`,scColor(R.score),
        "Composite of the preconditions for AI: skills, infrastructure, data and governing institutions. Methodology "+META.methodology,
        {dec:1,suf:" /100",series:YEARS.map(y=>RUNS[y].readiness.score),act:"go",actArgs:"readiness"})}
     ${kpi("AI Maturity",+M.index.score.toFixed(1),
        `${deltaHtml(M.index.score,PREV.maturity.score," pts")} vs ${YEAR-1} · coverage ${pct(M.index.coverage)}`,scColor(M.index.score),
        "Composite of observed adoption, investment and governance in practice.",
        {dec:1,suf:" /100",series:YEARS.map(y=>RUNS[y].maturity.score),act:"go",actArgs:"adoption"})}
     ${kpi("Maturity level","L"+M.level.assigned,
        `${M.level.def.n} · ${M.level.binding.length?"gate-limited":"score-limited"}`,"var(--brand)",
        "Assigned as the lower of the score band and the capability gates that must be satisfied.",
        {act:"go",actArgs:"policy"})}
     ${kpi("AI economic potential",econ.headline.totalMn,
        `~${econ.headline.shareOfGDP}% of GDP · ${qbadge("historical")}`,"var(--teal)",
        econ.headline.definition,{pre:"$",suf:"m",act:"go",actArgs:"investment"})}
     ${kpi("Registered use cases",ucs.length,
        `${ucs.filter(u=>u.stage==="Production"||u.stage==="Scaled").length} in production or scaled`,"var(--txt)",
        "Verified AI deployments in the registry. Contributed records awaiting verification are excluded.",
        {act:"go",actArgs:"adoption"})}
     ${kpi("Ecosystem organisations",ORGS.length,
        `${ORGS.filter(o=>o.type==="Startup").length} start-ups · ${ORGS.filter(o=>o.type==="Academia").length} academic institutions`,"var(--txt)",
        null,{act:"go",actArgs:"ecosystem"})}
   </div>

   <div class="bento" style="margin-bottom:14px">
     <div class="card w6"><header><h3>National position</h3><span class="sub">methodology ${META.methodology} · reporting year ${YEAR}</span></header>
       <div class="bd"><div class="gaugewrap">
         <div class="gauge"><div class="ring" id="gR"></div><div class="gi">
           <h4>AI Readiness</h4>
           <div class="gv" style="color:${scColor(R.score)}">${fmt(R.score)}</div>
           <div class="gmeta"><span>Target <b>${TARGETS.readiness.toFixed(1)}</b></span><span>Gap <b>${(TARGETS.readiness-R.score).toFixed(1)}</b></span>
             <span>Coverage <b>${pct(R.coverage)}</b></span><span>Confidence <b>${confLabel(R.confidence)}</b></span></div></div></div>
         <div class="gauge"><div class="ring" id="gM"></div><div class="gi">
           <h4>AI Maturity</h4>
           <div class="gv" style="color:${scColor(M.index.score)}">${fmt(M.index.score)}</div>
           <div class="gmeta"><span>Target <b>${TARGETS.maturity.toFixed(1)}</b></span><span>Gap <b>${(TARGETS.maturity-M.index.score).toFixed(1)}</b></span>
             <span>Coverage <b>${pct(M.index.coverage)}</b></span><span>Confidence <b>${confLabel(M.index.confidence)}</b></span></div></div></div>
       </div></div></div>
     <div class="card w6"><header><h3>Where capability is converting into deployment</h3><span class="sub">weighted score units</span></header>
       <div class="bd flush"><div id="ovSankey" style="height:290px"></div>
         <div style="padding:0 15px 13px" class="small muted">Enabling capability averages <b>${fmt((RUN.dS.D1.score+RUN.dS.D2.score+RUN.dS.D3.score)/3)}</b> while observed maturity is <b>${fmt(M.index.score)}</b>. The red flow is the part that has not converted.</div></div></div>
   </div>

   <div class="row" style="grid-template-columns:1.5fr 1fr">
     ${cardF("Readiness and maturity over time","Computed each cycle from the indicator register",
       `<div id="ovTrend" style="height:300px"></div>
        <div style="padding:0 15px 13px" class="small muted">The 70.0 and 60.0 reference lines are working targets held in the methodology registry, not official national targets. ${'<span class="src" data-act="go" data-args="\'about\'">How this is calculated</span>'}</div>`)}
     ${card("What the data is saying","Derived, not authored",
       ins.map((i,n)=>`<div style="padding:10px 0;border-bottom:1px solid var(--line);cursor:pointer" data-act="insight" data-args="${n}">
         <div style="display:flex;gap:8px;align-items:center"><span class="tag ${i.tone}">${i.kind}</span></div>
         <div style="font-size:13px;margin-top:5px;line-height:1.55">${i.text}</div></div>`).join("")
        +`<div class="small muted" style="margin-top:10px">Each statement is generated from current values in the store. Click any one to see the figures behind it.</div>`)}
   </div>

   <div class="row" style="grid-template-columns:1fr">
     ${cardF("The six dimensions of Rwanda's national AI framework","Click a dimension for the full assessment",
       `<div class="hex">${dimStrip}</div>`)}
   </div>

   <div class="row" style="grid-template-columns:1.1fr 1fr">
     ${card("Independent landscape assessment, September 2026",
       `${L26.author} · ${L26.type}`,
       `<div class="prose"><p><b>${esc(L26.subtitle)}</b></p><p>${esc(L26.thesis)}</p></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:12px 0">
        ${L26.headline.map(h=>`<div style="border-left:3px solid var(--brand);padding-left:11px">
          <div style="font-size:20px;font-weight:700;letter-spacing:-.6px">${esc(h.value)}</div>
          <div class="small muted" style="margin-top:2px">${esc(h.label)}</div></div>`).join("")}</div>
        ${L26.findings.map(f=>`<div class="kv"><span class="k">
          <span class="tag ${f.tone==="risk"?"r":f.tone==="opportunity"?"a":"g"}">${f.n}</span> <b>${esc(f.title)}</b>
          <div class="small muted" style="max-width:460px;margin-top:3px">${esc(f.text)}</div></span></div>`).join("")}
        ${srcLine("LANDSCAPE26")}`)}
     ${cardF("The constraint stack","four constraints that compound rather than sit in parallel",
       `<div style="padding:4px 0">${L26.constraintStack.layers.map(l=>`
         <div style="padding:11px 15px;border-bottom:1px solid var(--line)">
           <div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline">
             <b style="font-size:13px">${esc(l.layer)}</b>
             <span class="mono" style="font-size:17px;font-weight:700;color:var(--amber)">${esc(l.metric)}</span></div>
           <div class="small muted" style="margin-top:4px">${esc(l.detail)}</div></div>`).join("")}</div>
        <div style="padding:11px 15px" class="small muted">${esc(L26.constraintStack.compounding)}</div>`)}
   </div>

   <div class="row" style="grid-template-columns:1fr 1fr">
     ${cardF("How each dimension builds the composite","contribution in index points",
       `<div id="ovWaterfall" style="height:300px"></div>
        <div style="padding:0 15px 13px" class="small muted">Each dimension contributes its score divided by six. The final bar is the readiness composite.</div>`)}
     ${cardF("Score distribution across all indicators",IND.length+" indicators, reporting year "+YEAR,
       `<div id="ovHist" style="height:210px"></div>
        <div style="padding:0 15px 13px" class="small muted">A long left tail means the composite is being held down by many weak indicators rather than a few. Click through to the Data Explorer to see which.</div>`)}
   </div>

   <div class="row" style="grid-template-columns:1fr 1fr">
     ${cardF("Where AI value sits, by sector","2022 full-potential estimate vs registered adoption today, click a bar to filter the platform",
       `<div id="ovSector" style="height:320px"></div>
        <div style="padding:0 15px 13px">${srcLine("ECON22","adoption counts from the live use-case registry")}</div>`)}
     ${cardF("Recent evidence and contributions","Newest first",
       `<div class="scrollbox" style="max-height:320px">
         ${CONTRIBUTIONS.map(c=>`<div style="padding:11px 15px;border-bottom:1px solid var(--line)">
           <div style="display:flex;justify-content:space-between;gap:10px">
             <span style="font-size:13px;font-weight:600">${esc(c.kind)} · ${esc(c.target)}</span>
             <span class="tag ${c.state.startsWith("Accepted")?"g":"a"}">${esc(c.state)}</span></div>
           <div class="small muted" style="margin-top:3px">${esc(c.value)}. ${esc(c.who)}, ${c.when}</div>
           <div class="small muted" style="margin-top:2px">${esc(c.note)}</div></div>`).join("")}
        </div>
        <div style="padding:11px 15px;border-top:1px solid var(--line)">
          <button class="btn pri sm" data-act="contribute">Contribute data</button>
          <span class="small muted" style="margin-left:8px">Contributions are published only after review.</span></div>`)}
   </div>`;
};
MOUNT.overview=async function(){
  // Text alternatives for the two headline charts on the busiest page.
  chartTable("ovTrend","Readiness and maturity scores by year",
    [{label:"Year"},{label:"AI Readiness",n:1},{label:"AI Maturity",n:1},{label:"Coverage",n:1}],
    YEARS.map(y=>[y,RUNS[y].readiness.score.toFixed(1),RUNS[y].maturity.score.toFixed(1),
      pct((RUNS[y].readiness.coverage+RUNS[y].maturity.coverage)/2)]));
  chartTable("ovSector","AI potential by sector, 2022 estimate, against registered use cases today",
    [{label:"Sector"},{label:"2022 full potential, USD m",n:1},{label:"% of sector GDP",n:1},{label:"Registered use cases",n:1}],
    ECON2022.sectors.filter(x=>x.sector!=="OTH").map(x=>[SECTOR[x.sector].name,x.valueMn,x.shareSectorGDP,
      USECASES.filter(u=>u.sector===x.sector&&u.status==="verified").length]));
  ring(document.getElementById("gR"),RUN.readiness.score,TARGETS.readiness,PAL[0],"target "+TARGETS.readiness);
  ring(document.getElementById("gM"),RUN.maturity.score,TARGETS.maturity,PAL[4],"target "+TARGETS.maturity);
  sankeyConversion(document.getElementById("ovSankey"));
  waterfall(document.getElementById("ovWaterfall"));
  histogram(document.getElementById("ovHist"),IND.map(i=>RUN.iS[i.code].score));
  const el=document.getElementById("ovTrend");
  markChartAccessible(el,"ovTrend","Line chart: AI readiness and maturity scores from "+YEARS[0]+" to "+META.cycle);
  markChartAccessible(document.getElementById("ovSector"),"ovSector","Combination chart: 2022 sector AI potential against registered use cases");
  ec(el,{legend:{top:4,textStyle:{color:cssVar("--ec-axis"),fontSize:11}},
    tooltip:{trigger:"axis",formatter:ps=>{const y=ps[0].axisValue,r=RUNS[y];
      return `<b>${y}</b><br>${ps.map(p=>`${p.marker}${p.seriesName}: <b>${p.value}</b>`).join("<br>")}
        <div style="margin-top:5px;font-size:11px;color:${cssVar("--mut")}">Coverage ${pct((r.readiness.coverage+r.maturity.coverage)/2)} · confidence ${confLabel((r.readiness.confidence+r.maturity.confidence)/2)}<br>Methodology ${y>=2026?"v1.2":y>=2025?"v1.1":"v1.0"}</div>`}},
    grid:{left:42,right:18,top:40,bottom:28},
    xAxis:axis({type:"category",data:YEARS,boundaryGap:false}),
    yAxis:axis({type:"value",min:0,max:80}),
    series:[
      {name:"AI Readiness",type:"line",smooth:.3,symbolSize:6,data:YEARS.map(y=>+RUNS[y].readiness.score.toFixed(1)),
        lineStyle:{width:3,color:PAL[0]},itemStyle:{color:PAL[0]},areaStyle:{color:"rgba(14,136,204.10)"}},
      {name:"AI Maturity",type:"line",smooth:.3,symbolSize:6,data:YEARS.map(y=>+RUNS[y].maturity.score.toFixed(1)),
        lineStyle:{width:3,color:PAL[4]},itemStyle:{color:PAL[4]},areaStyle:{color:"rgba(94,75,184.10)"}},
      {name:"Readiness reference target",type:"line",data:YEARS.map(()=>70),symbol:"none",lineStyle:{type:"dashed",width:1.3,color:cssVar("--line2")}},
      {name:"Maturity reference target",type:"line",data:YEARS.map(()=>60),symbol:"none",lineStyle:{type:"dotted",width:1.3,color:cssVar("--line2")},
        markLine:{silent:true,symbol:"none",label:{formatter:"viewing "+YEAR,fontSize:10,color:cssVar("--mut"),position:"insideEndTop"},
          lineStyle:{color:cssVar("--brand"),type:"solid",width:1.2,opacity:.6},data:[{xAxis:String(YEAR)}]}}
    ]},300).on("click",p=>{if(p.name)setYear(+p.name)});
  const secs=ECON2022.sectors.filter(s=>s.sector!=="OTH");
  const adoption=secs.map(s=>USECASES.filter(u=>u.sector===s.sector&&u.status==="verified").length);
  ec(document.getElementById("ovSector"),{
    tooltip:{trigger:"axis",axisPointer:{type:"shadow"},formatter:ps=>{
      const i=ps[0].dataIndex,s=secs[i];
      return `<b>${SECTOR[s.sector].name}</b><br>2022 full potential: <b>$${s.valueMn}m</b> (${s.shareSectorGDP}% of sector GDP)<br>Registered use cases today: <b>${adoption[i]}</b><br><span style="font-size:11px;color:${cssVar("--mut")}">Source: Rwanda AI Economic Sizing Report, 2022</span>`}},
    legend:{top:4,textStyle:{color:cssVar("--ec-axis"),fontSize:11}},
    grid:{left:52,right:46,top:40,bottom:70},
    xAxis:axis({type:"category",data:secs.map(s=>SECTOR[s.sector].name),axisLabel:{color:cssVar("--ec-axis"),fontSize:10,interval:0,rotate:34}}),
    yAxis:[axis({type:"value",name:"$m potential (2022)",nameTextStyle:{color:cssVar("--ec-axis"),fontSize:10}}),
           axis({type:"value",name:"use cases",splitLine:{show:false},nameTextStyle:{color:cssVar("--ec-axis"),fontSize:10}})],
    series:[{name:"2022 full potential ($m)",type:"bar",barWidth:"52%",data:secs.map(s=>s.valueMn),itemStyle:{color:PAL[1],borderRadius:[3,3,0,0]}},
      {name:"Registered use cases",type:"line",yAxisIndex:1,data:adoption,symbolSize:8,lineStyle:{width:2,color:PAL[3]},itemStyle:{color:PAL[3]}}]},320)
   .on("click",p=>{const s=secs[p.dataIndex];if(s)setFilter("sector",s.sector)});
};
function insightDrawer(n){
  const i=insights()[n];
  openDrawer(i.text,`${i.kind.toUpperCase()} · derived from current platform data`,
    card("Why this is being said","",`<div class="prose">${i.why}</div>`)
    +`<div style="height:12px"></div>`+
    card("How this was generated","",`<div class="prose">This statement is produced by a rule over the live store, it is not written text. It re-evaluates whenever an observation changes, and it disappears if the condition stops holding. No figure in it is estimated by the platform.</div>
      <div class="kv"><span class="k">Methodology version</span><span class="v mono">${META.methodology}</span></div>
      <div class="kv"><span class="k">Engine</span><span class="v mono">${META.engine}</span></div>
      <div class="kv"><span class="k">Evaluated</span><span class="v">${META.built}</span></div>`)
    +`<div style="height:12px"></div><button class="btn pri" data-act="closeAndGo" data-args="${i.goto}">Open the underlying view</button>`);
}

/* ============================ RWANDA AI JOURNEY ========================== */
VIEWS.journey=async function(){
  const j=await api.journey();
  const cats=[...new Set(j.map(x=>x.cat))];
  return vh("Context","Rwanda's AI journey",
    "How Rwanda arrived at its current position, policy, infrastructure, research, investment, adoption and regulation, with the source behind each milestone. Entries marked as contributed are awaiting a second source.")
  +`<div class="row" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
    ${kpi("Milestones tracked",j.length,`${j.filter(x=>x.status==="verified").length} verified · ${j.filter(x=>x.status==="pending").length} pending verification`)}
    ${kpi("First AI deployments","2014",'Zipline and Charis UAS established')}
    ${kpi("Policy foundation","2022",'National AI policy developed; ethics framework drafted')}
    ${kpi("Evidence base","2 studies",'Economic sizing and readiness assessment, both 2022')}
   </div>
   <div class="row" style="grid-template-columns:1.3fr 1fr">
     ${cardF("Governance advanced two maturity stages since 2021; compute advanced half a stage",
       "analyst assessment, 1 exploring to 5 AI-enabled economy",
       `<div id="jDiverge" style="height:290px"></div>
        <div style="padding:0 15px 13px" class="small muted">${esc(L26.maturityTrajectory.reading)} ${srcLine("LANDSCAPE26")}</div>`)}
     ${card("Why the sequence matters","policy architecture",
       `<div class="prose"><p>${esc(L26.policySequencing.argument)}</p></div>
        ${L26.policySequencing.timeline.map(t=>`<div class="kv"><span class="k mono">${t.year}</span>
          <span class="v" style="max-width:76%">${esc(t.event)}</span></div>`).join("")}
        ${srcLine("LANDSCAPE26")}`)}
   </div>
   <div class="row" style="grid-template-columns:1fr">
     ${cardF("Milestone density by year and category","",`<div id="jChart" style="height:260px"></div>`)}
   </div>
   <div class="row" style="grid-template-columns:1.3fr 1fr">
     ${card("Timeline","",`<div style="margin-bottom:12px;display:flex;gap:6px;flex-wrap:wrap">
        ${cats.map(c=>`<span class="chip" data-act="note" data-args="Filtering is available in the Data Explorer for the full indicator set.">${c}</span>`).join("")}</div>
        <div class="tl">${j.map((x,n)=>`<div class="tlitem ${x.status}">
          <div class="tlyear">${x.y}${x.status==="pending"?' <span class="tag a" style="margin-left:5px">Pending verification</span>':""}</div>
          <div class="tlt">${esc(x.t)}</div>
          <div class="tld">${esc(x.d)}</div>
          <div class="prov" style="margin-top:5px"><span class="tag">${x.cat}</span>
            <span class="src" data-act="source" data-args="${x.src}">${esc(SRC(x.src).org)}, ${SRC(x.src).year}</span></div>
        </div>`).join("")}</div>`)}
     <div>
       ${card("What this timeline shows","",
         `<div class="prose">
          <p>Rwanda's AI activity began with <b>deployment before policy</b>: Zipline, Charis and Babyl were operating years before an AI policy existed. That is unusual, and it is why the country scores better on visible use cases than on the institutions around them.</p>
          <p>The institutional layer arrived in a tight cluster in <b>2021–2022</b>, data protection law, landscape mapping, economic sizing, the readiness framework and a drafted ethics framework. Most of the measurement in this platform starts there.</p>
          <p>The unfinished item is the same one the readiness framework flagged: the <b>ethics framework was drafted but not published</b>, and no dedicated public AI budget line was recorded. Those two remain the binding constraints on the maturity level today.</p>
         </div>`)}
       <div style="height:14px"></div>
       ${card("Maturity model used in 2022","Gartner-based, five levels",
         `<div class="prose"><p>The 2022 economic sizing study placed Rwanda in the <b>early "Exploring"</b> phase: conversations happening but not strategically, use cases largely stuck before pilot stage, and adoption constrained by scalable infrastructure, labelled data, talent and regulation.</p></div>
          ${["Awareness, conversations happening, no pilots","Active, proofs of concept and pilots; regulatory conversations","Operational. AI ecosystem enabled, strategy and data in place","Systematic. AI-powered applications interact across the business ecosystem","Transformational. AI drives socio-economic transformation and new business models"]
          .map((s,i)=>`<div class="kv"><span class="k">Level ${i+1}</span><span class="v" style="max-width:72%">${s}</span></div>`).join("")}
          ${srcLine("ECON22")}`)}
     </div>
   </div>`;
};
MOUNT.journey=async function(){
  const tr=L26.maturityTrajectory,ys=Object.keys(tr.series["Governance and policy"]);
  ec(document.getElementById("jDiverge"),{
    tooltip:{trigger:"axis"},legend:{top:4,textStyle:{color:cssVar("--ec-axis"),fontSize:11}},
    grid:{left:42,right:18,top:40,bottom:28},
    xAxis:axis({type:"category",data:ys,boundaryGap:false}),
    yAxis:axis({type:"value",min:1,max:5,name:"maturity stage",nameTextStyle:{color:cssVar("--ec-axis"),fontSize:10}}),
    series:Object.keys(tr.series).map((k,i)=>({name:k,type:"line",smooth:.3,symbolSize:6,
      data:ys.map(y=>tr.series[k][y]),lineStyle:{width:2.6,color:PAL[[0,2,7][i]]},itemStyle:{color:PAL[[0,2,7][i]]},
      areaStyle:i===0?{color:"rgba(14,136,204.10)"}:undefined}))},290);
  const j=await api.journey();
  const cats=[...new Set(j.map(x=>x.cat))];
  const years=[...new Set(j.map(x=>x.y))].sort();
  ec(document.getElementById("jChart"),{
    tooltip:{trigger:"axis",axisPointer:{type:"shadow"}},
    legend:{top:4,textStyle:{color:cssVar("--ec-axis"),fontSize:11}},
    grid:{left:40,right:18,top:40,bottom:28},
    xAxis:axis({type:"category",data:years}),
    yAxis:axis({type:"value",minInterval:1}),
    series:cats.map((c,i)=>({name:c,type:"bar",stack:"a",barWidth:"55%",
      data:years.map(y=>j.filter(x=>x.y===y&&x.cat===c).length),itemStyle:{color:PAL[i%PAL.length]}}))},260);
};
