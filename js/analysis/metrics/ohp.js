
import { avg, clamp, percentile, std } from "../utils.js";
import { buildMetricCards } from "./common.js";
export function computeRepMetrics(frames, cycle){
  const slice = frames.slice(cycle.startIndex, cycle.endIndex+1);
  const duration = cycle.duration;
  const metrics = {
    Lockout: clamp(((percentile(slice.map(f=>(f.shoulderY||0)-(f.wristY||0)),85)-0.08)/0.08)*100, 0, 100),
    "Press path": clamp(100 - std(slice.map(f=>f.wristMidX||0)) * 900, 0, 100),
    Tempo: clamp(100 - Math.abs(duration - 2.1) * 24, 0, 100),
    Symmetry: clamp(100 - avg(slice.map(f=>f.symmetry||0)) * 850, 0, 100)
  };
  const issues = [];
  if(metrics.Lockout < 70) issues.push("Missed full lockout");
  if(metrics["Press path"] < 70) issues.push("Press path drifted");
  if(metrics.Tempo < 70) issues.push("Tempo rushed");
  if(metrics.Symmetry < 70) issues.push("Left / right imbalance");
  return { rep:0, duration, metrics, issues:issues.length?issues:["No major issues flagged"], peakIndexSafe:cycle.peakIndex, snapshot:null };
}
export function aggregateLiftMetrics(repMetrics){
  const cards = buildMetricCards(repMetrics);
  const overallScore = cards.length ? Math.round(cards.reduce((a,b)=>a+b.value,0)/cards.length) : 0;
  return { cards, overallScore };
}
