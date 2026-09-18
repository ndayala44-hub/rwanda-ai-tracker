
/* ============================ UI FOUNDATION ============================== */
const $=s=>document.querySelector(s);
const fmt=(v,d)=>v===null||v===undefined||isNaN(v)?"–":Number(v).toLocaleString("en-US",{minimumFractionDigits:d===undefined?1:d,maximumFractionDigits:d===undefined?1:d});
const pct=v=>v===null||v===undefined?"–":(v*100).toFixed(0)+"%";
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function rawFmt(I,v){
  if(v===null||v===undefined)return "–";
  if(I.method==="binary")return v>=1?"Yes":"No";
  if(I.method==="ordinal")return v>=100?"In force":v>=50?"Drafted / pending":"Not in place";
  if(I.unit==="rank")return "#"+Math.round(v)+" of 172";
  if(Math.abs(v)<0.01&&v!==0)return v.toExponential(2);
  return Number(v).toLocaleString("en-US",{maximumFractionDigits:Math.abs(v)>=100?0:Math.abs(v)>=10?1:2});
}
const scColor=s=>s===null?"var(--dim)":s>=70?"var(--green)":s>=50?"var(--teal)":s>=35?"var(--amber)":"var(--red)";
const confLabel=c=>c>=.8?"High":c>=.65?"Medium-high":c>=.5?"Medium":c>=.35?"Medium-low":"Low";
function deltaHtml(a,b,suf){
  if(a===null||b===null||a===undefined||b===undefined)return '<span class="delta flat">–</span>';
  const d=a-b,c=d>.05?"up":d<-.05?"down":"flat";
  return `<span class="delta ${c}">${d>0?"▲":d<0?"▼":"■"} ${Math.abs(d).toFixed(1)}${suf||""}</span>`;
}
function SRC(id){return SOURCES[id]||{id:id,name:id,org:id,type:"Unregistered source",year:null,reliability:.5,url:null,note:"This source is referenced by an indicator but is not yet in the source register."}}
const VSTATE={verified:["q-verified","Verified"],in_review:["q-review","In review"],
  unverified:["q-unverified","Unverified"],not_reported:["q-unverified","Not reported"],
  modelled:["q-modelled","Modelled"],historical:["q-historical","2022 estimate"]};
function qbadge(state){const v=VSTATE[state]||["q-review",state];return `<span class="qbadge ${v[0]}">${v[1]}</span>`}
const EVIDENCE_LABEL={measured:"Directly measured",administrative:"Administrative record",
  "third-party":"Third-party source",estimated:"Estimated",modelled:"Modelled"};
