
import { avg } from "./utils.js";
export function smooth(values, w=5){
  return values.map((_,i)=>{
    const s=Math.max(0,i-Math.floor(w/2));
    const e=Math.min(values.length,i+Math.floor(w/2)+1);
    return avg(values.slice(s,e));
  });
}
