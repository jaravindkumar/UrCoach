
import { angle, avg } from "./utils.js";
import { MODES } from "../config.js";

export async function createMoveNetDetector(mode){
  await window.tf.setBackend("webgl");
  await window.tf.ready();
  const modelType = MODES[mode].movenet === "THUNDER"
    ? window.poseDetection.movenet.modelType.SINGLEPOSE_THUNDER
    : window.poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING;

  return await window.poseDetection.createDetector(
    window.poseDetection.SupportedModels.MoveNet,
    { modelType }
  );
}

export function createMediaPipePose(){
  const pose = new window.Pose({
    locateFile:(file)=>`https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
  });
  pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.45,
    minTrackingConfidence: 0.45
  });
  return pose;
}

export function buildFrameFeaturesFromMoveNet(keypoints, time){
  const kp = Object.fromEntries((keypoints || []).map(k => [k.name, k]));
  const ls = kp["left_shoulder"], rs = kp["right_shoulder"];
  const lh = kp["left_hip"], rh = kp["right_hip"];
  const lk = kp["left_knee"], rk = kp["right_knee"];
  const lw = kp["left_wrist"], rw = kp["right_wrist"];
  const le = kp["left_elbow"], re = kp["right_elbow"];

  if(!ls || !rs || !lh || !rh || !lk || !rk || !lw || !rw || !le || !re) return null;

  const shoulderMid={x:(ls.x+rs.x)/2,y:(ls.y+rs.y)/2};
  const hipMid={x:(lh.x+rh.x)/2,y:(lh.y+rh.y)/2};
  const kneeMid={x:(lk.x+rk.x)/2,y:(lk.y+rk.y)/2};
  const wristMid={x:(lw.x+rw.x)/2,y:(lw.y+rw.y)/2};

  return {
    time,
    shoulderWidth:Math.abs(ls.x-rs.x),
    torsoAbsDx:Math.abs(shoulderMid.x-hipMid.x),
    torsoAbsDy:Math.abs(shoulderMid.y-hipMid.y),
    elbowAngle:avg([angle(ls,le,lw), angle(rs,re,rw)]),
    hipAngle:avg([angle(ls,lh,lk), angle(rs,rh,rk)]),
    torsoAngle:Math.abs(Math.atan2(shoulderMid.x-hipMid.x, shoulderMid.y-hipMid.y) * 180 / Math.PI),
    symmetry:Math.abs((lw.x-ls.x)-(rw.x-rs.x)),
    depthDelta:hipMid.y-kneeMid.y,
    hipY:hipMid.y,
    shoulderY:shoulderMid.y,
    wristY:wristMid.y,
    wristMidX:wristMid.x,
    rowPull:shoulderMid.y-wristMid.y
  };
}

export function buildFrameFeaturesFromMediaPipe(landmarks, time){
  const lm = landmarks;
  const shoulderMid={x:(lm[11].x+lm[12].x)/2,y:(lm[11].y+lm[12].y)/2};
  const hipMid={x:(lm[23].x+lm[24].x)/2,y:(lm[23].y+lm[24].y)/2};
  const kneeMid={x:(lm[25].x+lm[26].x)/2,y:(lm[25].y+lm[26].y)/2};
  const wristMid={x:(lm[15].x+lm[16].x)/2,y:(lm[15].y+lm[16].y)/2};

  return {
    time,
    shoulderWidth:Math.abs(lm[11].x-lm[12].x),
    torsoAbsDx:Math.abs(shoulderMid.x-hipMid.x),
    torsoAbsDy:Math.abs(shoulderMid.y-hipMid.y),
    elbowAngle:avg([angle(lm[11],lm[13],lm[15]), angle(lm[12],lm[14],lm[16])]),
    hipAngle:avg([angle(lm[11],lm[23],lm[25]), angle(lm[12],lm[24],lm[26])]),
    torsoAngle:Math.abs(Math.atan2(shoulderMid.x-hipMid.x, shoulderMid.y-hipMid.y) * 180 / Math.PI),
    symmetry:Math.abs((lm[15].x-lm[11].x) - (lm[16].x-lm[12].x)),
    depthDelta:hipMid.y-kneeMid.y,
    hipY:hipMid.y,
    shoulderY:shoulderMid.y,
    wristY:wristMid.y,
    wristMidX:wristMid.x,
    rowPull:shoulderMid.y-wristMid.y
  };
}

export function inferAngle(frames, exercise){
  const torsoRatios = frames.map(f => f.torsoAbsDx / Math.max(0.01, f.torsoAbsDy));
  const shoulderWidths = frames.map(f => f.shoulderWidth);
  const avgTorsoRatio = torsoRatios.length ? torsoRatios.reduce((a,b)=>a+b,0)/torsoRatios.length : 0;
  const avgShoulderWidth = shoulderWidths.length ? shoulderWidths.reduce((a,b)=>a+b,0)/shoulderWidths.length : 0;
  if(exercise==="ohp"){
    if(avgShoulderWidth > 0.16) return { label:"Good", confidence:88, quality:"best" };
    if(avgShoulderWidth > 0.11) return { label:"Usable", confidence:70, quality:"usable" };
    return { label:"Low confidence", confidence:48, quality:"weak" };
  }
  if(avgTorsoRatio < 0.28) return { label:"Good", confidence:88, quality:"best" };
  if(avgTorsoRatio < 0.45) return { label:"Usable", confidence:68, quality:"usable" };
  return { label:"Low confidence", confidence:45, quality:"weak" };
}
