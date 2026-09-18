
/* =============================== AI ECOSYSTEM ============================ */
VIEWS.ecosystem=async function(){
  const orgs=await api.orgs();
  const types=[...new Set(orgs.map(o=>o.type))];
  const ucByOrg=id=>USECASES.filter(u=>u.org===id).length;
  return vh("Ecosystem","Rwanda's AI ecosystem",
    "The organisations that build, fund, regulate, teach and deploy AI in Rwanda. The register is open, anyone can propose an addition, and every entry shows where it came from.",
    `<button class="btn pri" data-act="contribute" data-args="Organisation">Add an organisation</button>`)
  +`<div class="row" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
     ${types.slice(0,6).map(t=>kpi(t,orgs.filter(o=>o.type===t).length,"")).join("")}
   </div>
   <div class="row" style="grid-template-columns:1fr 1.4fr">
     ${cardF("Ecosystem composition","",`<div id="ecoPie" style="height:320px"></div>`)}
     ${cardF("Organisations",orgs.length+" registered",
      `<div class="scrollbox" style="max-height:320px"><table class="dt"><thead><tr>
        <th>Organisation</th><th>Type</th><th>Role</th><th class="n">Use cases</th><th>District</th></tr></thead><tbody>
        ${orgs.map(o=>`<tr class="clickable" data-act="organisation" data-args="${o.id}"><td><b>${esc(o.name)}</b></td>
          <td><span class="tag">${esc(o.type)}</span></td><td class="small muted">${esc(o.role)}</td>
          <td class="n mono">${ucByOrg(o.id)||""}</td><td class="small">${esc(o.district)}</td></tr>`).join("")}
       </tbody></table></div>`)}
   </div>
   <div class="row" style="grid-template-columns:1fr">
     ${cardF("Partners named by RAIA","the state's own view of who is active, by enablement pillar",
      `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px;padding:15px">
       ${RAIA.pillars.map((P,n)=>{
         const orgs=ORGS.filter(o=>(o.activityAreas||[]).includes(P.slug));
         if(!orgs.length)return"";
         return `<div style="border-left:3px solid ${PAL[n%PAL.length]};padding-left:12px">
           <b style="font-size:13px">${esc(P.name)}</b>
           <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px">
            ${orgs.map(o=>`<span class="tag" data-act="organisation" data-args="${o.id}">${esc(o.name)}</span>`).join("")}</div>
          </div>`}).join("")}</div>
       <div style="padding:0 15px 13px" class="small muted">
        Where this list and the platform's own register differ is informative in both directions: organisations the
        state names but we had not recorded, and organisations we track that the state does not list.
        ${srcLine("RAIA_CATALOGUE")}</div>`)}
   </div>

   <div class="row" style="grid-template-columns:1fr">
     ${card("Where Rwandan firms are actually building","2026 landscape review, the deployment base",
      `<div class="prose"><p><b>${esc(L26.deploymentBase.headline)}</b></p></div>
       <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;margin:12px 0">
       ${L26.deploymentBase.clusters.map((c,i)=>`<div class="card lift" style="box-shadow:none">
         <div class="bd"><div class="tag" style="color:${PAL[i]}">${esc(c.cluster)}</div>
          ${c.firms.map(f=>`<div class="kv"><span class="k"><b>${esc(f.name)}</b></span>
            <span class="v small" style="max-width:58%">${esc(f.detail)}</span></div>`).join("")}
         </div></div>`).join("")}</div>
       <div class="small" style="color:var(--amber)"><b>Correct instinct, wrong scale.</b> ${esc(L26.deploymentBase.reading)}</div>
       ${srcLine("LANDSCAPE26")}`)}
   </div>
   <div class="row" style="grid-template-columns:1fr 1fr">
     ${card("Start-up and innovation support","evidence from the 2022 studies",
       `<div class="prose">
         <p>The 2022 enabler snapshot recorded a <b>young but vibrant start-up ecosystem with over eight major incubators and accelerators</b>, and identified Kigali Innovation City as the intended anchor for talent, research and innovation.</p>
         <p>On financing, the <b>Rwanda Innovation Fund</b> was launched in 2018 specifically to address the financing gap facing tech-enabled companies at different growth stages.</p>
         <p>The readiness assessment was blunter about measurement: there was <b>no repository for AI companies and start-ups</b> at RISA, and relevant registry data at RDB was scattered across departments. That is why start-up counts in this platform are marked low-confidence.</p>
        </div>${srcLine("ECON22","and the 2022 readiness assessment")}`)}
     ${cardF("Ecosystem indicators tracked","",
       ["OXF12a","OXF12b","RWA12-SUBa","RWA11-SUBd","RWA12-SUBg","RWA6-SUBb"].map(c=>BYCODE[c]).filter(Boolean).map(i=>indRow(i)).join(""))}
   </div>`;
};
MOUNT.ecosystem=async function(){
  const orgs=await api.orgs();
  const types=[...new Set(orgs.map(o=>o.type))];
  ec(document.getElementById("ecoPie"),{
    tooltip:{trigger:"item"},legend:{bottom:0,type:"scroll",textStyle:{color:cssVar("--ec-axis"),fontSize:11}},
    series:[{type:"pie",radius:["44%","70%"],center:["50%","44%"],avoidLabelOverlap:true,
      itemStyle:{borderColor:cssVar("--surface"),borderWidth:2},label:{show:false},
      data:types.map((t,i)=>({name:t,value:orgs.filter(o=>o.type===t).length,itemStyle:{color:PAL[i%PAL.length]}}))}]},320);
};
function orgDrawer(id){
  const o=ORG[id];if(!o)return;
  const uc=USECASES.filter(u=>u.org===id);
  const inds=IND.filter(i=>i.owner===id);
  openDrawer(o.name,`ORGANISATION · ${o.type}`,
    card("Profile","",`<div class="kv"><span class="k">Type</span><span class="v">${esc(o.type)}</span></div>
      <div class="kv"><span class="k">Role in the AI ecosystem</span><span class="v" style="max-width:60%">${esc(o.role)}</span></div>
      <div class="kv"><span class="k">Based in</span><span class="v">${esc(o.district)}</span></div>`)
    +`<div style="height:12px"></div>`
    +card("Registered use cases",uc.length?"":"none",
      uc.length?uc.map(u=>`<div class="kv" style="cursor:pointer" data-act="useCase" data-args="${u.id}">
        <span class="k">${esc(u.name)}</span><span class="v">${u.stage}</span></div>`).join("")
       :`<div class="empty">${unavailable("No registered deployment attributed to this organisation")}</div>`)
    +(inds.length?`<div style="height:12px"></div>`+card("Indicators this organisation reports on",inds.length+" indicators",
      inds.map(i=>`<div class="kv" style="cursor:pointer" data-act="indicator" data-args="${i.code}">
        <span class="k mono">${i.code}</span><span class="v" style="max-width:70%">${esc(i.name)} ${qbadge(i.verification)}</span></div>`).join("")):""),
    `<b data-act="go" data-args="ecosystem">Ecosystem</b> › <b>${esc(o.name)}</b>`);
}

