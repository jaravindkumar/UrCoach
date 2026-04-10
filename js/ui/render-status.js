
export function setStatus(msg){ document.getElementById("statusText").textContent = msg; }
export function setProgress(value){ document.getElementById("progressBar").value = value; }
export function showToast(msg){
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove("show"), 1800);
}
