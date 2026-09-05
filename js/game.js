(() => {
'use strict';

// =========================================================
// Constants
// =========================================================
const W = 960, H = 540;
const GROUND_Y = 460;
const GRAVITY = 0.55;
const GOAL_W = 26;
const GOAL_TOP = 340;
const BALL_R = 12;
const MATCH_SECONDS = 120;

const KEYS = {
  1: { left: 'a', right: 'd', jump: 'w', kick: 'j', skill: 'k' },
  2: { left: 'arrowleft', right: 'arrowright', jump: 'arrowup', kick: 'l', skill: ';' },
};

// =========================================================
// Characters — mỗi cao thủ một tuyệt kỹ riêng
// =========================================================
const CHARACTERS = [
  {
    id: 'dragon',
    name: 'Đại Sư Huynh',
    skillName: 'Hàng Long Cước',
    desc: 'Một cước uy lực rung chuyển sân cỏ, bay thẳng như rồng xuyên mây.',
    color: '#ffcf4a', skin: '#f0c090', trail: '#ffd25c',
    special: 'shockwave',
  },
  {
    id: 'iron',
    name: 'Thiết Đầu Nhị Ca',
    skillName: 'Thiết Đầu Công',
    desc: 'Đường bóng cứng như thép, bay là là mặt đất, xuyên phá mọi cản phá.',
    color: '#b9c4cf', skin: '#e8b98a', trail: '#dfe8ef',
    special: 'iron',
  },
  {
    id: 'taichi',
    name: 'Thái Cực Tam Ca',
    skillName: 'Thái Cực Toàn Phong',
    desc: 'Âm dương giao hòa, bóng lượn hình chữ S khiến thủ môn hoa mắt.',
    color: '#7ee0c8', skin: '#e8b98a', trail: '#7ee0c8',
    special: 'taichi',
  },
  {
    id: 'fire',
    name: 'Liệt Hỏa Tứ Muội',
    skillName: 'Liệt Hỏa Phần Thiên Cước',
    desc: 'Bóng bốc cháy tự tăng tốc giữa không trung như thiên hỏa giáng thế.',
    color: '#ff6a4d', skin: '#f0c8a0', trail: '#ff6a2b',
    special: 'fire',
  },
  {
    id: 'phantom',
    name: 'Ảo Ảnh Ngũ Đệ',
    skillName: 'Thiên Ảnh Vạn Hình Cước',
    desc: 'Thân pháp ảo diệu, bóng tựa hồ dịch chuyển tức thời qua không gian.',
    color: '#c48aff', skin: '#e8b98a', trail: '#c48aff',
    special: 'phantom',
  },
  {
    id: 'wind',
    name: 'Cuồng Phong Lục Ca',
    skillName: 'Cuồng Phong Toái Nhật Cước',
    desc: 'Xoáy lốc cuồng phong đẩy bóng lao đi với tốc độ kinh hồn.',
    color: '#5ce0ff', skin: '#f0c8a0', trail: '#5ce0ff',
    special: 'wind',
  },
];

// =========================================================
// State
// =========================================================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const state = {
  screen: 'menu', // menu | select | playing | goal | gameover
  mode: 'ai', // ai | 2p
  selecting: 1,
  p1Char: null,
  p2Char: null,
  keys: {},
  shake: 0,
  time: 0,
};

let players = [];
let ball = null;
let particles = [];
let score = { 1: 0, 2: 0 };
let matchTime = MATCH_SECONDS;
let goalFreezeTimer = 0;
let lastFrame = performance.now();

// =========================================================
// Input
// =========================================================
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  state.keys[k] = true;
  if (['a','d','w','j','k','arrowleft','arrowright','arrowup',' '].includes(k)) e.preventDefault();
});
window.addEventListener('keyup', (e) => {
  state.keys[e.key.toLowerCase()] = false;
});

// =========================================================
// Entity factories
// =========================================================
function makePlayer(num, charDef, isAI) {
  return {
    num, char: charDef, isAI,
    x: num === 1 ? 220 : 740,
    y: GROUND_Y,
    vx: 0, vy: 0,
    facing: num === 1 ? 1 : -1,
    onGround: true,
    w: 34, h: 78,
    kickCooldown: 0,
    kickAnim: 0,
    skillAnim: 0,
    meter: 0,
    walkPhase: 0,
    aiTimer: 0,
    aiJumpCooldown: 0,
  };
}