function spark(vals,w,h,color){
  w=w||70;h=h||20;const mn=Math.min.apply(null,vals),mx=Math.max.apply(null,vals),rg=(mx-mn)||1;
  const pts=vals.map((v,i)=>`${(i/(vals.length-1)*w).toFixed(1)},${(h-((v-mn)/rg)*(h-3)-1.5).toFixed(1)}`).join(" ");
  const c=color||(vals[vals.length-1]>=vals[0]?"var(--green)":"var(--red)");
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="vertical-align:middle"><polyline points="${pts}" fill="none" stroke="${c}" stroke-width="1.6"/></svg>`;
}
function unavailable(reason){return `<span class="unavail">◌ ${reason||"Data unavailable"}</span>`}
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("on");clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove("on"),2600)}

/* theme */
function cssVar(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()}
const DEFAULT_THEME="dark";
function currentTheme(){
  return document.documentElement.getAttribute("data-theme")||DEFAULT_THEME;
}
function toggleTheme(){
  const next=currentTheme()==="dark"?"light":"dark";
  document.documentElement.setAttribute("data-theme",next);
  const btn=$("#themebtn");
  if(btn)btn.innerHTML=`<span aria-hidden="true">${next==="dark"?"◑":"◐"}</span>`;
  // Charts read their colours from CSS custom properties at construction time,
  // so they are rebuilt rather than restyled.
  killCharts();go(VIEW);
}
/* language, the dictionary is real but partial; coverage is stated honestly */
const I18N={rw:{"Overview":"Incamake","Rwanda AI Journey":"Urugendo rwa AI mu Rwanda","AI Readiness & Maturity":"Ubushobozi n'Ubukure bwa AI",
 "AI Adoption":"Ikoreshwa rya AI","Investment & Economic Opportunity":"Ishoramari n'Amahirwe y'Ubukungu","AI Ecosystem":"Urwego rwa AI",
 "Sectors":"Inzego","Geographic Intelligence":"Amakuru y'Uturere","Global Position":"Umwanya ku Isi","Policy & Regulation":"Politiki n'Amabwiriza",
 "AI Talent & Skills":"Impano n'Ubumenyi","Research & Innovation":"Ubushakashatsi n'Udushya","Data Explorer":"Gushakisha Amakuru",
 "Sources & Evidence":"Inkomoko n'Ibimenyetso","About / Methodology":"Ibyerekeye / Uburyo","Contribute data":"Tanga amakuru",
 "Sign in":"Injira"}};
let LANG="en";
function t(s){return LANG==="rw"&&I18N.rw[s]?I18N.rw[s]:s}
function setLang(l){LANG=l;$("#langbtn").textContent=l.toUpperCase();
  if(l==="rw")toast("Kinyarwanda navigation enabled. Body content is English-only in this build, translation coverage is "+Math.round(Object.keys(I18N.rw).length/45*100)+"%.");
  renderNav();renderFooter();go(VIEW);}

/* charts */
let CHARTS=[];
function killCharts(){CHARTS.forEach(c=>{try{c.dispose()}catch(e){}});CHARTS=[]}
window.addEventListener("resize",()=>CHARTS.forEach(c=>{try{c.resize()}catch(e){}}));
function ec(el,opt,h){
  if(!el)return null;
  el.style.height=(h||260)+"px";
  // The platform stays usable without its charting library: every chart with a
  // registered table alternative falls back to that table, and the rest say so
  // rather than leaving an empty box.
  if(!chartsAvailable()){   // resolved at call time: the library loads asynchronously
    const id=el.getAttribute("data-chart-id");
    el.innerHTML=`<div class="empty"><div class="big">Chart unavailable</div>
      The charting library could not be loaded.${id&&CHART_TABLES[id]?" The underlying figures are shown below.":""}</div>`;
    el.style.height="auto";
    if(id&&CHART_TABLES[id])setTimeout(()=>toggleChartTable(id),0);
    return null;
  }
  const c=echarts.init(el,null,{renderer:"canvas"});
  c.setOption(Object.assign({
    backgroundColor:"transparent",animationDuration:400,
    textStyle:{color:cssVar("--ec-axis"),fontFamily:"Inter, Segoe UI, sans-serif",fontSize:11},
    tooltip:{backgroundColor:cssVar("--ec-tip"),borderColor:cssVar("--ec-tipline"),borderWidth:1,
      textStyle:{color:cssVar("--txt"),fontSize:12},extraCssText:"box-shadow:0 8px 26px rgba(0,0,0.14);border-radius:8px"}
  },opt));
  CHARTS.push(c);return c;
}
function axis(extra){return Object.assign({axisLine:{lineStyle:{color:cssVar("--line2")}},axisTick:{show:false},
  splitLine:{lineStyle:{color:cssVar("--ec-split")}},axisLabel:{color:cssVar("--ec-axis"),fontSize:10.5}},extra||{})}
const PAL=["#0E88CC","#0F8B84","#B8770E","#D2603A","#5E4BB8","#1B8A5A","#5B8DEF","#C0392B"];

/* drawer */
const DRAWER_CHARTS={};
let LAST_FOCUS=null;
function openDrawer(title,sub,html,crumb){
  LAST_FOCUS=document.activeElement;
  $("#dhead").innerHTML=`<div style="min-width:0"><div class="small muted">${sub}</div>
    <div id="dtitle" style="font-size:17px;font-weight:700;margin-top:3px;letter-spacing:-.3px">${title}</div></div>
    <button class="x" data-act="closeDrawer" aria-label="Close panel">✕</button>`;
  $("#dbody").innerHTML=(crumb?`<nav class="crumb" aria-label="Breadcrumb">${crumb}</nav>`:"")+html;
  const d=$("#drawer");
  d.classList.add("on");d.setAttribute("aria-hidden","false");
  $("#scrim").classList.add("on");
  makeActionablesFocusable(d);
  // Move focus into the dialog, or a screen-reader user stays stranded behind it.
  requestAnimationFrame(()=>{
    (d.querySelector(".x")||d).focus();
    document.querySelectorAll("#dbody [data-chart]").forEach(el=>{
      const f=DRAWER_CHARTS[el.getAttribute("data-chart")];if(f)f(el)});
  });
}
/* Keep Tab inside the dialog while it is open. */
function trapFocus(e){
  const d=$("#drawer");
  if(e.key!=="Tab"||!d.classList.contains("on"))return;
  const f=[...d.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')]
    .filter(el=>el.offsetParent!==null);
  if(!f.length)return;
  const first=f[0],last=f[f.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
}
document.addEventListener("keydown",trapFocus);
function closeDrawer(){
  const d=$("#drawer");
  d.classList.remove("on");d.setAttribute("aria-hidden","true");
  $("#scrim").classList.remove("on");
  if(LAST_FOCUS&&LAST_FOCUS.focus)LAST_FOCUS.focus();   // return focus where it came from
  LAST_FOCUS=null;
}
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeDrawer()});

/* layout helpers */
function vh(eyebrow,title,sub,tools){
  return `<div class="vh"><div class="vhrow"><div><div class="eyebrow">${eyebrow}</div><h2>${title}</h2>
    ${sub?`<p>${sub}</p>`:""}</div><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">${tools||""}</div></div></div>`;
}
/* Every data table gets a caption and column scope. The caption is visually
   hidden, it exists for screen readers, which otherwise meet an unlabelled
   grid of numbers. */
