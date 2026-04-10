
import { percentile } from "./utils.js";
import { buildPrimarySignal } from "./signal-builder.js";
import { REP_RULES } from "../config.js";

function buildZones(signal, rules){
  const low = percentile(signal, rules.startPct);
  const high = percentile(signal, rules.topPct);
  const reset = percentile(signal, rules.resetPct);
  const amp = Math.max(0.01, high - low);
  return {
    low, high, reset, amp,
    enterHigh: high,
    enterLow: low,
    returnBand: reset
  };
}
function dedupeOverlappingCycles(cycles){
  const ordered = [...cycles].sort((a,b)=>a.startIndex-b.startIndex);
  const cleaned = [];
  for(const cycle of ordered){
    const last = cleaned[cleaned.length-1];
    if(!last){ cleaned.push(cycle); continue; }
    if(cycle.startIndex > last.endIndex){ cleaned.push(cycle); continue; }
    if(cycle.cycleAmp > last.cycleAmp) cleaned[cleaned.length-1] = cycle;
  }
  return cleaned;
}

function confirmLiftSpecific(frames, exercise, startIndex, peakIndex, endIndex, zones){
  const start = frames[startIndex], peak = frames[peakIndex], end = frames[endIndex];
  if(exercise === "deadlift"){
    return ((peak.hipAngle||0) - (start.hipAngle||0) > 5) &&
           (Math.abs((end.hipY||0) - (start.hipY||0)) < zones.amp * 0.9 + 0.05);
  }
  if(exercise === "bench"){
    return (peak.elbowAngle||0) > (start.elbowAngle||0) + 6;
  }
  if(exercise === "ohp"){
    return ((peak.shoulderY||0)-(peak.wristY||0)) > ((start.shoulderY||0)-(start.wristY||0)) + zones.amp * 0.25;
  }
  if(exercise === "row"){
    return (peak.rowPull||0) > (start.rowPull||0) + zones.amp * 0.2;
  }
  return Math.abs((end.depthDelta||0) - (start.depthDelta||0)) < zones.amp * 0.9 + 0.05;
}

export function formCycles(frames, exercise){
  if(frames.length < 20){
    return { cycles:[], debug:{ rawSignalFrames:frames.length, rawCandidates:0, rejected:{}, zones:null } };
  }
  const rules = REP_RULES[exercise] || REP_RULES.squat;
  const signal = buildPrimarySignal(frames, exercise);
  const zones = buildZones(signal, rules);
  const totalDuration = frames[frames.length-1].time - frames[0].time;
  const rejected = { duration:0, amplitude:0, edge:0, confirm:0, transition:0 };
  const candidates = [];

  let state = "waiting";
  let startIndex = 0;
  let peakIndex = 0;
  let valleyIndex = 0;
  let sawMidReturn = false;

  for(let i=1;i<signal.length;i++){
    const v = signal[i];
    if(state === "waiting"){
      if(v <= zones.enterLow){
        startIndex = i;
        valleyIndex = i;
        peakIndex = i;
        sawMidReturn = false;
        state = "loading";
      }
      continue;
    }

    if(state === "loading"){
      if(signal[i] < signal[valleyIndex]) valleyIndex = i;
      if(signal[i] > signal[peakIndex]) peakIndex = i;

      if(v >= zones.enterHigh){
        state = "atHigh";
      }
      continue;
    }

    if(state === "atHigh"){
      if(signal[i] > signal[peakIndex]) peakIndex = i;
      if(v <= zones.returnBand){
        sawMidReturn = true;
        state = "returning";
      }
      continue;
    }

    if(state === "returning"){
      if(v <= zones.returnBand){
        const endIndex = i;
        const duration = frames[endIndex].time - frames[startIndex].time;
        const cycleAmp = signal[peakIndex] - signal[valleyIndex];
        const weakEdge = ((frames[startIndex].time - frames[0].time) < totalDuration * rules.earlyFrac ||
                          (frames[frames.length-1].time - frames[endIndex].time) < totalDuration * rules.lateFrac) &&
                         cycleAmp < zones.amp * 1.45;

        if(duration < rules.minDuration || duration > rules.maxDuration){
          rejected.duration += 1;
        } else if(cycleAmp < zones.amp * rules.ampFrac){
          rejected.amplitude += 1;
        } else if(weakEdge){
          rejected.edge += 1;
        } else if(!confirmLiftSpecific(frames, exercise, startIndex, peakIndex, endIndex, zones)){
          rejected.confirm += 1;
        } else {
          candidates.push({
            startIndex,
            peakIndex,
            endIndex,
            duration,
            cycleAmp,
            signalStart: signal[startIndex],
            signalPeak: signal[peakIndex],
            signalEnd: signal[endIndex]
          });
        }
        state = "waiting";
      } else if(v > zones.enterHigh){
        // merged wave, reset high point
        peakIndex = i;
        state = "atHigh";
      } else if(v > zones.returnBand + zones.amp * 0.1){
        rejected.transition += 1;
        state = "waiting";
      }
    }
  }

  return {
    cycles: dedupeOverlappingCycles(candidates),
    debug: {
      rawSignalFrames: signal.length,
      rawCandidates: candidates.length,
      rejected,
      zones
    }
  };
}
