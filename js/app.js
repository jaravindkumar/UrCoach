
import { LIFTS, MODES } from "./config.js";
import { saveResult, clearResults } from "./storage.js";
import { analyzeVideoLocally } from "./analysis/engine.js";
import { renderResult } from "./ui/render-results.js";
import { renderHistory } from "./ui/render-history.js";
import { setStatus, setProgress, showToast } from "./ui/render-status.js";

const videoInput = document.getElementById("videoInput");
const loadBtn = document.getElementById("loadBtn");
const analyzeBtn = document.getElementById("analyzeBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const videoEl = document.getElementById("videoEl");
const previewCanvas = document.getElementById("previewCanvas");

let selectedLift = "squat";
let selectedMode = "fast";
let loadedFile = null;
let videoUrl = null;
let latestAnalysis = null;

function switchTab(tab){
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tab));
  document.querySelectorAll(".tab-section").forEach(sec => sec.classList.remove("active"));
  document.getElementById(`tab-${tab}`).classList.add("active");
}
document.querySelectorAll(".tab-btn").forEach(btn => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));

function renderLiftButtons(){
  const grid = document.getElementById("liftGrid");
  grid.innerHTML = Object.entries(LIFTS).map(([key,cfg]) => `
    <button class="lift-btn ${key===selectedLift ? "active" : ""}" data-lift="${key}">
      <div style="font-weight:800">${cfg.name}</div>
      <div class="helper" style="margin-top:6px">Best: ${cfg.bestAngle}</div>
    </button>
  `).join("");
  document.getElementById("angleHint").textContent = `Best results for ${LIFTS[selectedLift].name} come from ${LIFTS[selectedLift].bestAngle}.`;
  grid.querySelectorAll(".lift-btn").forEach(btn => btn.addEventListener("click", () => {
    selectedLift = btn.dataset.lift;
    renderLiftButtons();
  }));
}
function renderModeButtons(){
  const grid = document.getElementById("modeGrid");
  grid.innerHTML = Object.entries(MODES).map(([key,cfg]) => `
    <button class="mode-btn ${key===selectedMode ? "active" : ""}" data-mode="${key}">
      <div style="font-weight:800">${cfg.name}</div>
      <div class="helper" style="margin-top:6px">${cfg.desc}</div>
    </button>
  `).join("");
  document.getElementById("modeHint").textContent = `${MODES[selectedMode].name} mode selected.`;
  grid.querySelectorAll(".mode-btn").forEach(btn => btn.addEventListener("click", () => {
    selectedMode = btn.dataset.mode;
    renderModeButtons();
  }));
}

function updateSelectedFileName(){
  const fileNameEl = document.getElementById("fileName");
  if(!fileNameEl) return;
  const file = videoInput.files && videoInput.files[0];
  fileNameEl.textContent = file ? file.name : "No file chosen";
}

function loadVideo(){
  if(!videoInput.files || !videoInput.files[0]){
    showToast("Choose a video first");
    return;
  }
  loadedFile = videoInput.files[0];
  if(videoUrl) URL.revokeObjectURL(videoUrl);
  videoUrl = URL.createObjectURL(loadedFile);
  videoEl.src = videoUrl;
  setStatus("Video loaded. Ready to analyze.");
  setProgress(0);
  switchTab("preview");
}
async function analyzeVideo(){
  if(!loadedFile){
    if(!videoInput.files || !videoInput.files[0]){
      showToast("Choose a video first");
      return;
    }
    loadVideo();
  }
  await new Promise(resolve => {
    if(videoEl.readyState >= 1) resolve();
    else videoEl.onloadedmetadata = () => resolve();
  });

  analyzeBtn.disabled = true;
  loadBtn.disabled = true;
  setStatus("Preparing analysis...");
  setProgress(0);
  switchTab("preview");

  try{
    const partial = await analyzeVideoLocally({
      videoEl,
      canvasEl: previewCanvas,
      exercise: selectedLift,
      mode: selectedMode,
      onStatus: setStatus,
      onProgress: setProgress
    });

    const result = {
      id: Date.now().toString(36),
      createdAt: new Date().toISOString(),
      exercise: selectedLift,
      exerciseName: LIFTS[selectedLift].name,
      bestAngle: LIFTS[selectedLift].bestAngle,
      mode: selectedMode,
      ...partial
    };

    latestAnalysis = result;
    renderResult(result);
    await saveResult(result);
    await renderHistory(openSavedResult);
    switchTab("results");
    setStatus(`Analysis complete. ${result.confidence.quality === "weak" ? "Overall form analysis is ready." : `${result.repCount} reps detected with ${result.confidence.label.toLowerCase()} confidence.`}`);
    setProgress(100);
    showToast("Analysis complete");
  }catch(err){
    console.error(err);
    setStatus("Analysis failed. Try Fast mode first.");
    showToast("Analysis failed");
  }finally{
    analyzeBtn.disabled = false;
    loadBtn.disabled = false;
  }
}

