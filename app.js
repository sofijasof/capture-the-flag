// ---------- GAME STATE ----------

const TEAM_FLAGS = {
  A: {
    A_FLAG_01: "Flag 1 (Team A)",
    A_FLAG_02: "Flag 2 (Team A)",
    A_FLAG_03: "Flag 3 (Team A)",
    A_FLAG_04: "Flag 4 (Team A)",
    A_FLAG_05: "Flag 5 (Team A)",
  },
  B: {
    B_FLAG_01: "Flag 1 (Team B)",
    B_FLAG_02: "Flag 2 (Team B)",
    B_FLAG_03: "Flag 3 (Team B)",
    B_FLAG_04: "Flag 4 (Team B)",
    B_FLAG_05: "Flag 5 (Team B)",
  },
};

const ALL_FLAGS = { ...TEAM_FLAGS.A, ...TEAM_FLAGS.B };

let timerInterval = null;
let timeLeftSec = 0;
let collectedFlagIds = new Set();

let currentTeam = null;
let enemyTeam = null;
let enemyTotal = 5;

let html5QrCode = null;
let scannerRunning = false;

// prevents rapid-fire duplicate events from the scanner
let scanLockUntil = 0;

// toast state (no overlap)
let toastTimeout = null;

// ---------- DOM ----------

const screens = {
  start: document.getElementById("screen-start"),
  game: document.getElementById("screen-game"),
  resultsBlue: document.getElementById("screen-results-blue"),
};

const timerDisplay = document.getElementById("timerDisplay");
const flagCountEl = document.getElementById("flagCount");
const finalFlagsBlue = document.getElementById("finalFlagsBlue");

const finalTime = document.getElementById("finalTime");
const resultsTitle = document.getElementById("resultsTitle");
const resultsCaption = document.getElementById("resultsCaption");

const startButton = document.getElementById("startButton");
const gameLengthSelect = document.getElementById("gameLength");
const teamSelect = document.getElementById("teamSelect");

const playAgainBlue = document.getElementById("playAgainBlue");

const helpButton = document.getElementById("helpButton");
const helpOverlay = document.getElementById("helpOverlay");
const helpClose = document.getElementById("helpClose");

const toastArea = document.getElementById("toastArea");

// ---------- SCREENS ----------

function showScreen(name) {
  Object.values(screens).forEach((el) => el.classList.remove("screen--active"));
  screens[name].classList.add("screen--active");
}

// ---------- UI ----------

