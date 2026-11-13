const KEYWORDS = [
  ["cuda", 18],
  ["gpu", 14],
  ["h100", 16],
  ["blackwell", 16],
  ["transformer", 12],
  ["ai", 8],
  ["jensen", 20],
  ["ceo", 10],
  ["leadership", 7],
  ["python", 6],
  ["silicon", 9],
  ["inference", 11],
  ["datacenter", 10],
  ["green", 8],
  ["rtx", 9],
  ["omniverse", 12],
  ["driver", 5],
  ["board", 6],
];

const SEED = [
  {
    id: "seed-jensen-clone",
    name: "A leather jacket",
    title: "Wardrobe continuity",
    pitch: "I am already the brand.",
    score: 99,
    fictional: true,
  },
  {
    id: "seed-gpu",
    name: "RTX 6090 (unreleased)",
    title: "Hardware that does not exist",
    pitch: "Ship the silicon, skip the meetings.",
    score: 91,
    fictional: true,
  },
  {
    id: "seed-intern",
    name: "Intern who touched CUDA once",
    title: "Acting CEO of the intern Slack",
    pitch: "I asked Copilot and it said yes.",
    score: 74,
    fictional: true,
  },
  {
    id: "seed-dog",
    name: "A golden retriever named Tensor",
    title: "Chief Happiness Officer",
    pitch: "I will eat the quarterly earnings.",
    score: 66,
    fictional: true,
  },
  {
    id: "seed-bot",
    name: "A large language model",
    title: "Next-token predictor",
    pitch: "I hallucinated a 40% margin.",
    score: 58,
    fictional: true,
  },
];

function scrollToBoard() {
  document.getElementById("leaderboard").scrollIntoView({ behavior: "smooth", block: "start" });
}

const applyBtn = document.getElementById("apply-btn");
const viewBoardBtn = document.getElementById("view-board-btn");
const applyDialog = document.getElementById("apply-dialog");
const resultDialog = document.getElementById("result-dialog");
const form = document.getElementById("apply-form");
const cancelBtn = document.getElementById("cancel-btn");
const resultClose = document.getElementById("result-close");
const resumeInput = document.getElementById("resume");
const fileStatus = document.getElementById("file-status");
const ranksEl = document.getElementById("ranks");
const statCount = document.getElementById("stat-count");
const statYou = document.getElementById("stat-you");

/** In-memory only. Never sent anywhere. */
const localApplicants = [];
let youId = null;
let resumeText = "";

applyBtn.addEventListener("click", () => {
  applyDialog.showModal();
});

viewBoardBtn.addEventListener("click", scrollToBoard);

cancelBtn.addEventListener("click", () => {
  applyDialog.close();
});

resultClose.addEventListener("click", () => {
  resultDialog.close();
  scrollToBoard();
});

resumeInput.addEventListener("change", async () => {
  const file = resumeInput.files?.[0];
  resumeText = "";
  if (!file) {
    fileStatus.textContent = "Not attached — we will score your vibes instead.";
    return;
  }
  fileStatus.textContent = `Reading locally: ${file.name} (${Math.ceil(file.size / 1024)} KB)`;
  try {
    resumeText = await readResumeLocally(file);
    fileStatus.textContent = `Parsed in-browser only. ${resumeText.length} characters. Nothing uploaded.`;
  } catch (err) {
    resumeText = "";
    fileStatus.textContent = "Could not parse that file. Scoring the form fields only.";
    console.warn(err);
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.getElementById("name").value.trim();
  const title = document.getElementById("title").value.trim();
  const pitch = document.getElementById("pitch").value.trim();
  const blob = `${name} ${title} ${pitch} ${resumeText}`.toLowerCase();
  const score = scoreApplication(blob, Boolean(resumeText));

  youId = crypto.randomUUID();
  localApplicants.length = 0;
  localApplicants.push({
    id: youId,
    name,
    title,
    pitch,
    score,
    fictional: false,
  });

  resumeText = "";
  form.reset();
  fileStatus.textContent = "Not attached — we will score your vibes instead.";
  applyDialog.close();

  document.getElementById("result-score").textContent = String(score);
  document.getElementById("result-blurb").textContent = blurbFor(score);
  resultDialog.showModal();
  renderBoard();
});

function scoreApplication(text, hasResume) {
  let score = 31 + (hasResume ? 8 : 0);
  for (const [word, pts] of KEYWORDS) {
    if (text.includes(word)) score += pts;
  }
  score += Math.min(12, Math.floor(text.length / 400));
  return Math.max(12, Math.min(97, score));
}

function blurbFor(score) {
  if (score >= 85) return "The fictional board is sweating. Still a joke. Do not update LinkedIn.";
  if (score >= 70) return "Strong CUDA energy. Weak succession-plan energy. You are on the meme list.";
  if (score >= 50) return "Respectable. The jacket does not fit yet, but the leaderboard noticed you.";
  return "The algorithm recommends more green. Also more jokes. You are still ranked.";
}

async function readResumeLocally(file) {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return readPdf(file);
  }
  return file.text();
}

async function readPdf(file) {
  const pdfjs = await loadPdfJs();
  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages = [];
  const max = Math.min(pdf.numPages, 8);
  for (let i = 1; i <= max; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(" "));
  }
  return pages.join("\n");
}

async function loadPdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  const mod = await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/build/pdf.min.mjs");
  mod.GlobalWorkerOptions.workerSrc =
    "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs";
  window.pdfjsLib = mod;
  return mod;
}

function allRows() {
  return [...SEED, ...localApplicants].sort((a, b) => b.score - a.score);
}

function renderBoard() {
  const rows = allRows();
  ranksEl.innerHTML = "";
  let yourRank = "—";
  rows.forEach((row, index) => {
    const li = document.createElement("li");
    if (row.id === youId) {
      li.classList.add("you");
      yourRank = `#${index + 1}`;
    }
    const tag = row.fictional ? "fictional applicant" : "you · this browser only";
    li.innerHTML = `
      <span class="place">#${index + 1}</span>
      <div class="who">
        <strong>${escapeHtml(row.name)}</strong>
        <span>${escapeHtml(row.title)} · ${escapeHtml(tag)}</span>
        <span>${escapeHtml(row.pitch)}</span>
      </div>
      <span class="points">${row.score} pts</span>
    `;
    ranksEl.appendChild(li);
  });
  statCount.textContent = String(localApplicants.length);
  statYou.textContent = yourRank;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

renderBoard();
