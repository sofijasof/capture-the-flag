// ---------- GAME STATE ----------

// Known flags in your building (you can add more)
const FLAGS = {
  LIBRARY_01: "Library entrance",
  LIBRARY_02: "Silent study room",
  CAFETERIA_01: "Cafeteria",
  STAIRS_01: "Main stairwell",
};

// Timing + score
let timerInterval = null;
let timeLeftSec = 0;
let collectedFlagIds = new Set(); // we use a Set to avoid duplicates

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

const playAgainBlue = document.getElementById("playAgainBlue");
const playAgainWhite = document.getElementById("playAgainWhite");

const cameraButton = document.querySelector(".camera-button"); // optional extra action

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
  if (html5QrCode) return; // already created

  const qrRegionId = "qr-reader";
  html5QrCode = new Html5Qrcode(qrRegionId);
}

// Start scanning when game starts
function startScanner() {
  if (!html5QrCode) initScanner();
  if (scannerRunning) return;

  const config = { fps: 10, qrbox: 250 };

  html5QrCode
    .start(
      { facingMode: "environment" }, // back camera if available
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
      // optionally clear the view:
      // html5QrCode.clear();
    })
    .catch((err) => {
      console.warn("Error stopping QR scanner", err);
    });
}

// Called whenever a QR code is successfully decoded
function onScanSuccess(decodedText, decodedResult) {
  const flagId = decodedText.trim();
  handleFlagScanned(flagId);
}

// We can ignore scan failures (they happen constantly while searching)
function onScanFailure(error) {
  // console.log("Scan failure:", error);
}

// ---------- GAME LOGIC ----------

function handleFlagScanned(flagId) {
  // Only count known flag IDs (optional – you can remove this check)
  if (!FLAGS[flagId]) {
    console.log("Unknown QR code:", flagId);
    return;
  }

  // Avoid counting the same flag twice
  if (collectedFlagIds.has(flagId)) {
    // If you want feedback you can alert or show a toast
    console.log("Flag already collected:", flagId);
    return;
  }

  collectedFlagIds.add(flagId);
  updateFlagsUI();

  // Optional small feedback
  flashFlagMessage(FLAGS[flagId]);
}

function flashFlagMessage(name) {
  // Simple temporary message overlay
  const div = document.createElement("div");
  div.textContent = `Flag collected: ${name}`;
  div.style.position = "absolute";
  div.style.bottom = "120px";
  div.style.left = "50%";
  div.style.transform = "translateX(-50%)";
  div.style.padding = "10px 18px";
  div.style.borderRadius = "999px";
  div.style.background = "rgba(0,0,0,0.7)";
  div.style.color = "#fff";
  div.style.fontSize = "14px";
  div.style.zIndex = "20";

  document.querySelector(".app").appendChild(div);

  setTimeout(() => div.remove(), 1500);
}

// ---------- START / END / RESET ----------

function startGame(minutes) {
  // Reset state
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
}

// ---------- EVENT LISTENERS ----------

// Start button
startButton.addEventListener("click", () => {
  const minutes = parseInt(gameLengthSelect.value, 10);

  if (isNaN(minutes)) {
    alert("Please pick a game length first.");
    return;
  }

  startGame(minutes);
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

// Optional: camera button could pause/resume scanning or just be decorative
cameraButton.addEventListener("click", () => {
  if (scannerRunning) {
    stopScanner();
  } else {
    startScanner();
  }
});
