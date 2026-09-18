/* ====================== SERVICE LAYER (the "API") =========================
   Every view resolves data through here. Point META.apiBase at the backend and
   the same calls hit the live service; nothing in the views changes.        */
let DB={};
function bindDB(){
  DB={META,SOURCES,ORGS,ORG,SECTORS,SECTOR,DISTRICTS,PROVINCES,GEO_CONFIG,ECON2022,L26,
    DIMS,OUTPUTS,IND,BYCODE,JOURNEY,POLICIES,GLOSSARY,USECASES,CONTRIBUTIONS,LADDER,BENCH,ROADMAP,RAIA,RECORD,
    RUNS,RUN,PREV,ML,TARGETS,YEARS,YEAR};
}
const AUDIT=[];
function logAudit(action,entity,before,after){
  AUDIT.unshift({t:new Date().toISOString().replace("T"," ").slice(0,19),actor:SESSION.user,role:SESSION.role,
    action,entity,before,after});
}
const api=(function(){
  const remote=async(path)=>{
    if(!META.apiBase)return null;
    try{const r=await fetch(META.apiBase+path);if(r.ok)return await r.json()}catch(e){}
    return null;
  };
  const local=v=>Promise.resolve(v);
  return {
    async meta(){return (await remote("/api/meta"))||META},
    async framework(){return (await remote("/api/framework"))||{dimensions:DIMS,outputs:OUTPUTS,ladder:LADDER}},
    async indicators(f){
      const r=await remote("/api/indicators");let rows=r||IND;
      if(f){
        if(f.q){const q=f.q.toLowerCase();rows=rows.filter(i=>(i.code+" "+i.name+" "+i.sourceId+" "+i.owner).toLowerCase().includes(q))}
        if(f.dim)rows=rows.filter(i=>i.dim===f.dim);
        if(f.output)rows=rows.filter(i=>i.output===f.output);
        if(f.mem)rows=rows.filter(i=>i.mem===f.mem);
        if(f.source)rows=rows.filter(i=>i.sourceId===f.source);
        if(f.org)rows=rows.filter(i=>i.owner===f.org);
        if(f.evidence)rows=rows.filter(i=>i.evidenceType===f.evidence);
        if(f.status)rows=rows.filter(i=>i.verification===f.status);
      }
      return rows;
    },
    async indicator(code){return (await remote("/api/indicators/"+code))||BYCODE[code]},
    async observations(code,year){const I=BYCODE[code];
      return year?I.obs.filter(o=>o.year===year):I.obs},
    async scores(year){return RUNS[year||META.cycle]},
    async readiness(){return RUN.readiness},
    async maturity(){return {index:RUN.maturity,level:ML}},
    async trend(code){return YEARS.map(y=>({year:y,raw:RUNS[y].iS[code].raw,score:RUNS[y].iS[code].score,
      assessed:RUNS[y].iS[code].assessed,confidence:RUNS[y].iS[code].confidence}))},
    async econ(){return (await remote("/api/economic-sizing"))||ECON2022},
    async landscape(){return (await remote("/api/landscape/2026"))||L26},
    async benchmarks(){return (await remote("/api/benchmarks"))||BENCH},
    async roadmap(){return (await remote("/api/proposed-indicators"))||ROADMAP},
    async raia(){return (await remote("/api/raia-portfolio"))||RAIA},
    async record(){return (await remote("/api/raia-record"))||RECORD},
    async useCases(f){let r=(await remote("/api/use-cases"))||USECASES;
      if(f&&f.sector)r=r.filter(u=>u.sector===f.sector);
      if(f&&f.district)r=r.filter(u=>u.district===f.district);
      if(f&&f.publishedOnly)r=r.filter(u=>u.status==="verified");
      return r},
    async orgs(f){let r=(await remote("/api/organisations"))||ORGS;
      if(f&&f.type)r=r.filter(o=>o.type===f.type);return r},
    async districts(){return (await remote("/api/geography"))||DISTRICTS},
    async policies(){return (await remote("/api/policies"))||POLICIES},
    async journey(){return (await remote("/api/journey"))||JOURNEY},
    async sources(){return (await remote("/api/sources"))||Object.values(SOURCES)},
    async contributions(){return (await remote("/api/contributions"))||CONTRIBUTIONS},
    async glossary(){return GLOSSARY},
    async audit(){return AUDIT},
    /* writes, admin only, RBAC enforced */
    async updateObservation(code,year,value,reason){
      requireRole(["Data Administrator","Platform Administrator"]);
      const I=BYCODE[code],o=I.obs.find(o=>o.year===year);
      const before=o?o.value:null;
      if(o)o.value=value;else I.obs.push({year,value,collected:new Date().toISOString().slice(0,10),period:String(year)});
      // keep the underlying observation store in step with the derived record
      const rec=OBSERVATIONS.find(x=>x.indicator===code&&x.year===year);
      if(rec)rec.value=value;else OBSERVATIONS.push({indicator:code,period:String(year),year,value,
        collectedOn:new Date().toISOString().slice(0,10),sourceId:I.sourceId,verification:"in_review",staleCycles:0});
      I.verification="in_review";I.notReported=false;I.lastUpdated=new Date().toISOString().slice(0,10);
      recompute();logAudit("OBSERVATION_UPDATED",code+"/"+year,before,value+(reason?". "+reason:""));
      return {ok:true};
    },
    async setVerification(code,state){
      requireRole(["Data Reviewer","Data Administrator","Platform Administrator"]);
      const I=BYCODE[code],before=I.verification;I.verification=state;
      recompute();logAudit("VERIFICATION_CHANGED",code,before,state);return {ok:true};
    },
    async addContribution(rec){
      CONTRIBUTIONS.unshift(Object.assign({id:"C-"+(1043+CONTRIBUTIONS.length),when:new Date().toISOString().slice(0,10),
        state:"Awaiting review",reviewer:", "},rec));
      logAudit("CONTRIBUTION_SUBMITTED",rec.target||"new",null,rec.value);return {ok:true};
    },
    async loadDataset(json){
      requireRole(["Data Administrator","Platform Administrator"]);
      let n=0;
      (json.observations||[]).forEach(r=>{
        const I=BYCODE[r.code];if(!I)return;
        const o=I.obs.find(o=>o.year===r.year);
        if(o)o.value=r.value;else I.obs.push({year:r.year,value:r.value,collected:r.collected||"",period:String(r.year)});
        if(r.verification)I.verification=r.verification;
        I.notReported=false;n++;
      });
      recompute();logAudit("DATASET_LOADED","observations",null,n+" observations");return {ok:true,applied:n};
    }
  };
})();
function recompute(){
  YEARS.forEach(y=>RUNS[y]=scoreAll(y));
  bindYear(YEAR);bindDB();
}
/* ------------------------------------------------------------------- RBAC */
const ROLES={
 "Public Viewer":{can:["read_public"]},
 "Contributor":{can:["read_public","submit"]},
 "Data Reviewer":{can:["read_public","submit","review"]},
 "Data Administrator":{can:["read_public","submit","review","write","load"]},
 "Platform Administrator":{can:["read_public","submit","review","write","load","admin"]}
};
const SESSION={user:"Public visitor",role:"Public Viewer",org:null};
function requireRole(roles){
  if(!roles.includes(SESSION.role))throw new Error("Permission denied: "+SESSION.role+" cannot perform this action.");
}
function can(p){return (ROLES[SESSION.role]||{can:[]}).can.includes(p)}
