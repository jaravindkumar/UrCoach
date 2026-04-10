
export function avg(nums){
  const vals = nums.filter(v => typeof v === "number" && !Number.isNaN(v));
  return vals.length ? vals.reduce((a,b)=>a+b,0) / vals.length : 0;
}
export function std(nums){
  const vals = nums.filter(v => typeof v === "number" && !Number.isNaN(v));
  if(!vals.length) return 0;
  const m = avg(vals);
  return Math.sqrt(avg(vals.map(v => (v-m) ** 2)));
}
export function clamp(x, lo, hi){ return Math.max(lo, Math.min(hi, x)); }
export function percentile(values, p){
  if(!values.length) return 0;
  const s = [...values].sort((a,b)=>a-b);
  const idx = (p / 100) * (s.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return lo === hi ? s[lo] : s[lo] + (s[hi]-s[lo]) * (idx-lo);
}
export function median(values){ return percentile(values, 50); }
export function mad(values){
  const med = median(values);
  return median(values.map(v => Math.abs(v-med)));
}
export function angle(a,b,c){
  if(!a||!b||!c) return null;
  const abx=a.x-b.x, aby=a.y-b.y, cbx=c.x-b.x, cby=c.y-b.y;
  const dot=abx*cbx+aby*cby, m1=Math.hypot(abx,aby), m2=Math.hypot(cbx,cby);
  if(!m1||!m2) return null;
  return Math.acos(clamp(dot/(m1*m2),-1,1))*180/Math.PI;
}
