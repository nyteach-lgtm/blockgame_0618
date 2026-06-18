const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const levelEl = document.getElementById("level");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const startButton = document.getElementById("startButton");
const pauseButton = document.getElementById("pauseButton");
const restartButton = document.getElementById("restartButton");

const state = {
  running: false,
  paused: false,
  score: 0,
  lives: 3,
  level: 1,
  inputX: null,
  keys: new Set(),
  last: 0,
};

const paddle = {
  width: 150,
  height: 18,
  x: canvas.width / 2 - 75,
  y: canvas.height - 50,
  speed: 720,
};

const ball = {
  radius: 11,
  x: canvas.width / 2,
  y: canvas.height - 78,
  dx: 280,
  dy: -360,
  speed: 460,
};

let bricks = [];

function buildBricks() {
  const rows = Math.min(5 + state.level, 9);
  const cols = 10;
  const gap = 10;
  const top = 78;
  const side = 48;
  const width = (canvas.width - side * 2 - gap * (cols - 1)) / cols;
  const height = 28;
  bricks = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      bricks.push({
        x: side + col * (width + gap),
        y: top + row * (height + gap),
        width,
        height,
        hp: row < 2 && state.level > 2 ? 2 : 1,
        hue: (row * 36 + col * 8 + state.level * 22) % 360,
      });
    }
  }
}

function resetBall() {
  paddle.x = canvas.width / 2 - paddle.width / 2;
  ball.x = canvas.width / 2;
  ball.y = paddle.y - ball.radius - 4;
  const dir = Math.random() > 0.5 ? 1 : -1;
  ball.dx = dir * (230 + state.level * 18);
  ball.dy = -(340 + state.level * 22);
}

function startGame() {
  state.running = true;
  state.paused = false;
  overlay.hidden = true;
  state.last = performance.now();
  requestAnimationFrame(loop);
}

function newGame() {
  state.score = 0;
  state.lives = 3;
  state.level = 1;
  buildBricks();
  resetBall();
  updateHud();
  startGame();
}

function nextLevel() {
  state.level += 1;
  buildBricks();
  resetBall();
  updateHud();
  showOverlay("레벨 클리어", "다음 레벨은 공이 더 빨라집니다. 준비되면 계속하세요.", "계속");
}

function showOverlay(title, text, buttonText) {
  state.running = false;
  state.paused = false;
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  startButton.textContent = buttonText;
  overlay.hidden = false;
}

function updateHud() {
  scoreEl.textContent = state.score;
  livesEl.textContent = state.lives;
  levelEl.textContent = state.level;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function movePaddle(dt) {
  if (state.inputX !== null) {
    paddle.x = clamp(state.inputX - paddle.width / 2, 0, canvas.width - paddle.width);
    return;
  }

  let direction = 0;
  if (state.keys.has("ArrowLeft") || state.keys.has("a")) direction -= 1;
  if (state.keys.has("ArrowRight") || state.keys.has("d")) direction += 1;
  paddle.x = clamp(paddle.x + direction * paddle.speed * dt, 0, canvas.width - paddle.width);
}

function update(dt) {
  movePaddle(dt);

  ball.x += ball.dx * dt;
  ball.y += ball.dy * dt;

  if (ball.x < ball.radius) {
    ball.x = ball.radius;
    ball.dx *= -1;
  }

  if (ball.x > canvas.width - ball.radius) {
    ball.x = canvas.width - ball.radius;
    ball.dx *= -1;
  }

  if (ball.y < ball.radius) {
    ball.y = ball.radius;
    ball.dy *= -1;
  }

  if (
    ball.y + ball.radius > paddle.y &&
    ball.y - ball.radius < paddle.y + paddle.height &&
    ball.x > paddle.x &&
    ball.x < paddle.x + paddle.width &&
    ball.dy > 0
  ) {
    const hit = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
    const speed = Math.hypot(ball.dx, ball.dy) + 10;
    ball.dx = hit * speed * 0.78;
    ball.dy = -Math.sqrt(Math.max(speed * speed - ball.dx * ball.dx, 0));
    ball.y = paddle.y - ball.radius - 1;
  }

  for (const brick of bricks) {
    if (
      brick.hp > 0 &&
      ball.x + ball.radius > brick.x &&
      ball.x - ball.radius < brick.x + brick.width &&
      ball.y + ball.radius > brick.y &&
      ball.y - ball.radius < brick.y + brick.height
    ) {
      brick.hp -= 1;
      state.score += brick.hp === 0 ? 100 : 25;
      ball.dy *= -1;
      updateHud();
      break;
    }
  }

  if (bricks.every((brick) => brick.hp === 0)) {
    nextLevel();
  }

  if (ball.y > canvas.height + ball.radius) {
    state.lives -= 1;
    updateHud();
    if (state.lives <= 0) {
      showOverlay("게임 오버", `최종 점수는 ${state.score}점입니다. 다시 도전해 보세요.`, "다시 플레이");
    } else {
      resetBall();
      showOverlay("공을 놓쳤어요", "남은 목숨으로 다시 시작합니다.", "계속");
    }
  }
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#10141b");
  gradient.addColorStop(0.52, "#17111b");
  gradient.addColorStop(1, "#111813");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
}

function roundRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.closePath();
}