/* ========================= GEOGRAPHIC INTELLIGENCE ======================= */
let GEO_STATE={loaded:false,geojson:null,metric:"usecases",attempted:false,level:"district",selected:null};

/* ---------------------------------------------------------------------------
   RwandaMap, an adapter of knowbee/react-rwanda-map (MIT, Igwaneza Bruce).
   The library's contract is preserved: selectedColor, defaultColor,
   strokeColor, nameColor, height, scale, position and an onSelect callback,
   with hover tooltips and click-to-select.
   Two deliberate departures:
     · it renders from GeoJSON supplied at runtime rather than from baked-in
       paths, because this platform must not ship approximated national
       borders, see the note rendered beneath the map;
     · it supports district level as well as province level, because every
       record in this platform is districted and the library is province-only.
   --------------------------------------------------------------------------- */
function RwandaMap(el, opts){
  if(!el) return null;
  const o = Object.assign({
    geojson:null, values:[], level:"district",
    defaultColor:cssVar("--chip"), selectedColor:PAL[0], strokeColor:cssVar("--line2"),
    nameColor:cssVar("--txt2"), height:460, scale:1, position:{x:50,y:50},
    label:"value", onSelect:()=>{}
  }, opts||{});

  const max = Math.max(1..o.values.map(v=>v.value||0));
  const mapName = "rwanda-"+o.level;
  echarts.registerMap(mapName, o.geojson);

  const chart = ec(el, {
    tooltip:{trigger:"item", formatter:p=>{
      const v = o.values.find(x=>x.name===p.name);
      if(!v) return `<b>${p.name}</b><br><span style="color:${cssVar("--mut")}">no record</span>`;
      return `<b>${p.name}</b><br>${o.label}: <b>${v.value}</b>`
        + (v.sub?`<br><span style="font-size:11px;color:${cssVar("--mut")}">${v.sub}</span>`:"");
    }},
    visualMap:{ min:0, max, left:14, bottom:14, calculable:false,
      inRange:{ color:[o.defaultColor, o.selectedColor] },
      textStyle:{ color:cssVar("--ec-axis"), fontSize:10.5 },
      text:["more","none"] },
    series:[{
      type:"map", map:mapName, roam:true, zoom:o.scale,
      layoutCenter:[o.position.x+"%", o.position.y+"%"], layoutSize:"96%",
      itemStyle:{ areaColor:o.defaultColor, borderColor:o.strokeColor, borderWidth:0.9 },
      emphasis:{ label:{show:true, color:o.nameColor, fontSize:11},
                 itemStyle:{ areaColor:o.selectedColor, borderColor:cssVar("--brand"), borderWidth:1.6 } },
      select:{ itemStyle:{ areaColor:o.selectedColor, borderColor:cssVar("--brand"), borderWidth:2 },
               label:{show:true, color:o.nameColor} },
      selectedMode:"single",
      label:{ show:false },
      data:o.values
    }]
  }, o.height);

  if(chart) chart.on("click", p=>{ GEO_STATE.selected=p.name; o.onSelect(p.name); });
  return chart;
}
VIEWS.geo=async function(){
  const districts=await api.districts();
  const stat=d=>({usecases:USECASES.filter(u=>u.district===d.code&&u.status==="verified").length,
                  orgs:ORGS.filter(o=>o.district===d.name).length});
  const rows=districts.map(d=>({d, ...stat(d)})).sort((a,b)=>(b.usecases+b.orgs)-(a.usecases+a.orgs));
  const withAny=rows.filter(r=>r.usecases+r.orgs>0).length;
  return vh("Geography","Geographic intelligence",
    "Rwanda's 30 districts, with the ecosystem assets and AI deployments recorded in each. National indicators are national, this layer never disaggregates them into district scores that were never measured.",
    `<div class="seg"><button class="${GEO_STATE.level==="district"?"on":""}" data-act="geoLevel" data-args="district">Districts</button>
       <button class="${GEO_STATE.level==="province"?"on":""}" data-act="geoLevel" data-args="province">Provinces</button></div>
     <select class="sel" data-act="geoMetric" data-on="change">
       <option value="usecases">Registered AI use cases</option>
       <option value="orgs">Ecosystem organisations</option></select>
     <button class="btn" data-act="loadGeoFile">Load boundary file</button>
     <input type="file" id="geoFile" accept=".geojson.json" style="display:none" data-act="geoFile" data-on="change">`)
  +`<div class="row" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
     ${kpi("Districts",districts.length,`across ${PROVINCES.length} provinces`)}
     ${kpi("Districts with recorded activity",withAny,`${districts.length-withAny} have no recorded AI activity yet`)}
     ${kpi("District-level indicators","0 of "+IND.length,"the national framework has no subnational indicator","var(--amber)",
       "Every indicator in the national framework is defined at national level. Producing district scores would mean inventing variation that was never measured.")}
     ${kpi("Concentration",rows[0]?Math.round(100*(rows[0].usecases+rows[0].orgs)/rows.reduce((s,r)=>s+r.usecases+r.orgs,0))+"%":"–",
       rows[0]?"of recorded activity is in "+rows[0].d.name:"","var(--amber)")}
   </div>
   <div class="row" style="grid-template-columns:1.3fr 1fr">
     ${cardF("District map","official boundaries load at runtime",`<div id="geoMap" style="height:460px"></div>
        <div id="geoNote" style="padding:12px 15px;border-top:1px solid var(--line)"></div>`)}
     ${cardF("Districts by recorded activity","",
       `<div class="scrollbox" style="max-height:520px"><table class="dt"><thead><tr>
         <th>District</th><th>Province</th><th class="n">Use cases</th><th class="n">Organisations</th><th>National indicators</th></tr></thead><tbody>
         ${rows.map(r=>`<tr class="clickable" data-act="district" data-args="${r.d.code}">
           <td><b>${esc(r.d.name)}</b></td><td class="small muted">${esc(r.d.prov)}</td>
           <td class="n mono">${r.usecases||'<span class="muted">0</span>'}</td>
           <td class="n mono">${r.orgs||'<span class="muted">0</span>'}</td>
           <td class="small">${unavailable("national only")}</td></tr>`).join("")}
        </tbody></table></div>`)}
   </div>
   <div class="row" style="grid-template-columns:1fr 1fr">
     ${cardF("The physical ceiling","national generation against the load a single AI campus draws",
      `<div id="geoPower" style="height:250px"></div>
       <div style="padding:0 15px 13px" class="small muted">${esc(L26.physicalCeiling.note)}</div>`)}
     ${card("What the comparison means","2026 landscape review",
      `<div class="prose"><p><b>${esc(L26.physicalCeiling.headline)}</b></p><p>${esc(L26.physicalCeiling.reading)}</p></div>
       ${L26.physicalCeiling.recommendations.map(r=>`<div class="kv"><span class="k"><b>${esc(r.title)}</b>
         <div class="small muted" style="max-width:400px;margin-top:2px">${esc(r.detail)}</div></span></div>`).join("")}
       ${srcLine("LANDSCAPE26")}`)}
   </div>
   <div class="row" style="grid-template-columns:1fr">
     ${card("Why there are no district readiness scores","a deliberate limit, not a missing feature",
       `<div class="prose">
         <p>All ${META.registry.main} indicators in the national main set are defined and collected at national level. There are only two ways to produce a district score from them: disaggregate national values, which fabricates variation nobody measured; or substitute a different indicator set, which would no longer be the national framework.</p>
         <p>So this layer shows what genuinely exists at district level, where deployments and institutions are, and marks everything else unavailable. A proper subnational layer is buildable from indicators that do exist by district (connectivity, electrification, schools, registered firms), and would be published separately and labelled as context, never folded into the national index.</p>
         <p><b>Boundary data.</b> Official administrative boundaries are not bundled with this build. The map requests ${esc(GEO_CONFIG.boundarySources.join(" then "))} at load, and you can load a file directly with the button above. Expected: ${esc(GEO_CONFIG.expected)}, joined on ${esc(GEO_CONFIG.joinKey)}. Until a boundary file resolves, the map plots district centroids rather than drawing an approximate outline of a real country's borders.</p>
        </div>`)}
   </div>`;
};
MOUNT.geo=async function(){
  mountPowerChart();
  const districts=await api.districts();
  const el=document.getElementById("geoMap");if(!el)return;
  const metric=GEO_STATE.metric;
  const dVal=d=>metric==="usecases"?USECASES.filter(u=>u.district===d.code&&u.status==="verified").length
                                   :ORGS.filter(o=>o.district===d.name).length;
  if(!GEO_STATE.attempted){GEO_STATE.attempted=true;await tryLoadBoundaries()}
  const note=document.getElementById("geoNote");
  const old=CHARTS.find(c=>c.getDom()===el);if(old){old.dispose();CHARTS=CHARTS.filter(c=>c!==old)}
  const label=metric==="usecases"?"Registered use cases":"Ecosystem organisations";

  if(GEO_STATE.loaded&&GEO_STATE.geojson){
    let values;
    if(GEO_STATE.level==="province"){
      values=PROVINCES.map(p=>{
        const ds=districts.filter(d=>d.prov===p);
        const v=ds.reduce((s,d)=>s+dVal(d),0);
        return {name:p,value:v,sub:ds.length+" districts"};
      });
    }else{
      values=districts.map(d=>({name:d.name,value:dVal(d),sub:d.prov,code:d.code}));
    }
    RwandaMap(el,{
      geojson:GEO_STATE.geojson, values, level:GEO_STATE.level, label,
      height:460, onSelect:name=>{
        const d=districts.find(x=>x.name===name);
        if(d)districtDrawer(d.code);
      }
    });
    note.innerHTML=`<span class="tag g">Boundaries loaded</span>
      <span class="small muted">Rendered at ${GEO_STATE.level} level from the supplied GeoJSON, joined on name. Click an area for its record. Values are counts of recorded activity, never scores.</span>
      <div class="small muted" style="margin-top:6px">Map component adapted from
        <span class="src" data-act="mapCredit">react-rwanda-map</span> (MIT, Igwaneza Bruce), extended to district level and driven by runtime GeoJSON.</div>`;
  }else{
    ec(el,{tooltip:{trigger:"item",formatter:p=>p.data&&p.data.name?`<b>${p.data.name}</b><br>${p.data.prov}<br>${label}: <b>${p.data.v}</b>`:""},
      grid:{left:16,right:16,top:16,bottom:16},
      xAxis:{type:"value",min:28.8,max:30.95,show:false},yAxis:{type:"value",min:-2.92,max:-1.0,show:false},
      series:[{type:"scatter",data:districts.map(d=>({value:[d.lon,d.lat],name:d.name,prov:d.prov,v:dVal(d),code:d.code})),
        symbolSize:d=>{const dd=districts.find(x=>x.lon===d[0]);return 9+Math.min(26,dVal(dd)*7)},
        itemStyle:{color:p=>p.data.v>0?PAL[0]:cssVar("--line2"),opacity:.9},
        label:{show:true,position:"right",formatter:p=>p.data.v>0?p.data.name:"",color:cssVar("--ec-axis"),fontSize:10}}]},460)
      .on("click",p=>{if(p.data&&p.data.code)districtDrawer(p.data.code)});
    note.innerHTML=`<span class="tag a">Boundary file not loaded</span>
      <span class="small muted">Plotting district centroids, every point is clickable. The map will not draw an approximated national or district boundary, because an approximate border is worse than none.
      Supply official GeoJSON at <span class="mono">${esc(GEO_CONFIG.boundarySources[0])}</span> or use <b>Load boundary file</b> above; the choropleth then renders immediately. Expected: ${esc(GEO_CONFIG.expected)}.</span>
      <div class="small muted" style="margin-top:6px">Map component adapted from
        <span class="src" data-act="mapCredit">react-rwanda-map</span> (MIT, Igwaneza Bruce).</div>`;
  }
};
function mapCreditDrawer(){
  openDrawer("Rwanda map component","ATTRIBUTION AND ADAPTATION",
    card("Origin","",
      `<div class="prose"><p>The map component follows <b>react-rwanda-map</b> by Igwaneza Bruce (MIT licence), an interactive SVG map of Rwanda for React applications.</p>
        <p>Its prop contract is preserved here. <span class="mono">selectedColor</span>, <span class="mono">defaultColor</span>, <span class="mono">strokeColor</span>, <span class="mono">nameColor</span>, <span class="mono">height</span>, <span class="mono">scale</span>, <span class="mono">position</span> and an <span class="mono">onSelect</span> callback, along with hover tooltips and click-to-select, rendered in this platform's design tokens rather than the library's Tailwind classes.</p></div>
       <div class="kv"><span class="k">Upstream</span><span class="v"><a class="src" href="https://github.com/knowbee/react-rwanda-map" target="_blank" rel="noopener">github.com/knowbee/react-rwanda-map ↗</a></span></div>
       <div class="kv"><span class="k">Licence</span><span class="v">MIT</span></div>
       <div class="kv"><span class="k">Author</span><span class="v">Igwaneza Bruce</span></div>`)
    +`<div style="height:12px"></div>`
    +card("Two deliberate departures","",
      `<div class="prose">
        <p><b>District level, not only province level.</b> The library renders Rwanda's five provinces. Every record in this platform, use cases, organisations, assets, is held at district level, so the adapter renders all 30 districts and aggregates to provinces on demand.</p>
        <p><b>Geometry loaded at runtime, not bundled.</b> The library ships its province paths inside the package. This platform loads official GeoJSON from <span class="mono">${esc(GEO_CONFIG.boundarySources.join("</span> or <span class='mono'>"))}</span>, or from a file you supply. That is a consequence of a rule the platform applies to itself: it will not ship approximated borders for a real country. Drop in the official NISR or RCMRD level-2 file and the choropleth renders on the next paint.</p>
       </div>`));
}
function mountPowerChart(){
  const f=L26.physicalCeiling.figures;
  ec(document.getElementById("geoPower"),{
    tooltip:{trigger:"axis",axisPointer:{type:"shadow"},formatter:ps=>`<b>${ps[0].name}</b><br><b>${ps[0].value}</b> MW`},
    grid:{left:180,right:46,top:14,bottom:30},
    xAxis:axis({type:"value",name:"MW",nameTextStyle:{color:cssVar("--ec-axis"),fontSize:10}}),
    yAxis:axis({type:"category",data:f.map(x=>x.name).reverse(),axisLabel:{fontSize:11,color:cssVar("--txt2")}}),
    series:[{type:"bar",barWidth:"58%",itemStyle:{borderRadius:[0,4,4,0]},
      data:f.map(x=>({value:x.mw,itemStyle:{color:x.name.indexOf("hyperscale")>=0?PAL[7]:PAL[0]}})).reverse(),
      label:{show:true,position:"right",formatter:"{c} MW",fontSize:10.5,color:cssVar("--ec-axis")}}]},250);
}
async function tryLoadBoundaries(){
  for(const u of GEO_CONFIG.boundarySources){
    try{const r=await fetch(u);if(r.ok){const j=await r.json();
      if(j&&j.type){GEO_STATE.geojson=j;GEO_STATE.loaded=true;return true}}}catch(e){}
  }
  return false;
}
function loadGeoFile(inp){
  const f=inp.files[0];if(!f)return;
  const rd=new FileReader();
  rd.onload=()=>{try{const j=JSON.parse(rd.result);
    if(!j.type||!(j.features||j.geometries))throw new Error("Not a GeoJSON FeatureCollection");
    GEO_STATE.geojson=j;GEO_STATE.loaded=true;toast("Boundaries loaded. "+(j.features?j.features.length:0)+" features");MOUNT.geo();
  }catch(e){toast("Could not read that file: "+e.message)}};
  rd.readAsText(f);
}
function districtDrawer(code){
  const d=DISTRICTS.find(x=>x.code===code);if(!d)return;
  const uc=USECASES.filter(u=>u.district===code);
  const orgs=ORGS.filter(o=>o.district===d.name);
  openDrawer(d.name,`DISTRICT · ${d.prov}`,
    card("Recorded activity","",
      `<div class="kv"><span class="k">Registered AI use cases</span><span class="v mono">${uc.length}</span></div>
       <div class="kv"><span class="k">Ecosystem organisations</span><span class="v mono">${orgs.length}</span></div>
       <div class="kv"><span class="k">District code</span><span class="v mono">${d.code}</span></div>
       <div class="kv"><span class="k">District-level indicators</span><span class="v">${unavailable("none collected")}</span></div>`)
    +`<div style="height:12px"></div>`
    +card("AI readiness for this district","",
      `<div class="empty"><div class="big">Not measured</div>
        The national framework contains no district-level indicator. Rather than disaggregate a national figure, this platform reports that no district measurement exists.
        <div style="margin-top:10px"><span class="src" data-act="closeAndGo" data-args="about">How this is handled in the methodology</span></div></div>`)
    +(uc.length?`<div style="height:12px"></div>`+card("Deployments here","",
      uc.map(u=>`<div class="kv" style="cursor:pointer" data-act="useCase" data-args="${u.id}"><span class="k">${esc(u.name)}</span>
        <span class="v">${u.stage}</span></div>`).join("")):"")
    +(orgs.length?`<div style="height:12px"></div>`+card("Organisations based here","",
      orgs.map(o=>`<div class="kv" style="cursor:pointer" data-act="organisation" data-args="${o.id}"><span class="k">${esc(o.name)}</span>
        <span class="v">${esc(o.type)}</span></div>`).join("")):""),
    `<b data-act="go" data-args="geo">Geographic intelligence</b> › <b>${esc(d.name)}</b>`);
}

