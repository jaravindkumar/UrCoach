
import { avg, clamp, percentile, std } from "../utils.js";
import { buildMetricCards } from "./common.js";
export function computeRepMetrics(frames, cycle){
  const slice = frames.slice(cycle.startIndex, cycle.endIndex+1);
  const duration = cycle.duration;
  const metrics = {
    Tempo: clamp(100 - Math.abs(duration - 2.0) * 24, 0, 100),
    Lockout: clamp(((percentile(slice.map(f=>f.elbowAngle||0),85)-150)/20)*100, 0, 100),
    Symmetry: clamp(100 - avg(slice.map(f=>f.symmetry||0)) * 900, 0, 100),
    Consistency: clamp(100 - std(slice.map(f=>f.elbowAngle||0)) * 1.2, 0, 100)
  };
  const issues = [];
  if(metrics.Tempo < 70) issues.push("Tempo rushed");
  if(metrics.Lockout < 70) issues.push("Lockout incomplete");
  if(metrics.Symmetry < 70) issues.push("Uneven press");
  if(metrics.Consistency < 70) issues.push("Rep consistency dropped");
  return { rep:0, duration, metrics, issues:issues.length?issues:["No major issues flagged"], peakIndexSafe:cycle.peakIndex, snapshot:null };
}
export function aggregateLiftMetrics(repMetrics){
  const cards = buildMetricCards(repMetrics);
  const overallScore = cards.length ? Math.round(cards.reduce((a,b)=>a+b.value,0)/cards.length) : 0;
  return { cards, overallScore };
}
