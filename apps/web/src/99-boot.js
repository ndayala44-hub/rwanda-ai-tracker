
/* ================================= BOOT =================================
   Load the dataset (API → snapshot → embedded), assemble indicators, run the
   scoring engine, then render. The UI code below this point is untouched.
   ======================================================================*/
async function boot(){
  // Optional runtime dependencies. Both may legitimately be absent, this file
  // is designed to work when it is opened straight from disk.
  await loadDeploymentConfig();
  const charts = await ensureCharts();

  try{
    const ds=await loadDataset();
    applyDataset(ds);
    runEngine();
    bindDB();
  }catch(e){
    document.getElementById("main").innerHTML=
      `<div class="card"><div class="bd"><b>The data layer could not be loaded.</b>
        <div class="prose" style="margin-top:8px">${e.message}</div>
        <div class="small muted" style="margin-top:8px">Tried, in order: ${META.apiBase?"the API at "+META.apiBase+", ":""}the snapshot at ${META.snapshotUrl}, then the embedded dataset.</div>
      </div></div>`;
    throw e;
  }
  renderNav();renderFresh();renderFooter();
  await applyRoute();       // deep link, bookmark or back button decides the first view
  console.log("%cRwanda AI Tracker","font-weight:700",
    "| data origin",META.dataOrigin,"| readiness",RUN.readiness.score.toFixed(2),
    "| maturity",RUN.maturity.score.toFixed(2),"| level L"+ML.assigned,
    "| indicators",IND.length,"| observations",OBSERVATIONS.length,"| sources",Object.keys(SOURCES).length,
    "| charts",charts);
}
boot();
