
import { loadResults } from "../storage.js";
export async function renderHistory(onOpen){
  const items = await loadResults().catch(() => []);
  const list = document.getElementById("historyList");
  if(!items.length){
    list.innerHTML = `<div class="empty">No saved analyses yet.</div>`;
    return;
  }
  list.innerHTML = items.map(item => `
    <div class="list-item">
      <div>
        <div><strong>${item.exerciseName}</strong></div>
        <div class="helper" style="margin-top:4px">${new Date(item.createdAt).toLocaleString()}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <span class="badge">${item.repCount} reps</span>
        <span class="badge">${item.overallScore}</span>
        <button class="btn btn-secondary btn-small" data-open-id="${item.id}">Open</button>
      </div>
    </div>
  `).join("");
  list.querySelectorAll("[data-open-id]").forEach(btn => btn.addEventListener("click", async () => {
    const items2 = await loadResults().catch(() => []);
    const item = items2.find(x => x.id === btn.dataset.openId);
    if(item) onOpen(item);
  }));
}