/* ========================= POLICY & REGULATION =========================== */
VIEWS.policy=async function(){
  const pol=await api.policies();
  const gates=LADDER[Math.min(4,ML.assigned)].gates;
  return vh("Governance","Policy and regulation",
    "Rwanda's AI policy and regulatory environment, and the specific instruments that are currently holding the maturity level where it is.")
  +`<div class="row" style="grid-template-columns:1fr">
     ${card("What is blocking the next maturity level","computed from capability gates, not opinion",
       `<div style="display:grid;grid-template-columns:180px 1fr;gap:20px;align-items:start">
         <div><div class="small muted">CURRENT LEVEL</div>
           <div style="font-size:36px;font-weight:700;color:var(--brand);letter-spacing:-1.5px">L${ML.assigned}</div>
           <div style="font-weight:600">${ML.def.n}</div>
           <div class="small muted" style="margin-top:5px">score band L${ML.band} · gate level L${ML.gate}</div></div>
         <div><div class="prose"><p>Rwanda reaches <b>L${Math.min(5,ML.assigned+1)} ${LADDER[Math.min(4,ML.assigned)].n}</b> when every gate below is satisfied${RUN.maturity.score<LADDER[Math.min(4,ML.assigned)].min?` and the maturity composite reaches ${LADDER[Math.min(4,ML.assigned)].min}.0 (currently ${fmt(RUN.maturity.score)})`:""}.</p></div>
           ${gates.map(g=>{const ok=gateOK(g[0],RUN),I=BYCODE[g[0]];
             return `<div class="kv" style="cursor:pointer" data-act="indicator" data-args="${g[0]}">
               <span class="k">${ok?'<span style="color:var(--green)">✔</span>':'<span style="color:var(--red)">✗</span>'} ${esc(g[1])}</span>
               <span class="v mono">${I?rawFmt(I,RUN.iS[g[0]].raw):""} · ${I?esc(ORG[I.owner].name.split(" ")[0]):""}</span></div>`}).join("")}
           <div class="small" style="margin-top:10px;color:var(--amber)">${gates.filter(g=>!gateOK(g[0],RUN)&&["binary","ordinal"].includes((BYCODE[g[0]]||{}).method)).length} of the unmet gates are administrative decisions rather than investments, they can move inside one budget cycle.</div>
         </div></div>`)}
   </div>
   <div class="row" style="grid-template-columns:1fr 1fr">
     ${card("What exists","2026 landscape review, trust, ethics and sovereignty",
      `<div class="prose"><p>${esc(L26.governanceGaps.headline)}</p></div>
       ${L26.governanceGaps.exists.map(x=>`<div class="kv"><span class="k">
         <span style="color:var(--green)">✔</span> <b>${esc(x.item)}</b>
         <div class="small muted" style="max-width:400px;margin-top:2px">${esc(x.detail)}</div></span></div>`).join("")}`)}
     ${card("What is missing","each gap is low cost relative to infrastructure",
      `${L26.governanceGaps.missing.map(x=>`<div class="kv"><span class="k">
         <span style="color:var(--red)">✗</span> <b>${esc(x.item)}</b>
         <div class="small muted" style="max-width:400px;margin-top:2px">${esc(x.detail)}</div></span>
         <span class="v"><span class="tag ${x.cost==="lowest"?"g":x.cost==="low"?"a":""}">${esc(x.cost)} cost</span></span></div>`).join("")}
       <div class="small" style="margin-top:10px;color:var(--brand)">${esc(L26.governanceGaps.closingNote)}</div>
       ${srcLine("LANDSCAPE26")}`)}
   </div>

   <div class="row" style="grid-template-columns:1fr">
     ${card("What the government's own catalogue says is still missing","RAIA's national AI portfolio, September 2026",
      `<div class="prose"><p>RAIA publishes eight enablement pillars, and each one separates <b>what exists today</b>
        from <b>what still needs to be built</b>. That second list is unusual and useful: it is the institution
        responsible for closing a gap stating on the record that the gap is open.</p>
        <p>Three instruments this platform scores at zero are confirmed absent by that document. An absence
        corroborated by the body accountable for filling it is about as strong as evidence of absence gets.</p></div>
       ${["L26-AIEVAL","L26-AILAW","L26-AIPROC"].map(c=>{const I=BYCODE[c];if(!I)return"";
         return `<div class="kv" data-act="indicator" data-args="${c}"><span class="k">
           <span style="color:var(--red)">✗</span> <b>${esc(I.name)}</b>
           <div class="small muted" style="max-width:640px;margin-top:3px">${esc(I.note||"")}</div></span>
           <span class="v"><span class="qbadge q-verified">corroborated</span></span></div>`}).join("")}
       <hr class="sep">
       <div class="prose"><p><b>One gap has partly closed.</b> This platform recorded no public register of state AI
         systems. RAIA's national record now lists <b>${RAIA.record.useCases} verified use cases across
         ${RAIA.record.institutions} institutions</b>, each reviewed against primary documentation and dated. The
         indicator moves from 0 to 50 rather than to 100: the record carries sector and stage, not risk
         classification, oversight arrangements or routes to redress. Rwanda now publishes what it deploys, not how
         those systems are governed.</p></div>
       <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
         <button class="btn sm" data-act="indicator" data-args="L26-AIREG">See the register indicator</button>
         <a class="btn sm" href="${esc(RAIA.record.url)}" target="_blank" rel="noopener">Open the national record ↗</a></div>
       ${srcLine("RAIA_CATALOGUE")}`)}
   </div>

   <div class="row" style="grid-template-columns:1fr">
     ${cardF("The eight national enablement pillars","RAIA's portfolio, mapped to this platform's indicators",
      `<table class="dt"><thead><tr><th>Pillar</th><th>Ambition</th><th class="n">Indicators here</th>
        <th class="n">Score</th><th class="n">Stated gaps</th></tr></thead><tbody>
       ${RAIA.pillars.map(P=>{
         const inds=IND.filter(i=>i.raiaPillar===P.slug);
         const sc=inds.filter(i=>RUN.iS[i.code].assessed);
         const avg=sc.length?sc.reduce((a,i)=>a+RUN.iS[i.code].score,0)/sc.length:null;
         return `<tr data-act="pillar" data-args="${P.slug}"><td><b>${String(P.n).padStart(2,"0")} ${esc(P.name)}</b>
           <div class="small muted">${esc(P.strapline)}</div></td>
           <td class="small">${P.markers.map(m=>`<span class="tag">${esc(m)}</span>`).join(" ")}</td>
           <td class="n mono">${inds.length||'<span class="unavail">0</span>'}</td>
           <td class="n">${avg!==null?`<b style="color:${scColor(avg)}">${fmt(avg)}</b>`:unavailable("no indicator")}</td>
           <td class="n mono">${P.needs.length}</td></tr>`}).join("")}
      </tbody></table>
      <div style="padding:12px 15px;border-top:1px solid var(--line)" class="small muted">
        The framework behind this platform predates RAIA's portfolio, so the two are held side by side rather than
        merged. Where a pillar shows few indicators. <b>Platforms &amp; Intelligence</b> has
        ${IND.filter(i=>i.raiaPillar==="platforms-intelligence").length}, it is a measurement gap on this platform,
        not an absence of national activity.</div>`)}
   </div>

   <div class="row" style="grid-template-columns:1.1fr 1fr">
     ${card("The National AI Agency","approved by Cabinet, "+esc(L26.nationalAiAgency.approved),
      `<div class="prose"><p><b>${esc(L26.nationalAiAgency.claim)}</b></p>
        <p><b>Mandate.</b> ${esc(L26.nationalAiAgency.mandate)}</p>
        <p><b>Instruments.</b> ${esc(L26.nationalAiAgency.instruments)}</p>
        <p>${esc(L26.nationalAiAgency.design)}</p></div>
       <b class="small" style="display:block;margin-top:6px">The five constraints it exists to resolve</b>
       ${L26.nationalAiAgency.constraintsItResolves.map(c=>`<div class="kv">
         <span class="k">${c.n}. ${esc(c.constraint)}</span><span class="v small">${esc(c.status)}</span></div>`).join("")}
       ${srcLine("LANDSCAPE26")}`)}
     ${card("The 2026 to 2030 agenda","conversion, not ambition",
      `<div class="prose" style="font-size:12.5px"><p>${esc(L26.agenda2026to2030.framing)}</p></div>
       ${L26.agenda2026to2030.phases.map((p,i)=>`<div style="margin-top:10px">
         <div style="display:flex;gap:8px;align-items:baseline"><span class="tag ${["b","a","g"][i]}">${esc(p.period)}</span>
           <b style="font-size:13px">${esc(p.theme)}</b></div>
         <ul class="prose" style="margin-top:5px;font-size:12.5px">${p.actions.map(a=>`<li>${esc(a)}</li>`).join("")}</ul></div>`).join("")}`)}
   </div>

   <div class="row" style="grid-template-columns:1fr">
     ${cardF("Policy and regulatory register",pol.length+" instruments",
      `<table class="dt"><thead><tr><th>Instrument</th><th>Category</th><th>Owner</th><th class="n">Year</th><th>Status</th><th>Source</th></tr></thead><tbody>
       ${pol.map((p,i)=>`<tr class="clickable" data-act="policy" data-args="${i}">
         <td><b>${esc(p.n)}</b><div class="small muted">${esc(p.d.slice(0,96))}…</div></td>
         <td><span class="tag">${esc(p.cat)}</span></td><td>${esc(p.owner)}</td>
         <td class="n mono">${p.year||"–"}</td>
         <td>${p.status.includes("In force")?'<span class="tag g">'+esc(p.status)+'</span>':p.status.includes("Not")?'<span class="tag r">'+esc(p.status)+'</span>':'<span class="tag a">'+esc(p.status)+'</span>'}</td>
         <td class="small"><span class="src" data-act="source" data-args="${p.src}">${esc(SRC(p.src).org)}</span></td></tr>`).join("")}
      </tbody></table>`)}
   </div>
   <div class="row" style="grid-template-columns:1fr 1fr">
     ${cardF("Governance indicators tracked","",
       ["OXF1","TOR118","OXF2","OXF4","TOR111","TOR108","TOR87","TOR58","RWA11-SUBb","RWA12-SUBf-S"].map(c=>BYCODE[c]).filter(Boolean).map(i=>indRow(i)).join(""))}
     ${card("Data protection context","from the 2022 readiness assessment",
       `<div class="prose">
         <p>Rwanda's data protection and privacy law provides mechanisms for protecting personal data in processing, ensures free flow of non-personal data, and <b>promotes data localisation</b>. It does not refer to AI explicitly, but it regulates data processing regardless of the technology used.</p>
         <p>The 2022 assessment noted a tension worth tracking: the legal imperative for local data storage was perceived as potentially contributing to a <b>less competitive environment for deploying AI solutions</b>. Whether that holds is an empirical question the cloud-authorisation and cost indicators are designed to answer.</p>
        </div>${srcLine("AIRM22")}`)}
   </div>`;
};
function pillarDrawer(slug){
  const P=RAIA.pillars.find(x=>x.slug===slug);if(!P)return;
  const inds=IND.filter(i=>i.raiaPillar===slug);
  openDrawer(P.name,`NATIONAL ENABLEMENT PILLAR ${String(P.n).padStart(2,"0")} OF 8`,
    card(P.strapline,"",
      `<div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:10px">${P.markers.map(m=>`<span class="tag b">${esc(m)}</span>`).join("")}</div>
       <b class="small" style="display:block;margin-top:8px;color:var(--green)">What exists today</b>
       <ul class="prose" style="margin-top:5px">${P.exists.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
       <b class="small" style="display:block;margin-top:10px;color:var(--amber)">What still needs to be built</b>
       <ul class="prose" style="margin-top:5px">${P.needs.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
       ${srcLine("RAIA_CATALOGUE")}`)
    +`<div style="height:12px"></div>`
    +(inds.length?cardF("Indicators this platform tracks against the pillar",inds.length+" indicators",
        inds.map(i=>indRow(i)).join(""))
      :card("Indicators tracked here","",
        `<div class="empty"><div class="big">Not yet measured</div>
          This platform holds no indicator against this pillar. That is a gap in the measurement framework rather
          than a statement about national activity.</div>`)),
    `<b data-act="go" data-args="policy">Policy &amp; regulation</b> › <b>${esc(P.name)}</b>`);
}

