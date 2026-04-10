
import { smooth } from "./smoothing.js";

export function buildPrimarySignal(frames, exercise){
  if(exercise==="squat") return smooth(frames.map(f=>f.depthDelta||0), 7);
  if(exercise==="deadlift") return smooth(frames.map(f=>-(f.hipY||0)), 7);
  if(exercise==="bench") return smooth(frames.map(f=>f.elbowAngle||0), 7);
  if(exercise==="ohp") return smooth(frames.map(f=>(f.shoulderY||0)-(f.wristY||0)), 7);
  return smooth(frames.map(f=>f.rowPull||0), 7);
}