function dtable(caption,headers,rows,opts){
  opts=opts||{};
  const th=headers.map(h=>typeof h==="string"
    ? `<th scope="col">${h}</th>`
    : `<th scope="col" class="${h.n?"n":""}"${h.sort?` aria-sort="${h.sort}"`:""}${h.act?` data-act="${h.act}" data-args="${h.args||""}"`:""}>${h.label}</th>`).join("");
  return `<table class="dt"${opts.id?` id="${opts.id}"`:""}>
    <caption class="visually-hidden">${esc(caption)}</caption>
    <thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table>`;
}
function card(title,sub,body,tools){
  return `<div class="card"><header><h3>${title}</h3><div style="display:flex;gap:8px;align-items:center">
    ${sub?`<span class="sub">${sub}</span>`:""}${tools||""}</div></header><div class="bd">${body}</div></div>`;
}
function cardF(title,sub,body,tools){
  return `<div class="card"><header><h3>${title}</h3><div style="display:flex;gap:8px;align-items:center">
    ${sub?`<span class="sub">${sub}</span>`:""}${tools||""}</div></header><div class="bd flush">${body}</div></div>`;
}
function kpi(lbl,val,sub,color,help,opts){
  opts=opts||{};
  const num=typeof val==="number";
  const body=num?`<span data-count="${val}" data-dec="${opts.dec===undefined?(val%1?1:0):opts.dec}" data-pre="${opts.pre||""}" data-suf="${opts.suf||""}">0</span>`:val;
  const sp=opts.series&&opts.series.length?`<div class="spark">${sparkArea(opts.series,color)}</div>`:"";
  return `<div class="card lift"><div class="kpi ${opts.act?"clickable":""}" ${opts.act?`data-act="${opts.act}"${opts.actArgs?` data-args="${opts.actArgs}"`:""}`:""}>
    <div class="lbl">${lbl}${help?`<span class="info" data-tip="${esc(help)}">i</span>`:""}</div>
    <div class="val" style="${color?`color:${color}`:""}">${body}</div>
    <div class="sub">${sub||""}</div>${sp}</div></div>`;
}
function sparkArea(vals,color){
  const w=320,h=36,mn=Math.min.apply(null,vals),mx=Math.max.apply(null,vals),rg=(mx-mn)||1;
  const pt=vals.map((v,i)=>[(i/(vals.length-1)*w),(h-((v-mn)/rg)*(h-6)-3)]);
  const line=pt.map(p=>p[0].toFixed(1)+","+p[1].toFixed(1)).join(" ");
  const c=color||"var(--brand)";
  return `<svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <polygon points="0,${h} ${line} ${w},${h}" fill="${c}" opacity=".13"/>
    <polyline points="${line}" fill="none" stroke="${c}" stroke-width="1.6" opacity=".75"/></svg>`;
}
function srcLine(sid,extra){
  const s=SRC(sid);if(!s)return "";
  return `<div class="prov" style="margin-top:8px">Source: <span class="src" data-act="source" data-args="${sid}">${esc(s.name)}. ${esc(s.org)}${s.year?", "+s.year:""}</span>${extra?" · "+extra:""}</div>`;
}

