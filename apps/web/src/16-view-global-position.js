
/* ======================= GLOBAL POSITION ================================
   How Rwanda compares across Africa and globally. Every comparison carries
   its comparability tier, because these indices measure different things, the whole finding on this page is that two of them disagree, and both are
   right.
   ======================================================================*/
VIEWS.position=async function(){
  const B=await api.benchmarks(), L=await api.landscape();
  const gov=B.series.find(s=>s.id==="africa-governance-2026");
  const rdy=B.series.find(s=>s.id==="global-readiness-2025");
  const oxf=B.series.find(s=>s.id==="oxford-2021");
  const use=B.series.find(s=>s.id==="usage-2026");
  const govRank=gov.values.slice().sort((a,b)=>b.value-a.value).findIndex(v=>v.iso3==="RWA")+1;

  return vh("Comparative position","How Rwanda compares",
    "Rwanda's standing across the continent and globally, and the gap between the two indices that matter most. One measures the capacity to govern AI, the other the readiness to build it. Rwanda leads on the first and sits mid-table on the second.",
    `<button class="btn" data-act="go" data-args="readiness">National scores</button>
     <button class="btn" data-act="source" data-args="LANDSCAPE26">About the 2026 review</button>`)
  +`<div class="banner note"><b>Read these together, not separately.</b> ${esc(L.comparativePosition.reading)}</div>

   <div class="row" style="grid-template-columns:repeat(auto-fit,minmax(196px,1fr))">
     ${kpi("Africa AI governance",gov.values.find(v=>v.iso3==="RWA").value,
        `1st of ${gov.values.length} in the set · score of 4`,"var(--green)",
        gov.measures,{dec:2,suf:" / 4",act:"benchmark",actArgs:"africa-governance-2026"})}
     ${kpi("Global AI readiness",rdy.values.find(v=>v.iso3==="RWA").value,
        `5th of the African states in the set · of 195`,"var(--amber)",
        rdy.measures,{pre:"#",act:"benchmark",actArgs:"global-readiness-2025"})}
     ${kpi("Measured AI usage",use.values[0].value,
        `${L.measuredAdoption.usageRank} of ${L.measuredAdoption.usageUniverse} globally`,"var(--red)",
        use.measures,{dec:2,suf:"x expected",act:"go",actArgs:"adoption"})}
     ${kpi("Government AI readiness, 2021",oxf.values.find(v=>v.iso3==="RWA").value,
        `rank 112 of 172 · ${B.africaPosition.rankInAfrica}th in Africa`,"var(--txt)",
        oxf.measures,{dec:2,suf:" / 100",act:"benchmark",actArgs:"oxford-2021"})}
     ${kpi("Indices tracked",B.indexComparison.length,
        "each with its own comparability tier","var(--txt)",
        "No index on this page is blended with another. They measure different constructs.")}
   </div>

   <div class="row" style="grid-template-columns:1fr 1fr">
     ${cardF("Capacity to govern AI. Africa",gov.name+" "+gov.edition+" · "+gov.scale,
       `<div id="gpGov" style="height:300px"></div>
        <div style="padding:0 15px 13px" class="small muted">${esc(gov.reading)} ${srcLine(gov.sourceId)}</div>`)}
     ${cardF("Readiness to deploy AI, global rank",rdy.name+" "+rdy.edition+" · lower is better",
       `<div id="gpRdy" style="height:300px"></div>
        <div style="padding:0 15px 13px" class="small muted">${esc(rdy.reading)} ${srcLine(rdy.sourceId)}</div>`)}
   </div>

   <div class="row" style="grid-template-columns:1fr">
     ${cardF("The same country, four different answers","each index measures a different construct, the tier tells you what may be compared with what",
      `<table class="dt"><thead><tr><th>Index</th><th>What it measures</th><th>Rwanda's position</th><th class="n">Value</th><th>Comparability</th></tr></thead><tbody>
       ${B.indexComparison.map(c=>`<tr>
         <td><b>${esc(c.index)}</b></td>
         <td class="small muted">${esc(c.measures)}</td>
         <td>${esc(c.rwandaPosition)}</td>
         <td class="n mono">${esc(c.value)}</td>
         <td><span class="tag ${c.tier==="A"?"g":c.tier==="B"?"a":"r"}" data-tip="${esc(B.tiers[c.tier].detail)}">Tier ${c.tier} · ${esc(B.tiers[c.tier].label)}</span></td></tr>`).join("")}
      </tbody></table>
      <div style="padding:12px 15px;border-top:1px solid var(--line)" class="small muted">
        A governance index and a readiness index disagreeing about the same country is not a contradiction, it is the finding. Rwanda built the rules faster than the substrate beneath them.</div>`)}
   </div>

   <div class="row" style="grid-template-columns:1.1fr 1fr">
     ${cardF("The governance–usage gap","first in Africa on the rules, 111th of 121 on observed use",
       `<div id="gpGap" style="height:290px"></div>
        <div style="padding:0 15px 13px" class="small muted">${esc(L.measuredAdoption.whyItMatters)}</div>`)}
     ${cardF("Where Rwanda sat in 2021","the neighbouring band in that edition, tightly packed",
       `<div id="gpOxf" style="height:290px"></div>
        <div style="padding:0 15px 13px" class="small muted">${esc(oxf.reading)}</div>`)}
   </div>

   <div class="row" style="grid-template-columns:1fr 1fr">
     ${cardF("Pillar scores, 2021","where the weakness already showed",
       `<div id="gpPillars" style="height:250px"></div>
        <div style="padding:0 15px 13px" class="small muted">${esc(B.oxfordPillars2021.note)} ${srcLine("OXFORD")}</div>`)}
     ${card("Regional context","how the region scored in the same edition",
       `${B.regionalAverages2021.items.map(r=>`<div class="kv"><span class="k">${esc(r.name)}
          <div class="small muted" style="max-width:340px;margin-top:2px">${esc(r.comment)}</div></span>
          <span class="v mono">${r.value}</span></div>`).join("")}
        <hr class="sep">
        <div class="prose"><p>In the 2021 edition Rwanda ranked <b>${B.africaPosition.rankInAfrica}th in Africa</b>, behind ${B.africaPosition.ahead.map(esc).join(", ")}. By the 2026 governance index it ranks <b>first</b>.</p>
         <p>${esc(B.africaPosition.comment)}</p></div>
        ${srcLine("AIRM22")}`)}
   </div>

   <div class="row" style="grid-template-columns:1fr">
     ${card("What Rwanda offers that a larger market cannot","the comparative case, from the 2026 review",
      `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:14px">
        ${L.proposition.points.map(p=>`<div style="border-left:3px solid var(--brand);padding-left:12px">
          <b style="font-size:13.5px">${p.n}. ${esc(p.title)}</b>
          <div class="small muted" style="margin-top:4px;line-height:1.6">${esc(p.detail)}</div></div>`).join("")}
       </div>
       <div class="small" style="margin-top:14px;color:var(--brand)"><b>The ask.</b> ${esc(L.proposition.ask)}</div>
       ${srcLine("LANDSCAPE26")}`)}
   </div>`;
};
MOUNT.position=async function(){
  const B=await api.benchmarks();
  const hi=(iso)=>iso==="RWA"?PAL[0]:cssVar("--line2");

  const gov=B.series.find(s=>s.id==="africa-governance-2026");
  const gv=gov.values.slice().sort((a,b)=>a.value-b.value);
  ec(document.getElementById("gpGov"),{
    tooltip:{trigger:"axis",axisPointer:{type:"shadow"},formatter:ps=>`<b>${ps[0].name}</b><br><b>${ps[0].value}</b> of 4`},
    grid:{left:96,right:44,top:14,bottom:30},
    xAxis:axis({type:"value",max:4,name:"score of 4",nameTextStyle:{color:cssVar("--ec-axis"),fontSize:10}}),
    yAxis:axis({type:"category",data:gv.map(v=>v.country),axisLabel:{fontSize:11.5,color:cssVar("--txt2")}}),
    series:[{type:"bar",barWidth:"62%",itemStyle:{borderRadius:[0,4,4,0]},
      data:gv.map(v=>({value:v.value,itemStyle:{color:hi(v.iso3)}})),
      label:{show:true,position:"right",fontSize:10.5,color:cssVar("--ec-axis")}}]},300);

  const rdy=B.series.find(s=>s.id==="global-readiness-2025");
  const rv=rdy.values.slice().sort((a,b)=>b.value-a.value);
  ec(document.getElementById("gpRdy"),{
    tooltip:{trigger:"axis",axisPointer:{type:"shadow"},formatter:ps=>`<b>${ps[0].name}</b><br>rank <b>${ps[0].value}</b> of 195`},
    grid:{left:96,right:44,top:14,bottom:30},
    xAxis:axis({type:"value",inverse:true,name:"rank of 195, lower is better",nameTextStyle:{color:cssVar("--ec-axis"),fontSize:10}}),
    yAxis:axis({type:"category",data:rv.map(v=>v.country),axisLabel:{fontSize:11.5,color:cssVar("--txt2")}}),
    series:[{type:"bar",barWidth:"62%",itemStyle:{borderRadius:[4,0,0,4]},
      data:rv.map(v=>({value:v.value,itemStyle:{color:hi(v.iso3)}})),
      label:{show:true,position:"right",formatter:"#{c}",fontSize:10.5,color:cssVar("--ec-axis")}}]},300);

  // Governance percentile against usage percentile, the divergence in one view
  const govPct=100*(gov.values.length-1)/(gov.values.length-1);
  const usePct=100*(121-111)/120;
  ec(document.getElementById("gpGap"),{
    tooltip:{trigger:"axis",axisPointer:{type:"shadow"},
      formatter:ps=>`<b>${ps[0].name}</b><br>percentile <b>${ps[0].value.toFixed(0)}</b>`},
    grid:{left:150,right:50,top:20,bottom:30},
    xAxis:axis({type:"value",max:100,name:"percentile position",nameTextStyle:{color:cssVar("--ec-axis"),fontSize:10}}),
    yAxis:axis({type:"category",data:["Measured AI usage\n(111 of 121 globally)","Government readiness\n(112 of 172, 2021)","AI governance capacity\n(1st in Africa, 2026)"],
      axisLabel:{fontSize:10.5,color:cssVar("--txt2"),lineHeight:14}}),
    series:[{type:"bar",barWidth:"52%",itemStyle:{borderRadius:[0,4,4,0]},
      data:[{value:usePct,itemStyle:{color:cssVar("--red")}},
            {value:100*(172-112)/171,itemStyle:{color:cssVar("--amber")}},
            {value:govPct,itemStyle:{color:cssVar("--green")}}],
      label:{show:true,position:"right",formatter:p=>p.value.toFixed(0)+"th",fontSize:11,color:cssVar("--ec-axis")}}]},290);

  const oxf=B.series.find(s=>s.id==="oxford-2021");
  const ov=oxf.values.slice().sort((a,b)=>a.value-b.value);
  ec(document.getElementById("gpOxf"),{
    tooltip:{trigger:"axis",axisPointer:{type:"shadow"},
      formatter:ps=>{const v=ov[ps[0].dataIndex];return `<b>${v.country}</b><br>score <b>${v.value}</b> · rank ${v.rank} of 172`}},
    grid:{left:98,right:52,top:14,bottom:30},
    xAxis:axis({type:"value",min:34,max:37,name:"score of 100",nameTextStyle:{color:cssVar("--ec-axis"),fontSize:10}}),
    yAxis:axis({type:"category",data:ov.map(v=>v.country),axisLabel:{fontSize:11,color:cssVar("--txt2")}}),
    series:[{type:"bar",barWidth:"62%",itemStyle:{borderRadius:[0,4,4,0]},
      data:ov.map(v=>({value:v.value,itemStyle:{color:hi(v.iso3)}})),
      label:{show:true,position:"right",formatter:p=>ov[p.dataIndex].value+" · #"+ov[p.dataIndex].rank,
        fontSize:10,color:cssVar("--ec-axis")}}]},290);

  const pil=B.oxfordPillars2021;
  ec(document.getElementById("gpPillars"),{
    tooltip:{trigger:"axis",axisPointer:{type:"shadow"}},
    grid:{left:130,right:44,top:14,bottom:30},
    xAxis:axis({type:"value",max:100}),
    yAxis:axis({type:"category",data:pil.pillars.map(p=>p.name),axisLabel:{fontSize:11,color:cssVar("--txt2")}}),
    series:[{type:"bar",barWidth:"58%",itemStyle:{borderRadius:[0,4,4,0]},
      data:pil.pillars.map(p=>({value:p.value,itemStyle:{color:p.value<35?cssVar("--red"):p.value<45?cssVar("--amber"):PAL[0]}})),
      label:{show:true,position:"right",fontSize:10.5,color:cssVar("--ec-axis")},
      markLine:{silent:true,symbol:"none",label:{formatter:"overall "+pil.overall,fontSize:10,color:cssVar("--mut")},
        lineStyle:{color:cssVar("--line2"),type:"dashed"},data:[{xAxis:pil.overall}]}}]},250);
};
function benchDrawer(id){
  const s=BENCH.series.find(x=>x.id===id);if(!s)return;
  const sorted=s.values.slice().sort((a,b)=>s.invert?a.value-b.value:b.value-a.value);
  openDrawer(s.name+" "+s.edition,`COMPARATIVE INDEX · TIER ${s.tier}`,
    card("What it measures","",
      `<div class="prose"><p>${esc(s.measures)}</p><p>${esc(s.reading)}</p></div>
       <div class="kv"><span class="k">Scale</span><span class="v">${esc(s.scale)}</span></div>
       <div class="kv"><span class="k">Scope</span><span class="v">${esc(s.scope)}</span></div>
       <div class="kv"><span class="k">Comparability</span><span class="v">Tier ${s.tier}. ${esc(BENCH.tiers[s.tier].label)}</span></div>
       <div class="small muted" style="margin-top:8px">${esc(BENCH.tiers[s.tier].detail)}</div>
       ${srcLine(s.sourceId)}`)
    +`<div style="height:12px"></div>`
    +cardF("Full set","",
      `<table class="dt"><thead><tr><th>Country</th><th class="n">Value</th>${sorted[0].rank?'<th class="n">Rank</th>':""}</tr></thead><tbody>
       ${sorted.map(v=>`<tr style="${v.iso3==="RWA"?"background:var(--hover)":""}">
         <td>${v.iso3==="RWA"?"<b>"+esc(v.country)+"</b>":esc(v.country)}</td>
         <td class="n mono">${v.value}</td>${v.rank?`<td class="n mono">#${v.rank}</td>`:""}</tr>`).join("")}
      </tbody></table>`),
    `<b data-act="go" data-args="position">Global position</b> › <b>${esc(s.name)}</b>`);
}
