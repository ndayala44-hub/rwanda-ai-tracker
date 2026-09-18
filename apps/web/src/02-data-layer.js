
/* ============================================================================
   DATA LAYER
   Bindings the whole UI reads from. They are `let`, not `const`, because the
   dataset is loaded at runtime and can be replaced (API, snapshot, admin
   upload) without a rebuild. applyDataset() is the single write point.
   ==========================================================================*/
let SOURCES={}, ORGS=[], ORG={}, SECTORS=[], SECTOR={}, DISTRICTS=[], PROVINCES=[], GEO_CONFIG={};
let DIMS=[], OUTPUTS=[], LADDER=[], TARGETS={readiness:70,maturity:60};
let INDICATOR_DEFS=[], OBSERVATIONS=[], IND=[], BYCODE={};
let JOURNEY=[], POLICIES=[], GLOSSARY=[], USECASES=[], CONTRIBUTIONS=[];
let ECON2022={}, L26={}, BENCH={}, RAIA={pillars:[],nationalTargets:[],sectorLadder:{sectors:[]},record:{}}, RECORD={useCases:[],institutions:[],enablers:[],taxonomy:{}}, ROADMAP={items:[],proposedComposites:[],externalIndicesToIngest:[]};
let YEARS=[];

/* Indicator records are assembled from two files, definitions and the
   observation series, so a new observation never requires touching a
   definition, and a definition change never rewrites history. */
function buildIndicators(){
  const byInd={};
  OBSERVATIONS.forEach(o=>{(byInd[o.indicator]=byInd[o.indicator]||[]).push(o)});
  IND = INDICATOR_DEFS.map(d=>{
    // An observation explicitly flagged "not_reported" is a stated absence,
    // not a value: it is kept for the audit trail but never scored.
    const all=(byInd[d.code]||[]).slice().sort((a,b)=>a.year-b.year);
    const obs=all.filter(o=>o.verification!=="not_reported"&&o.value!==null&&o.value!==undefined);
    const latest=obs.length?obs[obs.length-1]:null;
    const stale=latest?Math.max(0,META.cycle-latest.year):0;
    const current=obs.find(o=>o.year===META.cycle);
    const declaredAbsent=all.some(o=>o.year===META.cycle&&o.verification==="not_reported");
    return {
      code:d.code, name:d.name, output:d.output, dim:d.dimension, unit:d.unit,
      method:d.normalisation, pol:d.polarity==="negative"?"-":"+",
      baseline:d.baseline, target:d.target, universe:d.universe||172,
      mem:d.indexMembership==="maturity"?"M":"R",
      owner:d.reportingOrganisation, sourceId:d.sourceId,
      rel:d.relevance, acc:d.accessibility, origin:d.origin, gate:d.capabilityGate,
      evidenceType:d.evidenceType, note:d.note||"",
      definition:d.definition||null, methodology:d.methodology||null,
      geoLevel:d.geographicScope||"National", updateFrequency:d.updateFrequency||"annual",
      // Provenance travels with every observation. Dropping origin here made the
      // Data Explorer report every value as a demo value and silently broke the
      // data quality index, caught by the cross-engine parity test.
      obs:obs.map(o=>({year:o.year,value:o.value,collected:o.collectedOn,period:o.period,
                       origin:o.origin||"demo",verification:o.verification,sourceId:o.sourceId,
                       note:o.note||null})),
      stale, notReported: !current,
      verification: current?current.verification:"not_reported",
      declaredAbsent,
      weight:1, relWeight:d.relevance,
      lastUpdated: latest?(latest.collectedOn||latest.year+"-12-31"):", ",
      contributor: (SOURCES[d.sourceId]||{}).org || ", "
    };
  });
  BYCODE=Object.fromEntries(IND.map(i=>[i.code,i]));
}

/* How much of what is published is actually reported by a named source.
   Shown in the status bar rather than buried: a platform whose proposition is
   provenance has to be candid about its own. */