/* ------------------------------------------------------------ navigation */
const NAV=[
 ["overview","Overview"],["journey","Rwanda AI Journey"],["readiness","AI Readiness & Maturity"],
 ["adoption","AI Adoption"],["position","Global Position"],["investment","Investment & Economic Opportunity"],["ecosystem","AI Ecosystem"],
 ["sectors","Sectors"],["geo","Geographic Intelligence"],["policy","Policy & Regulation"],
 ["talent","AI Talent & Skills"],["research","Research & Innovation"],["explorer","Data Explorer"],
 ["sources","Sources & Evidence"],["about","About / Methodology"]
];
function renderNav(){
  $("#topnav").innerHTML=NAV.map(([id,n])=>
    `<a href="#/${id}" data-v="${id}" data-act="go" data-args="${id}">${t(n)}</a>`).join("");
  document.querySelectorAll(".topnav a").forEach(a=>{
    const on=a.dataset.v===VIEW;
    a.classList.toggle("on",on);
    if(on)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");
  });
  /* The public header carries no sign-in control. Administration moves to a
     separate authenticated page; the view remains reachable at #/admin for
     development until that page exists. */
}
function renderFresh(){
  const cov=(RUN.readiness.coverage+RUN.maturity.coverage)/2;
  const pend=CONTRIBUTIONS.filter(c=>c.state!=="Accepted, correction queued").length;
  $("#freshbar").innerHTML=`
   <span><span class="dot g pulse"></span>Platform live</span>
   <span class="scrub">Reporting year
     <input type="range" id="yearSlider" min="${META.firstYear}" max="${META.cycle}" step="1" value="${YEAR}"
       data-act="yearPreview" data-on="input" data-act="setYearFromInput" data-on="change"
       data-tip="Move the whole platform to another reporting year. Every score, chart and table re-computes for that year.">
     <b id="yearLab">${YEAR}</b><span id="yearHist">${YEAR===META.cycle?'<span class="tag g">Latest cycle</span>':`<span class="histbadge">Viewing ${YEAR}, historical</span>`}</span></span>
   <span>Indicators <b>${IND.length}</b> of ${META.registry.main}</span>
   <span>Coverage <b>${pct(cov)}</b></span>
   <span>Confidence <b>${confLabel((RUN.readiness.confidence+RUN.maturity.confidence)/2)}</b></span>
   <span>Sources <b>${Object.keys(SOURCES).length}</b></span>
   <span>In review <b>${pend}</b></span>
   <span data-tip="${META.dataOrigin==="api"?"Served live by the FastAPI backend at "+META.apiBase+". Edit a value in the data layer and it appears here on the next load.":META.dataOrigin==="snapshot"?"The API was not reachable, so this is the published snapshot at "+META.snapshotUrl+". Figures are as at the last build.":"Neither the API nor a snapshot was reachable, running on the dataset embedded in this file."}">
     Backend <b>${META.dataOrigin==="api"?"FastAPI · live":META.dataOrigin==="snapshot"?"snapshot":"offline"}</b></span>
   ${META.provenance?`<span data-tip="${(META.provenance.observations.byOrigin["source-reported"]||0)} of ${META.provenance.observations.total} observations are reported by a named source. The remainder are demo values, labelled everywhere they appear, and excluded from nothing, they are simply marked so you know which is which.">
     Source-reported <b>${(META.provenance.observations.sourceReportedShare*100).toFixed(0)}%</b></span>`:""}
   <span style="margin-left:auto" class="muted">Independent, multi-source · not a government publication</span>`;
}
function renderFooter(){
  $("#footer").innerHTML=`
   <div><b>Rwanda AI Tracker</b>An independent, multi-source intelligence platform on Rwanda's AI ecosystem.
     Contributions come from government, academia, industry, investors and development partners, and every published figure carries its source and verification state.</div>
   <div><b>Explore</b>${NAV.slice(0,7).map(([id,n])=>`<a data-act="go" data-args="${id}">${t(n)}</a>`).join("")}</div>
   <div><b>Understand</b>${NAV.slice(7).map(([id,n])=>`<a data-act="go" data-args="${id}">${t(n)}</a>`).join("")}</div>
   <div><b>Evidence base</b>
     <a data-act="source" data-args="AIRM22">AI Readiness and Maturity Framework for Rwanda, 2022</a>
     <a data-act="source" data-args="ECON22">Rwanda AI Economic Sizing Report, 2022</a>
     <a data-act="go" data-args="sources">All ${Object.keys(SOURCES).length} sources</a>
     <a data-act="contribute">Contribute or correct data</a></div>`;
}

