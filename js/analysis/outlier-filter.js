
import { median, mad } from "./utils.js";
export function filterOutlierCycles(cycles){
  if(cycles.length <= 5){
    return { cycles, debug:{ durationRejects:0, amplitudeRejects:0, baselineRejects:0, skipped:true } };
  }
  const durations = cycles.map(c=>c.duration);
  const amps = cycles.map(c=>c.cycleAmp);
  const endErrors = cycles.map(c=>Math.abs((c.signalEnd??0)-(c.signalStart??0)));
  const durMed = median(durations), durMad = Math.max(0.08, mad(durations));
  const ampMed = median(amps), ampMad = Math.max(0.01, mad(amps));
  const baseMed = median(endErrors), baseMad = Math.max(0.01, mad(endErrors));

  let durationRejects=0, amplitudeRejects=0, baselineRejects=0;
  const kept = cycles.filter(cycle => {
    const durOk = Math.abs(cycle.duration - durMed) <= 4 * durMad;
    const ampOk = cycle.cycleAmp >= (ampMed - 3 * ampMad);
    const baseOk = Math.abs(Math.abs((cycle.signalEnd??0)-(cycle.signalStart??0)) - baseMed) <= 4 * baseMad + 0.04;
    if(!durOk) durationRejects += 1;
    if(durOk && !ampOk) amplitudeRejects += 1;
    if(durOk && ampOk && !baseOk) baselineRejects += 1;
    return durOk && ampOk && baseOk;
  });
  const finalCycles = kept.length >= Math.max(3, Math.ceil(cycles.length * 0.7)) ? kept : cycles;
  return { cycles: finalCycles, debug:{ durationRejects, amplitudeRejects, baselineRejects, skipped:false } };
}