function computeProvenance(){
  const byOrigin={};
  OBSERVATIONS.forEach(o=>{const k=o.origin||"unclassified";byOrigin[k]=(byOrigin[k]||0)+1});
  const total=OBSERVATIONS.length||1;
  const srcs=Object.values(SOURCES);
  return {
    observations:{total:OBSERVATIONS.length,byOrigin,
      sourceReportedShare:(byOrigin["source-reported"]||0)/total},
    sources:{total:srcs.length,verified:srcs.filter(s=>s.verification==="verified").length}
  };
}
function applyDataset(ds){
  SOURCES=Object.fromEntries((ds.sources.items||[]).map(s=>[s.id,s]));
  ORGS=ds.organisations.items; ORG=Object.fromEntries(ORGS.map(o=>[o.id,o]));
  SECTORS=ds.sectors.items;     SECTOR=Object.fromEntries(SECTORS.map(s=>[s.id,s]));
  DISTRICTS=ds.geography.districts; PROVINCES=ds.geography.provinces; GEO_CONFIG=ds.geography.config;
  DIMS=ds.framework.dimensions.map(d=>({id:d.id,code:d.id,n:d.name,short:d.shortName,cls:d.class,
    color:d.color,obj:d.objective,why:d.rationale,outputs:d.outputs}));
  OUTPUTS=ds.framework.outputs.map(o=>({id:o.id,d:o.dimension,n:o.statement}));
  LADDER=ds.framework.maturityLadder.map(l=>({l:l.level,n:l.name,min:l.bandMin,max:l.bandMax,d:l.descriptor,
    gates:l.gates.map(g=>[g.indicator,g.label])}));
  TARGETS=ds.framework.targets||TARGETS;
  if(ds.framework.methodologyVersion)META.methodology=ds.framework.methodologyVersion;
  INDICATOR_DEFS=ds.indicators.items; OBSERVATIONS=ds.observations.items;
  JOURNEY=ds.journey.items; POLICIES=ds.policies.items; GLOSSARY=ds.glossary.items;
  USECASES=ds.useCases.items; CONTRIBUTIONS=ds.contributions.items;
  ECON2022=ds.economicSizing2022; L26=ds.landscape2026; BENCH=ds.benchmarks||{series:[],indexComparison:[]};
  ROADMAP=ds.proposedIndicators||ROADMAP;
  RAIA=ds.raiaPortfolio||RAIA;
  RECORD=ds.raiaRecord||RECORD;
  YEARS=[];for(let y=META.firstYear;y<=META.cycle;y++)YEARS.push(y);
  buildIndicators();
  META.provenance=computeProvenance();
}

/* Resolution order is deliberate: live service, then published snapshot, then
   the embedded copy. Each failure is reported, never silently swallowed. */
async function loadDataset(){
  const bundle=keys=>({sources:keys.sources,organisations:keys.organisations,sectors:keys.sectors,
    geography:keys.geography,framework:keys.framework,indicators:keys.indicators,observations:keys.observations,
    journey:keys.journey,policies:keys.policies,glossary:keys.glossary,useCases:keys.useCases,
    contributions:keys.contributions,economicSizing2022:keys.economicSizing2022,landscape2026:keys.landscape2026,
    benchmarks:keys.benchmarks,proposedIndicators:keys.proposedIndicators,raiaPortfolio:keys.raiaPortfolio,raiaRecord:keys.raiaRecord});
  if(META.apiBase!==null&&META.apiBase!==undefined){
    try{
      const r=await fetch(META.apiBase.replace(/\/$/,"")+"/api/bootstrap");
      if(r.ok){const j=await r.json();META.dataOrigin="api";return bundle(j)}
      console.warn("API responded",r.status,",  falling back to the published snapshot");
    }catch(e){console.warn("API unreachable:",e.message,",  falling back to the published snapshot")}
  }
  try{
    const r=await fetch(META.snapshotUrl);
    if(r.ok){const j=await r.json();META.dataOrigin="snapshot";return bundle(j)}
  }catch(e){/* expected when the file is opened directly from disk */}
  META.dataOrigin="embedded";
  return bundle(EMBEDDED_DATASET);
}
