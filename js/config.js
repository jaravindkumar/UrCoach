
export const LIFTS = {
  squat:{ name:"Squat", bestAngle:"Side view" },
  bench:{ name:"Bench", bestAngle:"Side view" },
  deadlift:{ name:"Deadlift", bestAngle:"Side view" },
  ohp:{ name:"OHP", bestAngle:"Front or slight front-diagonal" },
  row:{ name:"Row", bestAngle:"Side view" }
};

export const MODES = {
  fast:{ name:"Fast", desc:"Best for most users", fpsShort:6, fpsMedium:5, fpsLong:4, chunkSec:18, maxFramesPerChunk:84, snapshotCount:2, targetWidth:480, secondPassFramesPerRep:14, movenet:"LIGHTNING" },
  standard:{ name:"Standard", desc:"Balanced detail", fpsShort:8, fpsMedium:6, fpsLong:5, chunkSec:16, maxFramesPerChunk:110, snapshotCount:4, targetWidth:640, secondPassFramesPerRep:18, movenet:"LIGHTNING" },
  detailed:{ name:"Detailed", desc:"Slowest, more detail", fpsShort:10, fpsMedium:8, fpsLong:6, chunkSec:14, maxFramesPerChunk:132, snapshotCount:5, targetWidth:720, secondPassFramesPerRep:22, movenet:"THUNDER" }
};

export const DB_NAME = "UrCoachHybridDB";
export const DB_VERSION = 1;
export const STORE_NAME = "results";

export const REP_RULES = {
  squat:    { minDuration:0.6, maxDuration:8, ampFrac:0.12, earlyFrac:0.05, lateFrac:0.05, startPct:34, topPct:68, resetPct:46 },
  deadlift: { minDuration:0.7, maxDuration:10, ampFrac:0.13, earlyFrac:0.05, lateFrac:0.05, startPct:34, topPct:68, resetPct:47 },
  bench:    { minDuration:0.5, maxDuration:8, ampFrac:0.11, earlyFrac:0.04, lateFrac:0.04, startPct:36, topPct:66, resetPct:48 },
  ohp:      { minDuration:0.5, maxDuration:8, ampFrac:0.11, earlyFrac:0.04, lateFrac:0.04, startPct:36, topPct:66, resetPct:48 },
  row:      { minDuration:0.45, maxDuration:8, ampFrac:0.10, earlyFrac:0.04, lateFrac:0.04, startPct:36, topPct:64, resetPct:48 }
};