function formatTime(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function updateTimer() {
  timerDisplay.textContent = formatTime(timeLeftSec);
}

function updateFlagsUI() {
  const count = collectedFlagIds.size;
  flagCountEl.textContent = `${count}/${enemyTotal}`;
  finalFlagsBlue.textContent = count;
}

// ---------- TOAST (NO OVERLAP, OUTSIDE CAMERA) ----------

function showToast(text, duration = 1800) {
  // clear previous timeout and replace toast (prevents overlap)
  if (toastTimeout) clearTimeout(toastTimeout);
  toastArea.innerHTML = "";

  const div = document.createElement("div");
  div.className = "toast";
  div.textContent = text;
  toastArea.appendChild(div);

  toastTimeout = setTimeout(() => {
    toastArea.innerHTML = "";
  }, duration);
}

// ---------- QR ----------

function initScanner() {
  if (html5QrCode) return;
  html5QrCode = new Html5Qrcode("qr-reader");
}

function startScanner() {
  if (!html5QrCode) initScanner();
  if (scannerRunning) return;

  const config = {
    fps: 10,
    qrbox: (vw, vh) => {
      const size = Math.floor(Math.min(vw, vh) * 0.72);
      return { width: size, height: size }; // square
    },
  };

  html5QrCode
    .start({ facingMode: "environment" }, config, onScanSuccess, () => {})
    .then(() => {
      scannerRunning = true;
    })
    .catch((err) => {
      console.error(err);
      alert("Could not start camera. Check permissions and try again.");
    });
}

function stopScanner() {
  if (!html5QrCode || !scannerRunning) return;

  html5QrCode
    .stop()
    .then(() => {
      scannerRunning = false;
    })
    .catch(() => {});
}

function onScanSuccess(decodedText) {
  const now = Date.now();

  // lock out spam (scanner often fires multiple times on same QR)
  if (now < scanLockUntil) return;
  scanLockUntil = now + 900;

  handleFlagScanned(decodedText.trim());
}

// ---------- GAME LOGIC ----------

function getOwnerTeam(flagId) {
  if (flagId.startsWith("A_")) return "A";
  if (flagId.startsWith("B_")) return "B";
  return null;
}

function hasCapturedAllEnemyFlags() {
  const enemyFlags = Object.keys(TEAM_FLAGS[enemyTeam]);
  return enemyFlags.every((id) => collectedFlagIds.has(id));
}

function handleFlagScanned(flagId) {
  if (!currentTeam) return;

  // unknown QR
  if (!ALL_FLAGS[flagId]) {
    showToast("Unknown flag", 1400);
    return;
  }

  const ownerTeam = getOwnerTeam(flagId);

  // must steal enemy flags ONLY
  if (ownerTeam === currentTeam) {
    showToast("This is your team’s flag — steal the enemy flags!", 2200);
    return;
  }

  // already scanned
  if (collectedFlagIds.has(flagId)) {
    showToast("You scanned this flag already", 1400);
    return;
  }

  // steal success
  collectedFlagIds.add(flagId);
  updateFlagsUI();

  showToast(`You stole Team ${ownerTeam}'s flag!`, 2000);

  // win early
  if (hasCapturedAllEnemyFlags()) {
    // show win toast briefly then finish
    showToast("🏆 You captured all enemy flags!", 2200);
    setTimeout(() => finishGame("win"), 900);
  }
}

// ---------- START / END ----------

function finishGame(mode) {
  stopScanner();
  if (timerInterval) clearInterval(timerInterval);

  finalTime.textContent = formatTime(timeLeftSec);

  if (mode === "win") {
    resultsTitle.textContent = "YOU CAPTURED ALL FLAGS";
    resultsCaption.textContent = "enemy flags stolen";
  } else {
    resultsTitle.textContent = "TIME’S UP";
    resultsCaption.textContent = "enemy flags stolen";
  }

  showScreen("resultsBlue");
  updateFlagsUI();
}

function startGame(minutes, team) {
  currentTeam = team;
  enemyTeam = team === "A" ? "B" : "A";
  enemyTotal = Object.keys(TEAM_FLAGS[enemyTeam]).length;

  const teamBadge = document.getElementById("teamBadge");
  teamBadge.textContent = "TEAM " + team;
  teamBadge.classList.remove("team-badge--A", "team-badge--B");
  teamBadge.classList.add(team === "A" ? "team-badge--A" : "team-badge--B");

  collectedFlagIds = new Set();
  updateFlagsUI();

  timeLeftSec = minutes * 60;
  updateTimer();

  toastArea.innerHTML = ""; // clear messages

  showScreen("game");
  startScanner();

  timerInterval = setInterval(() => {
    timeLeftSec--;
    updateTimer();

    if (timeLeftSec <= 0) {
      finishGame("time");
    }
  }, 1000);
}

function resetGame() {
  if (timerInterval) clearInterval(timerInterval);
  stopScanner();

  timeLeftSec = 0;
  collectedFlagIds = new Set();
  updateFlagsUI();

  gameLengthSelect.selectedIndex = 0;
  teamSelect.selectedIndex = 0;

  currentTeam = null;
  enemyTeam = null;

  toastArea.innerHTML = "";
}

// ---------- EVENTS ----------

startButton.addEventListener("click", () => {
  const minutes = parseInt(gameLengthSelect.value, 10);
  const team = teamSelect.value;

  if (isNaN(minutes)) {
    alert("Please pick a game length first.");
    return;
  }
  if (!team) {
    alert("Please pick a team (A or B).");
    return;
  }

  startGame(minutes, team);
});

playAgainBlue.addEventListener("click", () => {
  resetGame();
  showScreen("start");
});

// Help overlay
helpButton.addEventListener("click", () => helpOverlay.classList.remove("hidden"));
helpClose.addEventListener("click", () => helpOverlay.classList.add("hidden"));
helpOverlay.addEventListener("click", (e) => {
  if (e.target === helpOverlay || e.target.classList.contains("help-backdrop")) {
    helpOverlay.classList.add("hidden");
  }
});
