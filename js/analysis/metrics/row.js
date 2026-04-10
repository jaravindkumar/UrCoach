
import { avg, clamp, std } from "../utils.js";
import { buildMetricCards } from "./common.js";
export function computeRepMetrics(frames, cycle){
  const slice = frames.slice(cycle.startIndex, cycle.endIndex+1);
  const peak = frames[cycle.peakIndex];
  const duration = cycle.duration;
  const metrics = {
    "Pull height": clamp(((peak.rowPull || 0.08) / 0.10) * 100, 0, 100),
    "Torso stability": clamp(100 - std(slice.map(f=>f.torsoAngle||0)) * 4.5, 0, 100),
    Tempo: clamp(100 - Math.abs(duration - 1.8) * 26, 0, 100),
    Symmetry: clamp(100 - avg(slice.map(f=>f.symmetry||0)) * 850, 0, 100)
  };
  const issues = [];
  if(metrics["Pull height"] < 70) issues.push("Pull height dropped");
  if(metrics["Torso stability"] < 70) issues.push("Torso swing increased");
  if(metrics.Tempo < 70) issues.push("Tempo rushed");
  if(metrics.Symmetry < 70) issues.push("Uneven pull");
  return { rep:0, duration, metrics, issues:issues.length?issues:["No major issues flagged"], peakIndexSafe:cycle.peakIndex, snapshot:null };
}
export function aggregateLiftMetrics(repMetrics){
  const cards = buildMetricCards(repMetrics);
  const overallScore = cards.length ? Math.round(cards.reduce((a,b)=>a+b.value,0)/cards.length) : 0;
  return { cards, overallScore };
}
