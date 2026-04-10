
import { clamp, std } from "../utils.js";
import { buildMetricCards } from "./common.js";
export function computeRepMetrics(frames, cycle){
  const slice = frames.slice(cycle.startIndex, cycle.endIndex+1);
  const peak = frames[cycle.peakIndex];
  const duration = cycle.duration;
  const setupSlice = slice.slice(0, Math.max(2, Math.floor(slice.length * 0.25)));
  const metrics = {
    Setup: clamp(100 - std(setupSlice.map(f=>f.hipY||0)) * 800, 0, 100),
    Hinge: clamp(100 - std(slice.map(f=>f.hipAngle||0)) * 2.4, 0, 100),
    Lockout: clamp(((peak.hipAngle || 140) - 145) * 7, 0, 100),
    Tempo: clamp(100 - Math.abs(duration - 2.4) * 18, 0, 100)
  };
  const issues = [];
  if(metrics.Setup < 70) issues.push("Setup inconsistent");
  if(metrics.Hinge < 70) issues.push("Hinge pattern drifted");
  if(metrics.Lockout < 70) issues.push("Incomplete lockout");
  if(metrics.Tempo < 70) issues.push("Tempo rushed");
  return { rep:0, duration, metrics, issues:issues.length?issues:["No major issues flagged"], peakIndexSafe:cycle.peakIndex, snapshot:null };
}
export function aggregateLiftMetrics(repMetrics){
  const cards = buildMetricCards(repMetrics);
  const overallScore = cards.length ? Math.round(cards.reduce((a,b)=>a+b.value,0)/cards.length) : 0;
  return { cards, overallScore };
}
