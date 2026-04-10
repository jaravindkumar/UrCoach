
export function buildMetricCards(repMetrics){
  const keys = repMetrics.length ? Object.keys(repMetrics[0].metrics) : [];
  return keys.map(key => ({
    label:key,
    value:Math.round(repMetrics.reduce((sum, rep)=>sum + rep.metrics[key], 0) / repMetrics.length)
  }));
}
