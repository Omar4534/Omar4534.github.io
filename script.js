// ----------------------
// Firebase Setup
// ----------------------
const firebaseConfig = {
  apiKey: "AIzaSyAFcv_wCPzLXI4cXOwdqOyMM6k0kUrFUJo",
  authDomain: "i-dont-know-cefc9.firebaseapp.com",
  databaseURL: "https://i-dont-know-cefc9-default-rtdb.firebaseio.com/",
  projectId: "i-dont-know-cefc9",
  storageBucket: "i-dont-know-cefc9.appspot.com",
  messagingSenderId: "207625985266",
  appId: "1:207625985266:web:15efe8f966a14b2943446b"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ----------------------
// Game Variables
// ----------------------
let name = "";
let isDrawer = false;
let currentPrompt = null;
const prompts = ["Cat", "House", "Tree", "Star", "Clock", "Dog", "Car", "Boat", "Phone", "Flower"];

let timeLeft = 300;
let timerInterval = null;

// Drawing tools
let brushColor = "#ffffff";
let brushSize = 4;
let erasing = false;

// ----------------------
// DOM Elements
// ----------------------
const login = document.getElementById("login");
const game = document.getElementById("game");
const roleText = document.getElementById("roleText");
const promptText = document.getElementById("promptText");
const messages = document.getElementById("messages");

// ----------------------
// Join Game
// ----------------------
document.getElementById("joinBtn").onclick = () => {
  name = document.getElementById("nameInput").value.trim();
  if (!name) return;

  login.style.display = "none";
  game.style.display = "block";

  startRound();
};

// ----------------------
// Start a new round
// ----------------------
function startRound() {
  db.ref("game/drawer").once("value", snap => {
    const drawer = snap.val();

    db.ref("game/timer").set(300);

    if (!drawer) {
      db.ref("game/drawer").set(name);
      setupDrawer();
    } else if (drawer === name) {
      setupDrawer();
    } else {
      setupGuesser();
    }
  });
}

// ----------------------
// Drawer Setup
// ----------------------
function setupDrawer() {
  isDrawer = true;
  currentPrompt = prompts[Math.floor(Math.random() * prompts.length)];

  roleText.textContent = "You are drawing!";
  promptText.textContent = "Prompt: " + currentPrompt;

  db.ref("game/prompt").set(currentPrompt);
  db.ref("game/guesses").remove();
  db.ref("game/canvas").remove();

  startTimer();
}

// ----------------------
// Guesser Setup
// ----------------------
function setupGuesser() {
  isDrawer = false;

  roleText.textContent = "Guess the drawing!";
  promptText.textContent = "";

  db.ref("game/prompt").on("value", snap => {
    currentPrompt = snap.val();
  });
}

// ----------------------
// Timer
// ----------------------
function startTimer() {
  clearInterval(timerInterval);
  timeLeft = 300;

  timerInterval = setInterval(() => {
    timeLeft--;
    db.ref("game/timer").set(timeLeft);

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      db.ref("game/winner").set("No one");
    }
  }, 1000);
}

db.ref("game/timer").on("value", snap => {
  const t = snap.val();
  if (t == null) return;

  roleText.innerHTML =
    (isDrawer ? "You are drawing" : "Guess the drawing") +
    ` — Time left: ${t}s`;
});

// ----------------------
// Drawing Tools
// ----------------------
document.getElementById("colorPicker").oninput = e => {
  brushColor = e.target.value;
  erasing = false;
};

document.getElementById("brushSize").oninput = e => {
  brushSize = parseInt(e.target.value);
};

document.getElementById("eraserBtn").onclick = () => {
  erasing = true;
};

// ----------------------
// Canvas Drawing Sync
// ----------------------
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let drawing = false;

if (canvas) {
  canvas.addEventListener("mousedown", () => {
    if (!isDrawer) return;
    drawing = true;
  });

  canvas.addEventListener("mouseup", () => drawing = false);

  canvas.addEventListener("mousemove", e => {
    if (!drawing || !isDrawer) return;

    const x = e.offsetX;
    const y = e.offsetY;

    db.ref("game/canvas").push({
      x,
      y,
      color: erasing ? "#1f2937" : brushColor,
      size: erasing ? 20 : brushSize
    });
  });
}

// Render strokes
db.ref("game/canvas").on("child_added", snap => {
  const { x, y, color, size } = snap.val();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.fill();
});

// ----------------------
// Guessing
// ----------------------
document.getElementById("guessBtn").onclick = () => {
  const guess = document.getElementById("guessInput").value.trim();
  if (!guess) return;

  db.ref("game/guesses").push({ name, guess });

  if (guess.toLowerCase() === currentPrompt.toLowerCase()) {
    db.ref("game/winner").set(name);
  }
};

db.ref("game/guesses").on("child_added", snap => {
  const { name, guess } = snap.val();
  messages.innerHTML += `<div><b>${name}:</b> ${guess}</div>`;
});

// ----------------------
// Winner
// ----------------------
db.ref("game/winner").on("value", snap => {
  const winner = snap.val();
  if (!winner) return;

  messages.innerHTML += `<div style="color:#4ade80;"><b>${winner} guessed correctly!</b></div>`;

  setTimeout(() => {
    db.ref("game").remove();
    location.reload();
  }, 3000);
});