function openSavedResult(item){
  renderResult(item);
  switchTab("results");
}


function buildFeedbackBody(){
  const name = document.getElementById("fbName")?.value?.trim() || "";
  const email = document.getElementById("fbEmail")?.value?.trim() || "";
  const lift = document.getElementById("fbLift")?.value || "";
  const issueType = document.getElementById("fbIssueType")?.value || "";
  const message = document.getElementById("fbMessage")?.value?.trim() || "";

  const lines = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Lift: ${lift}`,
    `Type: ${issueType}`,
    "",
    "Message:",
    message || ""
  ];

  if(latestAnalysis){
    lines.push(
      "",
      "Latest UrCoach analysis:",
      `Exercise: ${latestAnalysis.exerciseName || ""}`,
      `Mode: ${latestAnalysis.mode || ""}`,
      `Confidence: ${latestAnalysis.confidence?.label || ""} (${latestAnalysis.confidence?.confidence ?? ""})`,
      `Rep count shown: ${latestAnalysis.confidence?.quality === "weak" ? "Hidden due to camera angle" : (latestAnalysis.repCount ?? "")}`,
      `Overall score: ${latestAnalysis.overallScore ?? ""}`
    );
  }

  return lines.join("\n");
}

function sendFeedbackEmail(){
  const subjectBase = document.getElementById("fbIssueType")?.value || "UrCoach feedback";
  const subject = `UrCoach - ${subjectBase}`;
  const body = buildFeedbackBody();
  const href = `mailto:aravindkjay28@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = href;
}

function prefillFeedbackFromLatest(){
  if(!latestAnalysis){
    showToast("No analysis available yet");
    return;
  }
  const liftMap = { Squat:"Squat", Bench:"Bench", "Bench Press":"Bench", Deadlift:"Deadlift", OHP:"OHP", Row:"Row", "Barbell Row":"Row" };
  const lift = liftMap[latestAnalysis.exerciseName] || "";
  const msg = [
    "Expected result:",
    "",
    "Actual result:",
    `${latestAnalysis.confidence?.quality === "weak" ? "Rep count hidden due to camera angle" : `Rep count shown: ${latestAnalysis.repCount}`}`,
    `Overall score: ${latestAnalysis.overallScore}`,
    "",
    "Notes:",
    ...(latestAnalysis.notes || [])
  ].join("\n");
  const liftEl = document.getElementById("fbLift");
  const typeEl = document.getElementById("fbIssueType");
  const msgEl = document.getElementById("fbMessage");
  if(liftEl) liftEl.value = lift;
  if(typeEl) typeEl.value = "General feedback";
  if(msgEl) msgEl.value = msg;
  showToast("Filled with latest analysis");
}

videoInput.addEventListener("change", updateSelectedFileName);
loadBtn.addEventListener("click", loadVideo);
analyzeBtn.addEventListener("click", analyzeVideo);
clearHistoryBtn.addEventListener("click", async () => {
  await clearResults();
  await renderHistory(openSavedResult);
  showToast("History cleared");
});

document.getElementById("sendFeedbackBtn")?.addEventListener("click", sendFeedbackEmail);
document.getElementById("prefillFeedbackBtn")?.addEventListener("click", prefillFeedbackFromLatest);

renderLiftButtons();
renderModeButtons();
renderHistory(openSavedResult);