/* --------------------------------------------------------------- router */
let VIEW="overview";
const VIEWS={},MOUNT={};

/* ------------------------------------------------------------------ routing
   The view, reporting year, cross-filters and any open indicator live in the
   URL. Without this a policymaker cannot send a colleague "the 2023 view of D5
   filtered to agriculture", cannot bookmark it, and the back button does
   nothing, on a platform whose output is citations in policy papers.
   Shape:  #/readiness?year=2023&sector=AGR&indicator=RWA10
   -------------------------------------------------------------------------*/
let SUPPRESS_ROUTE=false;
function currentRoute(){
  const p=new URLSearchParams();
  if(YEAR!==META.cycle)p.set("year",YEAR);
  if(typeof FILTER!=="undefined"){
    if(FILTER.sector)p.set("sector",FILTER.sector);
    if(FILTER.dim)p.set("dim",FILTER.dim);
  }
  const q=p.toString();
  return "#/"+VIEW+(q?"?"+q:"");
}
function syncRoute(replace){
  if(SUPPRESS_ROUTE)return;
  const url=currentRoute();
  if(location.hash===url)return;
  history[replace?"replaceState":"pushState"]({view:VIEW},"",url);
}
function parseRoute(){
  const raw=(location.hash||"").replace(/^#\/?/,"");
  const [view,query]=raw.split("?");
  const p=new URLSearchParams(query||"");
  return {view:view||"overview",year:p.get("year"),sector:p.get("sector"),
          dim:p.get("dim"),indicator:p.get("indicator")};
}
async function applyRoute(){
  const r=parseRoute();
  SUPPRESS_ROUTE=true;
  if(r.year&&+r.year!==YEAR)bindYear(+r.year);
  if(typeof FILTER!=="undefined"){FILTER.sector=r.sector||null;FILTER.dim=r.dim||null}
  await go(r.view);
  SUPPRESS_ROUTE=false;
  if(r.indicator&&BYCODE[r.indicator])indDrawer(r.indicator);
}
window.addEventListener("popstate",()=>{applyRoute()});

async function go(v){
  if(!VIEWS[v])v="overview";
  VIEW=v;killCharts();closeDrawer();
  $("#main").innerHTML=skeleton();
  const html=await VIEWS[v]();
  $("#main").innerHTML=(typeof filterBar==="function"?filterBar():"")+html;
  window.scrollTo({top:0,behavior:"instant"});
  renderNav();renderFresh();
  if(typeof makeActionablesFocusable==="function")makeActionablesFocusable($("#main"));
  if(typeof animateCounters==="function")animateCounters();
  if(MOUNT[v])await MOUNT[v]();
  if(typeof registerChartTables==="function")registerChartTables();
  syncRoute();
}