function resetBall() {
  ball = {
    x: W / 2, y: GROUND_Y - 120,
    vx: 0, vy: 0,
    r: BALL_R,
    spin: 0,
    trail: [],
    special: null,
    lastTouch: null,
    groundHits: 0,
  };
}

function resetPositions() {
  players[0].x = 220; players[0].y = GROUND_Y; players[0].vx = 0; players[0].vy = 0; players[0].facing = 1;
  players[1].x = 740; players[1].y = GROUND_Y; players[1].vx = 0; players[1].vy = 0; players[1].facing = -1;
  resetBall();
}

// =========================================================
// Particles
// =========================================================
function spawnParticles(x, y, color, count, opts = {}) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (opts.speed || 3) * (0.4 + Math.random() * 1.2);
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (opts.up || 0),
      life: opts.life || 30,
      maxLife: opts.life || 30,
      color,
      size: (opts.size || 3) * (0.6 + Math.random() * 0.8),
      gravity: opts.gravity !== undefined ? opts.gravity : 0.1,
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vy += p.gravity;
    p.vx *= 0.97;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  for (const p of particles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// =========================================================
// Physics helpers
// =========================================================
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function dist(x1, y1, x2, y2) { return Math.hypot(x1 - x2, y1 - y2); }

function updatePlayer(p) {
  const k = KEYS[p.num];
  let left = false, right = false, jump = false, kick = false, skill = false;

  if (p.isAI) {
    aiThink(p);
    left = p._aiLeft; right = p._aiRight; jump = p._aiJump; kick = p._aiKick; skill = p._aiSkill;
  } else {
    left = !!state.keys[k.left];
    right = !!state.keys[k.right];
    jump = !!state.keys[k.jump];
    kick = !!state.keys[k.kick];
    skill = !!state.keys[k.skill];
  }

  const ACCEL = 0.85, MAXSPD = 4.4, FRICTION = 0.82;
  if (left && !right) { p.vx -= ACCEL; p.facing = -1; }
  else if (right && !left) { p.vx += ACCEL; p.facing = 1; }
  else { p.vx *= FRICTION; }
  p.vx = clamp(p.vx, -MAXSPD, MAXSPD);

  if (jump && p.onGround) {
    p.vy = -11.5;
    p.onGround = false;
  }

  p.vy += GRAVITY;
  p.x += p.vx;
  p.y += p.vy;

  if (p.y >= GROUND_Y) { p.y = GROUND_Y; p.vy = 0; p.onGround = true; }
  p.x = clamp(p.x, p.w / 2 + 4, W - p.w / 2 - 4);

  if (p.kickCooldown > 0) p.kickCooldown--;
  if (p.kickAnim > 0) p.kickAnim--;
  if (p.skillAnim > 0) p.skillAnim--;

  if (!p.onGround || Math.abs(p.vx) > 0.3) p.walkPhase += 0.25 * (p.onGround ? Math.abs(p.vx) / 2 + 0.4 : 0.5);

  // Kick / skill attempt — measured from body center, independent of facing,
  // so a player standing right on top of the ball can always make contact.
  const bodyCenterY = p.y - p.h * 0.4;
  const dToBall = dist(p.x, bodyCenterY, ball.x, ball.y);

  if (p.kickCooldown === 0 && dToBall < 52) {
    if (skill && p.meter >= 100) {
      performKick(p, true);
      p.meter = 0;
      p.kickCooldown = 20;
      p.kickAnim = 14;
      p.skillAnim = 24;
    } else if (kick) {
      performKick(p, false);
      p.kickCooldown = 16;
      p.kickAnim = 14;
    }
  }
}

function performKick(p, isSpecial) {
  const upward = !!state.keys && state.keys[KEYS[p.num].jump];
  const dir = p.facing;
  ball.lastTouch = p.num;

  if (!isSpecial) {
    const power = 11.5 + Math.min(3, Math.abs(p.vx));
    ball.vx = dir * power + p.vx * 0.3;
    ball.vy = upward ? -13 : -6.5;
    ball.special = null;
    p.meter = clamp(p.meter + 14, 0, 100);
    spawnParticles(ball.x, ball.y, '#ffffff', 6, { speed: 2.5, life: 16, size: 2 });
    return;
  }

  // ---- Special skill kicks ----
  const type = p.char.special;
  ball.groundHits = 0;
  spawnParticles(ball.x, ball.y, p.char.trail, 26, { speed: 5, life: 30, size: 4, up: 1 });
  state.shake = 10;

  switch (type) {
    case 'shockwave': {
      ball.vx = dir * 19;
      ball.vy = -5.5;
      ball.special = { type, timer: 55, dir, gravityMul: 0.55 };
      break;
    }
    case 'iron': {
      ball.vx = dir * 20;
      ball.vy = -2.5;
      ball.special = { type, timer: 60, dir, gravityMul: 0.22 };
      break;
    }
    case 'taichi': {
      ball.vx = dir * 14.5;
      ball.vy = -9;
      ball.special = { type, timer: 70, dir, phase: 0, gravityMul: 0.75 };
      break;
    }
    case 'fire': {
      ball.vx = dir * 13;
      ball.vy = -10;
      ball.special = { type, timer: 60, dir, gravityMul: 1, thrust: 0.55 };
      break;
    }
    case 'phantom': {
      const blinkDist = 230;
      const newX = clamp(ball.x + dir * blinkDist, 40, W - 40);
      spawnParticles(ball.x, ball.y, p.char.trail, 18, { speed: 1, life: 20, size: 5, gravity: 0 });
      ball.x = newX;
      spawnParticles(ball.x, ball.y, p.char.trail, 18, { speed: 1, life: 20, size: 5, gravity: 0 });
      ball.vx = dir * 17;
      ball.vy = -6;
      ball.special = { type, timer: 40, dir, gravityMul: 0.6 };
      break;
    }
    case 'wind': {
      ball.vx = dir * 16;
      ball.vy = -7;
      ball.special = { type, timer: 65, dir, gravityMul: 0.5, wob: 0 };
      break;
    }
  }
}

function updateBall() {
  if (ball.special) {
    const s = ball.special;
    s.timer--;
    ball.trail.push({ x: ball.x, y: ball.y, color: playerCharByNum(ball.lastTouch)?.trail || '#fff' });

    switch (s.type) {
      case 'shockwave':
        ball.vy += GRAVITY * s.gravityMul;
        if (s.timer % 8 === 0) spawnParticles(ball.x, ball.y, '#ffd25c', 4, { speed: 1, life: 18, size: 5, gravity: 0 });
        break;
      case 'iron':
        ball.vy += GRAVITY * s.gravityMul;
        if (s.timer % 4 === 0) spawnParticles(ball.x, ball.y, '#dfe8ef', 3, { speed: 1, life: 12, size: 2, gravity: 0 });
        break;
      case 'taichi':
        s.phase += 0.35;
        ball.vy += GRAVITY * s.gravityMul + Math.sin(s.phase) * 0.9;
        break;
      case 'fire':
        ball.vy += GRAVITY * s.gravityMul;
        ball.vx += s.dir * s.thrust * 0.3;
        ball.vy -= 0.15;
        if (s.timer % 3 === 0) spawnParticles(ball.x, ball.y, Math.random() > 0.5 ? '#ff6a2b' : '#ffd25c', 3, { speed: 1.2, life: 18, size: 4, gravity: -0.05 });
        break;
      case 'phantom':
        ball.vy += GRAVITY * s.gravityMul;
        break;
      case 'wind':
        s.wob += 0.5;
        ball.vy += GRAVITY * s.gravityMul;
        ball.vx += Math.sin(s.wob) * 0.4;
        if (s.timer % 5 === 0) spawnParticles(ball.x, ball.y, '#5ce0ff', 3, { speed: 0.8, life: 14, size: 3, gravity: 0 });
        break;
    }
    if (s.timer <= 0) ball.special = null;
  } else {
    ball.vy += GRAVITY;
    ball.trail.push({ x: ball.x, y: ball.y, color: 'rgba(255,255,255,0.5)' });
  }

  if (ball.trail.length > 14) ball.trail.shift();

  ball.vx *= 0.995;
  ball.x += ball.vx;
  ball.y += ball.vy;

  // Ground bounce
  if (ball.y + ball.r >= GROUND_Y + 22) {
    ball.y = GROUND_Y + 22 - ball.r;
    ball.vy *= -0.5;
    ball.vx *= 0.86;
    ball.groundHits++;
    if (Math.abs(ball.vy) < 1) ball.vy = 0;
    if (ball.special && ball.groundHits >= 2) ball.special = null;
  }

  // Wall / ceiling
  if (ball.y - ball.r < 30) { ball.y = 30 + ball.r; ball.vy *= -0.5; }

  // Side walls above goal mouth bounce back; inside goal mouth -> allow into net then reset
  if (ball.x - ball.r < GOAL_W) {
    if (ball.y < GOAL_TOP) { ball.x = GOAL_W + ball.r; ball.vx *= -0.6; }
  }
  if (ball.x + ball.r > W - GOAL_W) {
    if (ball.y < GOAL_TOP) { ball.x = W - GOAL_W - ball.r; ball.vx *= -0.6; }
  }

  // Player collisions (physical body, dribble bounce)
  for (const p of players) {
    const cx = p.x, cy = p.y - p.h / 2;
    const dx = ball.x - cx, dy = ball.y - cy;
    const minDist = ball.r + 24;
    const d = Math.hypot(dx, dy);
    if (d < minDist && d > 0.01) {
      const nx = dx / d, ny = dy / d;
      const overlap = minDist - d;
      ball.x += nx * overlap;
      ball.y += ny * overlap;
      const relSpeed = ball.vx * nx + ball.vy * ny;
      if (relSpeed < 0) {
        ball.vx -= 2 * relSpeed * nx * 0.9;
        ball.vy -= 2 * relSpeed * ny * 0.9;
      }
    }
  }
}

function playerCharByNum(num) {
  const p = players.find(pl => pl.num === num);
  return p ? p.char : null;
}

function checkGoal() {
  if (goalFreezeTimer > 0) return;
  if (ball.x - ball.r < GOAL_W + 4 && ball.y > GOAL_TOP) {
    scoreGoal(2);
  } else if (ball.x + ball.r > W - GOAL_W - 4 && ball.y > GOAL_TOP) {
    scoreGoal(1);
  }
}

function scoreGoal(who) {
  score[who]++;
  document.getElementById(`p${who}-score`).textContent = score[who];
  const banner = document.getElementById('goal-banner');
  banner.classList.remove('hidden');
  banner.style.animation = 'none';
  void banner.offsetWidth;
  banner.style.animation = '';
  state.shake = 16;
  spawnParticles(ball.x, ball.y, '#ffd25c', 40, { speed: 6, life: 40, size: 4, up: 2 });
  goalFreezeTimer = 90;
  setTimeout(() => banner.classList.add('hidden'), 1100);
}

// =========================================================
// Simple AI
// =========================================================
function aiThink(p) {
  p.aiTimer--;
  if (p.aiTimer <= 0) {
    p.aiTimer = 6 + Math.random() * 6;
    const goalX = p.num === 1 ? W - GOAL_W : GOAL_W;
    // stand on the side of the ball away from the target goal, so a kick drives it forward
    const approachSign = Math.sign(goalX - ball.x) || (p.num === 1 ? 1 : -1);
    p._aiTargetX = clamp(ball.x - approachSign * 26, 40, W - 40);
  }
  const dx = p._aiTargetX - p.x;
  p._aiLeft = dx < -8;
  p._aiRight = dx > 8;

  const bodyCenterY = p.y - p.h * 0.4;
  const dToBall = dist(p.x, bodyCenterY, ball.x, ball.y);
  const ballAbove = ball.y < p.y - 60 && dist(p.x, p.y, ball.x, ball.y) < 90;

  p.aiJumpCooldown = Math.max(0, p.aiJumpCooldown - 1);
  p._aiJump = ballAbove && p.aiJumpCooldown === 0 && Math.random() < 0.4;
  if (p._aiJump) p.aiJumpCooldown = 30;

  // face the ball
  if (ball.x < p.x - 4) p.facing = -1;
  else if (ball.x > p.x + 4) p.facing = 1;

  p._aiKick = dToBall < 50 && Math.random() < 0.6;
  p._aiSkill = dToBall < 50 && p.meter >= 100 && Math.random() < 0.5;
}

// =========================================================
// Rendering
// =========================================================
function drawField() {
  const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  grad.addColorStop(0, '#8fd8ff');
  grad.addColorStop(1, '#cdeeff');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, GROUND_Y);

  // distant pagoda silhouettes for flavor
  ctx.fillStyle = 'rgba(60,40,30,0.25)';
  for (const px of [120, 420, 760]) drawPagoda(px, GROUND_Y - 60);

  // ground
  ctx.fillStyle = '#3f9142';
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  ctx.fillStyle = '#469b49';
  for (let x = -20; x < W; x += 40) {
    ctx.fillRect(x, GROUND_Y, 20, H - GROUND_Y);
  }
  ctx.fillStyle = '#2f7d33';
  ctx.fillRect(0, GROUND_Y, W, 6);

  // center line & circle
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(W / 2, GROUND_Y + 6); ctx.lineTo(W / 2, H); ctx.stroke();
  ctx.beginPath(); ctx.arc(W / 2, H - 20, 45, 0, Math.PI * 2); ctx.stroke();

  drawGoal(true);
  drawGoal(false);
}

