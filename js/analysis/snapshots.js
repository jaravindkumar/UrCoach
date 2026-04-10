
export async function captureRepSnapshots(videoEl, repMetrics, maxSnapshots, canvasEl){
  const ctx = canvasEl.getContext("2d");
  const snapshots = [];
  const count = Math.min(maxSnapshots, repMetrics.length);
  for(let i=0;i<count;i++){
    const rep = repMetrics[i];
    const t = rep.peakTimeSafe || 0;
    videoEl.currentTime = t;
    await new Promise(resolve => { videoEl.onseeked = () => resolve(); });
    const snapW = Math.min(720, videoEl.videoWidth || 640);
    const snapH = Math.round(snapW * ((videoEl.videoHeight || 360) / Math.max(1, (videoEl.videoWidth || 640))));
    canvasEl.width = snapW;
    canvasEl.height = snapH;
    ctx.clearRect(0,0,canvasEl.width,canvasEl.height);
    ctx.drawImage(videoEl,0,0,canvasEl.width,canvasEl.height);
    snapshots.push(canvasEl.toDataURL("image/jpeg", 0.58));
  }
  return snapshots;
}
