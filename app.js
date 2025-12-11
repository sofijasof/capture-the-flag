// ---------- GAME STATE ----------

// Each team has its own set of flags.
// Use these texts when you generate your QR codes.
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


let timerInterval = null;
let timeLeftSec = 0;
let collectedFlagIds = new Set();

// Team / active flags
let currentTeam = null;
let activeFlags = {};

// QR scanner
let html5QrCode = null;
let scannerRunning = false;

// ---------- DOM REFERENCES ----------

const screens = {
  start: document.getElementById("screen-start"),
  game: document.getElementById("screen-game"),
  resultsBlue: document.getElementById("screen-results-blue"),
  resultsWhite: document.getElementById("screen-results-white"),
};

const timerDisplay = document.getElementById("timerDisplay");
const flagCountEl = document.getElementById("flagCount");
const finalFlagsBlue = document.getElementById("finalFlagsBlue");
const finalFlagsWhite = document.getElementById("finalFlagsWhite");

const startButton = document.getElementById("startButton");
const gameLengthSelect = document.getElementById("gameLength");
const teamSelect = document.getElementById("teamSelect");

const playAgainBlue = document.getElementById("playAgainBlue");
const playAgainWhite = document.getElementById("playAgainWhite");

const helpButton = document.getElementById("helpButton");
const helpOverlay = document.getElementById("helpOverlay");
const helpClose = document.getElementById("helpClose");

// ---------- SCREEN MANAGEMENT ----------

function showScreen(name) {
  Object.values(screens).forEach((el) => el.classList.remove("screen--active"));
  screens[name].classList.add("screen--active");
}

// ---------- TIMER & SCORE UI ----------

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
  flagCountEl.textContent = count;
  finalFlagsBlue.textContent = count;
  finalFlagsWhite.textContent = count;
}

// ---------- QR SCANNER SETUP ----------

function initScanner() {
  if (html5QrCode) return;
  const qrRegionId = "qr-reader";
  html5QrCode = new Html5Qrcode(qrRegionId);
}

function startScanner() {
  if (!html5QrCode) initScanner();
  if (scannerRunning) return;

  const config = { fps: 10, qrbox: 250 };

  html5QrCode
    .start(
      { facingMode: "environment" },
      config,
      onScanSuccess,
      onScanFailure
    )
    .then(() => {
      scannerRunning = true;
    })
    .catch((err) => {
      console.error("Error starting QR scanner", err);
      alert(
        "Could not start camera. Check permissions or try another browser."
      );
    });
}

function stopScanner() {
  if (!html5QrCode || !scannerRunning) return;

  html5QrCode
    .stop()
    .then(() => {
      scannerRunning = false;
    })
    .catch((err) => {
      console.warn("Error stopping QR scanner", err);
    });
}

function onScanSuccess(decodedText, decodedResult) {
  const flagId = decodedText.trim();
  handleFlagScanned(flagId);
}

function onScanFailure(error) {
  // ignored; happens constantly while scanning
}

// ---------- GAME LOGIC ----------

function handleFlagScanned(flagId) {
  if (!currentTeam || !activeFlags) {
    console.log("Scan ignored: game not started yet.");
    return;
  }

  // QR not part of current team's flags
  if (!activeFlags[flagId]) {
    console.log("QR code belongs to other team or unknown:", flagId);
    flashFlagMessage("This flag belongs to the other team");
    return;
  }

  if (collectedFlagIds.has(flagId)) {
    console.log("Flag already collected:", flagId);
    flashFlagMessage("You already collected this flag");
    return;
  }

  collectedFlagIds.add(flagId);
  updateFlagsUI();

  flashFlagMessage(activeFlags[flagId]);
}

function flashFlagMessage(text) {
  const div = document.createElement("div");
  div.textContent = text;
  div.style.position = "absolute";
  div.style.bottom = "120px";
  div.style.left = "50%";
  div.style.transform = "translateX(-50%)";
  div.style.padding = "10px 18px";
  div.style.borderRadius = "999px";
  div.style.background = "rgba(0,0,0,0.7)";
  div.style.color = "#fff";
  div.style.fontSize = "14px";
  div.style.zIndex = "30";

  document.querySelector(".app").appendChild(div);

  setTimeout(() => div.remove(), 1500);
}

// ---------- START / END / RESET ----------

function startGame(minutes, team) {
  currentTeam = team;
  activeFlags = TEAM_FLAGS[team] || {};

  // team badge
  const teamBadge = document.getElementById("teamBadge");
  teamBadge.textContent = "TEAM " + team;
  teamBadge.classList.remove("team-badge--A", "team-badge--B");
  if (team === "A") {
    teamBadge.classList.add("team-badge--A");
  } else {
    teamBadge.classList.add("team-badge--B");
  }

  // reset state
  collectedFlagIds = new Set();
  updateFlagsUI();

  timeLeftSec = minutes * 60;
  updateTimer();

  if (timerInterval) clearInterval(timerInterval);

  showScreen("game");
  startScanner();

  timerInterval = setInterval(() => {
    timeLeftSec--;
    updateTimer();

    if (timeLeftSec <= 0) {
      clearInterval(timerInterval);
      endGame();
    }
  }, 1000);
}

function endGame() {
  stopScanner();
  showScreen("resultsBlue");
  updateFlagsUI();
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
  activeFlags = {};
}

// ---------- EVENT LISTENERS ----------

// Start button
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

// Play again buttons
playAgainBlue.addEventListener("click", () => {
  resetGame();
  showScreen("start");
});

playAgainWhite.addEventListener("click", () => {
  resetGame();
  showScreen("start");
});

// Help overlay
helpButton.addEventListener("click", () => {
  helpOverlay.classList.remove("hidden");
});

helpClose.addEventListener("click", () => {
  helpOverlay.classList.add("hidden");
});

// Close help if user taps on dark backdrop
helpOverlay.addEventListener("click", (e) => {
  if (e.target === helpOverlay || e.target.classList.contains("help-backdrop")) {
    helpOverlay.classList.add("hidden");
  }
});