function drawPagoda(x, y) {
  for (let i = 0; i < 3; i++) {
    const w = 70 - i * 18, h = 16;
    ctx.fillRect(x - w / 2, y + i * 20, w, h);
  }
  ctx.fillRect(x - 6, y - 22, 12, 24);
}

function drawGoal(left) {
  const x0 = left ? 0 : W - GOAL_W;
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(x0, GOAL_TOP, GOAL_W, GROUND_Y - GOAL_TOP);
  ctx.strokeStyle = 'rgba(120,120,120,0.6)';
  ctx.lineWidth = 1;
  for (let yy = GOAL_TOP; yy < GROUND_Y; yy += 8) {
    ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 + GOAL_W, yy); ctx.stroke();
  }
  for (let xx = 0; xx <= GOAL_W; xx += 8) {
    ctx.beginPath(); ctx.moveTo(x0 + xx, GOAL_TOP); ctx.lineTo(x0 + xx, GROUND_Y); ctx.stroke();
  }
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 4;
  ctx.strokeRect(x0 + (left ? GOAL_W : 0), GOAL_TOP, 0, GROUND_Y - GOAL_TOP);
  ctx.beginPath();
  ctx.moveTo(x0 + (left ? GOAL_W : 0), GOAL_TOP);
  ctx.lineTo(x0 + (left ? GOAL_W : 0), GROUND_Y);
  ctx.stroke();
}

