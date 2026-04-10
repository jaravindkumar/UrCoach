
import { avg, clamp, std } from "../utils.js";
import { buildMetricCards } from "./common.js";

export function computeRepMetrics(frames, cycle){
  const slice = frames.slice(cycle.startIndex, cycle.endIndex+1);
  const peak = frames[cycle.peakIndex];
  const duration = cycle.duration;
  const metrics = {
    Depth: clamp(((peak.depthDelta + 0.02) / 0.06) * 100, 0, 100),
    Tempo: clamp(100 - Math.abs(duration - 2.2) * 22, 0, 100),
    "Torso control": clamp(100 - std(slice.map(f=>f.torsoAngle||0)) * 4.5, 0, 100),
    Symmetry: clamp(100 - avg(slice.map(f=>f.symmetry||0)) * 700, 0, 100)
  };
  const issues = [];
  if(metrics.Depth < 70) issues.push("Shallow depth");
  if(metrics.Tempo < 70) issues.push("Tempo rushed");
  if(metrics["Torso control"] < 70) issues.push("Torso control dropped");
  if(metrics.Symmetry < 70) issues.push("Shifted side to side");
  return { rep:0, duration, metrics, issues:issues.length?issues:["No major issues flagged"], peakIndexSafe:cycle.peakIndex, snapshot:null };
}
export function aggregateLiftMetrics(repMetrics){
  const cards = buildMetricCards(repMetrics);
  const overallScore = cards.length ? Math.round(cards.reduce((a,b)=>a+b.value,0)/cards.length) : 0;
  return { cards, overallScore };
}
