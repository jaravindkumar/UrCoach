
import { MODES, LIFTS } from "../config.js";
import { createMoveNetDetector, createMediaPipePose, buildFrameFeaturesFromMoveNet, buildFrameFeaturesFromMediaPipe, inferAngle } from "./landmarks.js";
import { formCycles } from "./cycle-detector.js";
import { filterOutlierCycles } from "./outlier-filter.js";
import { captureRepSnapshots } from "./snapshots.js";
import * as squatMetrics from "./metrics/squat.js";
import * as deadliftMetrics from "./metrics/deadlift.js";
import * as benchMetrics from "./metrics/bench.js";
import * as ohpMetrics from "./metrics/ohp.js";
import * as rowMetrics from "./metrics/row.js";

const metricModules = { squat:squatMetrics, deadlift:deadliftMetrics, bench:benchMetrics, ohp:ohpMetrics, row:rowMetrics };

export async function analyzeVideoLocally({ videoEl, canvasEl, exercise, mode, onStatus, onProgress }){
  const cfg = MODES[mode];
  const duration = videoEl.duration || 0;

  // Pass 1: MoveNet full-clip scan for rep windows
  onStatus("Initializing MoveNet...");
  const detector = await createMoveNetDetector(mode);
  const chunkCount = Math.max(1, Math.ceil(duration / cfg.chunkSec));
  let fps = cfg.fpsShort;
  if(duration > 120) fps = cfg.fpsLong;
  else if(duration > 45) fps = cfg.fpsMedium;

  const repFrames = [];
  let totalPlanned = 0;
  for(let c=0;c<chunkCount;c++){
    const start=c*cfg.chunkSec, end=Math.min(duration,(c+1)*cfg.chunkSec);
    const chunkDuration=Math.max(0,end-start);
    totalPlanned += Math.max(8, Math.min(cfg.maxFramesPerChunk, Math.floor(chunkDuration * fps)));
  }

  let processed = 0;
  for(let c=0;c<chunkCount;c++){
    const start=c*cfg.chunkSec, end=Math.min(duration,(c+1)*cfg.chunkSec);
    const chunkDuration=Math.max(0,end-start);
    const chunkFrames=Math.max(8, Math.min(cfg.maxFramesPerChunk, Math.floor(chunkDuration * fps)));
    onStatus(`MoveNet pass: chunk ${c+1} / ${chunkCount}...`);
    for(let i=0;i<chunkFrames;i++){
      const localT = chunkFrames===1 ? 0 : (i / Math.max(1,chunkFrames-1)) * chunkDuration;
      const t = Math.min(Math.max(0,duration-0.001), start + localT);
      videoEl.currentTime = t;
      await new Promise(resolve => { videoEl.onseeked = () => resolve(); });
      const poses = await detector.estimatePoses(videoEl, { flipHorizontal:false });
      const pose = poses && poses[0];
      if(pose && pose.keypoints){
        const frame = buildFrameFeaturesFromMoveNet(pose.keypoints, t);
        if(frame) repFrames.push(frame);
      }
      processed += 1;
      if(processed % 8 === 0 || processed===totalPlanned){
        onProgress(Math.round((processed / Math.max(1,totalPlanned)) * 55));
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  }
  try{ detector.dispose && detector.dispose(); }catch(e){}

  const confidence = inferAngle(repFrames, exercise);
  const formed = formCycles(repFrames, exercise);
  const filtered = filterOutlierCycles(formed.cycles);
  const repWindows = filtered.cycles;

  // Pass 2: MediaPipe detailed scoring only for detected rep windows
  onStatus("Initializing MediaPipe scoring pass...");
  const pose = createMediaPipePose();
  let lastLandmarks = null;
  pose.onResults((results)=>{ if(results.poseLandmarks) lastLandmarks = results.poseLandmarks; });

  const secondPassFrames = [];
  const framesPerRep = cfg.secondPassFramesPerRep;
  let detailedPlanned = repWindows.length * Math.max(4, framesPerRep);
  let detailedDone = 0;

  for(let r=0;r<repWindows.length;r++){
    const rep = repWindows[r];
    const startT = repFrames[rep.startIndex]?.time ?? 0;
    const endT = repFrames[rep.endIndex]?.time ?? startT;
    const repDuration = Math.max(0.01, endT - startT);

    onStatus(`MediaPipe pass: rep ${r+1} / ${repWindows.length}...`);
    for(let i=0;i<framesPerRep;i++){
      const t = startT + (i / Math.max(1, framesPerRep - 1)) * repDuration;
      videoEl.currentTime = Math.min(Math.max(0,duration-0.001), t);
      await new Promise(resolve => { videoEl.onseeked = () => resolve(); });
      await pose.send({ image: videoEl });
      if(lastLandmarks){
        secondPassFrames.push({ repIndex:r, frame: buildFrameFeaturesFromMediaPipe(lastLandmarks, t) });
      }
      detailedDone += 1;
      if(detailedDone % 4 === 0 || detailedDone===detailedPlanned){
        onProgress(55 + Math.round((detailedDone / Math.max(1,detailedPlanned)) * 35));
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  }

  const metricsModule = metricModules[exercise] || metricModules.squat;
  const repMetrics = repWindows.map((cycle, idx) => {
    const frames = secondPassFrames.filter(x => x.repIndex === idx).map(x => x.frame);
    const sourceFrames = frames.length ? frames : repFrames.slice(cycle.startIndex, cycle.endIndex + 1);
    const rep = metricsModule.computeRepMetrics(sourceFrames, {
      ...cycle,
      peakIndex: Math.min(sourceFrames.length - 1, Math.max(0, Math.floor(sourceFrames.length * 0.5)))
    });
    rep.rep = idx + 1;
    rep.peakTimeSafe = repFrames[cycle.peakIndex]?.time ?? 0;
    return rep;
  });

  const snapshots = await captureRepSnapshots(videoEl, repMetrics, cfg.snapshotCount, canvasEl);
  repMetrics.forEach((rep, idx) => { rep.snapshot = snapshots[idx] || null; });

  let { cards, overallScore } = metricsModule.aggregateLiftMetrics(repMetrics);
  let overallIssues = [];
  if(confidence.quality === "weak"){
    // For weak camera angle, summarize overall form tendencies instead of rep count.
    const avgCards = cards.filter(c => typeof c.value === "number");
    overallIssues = avgCards.filter(c => c.value < 70).map(c => `${c.label} needs improvement`);
    if(!overallIssues.length){
      overallIssues = ["Camera angle not satisfactory for reliable rep counting", "Use the recommended camera angle for rep-level analysis"];
    }
  }
  try{ pose.close && pose.close(); }catch(e){}
  onProgress(100);

  return {
    exerciseName: LIFTS[exercise].name,
    bestAngle: LIFTS[exercise].bestAngle,
    confidence,
    repCount: repMetrics.length,
    overallScore,
    cards,
    repMetrics,
    notes: summariseNotes(exercise, confidence, repMetrics.length),
    overallIssues,
    debug: {
      framesProcessedMoveNet: repFrames.length,
      framesProcessedMediaPipe: secondPassFrames.length,
      candidateReps: formed.debug.rawCandidates,
      keptReps: repMetrics.length,
      zones: formed.debug.zones,
      rejectedCycleDetection: formed.debug.rejected,
      rejectedOutlier: filtered.debug
    }
  };
}

function summariseNotes(exercise, confidence, repCount){
  const notes = [`Best camera angle for ${LIFTS[exercise].name}: ${LIFTS[exercise].bestAngle}.`];
  if(confidence.quality==="weak") notes.push("This result is lower confidence because the camera angle or tracking quality looked weaker than ideal.");
  else if(confidence.quality==="usable") notes.push("This result is usable, but the recommended camera angle would likely improve reliability.");
  else notes.push("Tracking quality looked good for the selected lift.");
  notes.push("UrCoach used a fast first pass to find lift windows, then a detailed pass to score form.");
  if(!repCount) notes.push("No full valid reps were detected from the current signal.");
  return notes;
}
