
/* ============== INVESTMENT & ECONOMIC OPPORTUNITY ======================== */
function opportunityMatrix(){
  const maxUC=Math.max.apply(null,SECTORS.map(s=>USECASES.filter(u=>u.sector===s.id&&u.status==="verified").length))||1;
  return ECON2022.sectors.filter(s=>s.sector!=="OTH").map(s=>{
    const uc=USECASES.filter(u=>u.sector===s.sector&&u.status==="verified").length;
    const opportunity=s.shareSectorGDP;                 // % of sector GDP. 2022 estimate
    const gap=100*(1-uc/maxUC);                         // adoption gap proxy
    const priority=(opportunity/27)*0.5+(gap/100)*0.5;
    return {id:s.sector,name:SECTOR[s.sector].name,valueMn:s.valueMn,opportunity,gap,uc,priority,driver:s.driver};
  }).sort((a,b)=>b.priority-a.priority);
}
VIEWS.investment=async function(){
  const econ=await api.econ();
  const mtx=opportunityMatrix();
  const invInd=["RWA11-SUBc","RWA11-SUBd","RWA11-SUBe","OXF12a","OXF12b","TOR109","TOR108","TOR111"].map(c=>BYCODE[c]).filter(Boolean);
  const enablerTotal=econ.enablerInitiatives.reduce((s,e)=>s+e.costK,0);
  return vh("Opportunity","AI investment and economic opportunity",
    "Where the evidence points to unmet demand, sized opportunity from the 2022 national study, set against what is actually being deployed and funded today.",
    `<button class="btn" data-act="source" data-args="ECON22">About the sizing study</button>`)
  +`<div class="banner hist"><b>Historical evidence, clearly separated.</b> All monetary figures on this page come from the <b>Rwanda AI Economic Sizing Report, 2022</b>. They are <b>full-potential estimates</b>, the value if today's AI applications were adopted across the economy, not current statistics, not forecasts and not targets. Adoption and indicator figures shown beside them are current platform measurements. The two are never combined into one number.</div>
   <div class="row" style="grid-template-columns:repeat(auto-fit,minmax(190px,1fr))">
     ${kpi("Full AI potential","$"+econ.headline.totalMn+"m",`~${econ.headline.shareOfGDP}% of GDP · ${qbadge("historical")}`,"var(--teal)",econ.headline.definition)}
     ${kpi("Largest sector opportunity","$"+mtx[0].valueMn+"m",esc(ECON2022.sectors[0].sector==="AGR"?"Agriculture":mtx[0].name)+" ranks first by value","var(--teal)")}
     ${kpi("Highest intensity","27%",'Healthcare. AI potential as a share of sector GDP',"var(--teal)")}
     ${kpi("Lighthouse use cases",econ.lighthouse.length,`$${econ.lighthouse.reduce((s,l)=>s+l.lowMn,0)}m–$${econ.lighthouse.reduce((s,l)=>s+l.highMn,0)}m combined`,"var(--teal)")}
     ${kpi("Ecosystem enabler cost","$"+enablerTotal+"K",`indicative first-year cost of ${econ.enablerInitiatives.length} initiatives`,"var(--teal)")}
     ${kpi("Current AI investment tracked",rawFmt(BYCODE["RWA11-SUBc"],RUN.iS["RWA11-SUBc"].raw)+" USDm",
        `${qbadge(BYCODE["RWA11-SUBc"].verification)} · ${esc(SOURCES[BYCODE["RWA11-SUBc"].sourceId].org)}`,"var(--txt)")}
   </div>

   <div class="row" style="grid-template-columns:1.25fr 1fr">
     ${cardF("Full AI potential by sector, 2022","value in $m and as a share of sector GDP",
       `<div id="invSector" style="height:360px"></div>
        <div style="padding:0 15px 13px">${srcLine("ECON22")}</div>`)}
     ${cardF("Opportunity and gap matrix","priority = high sized opportunity × low observed adoption",
       `<div id="invMatrix" style="height:360px"></div>
        <div style="padding:0 15px 13px" class="small muted">Vertical axis is the 2022 AI potential as a share of that sector's GDP. Horizontal axis is an adoption-gap proxy built from the live use-case registry, it is a proxy, not a measured adoption rate. Top-right is the priority quadrant.</div>`)}
   </div>

   <div class="row" style="grid-template-columns:1.3fr 1fr">
     ${cardF("The 589m, by share","area is proportional to sized value, click a tile to filter",
       `<div id="invTree" style="height:330px"></div>
        <div style="padding:0 15px 13px" class="small muted">${qbadge("historical")} 2022 full-potential estimate. Tile colour shows intensity, potential as a share of that sector's own GDP.</div>`)}
     ${cardF("Lighthouse value ranges","the five use cases screened for early implementation",
       `<div id="invLH" style="height:330px"></div>
        <div style="padding:0 15px 13px" class="small muted">Bars show the published low–high range. Together they account for $${ECON2022.lighthouse.reduce((a,l)=>a+l.lowMn,0)}m–$${ECON2022.lighthouse.reduce((a,l)=>a+l.highMn,0)}m of the ${ECON2022.headline.totalMn}m total.</div>`)}
   </div>

   <div class="row" style="grid-template-columns:1fr">
     ${cardF("Priority investment areas","ranked by the matrix above",
       `<table class="dt"><thead><tr><th>Sector</th><th class="n">2022 potential</th><th class="n">% of sector GDP</th>
         <th class="n">Registered use cases</th><th class="n">Adoption gap</th><th>Main value driver</th><th></th></tr></thead><tbody>
        ${mtx.map((m,i)=>`<tr class="clickable" data-act="go" data-args="sectors">
          <td><b>${i+1}. ${esc(m.name)}</b></td>
          <td class="n mono">$${m.valueMn}m</td>
          <td class="n mono">${m.opportunity}%</td>
          <td class="n mono">${m.uc}</td>
          <td class="n"><div class="bar" style="width:80px;display:inline-block"><i style="width:${m.gap.toFixed(0)}%;background:${m.gap>70?"var(--red)":m.gap>40?"var(--amber)":"var(--green)"}"></i></div></td>
          <td class="small muted">${esc(m.driver)}</td>
          <td>${i<3?'<span class="tag a">Priority</span>':""}</td></tr>`).join("")}
       </tbody></table>`)}
   </div>

   <div class="row" style="grid-template-columns:1fr">
     ${card("Lighthouse use cases identified in 2022","Screened from over 1,000 candidate use cases down to 270 relevant, then to five for early implementation",
       `<div class="opgrid">${econ.lighthouse.map(l=>`
         <div class="card" style="box-shadow:none;cursor:pointer" data-act="lighthouse" data-args="${l.id}">
           <div class="bd">
             <div style="display:flex;justify-content:space-between;gap:8px"><span class="tag t">${esc(SECTOR[l.sector].name)}</span>
               <span class="mono muted small">${l.id}</span></div>
             <div style="font-size:14px;font-weight:600;margin-top:8px;line-height:1.35">${esc(l.name)}</div>
             <div style="font-size:22px;font-weight:700;color:var(--teal);margin-top:8px;letter-spacing:-.6px">$${l.lowMn}–${l.highMn}m</div>
             <div class="small muted" style="margin-top:3px">${esc(l.benchmark)}</div>
             <div class="small muted" style="margin-top:6px">Owner: ${esc(l.owner)}</div>
           </div></div>`).join("")}</div>
        ${srcLine("ECON22")}`)}
   </div>

   <div class="row" style="grid-template-columns:1.25fr 1fr">
     ${cardF("Partnership commitments since 2025","disclosed, AI-specific, current, not a 2022 estimate",
      `<table class="dt"><thead><tr><th>Partner</th><th>Vehicle</th><th class="n">Committed</th><th>What it buys</th></tr></thead><tbody>
       ${L26.partnerships.items.map(p=>`<tr>
         <td><b>${esc(p.partner)}</b><div class="small muted">${esc(p.marker)}</div></td>
         <td>${esc(p.vehicle)}</td>
         <td class="n mono">${p.amountUsd?"$"+(p.amountUsd/1e6).toFixed(p.amountUsd<1e6?2:1)+"m":'<span class="unavail">undisclosed</span>'}</td>
         <td class="small muted">${esc(p.detail)}</td></tr>`).join("")}
       <tr><td><b>Total disclosed</b></td><td></td>
         <td class="n mono"><b>$${(L26.partnerships.items.reduce((a,p)=>a+(p.amountUsd||0),0)/1e6).toFixed(2)}m</b></td><td></td></tr>
      </tbody></table>
      <div style="padding:12px 15px;border-top:1px solid var(--line)" class="small" style="color:var(--amber)">
        <b>Concentration risk.</b> ${esc(L26.partnerships.exposure)}</div>
      <div style="padding:0 15px 12px">${srcLine("LANDSCAPE26")}</div>`)}
     ${card("What Rwanda offers a partner","the 2026 proposition",
      `<div class="prose"><p>${esc(L26.proposition.headline)}</p></div>
       ${L26.proposition.points.map(p=>`<div class="kv"><span class="k"><b>${p.n}. ${esc(p.title)}</b>
         <div class="small muted" style="max-width:400px;margin-top:2px">${esc(p.detail)}</div></span></div>`).join("")}
       <div class="small" style="margin-top:10px;color:var(--brand)"><b>The ask.</b> ${esc(L26.proposition.ask)}</div>`)}
   </div>

   <div class="row" style="grid-template-columns:1fr 1fr">
     ${cardF("Ecosystem enabler initiatives and indicative cost","2022 benchmark estimates",
       `<table class="dt"><thead><tr><th>Initiative</th><th class="n">Indicative first-year cost</th><th>Proposed owner</th></tr></thead><tbody>
        ${econ.enablerInitiatives.map(e=>`<tr><td><b>${esc(e.name)}</b><div class="small muted">${esc(e.desc)}</div></td>
          <td class="n mono">$${e.costK}K</td><td>${esc(e.owner)}</td></tr>`).join("")}
        <tr><td><b>Total</b></td><td class="n mono"><b>$${enablerTotal}K</b></td><td></td></tr></tbody></table>
        <div style="padding:11px 15px" class="small muted">${esc(econ.enablerNote)}</div>`)}
     ${cardF("Investment-related indicators tracked now","current measurement, not 2022 estimates",
       invInd.map(i=>indRow(i)).join(""))}
   </div>

   <div class="row" style="grid-template-columns:1fr 1fr">
     ${card("What the 589m does and does not mean","",
       `<div class="prose"><p>${esc(econ.headline.definition)}</p>
         <p><b>Method:</b> ${esc(econ.headline.method)}</p>
         <p><b>Excluded:</b> ${esc(econ.redistributionNote)}</p></div>
        <b class="small">Caveats published with the study</b>
        <ul class="prose" style="margin-top:6px">${econ.caveats.map(c=>`<li>${esc(c)}</li>`).join("")}</ul>`)}
     ${card("2022 baseline conditions","context the sizing assumed",
       econ.context.map(c=>`<div class="kv"><span class="k">${esc(c.k)}<div class="small muted" style="max-width:260px">${esc(c.note)}</div></span>
         <span class="v mono">${esc(c.v)}</span></div>`).join("")+srcLine("ECON22"))}
   </div>`;
};
MOUNT.investment=async function(){
  const secs=ECON2022.sectors.filter(s=>s.sector!=="OTH");
  ec(document.getElementById("invSector"),{
    tooltip:{trigger:"axis",axisPointer:{type:"shadow"},formatter:ps=>{
      const s=secs[ps[0].dataIndex];
      return `<b>${SECTOR[s.sector].name}</b><br>Full potential: <b>$${s.valueMn}m</b><br>Share of sector GDP: <b>${s.shareSectorGDP}%</b><br>Driver: ${s.driver}<br><span style="font-size:11px;color:${cssVar("--mut")}">Rwanda AI Economic Sizing Report, 2022, estimate</span>`}},
    legend:{top:4,textStyle:{color:cssVar("--ec-axis"),fontSize:11}},
    grid:{left:110,right:52,top:38,bottom:26},
    xAxis:[axis({type:"value",name:"$m",nameTextStyle:{color:cssVar("--ec-axis")}}),
           axis({type:"value",name:"% of sector GDP",splitLine:{show:false},max:30})],
    yAxis:axis({type:"category",data:secs.map(s=>SECTOR[s.sector].name).reverse(),axisLabel:{color:cssVar("--txt2"),fontSize:11.5}}),
    series:[{name:"Full potential ($m)",type:"bar",barWidth:"55%",itemStyle:{color:PAL[1],borderRadius:[0,4,4,0]},
      data:secs.map(s=>s.valueMn).reverse(),label:{show:true,position:"right",formatter:"${c}m",color:cssVar("--ec-axis"),fontSize:10.5}},
      {name:"% of sector GDP",type:"scatter",xAxisIndex:1,symbolSize:11,itemStyle:{color:PAL[3]},
       data:secs.map(s=>s.shareSectorGDP).reverse()}]},360);
  const mtx=opportunityMatrix();
  ec(document.getElementById("invTree"),{
    tooltip:{formatter:p=>`<b>${p.name}</b><br>Full potential: <b>$${p.value}m</b><br>${p.data.share}% of sector GDP<br><span style="font-size:11px;color:${cssVar("--mut")}">${p.data.driver}</span>`},
    series:[{type:"treemap",roam:false,nodeClick:false,breadcrumb:{show:false},width:"100%",height:"100%",
      itemStyle:{borderColor:cssVar("--surface"),borderWidth:2,gapWidth:2},
      label:{fontSize:11.5,color:"#fff",formatter:p=>p.name+"\n$"+p.value+"m"},
      levels:[{itemStyle:{borderWidth:2,gapWidth:2}}],
      data:ECON2022.sectors.map(x=>({name:SECTOR[x.sector].name,value:x.valueMn,sid:x.sector,share:x.shareSectorGDP,driver:x.driver,
        itemStyle:{color:x.shareSectorGDP>=15?PAL[3]:x.shareSectorGDP>=8?PAL[2]:x.shareSectorGDP>=5?PAL[1]:PAL[0]}}))}]},330)
   .on("click",p=>{if(p.data&&p.data.sid)setFilter("sector",p.data.sid)});
  const lh=ECON2022.lighthouse;
  ec(document.getElementById("invLH"),{
    tooltip:{trigger:"axis",axisPointer:{type:"shadow"},formatter:ps=>{const l=lh[ps[0].dataIndex];
      return `<b>${l.name}</b><br>$${l.lowMn}m – $${l.highMn}m<br>${l.benchmark}<br><span style="font-size:11px;color:${cssVar("--mut")}">Owner: ${l.owner}</span>`}},
    grid:{left:170,right:46,top:16,bottom:34},
    xAxis:axis({type:"value",name:"$m",nameTextStyle:{color:cssVar("--ec-axis")}}),
    yAxis:axis({type:"category",data:lh.map(l=>l.name.length>30?l.name.slice(0,29)+"…":l.name).reverse(),axisLabel:{fontSize:10.5,color:cssVar("--txt2")}}),
    series:[{type:"bar",stack:"r",itemStyle:{color:"transparent"},data:lh.map(l=>l.lowMn).reverse(),silent:true},
      {type:"bar",stack:"r",barWidth:"52%",itemStyle:{color:PAL[1],borderRadius:[0,4,4,0]},
       data:lh.map(l=>l.highMn-l.lowMn).reverse(),
       label:{show:true,position:"right",fontSize:10.5,color:cssVar("--ec-axis"),
         formatter:p=>"$"+lh[lh.length-1-p.dataIndex].lowMn+"–"+lh[lh.length-1-p.dataIndex].highMn+"m"}}]},330)
   .on("click",p=>{const l=lh[lh.length-1-p.dataIndex];if(l)lighthouseDrawer(l.id)});
  ec(document.getElementById("invMatrix"),{
    tooltip:{trigger:"item",formatter:p=>{const m=mtx[p.dataIndex];
      return `<b>${m.name}</b><br>2022 potential: <b>$${m.valueMn}m</b> (${m.opportunity}% of sector GDP)<br>Registered use cases: <b>${m.uc}</b><br>Adoption gap proxy: <b>${m.gap.toFixed(0)}%</b>`}},
    grid:{left:54,right:26,top:22,bottom:44},
    xAxis:axis({type:"value",name:"adoption gap (proxy) →",min:0,max:105,nameLocation:"middle",nameGap:26,nameTextStyle:{color:cssVar("--ec-axis")}}),
    yAxis:axis({type:"value",name:"opportunity. % of sector GDP →",min:0,max:30,nameLocation:"middle",nameGap:36,nameTextStyle:{color:cssVar("--ec-axis")}}),
    series:[{type:"scatter",data:mtx.map(m=>({value:[+m.gap.toFixed(1),m.opportunity],name:m.name})),
      symbolSize:d=>Math.max(11,Math.sqrt(mtx.find(m=>m.opportunity===d[1]).valueMn)*2.1),
      itemStyle:{color:p=>p.value[0]>55&&p.value[1]>7?PAL[3]:PAL[0],opacity:.85},
      label:{show:true,position:"top",formatter:p=>p.name,color:cssVar("--ec-axis"),fontSize:10},
      markArea:{silent:true,itemStyle:{color:"rgba(210,96,58.07)"},
        data:[[{xAxis:55,yAxis:7,name:"Priority quadrant"},{xAxis:105,yAxis:30}]],
        label:{color:cssVar("--mut"),fontSize:10,position:"insideTopRight"}}}]},360)
   .on("click",p=>{const m=mtx[p.dataIndex];if(m)setFilter("sector",m.id)});
};
function lighthouseDrawer(id){
  const l=ECON2022.lighthouse.find(x=>x.id===id);if(!l)return;
  const s=ECON2022.sectors.find(x=>x.sector===l.sector);
  const live=USECASES.filter(u=>u.sector===l.sector);
  openDrawer(l.name,`LIGHTHOUSE USE CASE · ${SECTOR[l.sector].name} · 2022 study`,
    `<div class="banner hist">This is a <b>2022 full-potential estimate</b>, published as an order-of-magnitude range for prioritisation. It is not a business case, a forecast or a commitment.</div>`
    +card("Estimated value","",
      `<div style="font-size:34px;font-weight:700;color:var(--teal);letter-spacing:-1.2px">$${l.lowMn}–${l.highMn}m</div>
       <div class="small muted" style="margin-top:4px">${esc(l.benchmark)}</div>
       <hr class="sep">
       <div class="kv"><span class="k">Proposed owner</span><span class="v">${esc(l.owner)}</span></div>
       <div class="kv"><span class="k">Sector</span><span class="v">${esc(SECTOR[l.sector].name)}</span></div>
       <div class="kv"><span class="k">Sector full potential</span><span class="v mono">$${s.valueMn}m (${s.shareSectorGDP}% of sector GDP)</span></div>
       ${srcLine("ECON22")}`)
    +`<div style="height:12px"></div>`
    +card("How it would work","",`<div class="prose"><p>${esc(l.mechanism)}</p></div>`)
    +`<div style="height:12px"></div>`
    +card("Why Rwanda","the context the estimate rests on",`<div class="prose"><p>${esc(l.context)}</p></div>`)
    +`<div style="height:12px"></div>`
    +card("Social impact identified","",`<div class="prose"><p>${esc(l.social)}</p></div>`)
    +`<div style="height:12px"></div>`
    +card("Status today","live registry",
      live.length?live.map(u=>`<div class="kv" style="cursor:pointer" data-act="useCase" data-args="${u.id}">
        <span class="k">${esc(u.name)}</span><span class="v">${u.stage} · ${qbadge(u.status==="verified"?"verified":"in_review")}</span></div>`).join("")
       :`<div class="empty">${unavailable("No registered deployment in this sector yet")}<div class="small" style="margin-top:8px">If you know of one, <span class="src" data-act="closeAndContribute">contribute it</span>.</div></div>`),
    `<b data-act="go" data-args="investment">Investment</b> › Lighthouse use cases › <b>${l.id}</b>`);
}

/* ================================ SECTORS ================================ */
VIEWS.sectors=async function(){
  const econ=await api.econ();
  const rows=SECTORS.map(S=>{
    const e=econ.sectors.find(x=>x.sector===S.id);
    const uc=USECASES.filter(u=>u.sector===S.id&&u.status==="verified");
    const soc=econ.socialGrades[S.id];
    return {S,e,uc,soc};
  });
  return vh("Sector intelligence","Sectors",
    "Sector-by-sector view of sized opportunity, registered adoption and social impact potential. Sectors with no evidence are shown as such rather than filled in.")
  +`<div class="row" style="grid-template-columns:1fr">
     ${cardF("Sector scorecards","2022 opportunity · live adoption · 2022 social impact grading",
      `<table class="dt"><thead><tr><th>Sector</th><th class="n">2022 full potential</th><th class="n">% of sector GDP</th>
        <th class="n">Use cases</th><th class="n">In production</th><th>Social impact (2022 grading)</th><th>Main driver</th></tr></thead><tbody>
       ${rows.filter(r=>!FILTER.sector||r.S.id===FILTER.sector).map(r=>`<tr class="clickable" data-act="sector" data-args="${r.S.id}">
         <td><b>${r.S.icon} ${esc(r.S.name)}</b></td>
         <td class="n mono">${r.e?"$"+r.e.valueMn+"m":unavailable("Not sized")}</td>
         <td class="n mono">${r.e?r.e.shareSectorGDP+"%":"–"}</td>
         <td class="n mono">${r.uc.length||'<span class="unavail">0</span>'}</td>
         <td class="n mono">${r.uc.filter(u=>["Production","Scaled"].includes(u.stage)).length}</td>
         <td>${r.soc?Object.entries(r.soc).map(([k,v])=>`<span class="tag ${v===3?"g":v===2?"b":""}" title="${esc(econ.socialDimensions.find(d=>d.id===k).name)}">${k} ${"●".repeat(v)}</span>`).join(" "):unavailable("Not graded")}</td>
         <td class="small muted">${r.e?esc(r.e.driver):"–"}</td></tr>`).join("")}
      </tbody></table>
      <div style="padding:12px 15px;border-top:1px solid var(--line)" class="small muted">
        Energy and tourism appear in the sector list because they matter to Rwanda's economy, but neither was sized in the 2022 study and neither has a registered AI deployment yet, so both are shown as unmeasured rather than estimated.
        ${srcLine("ECON22","social grading from the same study")}</div>`)}
   </div>
   <div class="row" style="grid-template-columns:1fr">
     ${card("Sector AI-readiness, on RAIA's own ladder","Data → Consolidation → Intelligence → AI",
      `<div class="prose"><p>${esc(RAIA.sectorLadder.note)}</p></div>
       <div style="margin-top:12px">
       ${RAIA.sectorLadder.sectors.map(x=>{
         const S=SECTOR[x.sector];if(!S)return"";
         return `<div style="margin-bottom:14px" ${x.sector?`data-act="sector" data-args="${x.sector}"`:""}>
           <div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline">
             <b style="font-size:13.5px">${esc(S.name)}</b>
             <span class="small muted">stage ${x.stage} of 4</span></div>
           <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:6px">
            ${RAIA.sectorLadder.stages.map((st,n)=>`<div style="text-align:center">
              <div style="height:6px;border-radius:3px;background:${n<x.stage?PAL[0]:"var(--chip)"}"></div>
              <div class="small ${n<x.stage?"":"muted"}" style="margin-top:4px;font-size:10.5px">${esc(st)}</div></div>`).join("")}</div>
           <div class="small muted" style="margin-top:5px">${esc(x.detail)}</div></div>`}).join("")}
       </div>
       <div class="small muted">Sectors absent from this list are not on RAIA's published sector journey.
        ${srcLine("RAIA_CATALOGUE")}</div>`)}
   </div>

   <div class="row" style="grid-template-columns:1fr">
     ${cardF("Opportunity, adoption and social impact together","one row per sector, the three things a sector decision needs",
       `<div id="secCombo" style="height:330px"></div>
        <div style="padding:0 15px 13px" class="small muted">Bars are the 2022 sized opportunity; the line is intensity as a share of sector GDP; dots are registered deployments today. Click a bar to filter.</div>`)}
   </div>
   <div class="row" style="grid-template-columns:1fr 1fr">
     ${cardF("Social impact potential by sector","graded 1–3 on five qualitative dimensions, 2022",`<div id="secSocial" style="height:340px"></div>`)}
     ${card("How the social grading was done","",
       `<div class="prose"><p>${esc(econ.socialGradeNote)}</p></div>
        ${econ.socialDimensions.map(d=>`<div class="kv"><span class="k"><b>${esc(d.name)}</b><div class="small muted" style="max-width:340px">${esc(d.desc)}</div></span></div>`).join("")}
        ${srcLine("ECON22")}`)}
   </div>`;
};
MOUNT.sectors=async function(){
  const econ=ECON2022,dims=econ.socialDimensions;
  const cs=econ.sectors.filter(x=>x.sector!=="OTH");
  ec(document.getElementById("secCombo"),{
    tooltip:{trigger:"axis",axisPointer:{type:"shadow"}},
    legend:{top:4,textStyle:{color:cssVar("--ec-axis"),fontSize:11}},
    grid:{left:50,right:52,top:40,bottom:74},
    xAxis:axis({type:"category",data:cs.map(x=>SECTOR[x.sector].name),axisLabel:{interval:0,rotate:30,fontSize:10,color:cssVar("--ec-axis")}}),
    yAxis:[axis({type:"value",name:"$m (2022)",nameTextStyle:{color:cssVar("--ec-axis"),fontSize:10}}),
           axis({type:"value",name:"% / count",splitLine:{show:false},nameTextStyle:{color:cssVar("--ec-axis"),fontSize:10}})],
    series:[
      {name:"2022 sized opportunity ($m)",type:"bar",barWidth:"46%",itemStyle:{color:PAL[1],borderRadius:[4,4,0,0]},data:cs.map(x=>x.valueMn)},
      {name:"% of sector GDP",type:"line",yAxisIndex:1,smooth:.3,symbolSize:7,lineStyle:{width:2,color:PAL[3]},itemStyle:{color:PAL[3]},
       data:cs.map(x=>x.shareSectorGDP)},
      {name:"Registered deployments",type:"scatter",yAxisIndex:1,symbolSize:11,itemStyle:{color:PAL[4]},
       data:cs.map(x=>USECASES.filter(u=>u.sector===x.sector&&u.status==="verified").length)}]},330)
   .on("click",p=>{const x=cs[p.dataIndex];if(x)setFilter("sector",x.sector)});
  const secs=Object.keys(econ.socialGrades);
  ec(document.getElementById("secSocial"),{
    tooltip:{position:"top",formatter:p=>`<b>${SECTOR[secs[p.data[1]]].name}</b><br>${dims[p.data[0]].name}: <b>${["","low","medium","high"][p.data[2]]}</b>`},
    grid:{left:150,right:26,top:14,bottom:78},
    xAxis:axis({type:"category",data:dims.map(d=>d.name),axisLabel:{interval:0,rotate:26,fontSize:10,color:cssVar("--ec-axis")},splitLine:{show:true,lineStyle:{color:cssVar("--ec-split")}}}),
    yAxis:axis({type:"category",data:secs.map(s=>SECTOR[s].name),axisLabel:{fontSize:11,color:cssVar("--txt2")},splitLine:{show:true,lineStyle:{color:cssVar("--ec-split")}}}),
    visualMap:{min:1,max:3,show:false,inRange:{color:["#DCE6F0",PAL[0],PAL[1]]}},
    series:[{type:"heatmap",data:secs.flatMap((s,y)=>dims.map((d,x)=>[x,y,econ.socialGrades[s][d.id]])),
      label:{show:true,formatter:p=>["","·","··","•••"][p.data[2]],color:"#fff",fontSize:11},
      itemStyle:{borderColor:cssVar("--surface"),borderWidth:2}}]},340);
};
function sectorDrawer(id){
  const S=SECTOR[id],e=ECON2022.sectors.find(x=>x.sector===id);
  const uc=USECASES.filter(u=>u.sector===id);
  const orgs=ORGS.filter(o=>uc.some(u=>u.org===o.id));
  const lh=ECON2022.lighthouse.filter(l=>l.sector===id);
  openDrawer(S.name,"SECTOR PROFILE",
    (e?card("2022 sized opportunity","historical estimate",
      `<div style="font-size:32px;font-weight:700;color:var(--teal);letter-spacing:-1.2px">$${e.valueMn}m</div>
       <div class="small muted">${e.shareSectorGDP}% of sector GDP · ${esc(e.driver)}</div>${srcLine("ECON22")}`)
      :card("2022 sized opportunity","",`<div class="empty">${unavailable("This sector was not sized in the 2022 study")}</div>`))
    +`<div style="height:12px"></div>`
    +card("Registered deployments",uc.length+" records",
      uc.length?uc.map(u=>`<div class="kv" style="cursor:pointer" data-act="useCase" data-args="${u.id}">
        <span class="k">${esc(u.name)}<div class="small muted">${esc((ORG[u.org]||{name:u.org}).name)}</div></span>
        <span class="v">${u.stage} · ${qbadge(u.status==="verified"?"verified":"in_review")}</span></div>`).join("")
       :`<div class="empty"><div class="big">No registered AI deployment in this sector</div>
          That is a finding, not a gap in the interface. <span class="src" data-act="closeAndContribute">Contribute a use case</span> if you know of one.</div>`)
    +(lh.length?`<div style="height:12px"></div>`+card("Lighthouse use cases proposed in 2022","",
      lh.map(l=>`<div class="kv" style="cursor:pointer" data-act="lighthouse" data-args="${l.id}">
        <span class="k">${esc(l.name)}</span><span class="v mono">$${l.lowMn}–${l.highMn}m</span></div>`).join("")):"")
    +(sectorDeepDive(id)?`<div style="height:12px"></div>`+sectorDeepDive(id):"")
    +(orgs.length?`<div style="height:12px"></div>`+card("Organisations active in this sector","",
      orgs.map(o=>`<div class="kv"><span class="k">${esc(o.name)}</span><span class="v">${esc(o.type)}</span></div>`).join("")):""),
    `<b data-act="go" data-args="sectors">Sectors</b> › <b>${esc(S.name)}</b>`);
}

/* 2026 landscape deep-dives, rendered inside the existing sector drawer. */
function sectorDeepDive(id){
  const dd=L26.sectorDeepDives||{};
  if(id==="HLT"&&dd.health)return card("2026 landscape review, health","the most mature AI sector",
    `<div class="prose"><p><b>${esc(dd.health.headline)}</b></p>
      <p><b>National Health Intelligence Centre.</b> ${esc(dd.health.healthIntelligenceCentre)}</p>
      <p><b>Horizon 1000 and the Anthropic MOU.</b> ${esc(dd.health.horizon1000)}</p></div>
     ${dd.health.stats.map(s=>`<div class="kv"><span class="k">${esc(s.label)}</span><span class="v mono">${esc(s.value)}</span></div>`).join("")}
     <div class="small" style="margin-top:10px;color:var(--amber)"><b>The precedent that should govern procurement.</b> ${esc(dd.health.precedent)}</div>
     ${srcLine("LANDSCAPE26")}`);
  if(id==="AGR"&&dd.agriculture)return card("2026 landscape review, agriculture","voice advisory in Kinyarwanda",
    `<div class="prose"><p><b>${esc(dd.agriculture.headline)}</b></p><p>${esc(dd.agriculture.problem)}</p></div>
     <b class="small">Architecture</b>
     ${dd.agriculture.architecture.map(a=>`<div class="kv"><span class="k mono">${esc(a.component)}</span><span class="v" style="max-width:66%">${esc(a.detail)}</span></div>`).join("")}
     <b class="small" style="display:block;margin-top:10px">Performance and targets</b>
     ${dd.agriculture.performance.map(p=>`<div class="kv"><span class="k">${esc(p.label)}</span><span class="v mono">${esc(p.value)}</span></div>`).join("")}
     <div class="small" style="margin-top:10px;color:var(--green)">${esc(dd.agriculture.sovereignty)}</div>
     ${srcLine("LANDSCAPE26")}`);
  if(id==="FIN"&&dd.socialProtection){const sp=dd.socialProtection;
    return card("2026 landscape review, social protection","the most AI-ready institution in Rwanda",
    `<div class="prose"><p><b>${esc(sp.headline)}</b></p><p>${esc(sp.pipeline.note)}</p></div>
     <div class="mono small" style="background:var(--surface2);border:1px solid var(--line);border-radius:8px;padding:11px;margin:9px 0;line-height:1.9">
       <b>${esc(sp.pipeline.name)}</b><br>${esc(sp.pipeline.sources)}<br>${sp.pipeline.stages.map(esc).join(" → ")}<br>
       <span class="muted">${esc(sp.pipeline.outputs)}</span></div>
     ${Object.entries(sp.achievements).map(([k,v])=>`<b class="small" style="display:block;margin-top:8px">${esc(k)}</b>
       <ul class="prose" style="margin-top:4px">${v.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`).join("")}
     <div class="small" style="margin-top:8px;color:var(--brand)">${esc(sp.whyItMatters)}</div>
     ${srcLine("RSSB")}`);}
  return null;
}