function drawStickFigure(p) {
  const { x, y, facing, char } = p;
  const legSwing = Math.sin(p.walkPhase) * (p.onGround ? 22 : 10);
  const headY = y - p.h;
  const hipY = y - p.h * 0.42;
  const kicking = p.kickAnim > 0;
  const skillGlow = p.skillAnim > 0;

  ctx.save();

  if (skillGlow) {
    const glowA = p.skillAnim / 24;
    ctx.globalAlpha = glowA * 0.5;
    ctx.fillStyle = char.trail;
    ctx.beginPath();
    ctx.arc(x, hipY, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.strokeStyle = char.color;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';

  // legs
  ctx.beginPath();
  if (kicking) {
    ctx.moveTo(x, hipY);
    ctx.lineTo(x - facing * 4, y - 14);
    ctx.moveTo(x, hipY);
    ctx.lineTo(x + facing * 30, hipY + 20);
  } else {
    ctx.moveTo(x, hipY);
    ctx.lineTo(x - 10 + legSwing * 0.3, y);
    ctx.moveTo(x, hipY);
    ctx.lineTo(x + 10 - legSwing * 0.3, y);
  }
  ctx.stroke();

  // body
  ctx.beginPath();
  ctx.moveTo(x, hipY);
  ctx.lineTo(x, headY + 16);
  ctx.stroke();

  // arms
  ctx.beginPath();
  const armSwing = Math.sin(p.walkPhase + Math.PI) * 14;
  if (kicking) {
    ctx.moveTo(x, headY + 22);
    ctx.lineTo(x - facing * 16, headY + 8);
    ctx.moveTo(x, headY + 22);
    ctx.lineTo(x + facing * 20, headY + 34);
  } else {
    ctx.moveTo(x, headY + 22);
    ctx.lineTo(x - 14 + armSwing * 0.4, headY + 42);
    ctx.moveTo(x, headY + 22);
    ctx.lineTo(x + 14 - armSwing * 0.4, headY + 42);
  }
  ctx.stroke();

  // head
  ctx.fillStyle = char.skin;
  ctx.beginPath();
  ctx.arc(x, headY, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5a3d20';
  ctx.lineWidth = 2;
  ctx.stroke();
  // headband
  ctx.fillStyle = char.color;
  ctx.fillRect(x - 13, headY - 4, 26, 5);
  const tailDir = -facing;
  ctx.beginPath();
  ctx.moveTo(x + tailDir * 12, headY - 2);
  ctx.lineTo(x + tailDir * 22, headY + 6);
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.restore();
}

function drawBall() {
  for (let i = 0; i < ball.trail.length; i++) {
    const t = ball.trail[i];
    const a = (i / ball.trail.length) * 0.5;
    ctx.globalAlpha = a;
    ctx.fillStyle = t.color;
    ctx.beginPath();
    ctx.arc(t.x, t.y, ball.r * (0.4 + a), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.save();
  if (ball.special) {
    ctx.shadowColor = playerCharByNum(ball.lastTouch)?.trail || '#fff';
    ctx.shadowBlur = 20;
  }
  ctx.fillStyle = '#fdfdfd';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ball.x - ball.r, ball.y);
  ctx.lineTo(ball.x + ball.r, ball.y);
  ctx.moveTo(ball.x, ball.y - ball.r);
  ctx.lineTo(ball.x, ball.y + ball.r);
  ctx.stroke();
  ctx.restore();
}

function render() {
  ctx.save();
  if (state.shake > 0) {
    const s = state.shake;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    state.shake *= 0.9;
    if (state.shake < 0.5) state.shake = 0;
  }
  drawField();
  drawParticles();
  if (ball) drawBall();
  for (const p of players) drawStickFigure(p);
  ctx.restore();
}

// =========================================================
// Main loop
// =========================================================
function update(dt) {
  if (state.screen !== 'playing') return;

  if (goalFreezeTimer > 0) {
    goalFreezeTimer--;
    updateParticles();
    if (goalFreezeTimer === 0) resetPositions();
    return;
  }

  for (const p of players) updatePlayer(p);

  // player-player separation
  const [a, b] = players;
  const minSep = (a.w + b.w) / 2;
  if (Math.abs(a.x - b.x) < minSep) {
    const push = (minSep - Math.abs(a.x - b.x)) / 2;
    const dir = a.x < b.x ? -1 : 1;
    a.x += dir * push;
    b.x -= dir * push;
  }

  updateBall();
  checkGoal();
  updateParticles();

  document.getElementById('meter1-fill').style.width = players[0].meter + '%';
  document.getElementById('meter2-fill').style.width = players[1].meter + '%';

  matchTime -= dt;
  if (matchTime <= 0) {
    matchTime = 0;
    endMatch();
  }
  const mm = String(Math.floor(matchTime / 60)).padStart(2, '0');
  const ss = String(Math.floor(matchTime % 60)).padStart(2, '0');
  document.getElementById('timer').textContent = `${mm}:${ss}`;
}

function loop(now) {
  const dt = Math.min(0.033, (now - lastFrame) / 1000);
  lastFrame = now;
  update(dt);
  if (state.screen === 'playing' || state.screen === 'goal') render();
  requestAnimationFrame(loop);
}

// =========================================================
// Screen flow
// =========================================================
function endMatch() {
  state.screen = 'gameover';
  document.getElementById('hud').classList.add('hidden');
  const title = document.getElementById('gameover-title');
  const sub = document.getElementById('gameover-sub');
  if (score[1] > score[2]) {
    title.textContent = `${players[0].char.name} CHIẾN THẮNG!`;
  } else if (score[2] > score[1]) {
    title.textContent = `${players[1].char.name} CHIẾN THẮNG!`;
  } else {
    title.textContent = 'HÒA!';
  }
  sub.textContent = `Tỷ số: ${score[1]} - ${score[2]}`;
  document.getElementById('overlay-gameover').classList.remove('hidden');
}

function startMatch() {
  score = { 1: 0, 2: 0 };
  matchTime = MATCH_SECONDS;
  particles = [];
  document.getElementById('p1-score').textContent = '0';
  document.getElementById('p2-score').textContent = '0';
  document.getElementById('p1-name').textContent = state.p1Char.name;
  document.getElementById('p2-name').textContent = state.p2Char.name;

  players = [
    makePlayer(1, state.p1Char, false),
    makePlayer(2, state.p2Char, state.mode === 'ai'),
  ];
  resetPositions();
  state.screen = 'playing';
  document.getElementById('hud').classList.remove('hidden');
  document.getElementById('overlay-gameover').classList.add('hidden');
  document.getElementById('overlay-select').classList.add('hidden');
  document.getElementById('overlay-menu').classList.add('hidden');
}

// =========================================================
// Menu / character-select UI wiring
// =========================================================
function renderCharCard(char) {
  const card = document.createElement('div');
  card.className = 'char-card';
  card.dataset.id = char.id;

  const cv = document.createElement('canvas');
  cv.width = 160; cv.height = 100;
  const cctx = cv.getContext('2d');
  cctx.strokeStyle = char.color;
  cctx.lineWidth = 5;
  cctx.lineCap = 'round';
  const cx = 80, hipY = 68, headY = 30;
  cctx.beginPath();
  cctx.moveTo(cx, hipY); cctx.lineTo(cx - 12, 92);
  cctx.moveTo(cx, hipY); cctx.lineTo(cx + 12, 92);
  cctx.stroke();
  cctx.beginPath();
  cctx.moveTo(cx, hipY); cctx.lineTo(cx, headY + 14);
  cctx.stroke();
  cctx.beginPath();
  cctx.moveTo(cx, headY + 20); cctx.lineTo(cx - 16, headY + 40);
  cctx.moveTo(cx, headY + 20); cctx.lineTo(cx + 16, headY + 40);
  cctx.stroke();
  cctx.fillStyle = char.skin;
  cctx.beginPath(); cctx.arc(cx, headY, 13, 0, Math.PI * 2); cctx.fill();
  cctx.strokeStyle = '#5a3d20'; cctx.lineWidth = 2; cctx.stroke();
  cctx.fillStyle = char.color;
  cctx.fillRect(cx - 13, headY - 4, 26, 5);

  card.appendChild(cv);
  const name = document.createElement('div'); name.className = 'name'; name.textContent = char.name;
  const skill = document.createElement('div'); skill.className = 'skill'; skill.textContent = char.skillName;
  const desc = document.createElement('div'); desc.className = 'desc'; desc.textContent = char.desc;
  card.appendChild(name); card.appendChild(skill); card.appendChild(desc);
  return card;
}

function openSelect(forPlayer) {
  state.selecting = forPlayer;
  document.getElementById('select-title').textContent =
    forPlayer === 1 ? 'NGƯỜI CHƠI 1 — CHỌN CAO THỦ' : 'NGƯỜI CHƠI 2 — CHỌN CAO THỦ';
  const grid = document.getElementById('char-grid');
  grid.innerHTML = '';
  for (const char of CHARACTERS) grid.appendChild(renderCharCard(char));
  document.getElementById('btn-confirm-select').disabled = true;
  document.getElementById('overlay-menu').classList.add('hidden');
  document.getElementById('overlay-select').classList.remove('hidden');
}

let pendingChoice = null;

document.getElementById('char-grid').addEventListener('click', (e) => {
  const card = e.target.closest('.char-card');
  if (!card) return;
  document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  pendingChoice = CHARACTERS.find(c => c.id === card.dataset.id);
  document.getElementById('btn-confirm-select').disabled = false;
});

document.getElementById('btn-confirm-select').addEventListener('click', () => {
  if (!pendingChoice) return;
  if (state.selecting === 1) {
    state.p1Char = pendingChoice;
    pendingChoice = null;
    if (state.mode === '2p') {
      openSelect(2);
    } else {
      const others = CHARACTERS.filter(c => c.id !== state.p1Char.id);
      state.p2Char = others[Math.floor(Math.random() * others.length)];
      startMatch();
    }
  } else {
    state.p2Char = pendingChoice;
    pendingChoice = null;
    startMatch();
  }
});

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.mode = btn.dataset.mode;
    document.getElementById('p2-hint').innerHTML = state.mode === '2p'
      ? '<b>P2:</b> ←/→ di chuyển · ↑ nhảy · L sút · ; xuất chiêu'
      : '<b>P2 (AI):</b> tự động thi triển võ công';
  });
});

document.getElementById('btn-to-select').addEventListener('click', () => openSelect(1));

document.getElementById('btn-restart').addEventListener('click', () => {
  document.getElementById('overlay-gameover').classList.add('hidden');
  document.getElementById('overlay-menu').classList.remove('hidden');
  state.screen = 'menu';
});

// =========================================================
// Boot
// =========================================================
resetBall();
players = [makePlayer(1, CHARACTERS[0], false), makePlayer(2, CHARACTERS[1], true)];
requestAnimationFrame((t) => { lastFrame = t; requestAnimationFrame(loop); });

})();