function drawBricks() {
  for (const brick of bricks) {
    if (brick.hp <= 0) continue;
    const gradient = ctx.createLinearGradient(brick.x, brick.y, brick.x + brick.width, brick.y + brick.height);
    gradient.addColorStop(0, `hsl(${brick.hue} 86% 64%)`);
    gradient.addColorStop(1, `hsl(${(brick.hue + 32) % 360} 82% 48%)`);
    ctx.fillStyle = gradient;
    roundRect(brick.x, brick.y, brick.width, brick.height, 7);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    roundRect(brick.x + 6, brick.y + 5, brick.width - 12, 5, 4);
    ctx.fill();
    if (brick.hp > 1) {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      roundRect(brick.x + brick.width - 20, brick.y + 8, 10, 10, 5);
      ctx.fill();
    }
  }
}

function drawPaddle() {
  const gradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x + paddle.width, paddle.y);
  gradient.addColorStop(0, "#24c6a8");
  gradient.addColorStop(1, "#f5b84b");
  ctx.fillStyle = gradient;
  roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 9);
  ctx.fill();
}

function drawBall() {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = "#f7f0e8";
  ctx.shadowColor = "rgba(36, 198, 168, 0.65)";
  ctx.shadowBlur = 18;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function draw() {
  drawBackground();
  drawBricks();
  drawPaddle();
  drawBall();
}

function loop(now) {
  if (!state.running || state.paused) return;
  const dt = Math.min((now - state.last) / 1000, 0.024);
  state.last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function canvasXFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  return ((clientX - rect.left) / rect.width) * canvas.width;
}

canvas.addEventListener("mousemove", (event) => {
  state.inputX = canvasXFromEvent(event);
});

canvas.addEventListener("mouseleave", () => {
  state.inputX = null;
});

canvas.addEventListener("touchstart", (event) => {
  state.inputX = canvasXFromEvent(event);
  event.preventDefault();
}, { passive: false });

canvas.addEventListener("touchmove", (event) => {
  state.inputX = canvasXFromEvent(event);
  event.preventDefault();
}, { passive: false });

window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "a", "d"].includes(event.key)) {
    state.keys.add(event.key);
    state.inputX = null;
  }
  if (event.key === " " && overlay.hidden) {
    event.preventDefault();
    pauseButton.click();
  }
});

window.addEventListener("keyup", (event) => {
  state.keys.delete(event.key);
});

startButton.addEventListener("click", () => {
  if (state.lives <= 0 || bricks.length === 0) {
    newGame();
  } else {
    startGame();
  }
});

pauseButton.addEventListener("click", () => {
  if (!overlay.hidden) return;
  state.paused = !state.paused;
  pauseButton.textContent = state.paused ? "계속" : "일시정지";
  if (!state.paused) {
    state.last = performance.now();
    requestAnimationFrame(loop);
  }
});

restartButton.addEventListener("click", newGame);

buildBricks();
resetBall();
updateHud();
draw();
