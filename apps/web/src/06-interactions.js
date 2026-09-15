
/* ==================== v2 INTERACTION LAYER ==============================
   Year scrubber, cross-filtering, command palette, animated counters,
   skeleton loading and a custom tooltip. All of it drives real state.
   ====================================================================== */
const FILTER={sector:null,dim:null};
function setYear(y,rerender){
  bindYear(+y);
  const lab=document.getElementById("yearLab");if(lab)lab.textContent=YEAR;
  const sl=document.getElementById("yearSlider");if(sl&&+sl.value!==YEAR)sl.value=YEAR;
  const hb=document.getElementById("yearHist");
  if(hb)hb.innerHTML=YEAR===META.cycle?'<span class="tag g">Latest cycle</span>'
    :`<span class="histbadge">Viewing ${YEAR} — historical</span>`;
  if(rerender!==false)go(VIEW);
}
function setFilter(k,v){
  FILTER[k]=(FILTER[k]===v)?null:v;
  go(VIEW);
}
function clearFilters(){FILTER.sector=null;FILTER.dim=null;go(VIEW)}
function filterBar(){
  const bits=[];
  if(FILTER.sector)bits.push(`<span class="fchip">Sector · ${esc(SECTOR[FILTER.sector].name)}<button data-act="filter" data-args="sector|${FILTER.sector}">✕</button></span>`);
  if(FILTER.dim)bits.push(`<span class="fchip">Dimension · ${FILTER.dim} ${esc(DIMS.find(d=>d.id===FILTER.dim).short)}<button data-act="filter" data-args="dim|${FILTER.dim}">✕</button></span>`);
  if(YEAR!==META.cycle)bits.push(`<span class="fchip" style="background:var(--amber)">Reporting year · ${YEAR}<button data-act="setYear" data-args="${META.cycle}">✕</button></span>`);
  if(!bits.length)return "";
  return `<div class="filterbar">${bits.join("")}<button class="btn sm" data-act="resetAll">Clear all</button>
    <span class="hint">Cross-filters apply to every chart and table on the page</span></div>`;
}
/* animated counters */
function countUp(el,to,decimals,prefix,suffix){
  const from=0,dur=620,t0=performance.now();
  const step=now=>{
    const k=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-k,3),v=from+(to-from)*e;
    el.textContent=(prefix||"")+v.toLocaleString("en-US",{minimumFractionDigits:decimals,maximumFractionDigits:decimals})+(suffix||"");
    if(k<1)requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function animateCounters(){
  document.querySelectorAll("[data-count]").forEach(el=>{
    const to=parseFloat(el.getAttribute("data-count"));
    if(isNaN(to))return;
    countUp(el,to,+(el.getAttribute("data-dec")||0),el.getAttribute("data-pre")||"",el.getAttribute("data-suf")||"");
  });
}
/* skeleton */
function skeleton(){
  return `<div class="skgrid">${Array(5).fill('<div class="sk" style="height:96px"></div>').join("")}</div>
    <div class="row" style="grid-template-columns:1.5fr 1fr"><div class="sk" style="height:330px"></div><div class="sk" style="height:330px"></div></div>
    <div class="sk" style="height:220px"></div>`;
}
/* tooltip */
(function(){
  let tip;
  document.addEventListener("mouseover",e=>{
    const el=e.target.closest?e.target.closest("[data-tip]"):null;
    if(!el)return;
    tip=document.getElementById("tip");if(!tip)return;
    tip.textContent=el.getAttribute("data-tip");tip.classList.add("on");
    const r=el.getBoundingClientRect();
    tip.style.left=Math.min(window.innerWidth-340,Math.max(10,r.left))+"px";
    tip.style.top=(r.bottom+9)+"px";
  });
  document.addEventListener("mouseout",e=>{
    if(e.target.closest&&e.target.closest("[data-tip]")){const t=document.getElementById("tip");if(t)t.classList.remove("on")}
  });
})();
/* command palette */
let CMD={items:[],sel:0};
function palIndex(){
  const out=NAV.map(([id,n])=>({k:"Page",t:n,s:"",go:()=>go(id)}));
  IND.forEach(i=>out.push({k:"Indicator",t:i.code+" · "+i.name,s:DIMS.find(d=>d.id===i.dim).short,go:()=>indDrawer(i.code)}));
  DIMS.forEach(d=>out.push({k:"Dimension",t:d.id+" · "+d.n,s:d.cls,go:()=>dimDrawer(d.id)}));
  SECTORS.forEach(s=>out.push({k:"Sector",t:s.name,s:"",go:()=>sectorDrawer(s.id)}));
  ORGS.forEach(o=>out.push({k:"Organisation",t:o.name,s:o.type,go:()=>orgDrawer(o.id)}));
  Object.values(SOURCES).forEach(s=>out.push({k:"Source",t:s.name,s:s.org,go:()=>sourceDrawer(s.id)}));
  USECASES.forEach(u=>out.push({k:"Use case",t:u.name,s:SECTOR[u.sector].name,go:()=>ucDrawer(u.id)}));
  ECON2022.lighthouse.forEach(l=>out.push({k:"Lighthouse",t:l.name,s:"$"+l.lowMn+"–"+l.highMn+"m · 2022",go:()=>lighthouseDrawer(l.id)}));
  return out;
}
function openPalette(){
  CMD.items=palIndex();CMD.sel=0;
  const p=document.getElementById("pal");p.classList.add("on");
  const q=document.getElementById("palq");q.value="";q.focus();palSearch();
}
function closePalette(){document.getElementById("pal").classList.remove("on")}
function palSearch(){
  const q=(document.getElementById("palq").value||"").toLowerCase().trim();
  const res=(q?CMD.items.filter(i=>(i.t+" "+i.k+" "+i.s).toLowerCase().includes(q)):CMD.items.filter(i=>i.k==="Page")).slice(0,40);
  CMD.res=res;CMD.sel=0;
  document.getElementById("palres").innerHTML=res.length?res.map((i,n)=>
    `<div class="palitem ${n===0?"sel":""}" data-n="${n}" data-act="paletteGo" data-args="${n}">
      <span class="pk">${i.k}</span><span class="pt">${esc(i.t)}</span><span class="ps">${esc(i.s)}</span></div>`).join("")
    :`<div class="palitem"><span class="pt muted">Nothing matches “${esc(q)}”. Try an indicator code, a sector or an organisation.</span></div>`;
}
function palGo(n){const i=CMD.res[n];if(!i)return;closePalette();i.go()}
function palKey(e){
  if(e.key==="Escape")return closePalette();
  if(!CMD.res||!CMD.res.length)return;
  if(e.key==="Enter"){e.preventDefault();return palGo(CMD.sel)}
  if(e.key==="ArrowDown"||e.key==="ArrowUp"){
    e.preventDefault();
    CMD.sel=(CMD.sel+(e.key==="ArrowDown"?1:-1)+CMD.res.length)%CMD.res.length;
    document.querySelectorAll(".palitem").forEach(el=>el.classList.toggle("sel",+el.dataset.n===CMD.sel));
    const el=document.querySelector(".palitem.sel");if(el&&el.scrollIntoView)el.scrollIntoView({block:"nearest"});
  }
}
document.addEventListener("keydown",e=>{
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();openPalette()}
  if(e.key==="Escape")closePalette();
});
/* ---- reusable chart builders shared across views ---- */
function ring(el,val,target,color,label){
  if(!el)return;
  ec(el,{series:[
    {type:"gauge",startAngle:215,endAngle:-35,min:0,max:100,radius:"94%",center:["50%","55%"],
     progress:{show:true,width:10,roundCap:true,itemStyle:{color}},
     axisLine:{lineStyle:{width:10,color:[[1,cssVar("--chip")]]}},
     pointer:{show:false},axisTick:{show:false},splitLine:{show:false},axisLabel:{show:false},anchor:{show:false},
     detail:{valueAnimation:true,fontSize:22,fontWeight:700,fontFamily:"Inter",color,offsetCenter:[0,"0%"],
       formatter:v=>v.toFixed(1)},
     title:{show:true,offsetCenter:[0,"34%"],color:cssVar("--mut"),fontSize:10.5},
     data:[{value:+val.toFixed(1),name:label||("target "+target)}]},
    {type:"gauge",startAngle:215,endAngle:-35,min:0,max:100,radius:"94%",center:["50%","55%"],
     pointer:{show:false},axisTick:{show:false},splitLine:{show:false},axisLabel:{show:false},detail:{show:false},
     axisLine:{lineStyle:{width:10,color:[[target/100,"rgba(0,0,0,0)"],[target/100+0.008,cssVar("--txt2")],[1,"rgba(0,0,0,0)"]]}},
     data:[{value:0}]}]},128);
}
function sankeyConversion(el){
  if(!el)return;
  const d=id=>RUN.dS[id].score||0;
  const cap=(d("D1")+d("D2")+d("D3"))/3, conv=RUN.maturity.score, loss=Math.max(0,cap-conv);
  ec(el,{tooltip:{trigger:"item",formatter:p=>p.dataType==="edge"
      ?`${p.data.source} → ${p.data.target}<br><b>${p.data.value.toFixed(1)}</b> weighted score units`
      :`<b>${p.name}</b>`},
    series:[{type:"sankey",left:8,right:118,top:12,bottom:10,nodeWidth:12,nodeGap:12,emphasis:{focus:"adjacency"},
      data:[{name:"Skills"},{name:"Infrastructure"},{name:"Data"},{name:"Enabling capability"},
        {name:"Public adoption"},{name:"Private adoption"},{name:"Responsible AI"},
        {name:"Observed AI maturity"},{name:"Not yet converted"}].map(n=>Object.assign(n,{
          itemStyle:{color:n.name==="Not yet converted"?cssVar("--red"):n.name==="Observed AI maturity"?PAL[4]:
            n.name==="Enabling capability"?PAL[0]:PAL[1]},
          label:{color:n.name==="Not yet converted"?cssVar("--red"):cssVar("--txt2"),fontSize:11}})),
      links:[
        {source:"Skills",target:"Enabling capability",value:d("D1")},
        {source:"Infrastructure",target:"Enabling capability",value:d("D2")},
        {source:"Data",target:"Enabling capability",value:d("D3")},
        {source:"Enabling capability",target:"Public adoption",value:d("D4")},
        {source:"Enabling capability",target:"Private adoption",value:d("D5")},
        {source:"Enabling capability",target:"Responsible AI",value:d("D6")},
        {source:"Enabling capability",target:"Not yet converted",value:loss*1.9},
        {source:"Public adoption",target:"Observed AI maturity",value:d("D4")*0.92},
        {source:"Private adoption",target:"Observed AI maturity",value:d("D5")*0.92},
        {source:"Responsible AI",target:"Observed AI maturity",value:d("D6")*0.92}],
      lineStyle:{color:"gradient",opacity:.32,curveness:.5}}]},290);
}
function waterfall(el){
  if(!el)return;
  const dims=DIMS.map(D=>({D,v:(RUN.dS[D.id].score||0)/6}));
  const help=[],vals=[];let acc=0;
  dims.forEach(x=>{help.push(+acc.toFixed(2));vals.push(+x.v.toFixed(2));acc+=x.v});
  ec(el,{tooltip:{trigger:"axis",axisPointer:{type:"shadow"},formatter:ps=>{
      const i=ps[0].dataIndex,x=dims[i];
      return `<b>${x.D.short}</b><br>Contribution: <b>${x.v.toFixed(2)}</b> index points<br>Dimension score ${fmt(RUN.dS[x.D.id].score)} ÷ 6 dimensions`}},
    grid:{left:44,right:20,top:20,bottom:62},
    xAxis:axis({type:"category",data:dims.map(x=>x.D.short).concat(["Composite"]),
      axisLabel:{interval:0,rotate:24,fontSize:10,color:cssVar("--ec-axis")}}),
    yAxis:axis({type:"value",name:"index points",nameTextStyle:{color:cssVar("--ec-axis"),fontSize:10}}),
    series:[
      {type:"bar",stack:"w",itemStyle:{color:"transparent"},data:help.concat([0]),silent:true},
      {type:"bar",stack:"w",barWidth:"56%",itemStyle:{borderRadius:[4,4,0,0]},
        data:dims.map(x=>({value:+x.v.toFixed(2),itemStyle:{color:x.D.color}}))
          .concat([{value:+acc.toFixed(2),itemStyle:{color:cssVar("--txt2")}}]),
        label:{show:true,position:"top",fontSize:10,color:cssVar("--ec-axis"),formatter:p=>p.value.toFixed(1)}}]},300);
}
function histogram(el,scores){
  if(!el)return;
  const bins=[0,10,20,30,40,50,60,70,80,90,100],counts=Array(10).fill(0);
  scores.forEach(s=>{if(s===null)return;const b=Math.min(9,Math.floor(s/10));counts[b]++});
  ec(el,{tooltip:{trigger:"axis",axisPointer:{type:"shadow"},
      formatter:ps=>`Score ${bins[ps[0].dataIndex]}–${bins[ps[0].dataIndex+1]}<br><b>${ps[0].value}</b> indicators`},
    grid:{left:40,right:16,top:16,bottom:30},
    xAxis:axis({type:"category",data:bins.slice(0,10).map((b,i)=>b+"–"+bins[i+1])}),
    yAxis:axis({type:"value",minInterval:1}),
    series:[{type:"bar",barWidth:"78%",data:counts.map((c,i)=>({value:c,
      itemStyle:{color:scColor(bins[i]+5),borderRadius:[3,3,0,0]}}))}]},210);
}

