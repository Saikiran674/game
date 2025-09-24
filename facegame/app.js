/* ==========================================
   FaceBomp Game Logic (app.js)
   ========================================== */

(() => {
  // ---- DOM references ----
  const startBtn = document.getElementById("start-btn");
  const scoreEl = document.getElementById("score");
  const timerEl = document.getElementById("timer");
  const finalMsgEl = document.getElementById("final-message");
  const holes = Array.from(document.querySelectorAll(".hole"));
  const moles = Array.from(document.querySelectorAll(".mole"));

  // ---- Game configuration ----
  const GAME_DURATION_MS = 30_000;      // 30 seconds
  const TIMER_TICK_MS = 1000;           // update timer every 1s
  const MIN_UP_MS = 600;                // how long a photo stays up (min)
  const MAX_UP_MS = 1100;               // how long a photo stays up (max)
  const MIN_GAP_MS = 250;               // gap before next pop (min)
  const MAX_GAP_MS = 700;               // gap before next pop (max)

  // ---- Game state ----
  let isPlaying = false;
  let score = 0;
  let timeLeftMs = GAME_DURATION_MS;
  let lastHoleIndex = -1;               // prevents the same hole twice in a row
  let timerIntervalId = null;
  let activeHoleIndex = -1;
  let timeouts = [];                    // keep track of all timeouts for clean stop
  let currentPopHit = false;            // prevents multiple scores on the same pop

  // ---- Utility: random integer in [min, max] inclusive ----
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  // ---- Utility: format time as mm:ss ----
  function formatTime(ms) {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const m = String(Math.floor(totalSec / 60)).padStart(2, "0");
    const s = String(totalSec % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  // ---- Reset visuals & state for a fresh game ----
  function resetGameState() {
    isPlaying = false;
    score = 0;
    timeLeftMs = GAME_DURATION_MS;
    lastHoleIndex = -1;
    activeHoleIndex = -1;
    currentPopHit = false;

    // UI
    scoreEl.textContent = "0";
    timerEl.textContent = formatTime(GAME_DURATION_MS);
    finalMsgEl.textContent = "";

    // Ensure no faces are visible and classes are clean
    holes.forEach(h => h.classList.remove("is-active"));
    moles.forEach(m => {
      m.classList.remove("hit", "show");
      m.dataset.active = "false";
    });

    // Clear any pending timers
    clearAllTimers();
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }

  // ---- Start the game ----
  function startGame() {
    if (isPlaying) return; // avoid double starts
    resetGameState();
    isPlaying = true;

    // Optional: visually disable the start button while playing
    startBtn.disabled = true;

    // Kick off countdown + popping loop
    startTimer();
    queueNextPop(randInt(200, 600)); // a tiny delay before the first pop
  }

  // ---- Stop the game ----
  function stopGame() {
    if (!isPlaying) return;
    isPlaying = false;

    // Stop timers & hide any visible mole
    clearAllTimers();
    clearInterval(timerIntervalId);
    timerIntervalId = null;

    holes.forEach(h => h.classList.remove("is-active"));
    moles.forEach(m => {
      m.classList.remove("hit", "show");
      m.dataset.active = "false";
    });

    // Re-enable start button for replay
    startBtn.disabled = false;

    // Show final scoreboard message
    showFinalMessage();
  }

  // ---- Countdown timer logic ----
  function startTimer() {
    timerEl.textContent = formatTime(timeLeftMs);

    const tick = () => {
      if (!isPlaying) return;
      timeLeftMs -= TIMER_TICK_MS;
      if (timeLeftMs <= 0) {
        timerEl.textContent = "00:00";
        stopGame();
      } else {
        timerEl.textContent = formatTime(timeLeftMs);
      }
    };

    timerIntervalId = setInterval(tick, TIMER_TICK_MS);
  }

  // ---- Schedule a mole pop after a delay ----
  function queueNextPop(delay) {
    if (!isPlaying) return;
    const id = setTimeout(popOnce, delay);
    timeouts.push(id);
  }

  // ---- Perform a single pop (one hole at a time) ----
  function popOnce() {
    if (!isPlaying) return;

    // Choose a hole index not equal to lastHoleIndex (if possible)
    let idx;
    do {
      idx = randInt(0, holes.length - 1);
    } while (holes.length > 1 && idx === lastHoleIndex);

    lastHoleIndex = idx;
    activeHoleIndex = idx;
    currentPopHit = false;

    const hole = holes[idx];
    const mole = hole.querySelector(".mole");
    const upTime = randInt(MIN_UP_MS, MAX_UP_MS);

    // Mark active & show
    hole.classList.add("is-active");
    mole.dataset.active = "true"; // quick state flag for click handler

    // After upTime, hide the mole and schedule the next pop
    const hideId = setTimeout(() => {
      // Hide this mole
      hole.classList.remove("is-active");
      mole.dataset.active = "false";
      mole.classList.remove("hit");

      activeHoleIndex = -1;

      // If still playing, schedule the next pop after a gap
      if (isPlaying) {
        const gap = randInt(MIN_GAP_MS, MAX_GAP_MS);
        queueNextPop(gap);
      }
    }, upTime);

    timeouts.push(hideId);
  }

  // ---- Click handling: award points only if the mole is up and not already hit ----
  function onMoleClick(e) {
    // Only count if game is active
    if (!isPlaying) return;

    // We attached handler to every .mole
    const mole = e.currentTarget;

    // Ignore clicks if not currently active (not popped up)
    if (mole.dataset.active !== "true") return;

    // Prevent multiple scoring on the same appearance
    if (currentPopHit) return;
    currentPopHit = true;

    // Visual feedback
    mole.classList.add("hit");

    // Update score
    score += 1;
    scoreEl.textContent = String(score);
  }

  // ---- End screen message selector ----
  function showFinalMessage() {
    const s = score;
    let line;

    if (s >= 25) {
      line = "Legendary! The faces never saw it coming. 😎";
    } else if (s >= 18) {
      line = "FaceBomp phenom! Your reflexes are on point. ⚡";
    } else if (s >= 12) {
      line = "Nice! Those faces are feeling it. 👍";
    } else if (s >= 6) {
      line = "Not bad! Warming up those click-fingers. 🖱️";
    } else if (s >= 1) {
      line = "A few bops landed—room to level up! 💪";
    } else {
      line = "Hey… the faces won that round. Practice round? 😅";
    }

    finalMsgEl.textContent = `Final Score: ${s} — ${line}`;
  }

  // ---- Cleanup helpers ----
  function clearAllTimers() {
    timeouts.forEach(id => clearTimeout(id));
    timeouts = [];
  }

  // ---- Wire up events ----
  startBtn.addEventListener("click", () => {
    // Start button acts as "restart" as well
    startGame();
  });

  // Delegate click scoring to each mole image
  moles.forEach(m => m.addEventListener("click", onMoleClick));

  // Initialize UI on load (shows 00:30 etc.)
  resetGameState();
})();