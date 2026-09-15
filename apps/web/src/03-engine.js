
/* ============================== SCORING ENGINE ==========================
   Unchanged methodology. The only differences from the previous build are
   that the indicator universe for rank normalisation is now per-indicator,
   and a missing observation in ANY year (not just the current cycle) is
   excluded from aggregation rather than assumed present.
   ======================================================================*/
function rng(seed){let h=2166136261;for(let i=0;i<seed.length;i++){h^=seed.charCodeAt(i);h=Math.imul(h,16777619)}
  return function(){h+=0x6D2B79F5;let t=h;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}
const clamp100=v=>Math.max(0,Math.min(100,v));
const clampv=(x,a,b)=>{const lo=Math.min(a,b),hi=Math.max(a,b);return Math.max(lo,Math.min(hi,x))};
function invert(p,I){const L=I.baseline,U=I.target;
  if(I.method==="log"){const a=Math.log(1+L),b=Math.log(1+U);return Math.exp(a+p*(b-a))-1}
  if(I.method==="rank")return Math.round(L+p*(U-L));
  return L+p*(U-L)}

function normalise(x,I){
  if(x===null||x===undefined||isNaN(x))return null;
  const L=I.baseline,U=I.target;
  switch(I.method){
    case "binary":return x?100:0;
    case "ordinal":return clamp100(x);
    case "passthrough":return clamp100(100*(x-L)/(U-L));
    case "rank":{const N=I.universe||172;return clamp100(100*(N-x+1)/N)}
    case "log":{const a=Math.log(1+L),b=Math.log(1+U);return clamp100(100*(Math.log(1+clampv(x,L,U))-a)/(b-a))}
    default:{const lo=Math.min(L,U),hi=Math.max(L,U);
      const v=(clampv(x,lo,hi)-lo)/(hi-lo);return clamp100(100*(U>=L?v:1-v))}
  }
}
function confidence(I,year){
  const S=(SOURCES[I.sourceId]||{reliability:.6}).reliability;
  const A={1:0.4,2:0.7,3:1.0}[I.acc];
  const age=(I.stale||0)+(META.cycle-year);
  const Rc=Math.exp(-0.35*Math.max(0,age));
  const V={verified:0.9,in_review:0.6,unverified:0.4,not_reported:0.2}[I.verification]||0.5;
  return Math.max(0,Math.min(1,0.30*S+0.20*A+0.25*Rc+0.25*V));
}
function aggregate(children){
  const all=children,WT=all.reduce((s,c)=>s+c.w,0)||1;
  const avail=all.filter(c=>c.assessed&&c.score!==null);
  const coverage=all.reduce((s,c)=>s+c.w*(c.coverage!==undefined?c.coverage:(c.assessed?1:0)),0)/WT;
  if(!avail.length)return{score:null,assessed:false,coverage:0,confidence:0,status:"insufficient"};
  const W=avail.reduce((s,c)=>s+c.w,0);
  const score=avail.reduce((s,c)=>s+c.w*c.score,0)/W;
  const conf=coverage*avail.reduce((s,c)=>s+c.w*c.confidence,0)/W;
  return{score,assessed:true,coverage,
    confidence:conf,status:coverage>=0.75?"published":coverage>=0.5?"provisional":"insufficient"};
}
function scoreAll(year,overrides){
  overrides=overrides||{};
  const iS={};
  IND.forEach(I=>{
    const o=I.obs.find(o=>o.year===year);
    // An indicator with no observation for this year is excluded from the
    // aggregate and lowers coverage. It is never treated as a zero.
    const missing=!o;
    let raw=o?o.value:null;
    if(overrides[I.code]!==undefined)raw=overrides[I.code];
    const s=missing?null:normalise(raw,I);
    const ok=!missing&&s!==null;
    iS[I.code]={code:I.code,raw,score:s,assessed:ok,coverage:ok?1:0,
      confidence:confidence(I,year-(I.stale||0)),w:1,I};
  });
  const oS={},dS={};
  OUTPUTS.forEach(O=>{oS[O.id]=Object.assign({id:O.id},aggregate(IND.filter(i=>i.output===O.id).map(i=>iS[i.code])),{w:1})});
  DIMS.forEach(D=>{dS[D.id]=Object.assign({id:D.id},aggregate(D.outputs.map(id=>oS[id])),{w:1})});
  function composite(mem){
    const per={};
    DIMS.forEach(D=>{
      const outs=D.outputs.map(oid=>{
        const m=IND.filter(i=>i.output===oid&&i.mem===mem);
        return Object.assign({id:oid},aggregate(m.map(i=>iS[i.code])),{w:m.length});
      }).filter(o=>o.w>0);
      per[D.id]=outs.length?Object.assign({id:D.id},aggregate(outs),{w:outs.reduce((s,o)=>s+o.w,0)})
                           :{id:D.id,score:null,assessed:false,coverage:0,confidence:0,w:0};
    });
    const dims=DIMS.map(D=>per[D.id]).filter(d=>d.w>0);
    const top=aggregate(dims);
    const av=dims.filter(x=>x.assessed&&x.score>0),tw=av.reduce((s,x)=>s+x.w,0)||1;
    const geo=av.length?Math.exp(av.reduce((s,x)=>s+x.w*Math.log(x.score),0)/tw):null;
    return Object.assign(top,{byDim:per,geometric:geo,balance:geo!==null?top.score-geo:null});
  }
  return {year,iS,oS,dS,readiness:composite("R"),maturity:composite("M")};
}
function gateOK(code,run){
  const s=run.iS[code];if(!s||s.raw===null)return false;
  const I=BYCODE[code];
  if(I.method==="binary")return s.raw>=1;
  if(I.method==="ordinal")return s.raw>=100;
  if(code==="RWA10")return s.raw>=10;
  if(code==="RWA9")return s.raw<=15;
  return (s.score||0)>=60;
}
function maturityLevel(run){
  const score=run.maturity.score||0;
  let band=1;LADDER.forEach(L=>{if(score>=L.min)band=L.l});
  let gate=1;const unmet=[];
  for(let i=1;i<LADDER.length;i++){
    const L=LADDER[i],bad=L.gates.filter(g=>!gateOK(g[0],run));
    if(!bad.length)gate=L.l;else{bad.forEach(b=>unmet.push({level:L.l,code:b[0],label:b[1]}));break}
  }
  const assigned=Math.min(band,gate);
  return {assigned,band,gate,unmet,def:LADDER[assigned-1],binding:gate<band?unmet.filter(u=>u.level===gate+1):[]};
}
let RUNS={};
/* YEAR is the reporting year the whole platform is currently showing. Moving it
   re-points RUN/PREV/ML, so every view, chart and drawer follows one control. */
let YEAR=META.cycle, RUN=null, PREV=null, ML=null;
function runEngine(){
  RUNS={};YEARS.forEach(y=>RUNS[y]=scoreAll(y));
  bindYear(YEAR);
}
function bindYear(y){
  YEAR=Math.max(META.firstYear,Math.min(META.cycle,y));
  RUN=RUNS[YEAR];PREV=RUNS[Math.max(META.firstYear,YEAR-1)];ML=maturityLevel(RUN);
  if(typeof DB!=="undefined"){DB.RUN=RUN;DB.PREV=PREV;DB.ML=ML;DB.YEAR=YEAR}
}


/* ---------------------------------------------------------------- data quality
   A composite of how well a dimension is *measured*, as distinct from how well
   Rwanda is *doing*. No national AI index publishes this, and it is the most
   defensible differentiator the platform has: a score of 60 on 95% coverage
   with verified sources is a different claim from 60 on 55% coverage of
   estimates, and today those two look identical.
   ---------------------------------------------------------------------------*/
function dataQuality(dimId,year){
  year=year||YEAR;
  const run=RUNS[year]||RUN;
  const inds=IND.filter(i=>!dimId||i.dim===dimId);
  if(!inds.length)return null;
  const s=inds.map(i=>run.iS[i.code]);
  const assessed=s.filter(x=>x.assessed);
  const coverage=assessed.length/inds.length;
  const confidence=assessed.length?assessed.reduce((a,x)=>a+x.confidence,0)/assessed.length:0;
  const verified=inds.filter(i=>i.verification==="verified").length/inds.length;
  const reported=inds.filter(i=>{const o=i.obs.find(o=>o.year===year);
    return o&&(o.origin||"demo")==="source-reported"}).length/inds.length;
  // Equal weights: each answers a different question and none dominates.
  const score=100*(0.30*coverage+0.30*confidence+0.20*verified+0.20*reported);
  return {score,coverage,confidence,verified,sourceReported:reported,
    band:score>=75?"strong":score>=55?"adequate":score>=40?"weak":"poor"};
}