/* ==================== CHARTS AS TABLES ==================================
   Every chart carries a text alternative. This is the accessibility fix — a
   canvas is invisible to a screen reader — but it also serves two other
   audiences the platform names: analysts who want the numbers, and users on
   the low-bandwidth connections that 34% smartphone ownership implies.
   ======================================================================= */
const CHART_TABLES = {};

/** Register the data behind a chart so it can be rendered as a table. */
function chartTable(id, caption, headers, rows) {
  CHART_TABLES[id] = { caption, headers, rows };
}

function registerChartTables() {
  document.querySelectorAll("[data-chart-id]").forEach(el => {
    const id = el.getAttribute("data-chart-id");
    if (!CHART_TABLES[id] || el.querySelector(".chartswap")) return;
    const swap = document.createElement("div");
    swap.className = "chartswap";
    swap.innerHTML = `<button class="btn sm" data-act="chartTable" data-args="${id}"
      aria-controls="${id}-table" aria-expanded="false">View as table</button>`;
    el.parentNode.insertBefore(swap, el.nextSibling);
    makeActionablesFocusable(swap);
  });
}

function toggleChartTable(id) {
  const chart = document.querySelector(`[data-chart-id="${id}"]`);
  const data = CHART_TABLES[id];
  if (!chart || !data) return;
  const existing = document.getElementById(id + "-table");
  const button = document.querySelector(`[data-act="chartTable"][data-args="${id}"]`);

  if (existing) {
    existing.remove();
    chart.style.display = "";
    button.textContent = "View as table";
    button.setAttribute("aria-expanded", "false");
    return;
  }
  const wrap = document.createElement("div");
  wrap.id = id + "-table";
  wrap.style.padding = "0 12px 12px";
  wrap.innerHTML = `<table class="charttable">
    <caption class="visually-hidden">${esc(data.caption)}</caption>
    <thead><tr>${data.headers.map(h =>
      `<th scope="col"${typeof h === "object" && h.n ? ' class="n"' : ""}>${esc(typeof h === "object" ? h.label : h)}</th>`).join("")}</tr></thead>
    <tbody>${data.rows.map(r => `<tr>${r.map((c, i) =>
      `<td${typeof data.headers[i] === "object" && data.headers[i].n ? ' class="n"' : ""}>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  chart.style.display = "none";
  chart.parentNode.insertBefore(wrap, chart.nextSibling);
  button.textContent = "View as chart";
  button.setAttribute("aria-expanded", "true");
  wrap.setAttribute("tabindex", "-1");
  wrap.focus();
}

/* Charts are decorative to assistive technology once a table alternative
   exists, so they are hidden from the accessibility tree rather than
   announced as an unlabelled image. */
function markChartAccessible(el, id, label) {
  if (!el) return;
  el.setAttribute("data-chart-id", id);
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", label);
}
