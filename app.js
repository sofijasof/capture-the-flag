// ---------- GAME STATE ----------

// Each QR code "belongs" to a team based on its ID.
// You do NOT need to change existing QR codes as long as their text
// matches these IDs (A_FLAG_01, B_FLAG_01, etc.)
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

// ALL flags, regardless of who owns them
const ALL_FLAGS = {
  ...TEAM_FLAGS.A,
  ...TEAM_FLAGS.B,
};

let timerInterval = null;
let timeLeftSec = 0;
let collectedFlagIds = new Set();

// Team / active flags
let currentTeam = null;

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

// Which team owns this flag, based on its prefix?
function getOwnerTeam(flagId) {
  if (flagId.startsWith("A_")) return "A";
  if (flagId.startsWith("B_")) return "B";
  return null;
}

// options: { bottom: number, duration: number }
function flashFlagMessage(text, options = {}) {
  const bottom = options.bottom ?? 120;      // px from bottom
  const duration = options.duration ?? 1500; // ms

  const div = document.createElement("div");
  div.textContent = text;
  div.style.position = "absolute";
  div.style.bottom = `${bottom}px`;
  div.style.left = "50%";
  div.style.transform = "translateX(-50%)";
  div.style.padding = "10px 18px";
  div.style.borderRadius = "999px";
  div.style.background = "rgba(0,0,0,0.7)";
  div.style.color = "#fff";
  div.style.fontSize = "14px";
  div.style.zIndex = "30";

  document.querySelector(".app").appendChild(div);

  setTimeout(() => div.remove(), duration);
}

function handleFlagScanned(flagId) {
  if (!currentTeam) {
    console.log("Scan ignored: game not started yet.");
    return;
  }

  const flagLabel = ALL_FLAGS[flagId];

  // QR code not known at all
  if (!flagLabel) {
    console.log("Unknown QR code:", flagId);
    flashFlagMessage("Unknown flag");
    return;
  }

  const ownerTeam = getOwnerTeam(flagId);

  // ❌ You are scanning your OWN team's flag: show warning, no points
  if (ownerTeam === currentTeam) {
    flashFlagMessage(
      "This is your own team's flag – you have to steal the other team's flags!",
      { bottom: 140, duration: 2200 }
    );
    return;
  }

  const alreadyCollected = collectedFlagIds.has(flagId);

  // First time: add to set + increase score
  if (!alreadyCollected) {
    collectedFlagIds.add(flagId);
    updateFlagsUI();

    // main message: stolen flag
    let msg;
    if (ownerTeam) {
      msg = `You stole Team ${ownerTeam}'s flag!`;
    } else {
      msg = "Flag captured!";
    }

    // show main "stolen" message higher + a bit longer
    flashFlagMessage(msg, { bottom: 140, duration: 2000 });
  } else {
    // Re-scan: ONLY show "already scanned", lower + shorter
    flashFlagMessage("You scanned this flag already", {
      bottom: 80,
      duration: 1200,
    });
  }
}

// ---------- START / END / RESET ----------

function startGame(minutes, team) {
  currentTeam = team;

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