function policyDrawer(i){
  const p=POLICIES[i];
  openDrawer(p.n,`POLICY INSTRUMENT · ${p.cat}`,
    card("Summary","",`<div class="prose"><p>${esc(p.d)}</p></div>
      <div class="kv"><span class="k">Owner</span><span class="v">${esc(p.owner)}</span></div>
      <div class="kv"><span class="k">Year</span><span class="v mono">${p.year||"–"}</span></div>
      <div class="kv"><span class="k">Status</span><span class="v">${esc(p.status)}</span></div>
      ${p.url?`<div class="kv"><span class="k">Reference</span><span class="v"><a class="src" href="${p.url}" target="_blank" rel="noopener">${esc(p.url)}</a></span></div>`:""}
      ${srcLine(p.src)}`),
    `<b data-act="go" data-args="policy">Policy &amp; regulation</b> › <b>${esc(p.n)}</b>`);
}

/* ========================== TALENT & RESEARCH ============================ */
VIEWS.talent=async function(){
  const inds=IND.filter(i=>i.dim==="D1");
  const d=RUN.dS.D1;
  return vh("Capability","AI talent and skills",
    "The workforce and education pipeline behind Rwanda's AI ambitions, where it is growing, where it is thin, and how confident the measurement is.")
  +`<div class="row" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
     ${kpi("Skills dimension score",fmt(d.score),`${deltaHtml(d.score,PREV.dS.D1.score," pts")} · coverage ${pct(d.coverage)}`,scColor(d.score))}
     ${kpi("Professionals trained",rawFmt(BYCODE["RWA1-SUB1"],RUN.iS["RWA1-SUB1"].raw),qbadge(BYCODE["RWA1-SUB1"].verification))}
     ${kpi("AI postgraduates",rawFmt(BYCODE["RWA2-SUBf"],RUN.iS["RWA2-SUBf"].raw),qbadge(BYCODE["RWA2-SUBf"].verification))}
     ${kpi("Universities with AI programmes",rawFmt(BYCODE["RWA4.2"],RUN.iS["RWA4.2"].raw),"degree programmes offered")}
     ${kpi("Schools teaching AI/tech",rawFmt(BYCODE["RWA2.2-SCH"],RUN.iS["RWA2.2-SCH"].raw),"primary and secondary")}
   </div>
   <div class="row" style="grid-template-columns:1.3fr 1fr">
     ${cardF("Talent pipeline over time","normalised scores, all skills indicators",`<div id="tlChart" style="height:320px"></div>`)}
     ${card("The pipeline problem","evidence from the 2022 assessment",
       `<div class="prose">
         <p>The first-round assessment found <b>science graduates per capita declining from 2016 to 2019</b>, with STEM graduates down 44% by tally and 48% per capita over the same period, a steeper real decline once 2.5% annual population growth is accounted for.</p>
         <p>Against that, <b>AI postgraduates numbered 45 in 2022</b>, about 0.5% of 2019 STEM graduates, which the assessment read as limited awareness of AI opportunities among students.</p>
         <p>The encouraging counter-signal is informal: GitHub commits rose <b>over 400% between 2018 and 2019</b> and kept climbing, and AI papers co-authored with Rwandan researchers more than doubled from 63 to 143 between 2019 and 2020. Capability is forming outside the formal education system faster than inside it.</p>
        </div>${srcLine("AIRM22")}`)}
   </div>
   <div class="row" style="grid-template-columns:1fr">
     ${card("How many officials have been trained in AI? Three sources, three answers",
       "an unresolved definitional conflict, published rather than resolved",
      `<div class="prose"><p>This is the clearest example on the platform of why a number without a definition is
        not a measurement. Three credible sources report the same apparent quantity and differ by more than three
        orders of magnitude.</p></div>
       <table class="dt" style="margin:10px 0"><thead><tr><th>Source</th><th class="n">Figure</th><th>What it appears to count</th><th class="n">Year</th></tr></thead><tbody>
        <tr data-act="indicator" data-args="RAIA-OFFICIALS-AI"><td><b>RAIA national AI catalogue</b></td>
          <td class="n mono">134,000+</td><td class="small muted">Government officials reached by AI training of unstated depth</td><td class="n mono">2026</td></tr>
        <tr data-act="indicator" data-args="RWA8"><td><b>2022 national readiness assessment</b></td>
          <td class="n mono">41</td><td class="small muted">Civil servants completing AI policy or regulatory training</td><td class="n mono">2022</td></tr>
        <tr data-act="source" data-args="LANDSCAPE26"><td><b>2026 independent landscape review</b></td>
          <td class="n mono">50</td><td class="small muted">Civil servants across 24 institutions, national AI literacy programme</td><td class="n mono">2026</td></tr>
       </tbody></table>
       <div class="prose"><p>Almost certainly these measure different things: a short awareness or digital-literacy
         module counted per head, against a structured policy or technical programme. All three may be accurate.</p>
        <p><b>The platform publishes all three rather than choosing between them.</b> Adopting the largest figure
         would flatter the skills dimension on an undefined basis; adopting the smallest would ignore an official
         source. Neither is measurement. What is needed is a published definition of what "trained in AI" counts, and that is a request worth making of RAIA.</p></div>
       ${srcLine("RAIA_CATALOGUE","cross-checked against the 2022 assessment and the 2026 review")}`)}
   </div>

   <div class="row" style="grid-template-columns:1fr 1.2fr">
     ${cardF("Learning outcomes against the attainment scale","World Bank harmonised test score",
      `<div id="tlHCI" style="height:250px"></div>
       <div style="padding:0 15px 13px" class="small muted">${esc(L26.humanCapital.hciNote)} ${srcLine("WB_HCI")}</div>`)}
     ${card("Three gaps beneath the AI programme","2026 landscape review",
      `<div class="prose"><p>Rwanda is building AI literacy on top of a foundational literacy problem, and the AI programme cannot outrun the education system beneath it.</p></div>
       ${L26.humanCapital.gaps.map(g=>`<div class="kv"><span class="k"><b>${esc(g.gap)}</b>
         <div class="small muted" style="max-width:440px;margin-top:2px">${esc(g.detail)}</div></span></div>`).join("")}
       ${srcLine("LANDSCAPE26")}`)}
   </div>
   <div class="row" style="grid-template-columns:1fr">
     ${cardF("All skills and literacy indicators",inds.length+" tracked",inds.map(i=>indRow(i)).join(""))}
   </div>`;
};
MOUNT.talent=async function(){
  const hc=L26.humanCapital;
  ec(document.getElementById("tlHCI"),{
    tooltip:{trigger:"axis",axisPointer:{type:"shadow"}},
    grid:{left:130,right:44,top:14,bottom:30},
    xAxis:axis({type:"value",min:250,max:650,name:"harmonised test score",nameTextStyle:{color:cssVar("--ec-axis"),fontSize:10}}),
    yAxis:axis({type:"category",data:["Advanced attainment","Rwanda","Minimum attainment"],axisLabel:{fontSize:11,color:cssVar("--txt2")}}),
    series:[{type:"bar",barWidth:"56%",itemStyle:{borderRadius:[0,4,4,0]},
      data:[{value:hc.harmonisedMax,itemStyle:{color:cssVar("--line2")}},
            {value:hc.harmonisedTestScore,itemStyle:{color:PAL[2]}},
            {value:hc.harmonisedMin,itemStyle:{color:cssVar("--line2")}}],
      label:{show:true,position:"right",fontSize:10.5,color:cssVar("--ec-axis")}}]},250);
  const inds=IND.filter(i=>i.dim==="D1");
  ec(document.getElementById("tlChart"),{
    tooltip:{trigger:"axis"},legend:{type:"scroll",top:4,textStyle:{color:cssVar("--ec-axis"),fontSize:10.5}},
    grid:{left:42,right:18,top:54,bottom:28},
    xAxis:axis({type:"category",data:YEARS,boundaryGap:false}),yAxis:axis({type:"value",max:100}),
    series:inds.slice(0,10).map((I,i)=>({name:I.name.slice(0,26),type:"line",smooth:.3,symbol:"none",
      data:YEARS.map(y=>{const s=RUNS[y].iS[I.code];return s.assessed?+s.score.toFixed(1):null}),
      lineStyle:{width:1.8,color:PAL[i%PAL.length]},itemStyle:{color:PAL[i%PAL.length]},connectNulls:false}))},320);
};
VIEWS.research=async function(){
  const codes=["RWA2-SUBb-CIT","STAN13","TOR82","RWA2.2-COL","STAN10","TOR88","TOR92","TOR32","RWA2-SUBb-FND","TOR109"];
  const inds=codes.map(c=>BYCODE[c]).filter(Boolean);
  return vh("Capability","Research and innovation",
    "Research output, collaboration and open-source activity, the leading indicators of whether Rwanda can build AI rather than only buy it.")
  +`<div class="row" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
     ${kpi("AI paper citations",rawFmt(BYCODE["RWA2-SUBb-CIT"],RUN.iS["RWA2-SUBb-CIT"].raw),qbadge("verified")+" Scimago")}
     ${kpi("Researchers (AI/STEM)",rawFmt(BYCODE["TOR82"],RUN.iS["TOR82"].raw),"UNESCO UIS")}
     ${kpi("International collaborations",rawFmt(BYCODE["RWA2.2-COL"],RUN.iS["RWA2.2-COL"].raw),"co-authored programmes, OECD")}
     ${kpi("R&D intensity",rawFmt(BYCODE["TOR109"],RUN.iS["TOR109"].raw)+"%","of GDP · UNESCO","var(--amber)",
       "The 2022 study noted ~0.7% of GDP, with the AI share unknown.")}
     ${kpi("Open-source AI commits",rawFmt(BYCODE["TOR92"],RUN.iS["TOR92"].raw),"GitHub, proxy measure")}
   </div>
   <div class="row" style="grid-template-columns:1fr 1fr">
     ${cardF("Research and open-source trajectory","",`<div id="rsChart" style="height:320px"></div>`)}
     ${card("Reading these numbers carefully","",
       `<div class="prose">
         <p>Research indicators here are <b>third-party sourced and well covered</b>. Scimago, UNESCO and OECD all publish Rwanda. That makes them among the most reliable measurements on the platform, and also the least controllable by any single Rwandan institution.</p>
         <p>GitHub activity is a <b>proxy, not a measurement</b> of AI skill. It captures all software development, country attribution is imperfect, and the 2022 assessment found only 68 commits and between one and three collaborators on actual open-source AI packages between 2019 and 2022. Treat the trend, not the level.</p>
         <p>R&D intensity is the number that should worry policymakers most: around 0.7% of GDP against 3.45% in the United States and 2.4% in China, with the AI-attributable share unknown because no one measures it.</p>
        </div>${srcLine("AIRM22","R&D comparison from the same assessment")}`)}
   </div>
   <div class="row" style="grid-template-columns:1fr">
     ${cardF("Research and innovation indicators",inds.length+" tracked",inds.map(i=>indRow(i)).join(""))}
   </div>`;
};
MOUNT.research=async function(){
  const codes=["RWA2-SUBb-CIT","STAN13","TOR82","RWA2.2-COL","TOR92"];
  ec(document.getElementById("rsChart"),{
    tooltip:{trigger:"axis"},legend:{top:4,type:"scroll",textStyle:{color:cssVar("--ec-axis"),fontSize:10.5}},
    grid:{left:44,right:18,top:48,bottom:28},
    xAxis:axis({type:"category",data:YEARS}),yAxis:axis({type:"value",max:100,name:"normalised score",nameTextStyle:{color:cssVar("--ec-axis"),fontSize:10}}),
    series:codes.map((c,i)=>({name:BYCODE[c].name.slice(0,28),type:"bar",
      data:YEARS.map(y=>{const s=RUNS[y].iS[c];return s.assessed?+s.score.toFixed(1):null}),
      itemStyle:{color:PAL[i%PAL.length],borderRadius:[3,3,0,0]}}))},320);
};
