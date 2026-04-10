
export function renderResult(result){
  document.getElementById("sumLift").textContent = result.exerciseName;
  const lowAngle = result.confidence && result.confidence.quality === "weak";
  document.getElementById("sumReps").textContent = lowAngle ? "—" : result.repCount;
  document.getElementById("sumScore").textContent = result.overallScore;
  document.getElementById("sumConfidence").textContent = result.confidence.confidence;
  document.getElementById("angleBadge").textContent = lowAngle ? `Angle: not ideal` : `Best: ${result.bestAngle}`;

  const metricGrid = document.getElementById("metricGrid");
  metricGrid.innerHTML = result.cards.length
    ? result.cards.map(card => `<div class="metric-card"><span>${card.label}</span><strong>${card.value}</strong></div>`).join("")
    : `<div class="empty">No metrics yet.</div>`;

  const flagged = result.repMetrics.filter(r => r.issues.some(x => x !== "No major issues flagged"));
  document.getElementById("flaggedList").innerHTML = lowAngle
    ? `<div class="list-item"><div><strong>Overall form analysis</strong><div class="helper" style="margin-top:4px">${result.overallIssues && result.overallIssues.length ? result.overallIssues.join(" · ") : "Use the recommended camera angle for rep-level analysis."}</div></div></div>`
    : flagged.length
    ? flagged.map(r => `<div class="list-item"><div><div><strong>Rep ${r.rep}</strong></div><div class="helper" style="margin-top:4px">${r.issues.join(" · ")}</div></div><div class="badge">${r.duration.toFixed(2)}s</div></div>`).join("")
    : `<div class="empty">No major issues flagged.</div>`;

  document.getElementById("notesList").innerHTML = result.notes.map(n => `<div class="list-item"><div>${n}</div></div>`).join("");

  document.getElementById("repList").innerHTML = lowAngle ? `<div class="empty">Rep count is hidden because the camera angle was not satisfactory for reliable rep-level counting.</div>` : result.repMetrics.length
    ? result.repMetrics.map(r => `<div class="list-item"><div><div><strong>Rep ${r.rep}</strong></div><div class="helper" style="margin-top:4px">${Object.entries(r.metrics).map(([k,v]) => `${k}: ${Math.round(v)}`).join(" · ")}</div></div><div class="badge">${r.duration.toFixed(2)}s</div></div>`).join("")
    : `<div class="empty">No reps detected in this analysis.</div>`;

  const snaps = lowAngle ? [] : result.repMetrics.filter(r => r.snapshot).slice(0, 6);
  document.getElementById("snapGrid").innerHTML = snaps.length
    ? snaps.map(r => `<div class="snap-card"><img src="${r.snapshot}" alt="Rep ${r.rep}" /><div class="helper" style="margin-top:8px">Rep ${r.rep}</div></div>`).join("")
    : `<div class="empty">No snapshots available.</div>`;

  const dbg = result.debug || {};
  const zones = dbg.zones || {};
  document.getElementById("debugList").innerHTML = `
    <div class="list-item"><div>Frames processed</div><strong>Pass 1 ${dbg.framesProcessedMoveNet ?? 0} | Pass 2 ${dbg.framesProcessedMediaPipe ?? 0}</strong></div>
    <div class="list-item"><div>Candidate reps / kept reps</div><strong>${dbg.candidateReps ?? 0} / ${dbg.keptReps ?? 0}</strong></div>
    <div class="list-item"><div>Zones</div><strong>low ${fmt(zones.low)} | high ${fmt(zones.high)} | reset ${fmt(zones.reset)}</strong></div>
    <div class="list-item"><div>Rejected in cycle detection</div><strong>dur ${dbg.rejectedCycleDetection?.duration ?? 0}, amp ${dbg.rejectedCycleDetection?.amplitude ?? 0}, edge ${dbg.rejectedCycleDetection?.edge ?? 0}, confirm ${dbg.rejectedCycleDetection?.confirm ?? 0}, transition ${dbg.rejectedCycleDetection?.transition ?? 0}</strong></div>
    <div class="list-item"><div>Rejected in outlier cleanup</div><strong>dur ${dbg.rejectedOutlier?.durationRejects ?? 0}, amp ${dbg.rejectedOutlier?.amplitudeRejects ?? 0}, base ${dbg.rejectedOutlier?.baselineRejects ?? 0}, skipped ${dbg.rejectedOutlier?.skipped ? "yes" : "no"}</strong></div>
  `;
}
function fmt(v){ return typeof v === "number" ? v.toFixed(3) : "-"; }
