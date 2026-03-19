const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ---- CONFIG ----
const CANVAS_W = 320;
const CANVAS_H = 240;
let scale = Math.max(1, Math.min(
  Math.floor(window.innerWidth / CANVAS_W),
  Math.floor(window.innerHeight / CANVAS_H),
  4
));

canvas.width = CANVAS_W;
canvas.height = CANVAS_H;
canvas.style.width = (CANVAS_W * scale) + 'px';
canvas.style.height = (CANVAS_H * scale) + 'px';

// ---- PASTEL PALETTE ----
const P = {
  grass1:    '#a8d8a8', grass2:    '#c2e6c2', grassDark: '#8ec88e',
  road:      '#d0c0d8', roadLine:  '#e8d8f0', roadEdge:  '#b0a0b8',
  sidewalk:  '#f0e0c8',
  pink:      '#f4b8c8', blue:      '#a8c8e8', yellow:    '#f0e0a0',
  mint:      '#a0e0d0', peach:     '#f8c8a8', lilac:     '#d0b8e8',
  coral:     '#f0a8a0', cream:     '#f8f0d8', lavender:  '#c8b0e0',
  skyBlue:   '#b0d8f0', salmon:    '#f0b0a0', lemon:     '#f0f0b0',
  rosePink:  '#e8a0b8', teal:      '#90d0c0',
  softRed:   '#e8a0a0', white:     '#f8f0f0', dark:      '#6a5a7a',
  window:    '#d0e8f8', tire:      '#8a7a9a', headlight: '#f8f0b0',
};

const BODY_COLORS = [
  P.pink, P.blue, P.yellow, P.mint, P.peach, P.lilac,
  P.coral, P.cream, P.lavender, P.skyBlue, P.salmon,
  P.lemon, P.rosePink, P.teal,
];

// ---- PIXEL ART SPRITES ----
function makeCarSprite(c) {
  const W = P.window, T = P.tire, D = P.dark, H = P.headlight, _ = '.';
  return [
    [_,_,c,c,c,c,c,c,c,_,_,_,_,_],
    [_,c,W,W,c,c,W,W,c,c,_,_,_,_],
    [c,c,c,c,c,c,c,c,c,c,c,c,H,_],
    [c,c,c,c,c,c,c,c,c,c,c,c,c,c],
    [c,c,c,c,c,c,c,c,c,c,c,c,H,_],
    [_,T,D,T,_,_,_,_,T,D,T,_,_,_],
  ];
}

function makeTruckSprite(c) {
  const W = P.window, T = P.tire, D = P.dark, H = P.headlight, _ = '.';
  return [
    [_,_,_,_,_,c,c,c,c,c,c,c,c,c,c,c,c,_,_,_,_,_],
    [c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,_,_,_],
    [c,W,W,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,H,_],
    [c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c],
    [c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,H,_],
    [_,T,D,T,_,_,_,T,D,T,_,_,_,_,_,_,T,D,T,_,_,_],
  ];
}

function makeBusSprite(c) {
  const W = P.window, T = P.tire, D = P.dark, H = P.headlight, _ = '.';
  return [
    [_,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,_,_],
    [c,c,W,W,c,W,W,c,W,W,c,W,W,c,W,W,c,W,W,c,c,c,c,c,c,_],
    [c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,H],
    [c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c],
    [c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,H],
    [_,T,D,T,_,_,_,_,_,_,T,D,T,_,_,_,_,_,_,T,D,T,_,_,_,_],
  ];
}

// ---- ROAD LAYOUT ----
const GRASS_H = 10;
const ROAD_H = 14;
const GAP_H = 8;
const LANE_COUNT = 10;

const lanes = [];
let yOff = GRASS_H;
for (let i = 0; i < LANE_COUNT; i++) {
  const dir = (i % 2 === 0) ? 1 : -1;
  const spd = 0.25 + Math.random() * 0.55;
  lanes.push({
    y: yOff, height: ROAD_H,
    direction: dir, speed: spd,
    vehicles: [], stopped: false, stopAnim: 0,
  });
  yOff += ROAD_H;
  if ((i + 1) % 2 === 0 && i < LANE_COUNT - 1) yOff += GAP_H;
}

// ---- VEHICLES ----
function spawnVehicle(lane, spreadX) {
  const r = Math.random();
  const col = BODY_COLORS[Math.floor(Math.random() * BODY_COLORS.length)];
  let sprite;
  if (r < 0.15) sprite = makeBusSprite(col);
  else if (r < 0.40) sprite = makeTruckSprite(col);
  else sprite = makeCarSprite(col);

  const w = sprite[0].length, h = sprite.length;
  let x = spreadX !== undefined ? spreadX :
    (lane.direction === 1 ? -w - Math.random() * 60 : CANVAS_W + Math.random() * 60);
  const vy = lane.y + Math.floor((lane.height - h) / 2);

  return {
    x, y: vy, w, h, sprite,
    speed: lane.speed * (0.8 + Math.random() * 0.4),
    direction: lane.direction, brakeLights: false,
  };
}

function initVehicles() {
  for (const lane of lanes) {
    lane.vehicles = [];
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const spread = lane.direction === 1
        ? -20 + (i * (CANVAS_W + 60)) / count
        : CANVAS_W - (i * (CANVAS_W + 60)) / count;
      lane.vehicles.push(spawnVehicle(lane, spread));
    }
  }
}
initVehicles();

// ---- MOUSE STATE ----
let mouseX = -100, mouseY = -100, mouseIn = false;

canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  mouseX = (e.clientX - r.left) / scale;
  mouseY = (e.clientY - r.top) / scale;
  mouseIn = true;
});
canvas.addEventListener('mouseleave', () => { mouseIn = false; mouseX = mouseY = -100; });

// ---- MOUSE CURSOR SPRITE ----
const CUR = [
  [P.dark,'.','.','.','.'],
  [P.dark,P.dark,'.','.','.'],
  [P.dark,P.white,P.dark,'.','.'],
  [P.dark,P.white,P.white,P.dark,'.'],
  [P.dark,P.white,P.white,P.white,P.dark],
  [P.dark,P.white,P.white,P.dark,'.'],
  [P.dark,P.dark,P.dark,P.dark,'.'],
  ['.','.','.',P.dark,P.dark],
];

// ---- DECORATIONS ----
const decos = [];
function genDecos() {
  const areas = [{ y: 0, h: GRASS_H }];
  let gy = GRASS_H;
  for (let i = 0; i < LANE_COUNT; i++) {
    gy += ROAD_H;
    if ((i + 1) % 2 === 0 && i < LANE_COUNT - 1) { areas.push({ y: gy, h: GAP_H }); gy += GAP_H; }
  }
  areas.push({ y: gy, h: CANVAS_H - gy });

  for (const a of areas) {
    const n = Math.floor(a.h * CANVAS_W / 120);
    for (let i = 0; i < n; i++) {
      decos.push({
        x: Math.floor(Math.random() * CANVAS_W),
        y: a.y + 2 + Math.floor(Math.random() * Math.max(1, a.h - 4)),
        type: Math.random() < 0.4 ? 'flower' : (Math.random() < 0.5 ? 'tuft' : 'bush'),
        color: BODY_COLORS[Math.floor(Math.random() * BODY_COLORS.length)],
      });
    }
  }
}
genDecos();

// ---- SCORE ----
let crossings = 0, curLane = -1, prevLane = -1;

function laneAt(y) {
  for (let i = 0; i < lanes.length; i++)
    if (y >= lanes[i].y && y < lanes[i].y + lanes[i].height) return i;
  return -1;
}

// ---- CACHED BACKGROUND ----
let bgCanvas = null;
function cacheBG() {
  bgCanvas = document.createElement('canvas');
  bgCanvas.width = CANVAS_W;
  bgCanvas.height = CANVAS_H;
  const g = bgCanvas.getContext('2d');

  g.fillStyle = P.grass1;
  g.fillRect(0, 0, CANVAS_W, CANVAS_H);
  for (let py = 0; py < CANVAS_H; py++) {
    for (let px = 0; px < CANVAS_W; px++) {
      const r = Math.random();
      if (r < 0.08) { g.fillStyle = P.grass2; g.fillRect(px, py, 1, 1); }
      else if (r < 0.12) { g.fillStyle = P.grassDark; g.fillRect(px, py, 1, 1); }
    }
  }

  for (const d of decos) {
    if (d.type === 'flower') {
      g.fillStyle = d.color;
      g.fillRect(d.x, d.y, 1, 1);
      g.fillRect(d.x-1, d.y, 1, 1);
      g.fillRect(d.x+1, d.y, 1, 1);
      g.fillRect(d.x, d.y-1, 1, 1);
      g.fillRect(d.x, d.y+1, 1, 1);
      g.fillStyle = P.yellow;
      g.fillRect(d.x, d.y, 1, 1);
    } else if (d.type === 'tuft') {
      g.fillStyle = P.grassDark;
      g.fillRect(d.x, d.y, 1, 3);
      g.fillRect(d.x+1, d.y-1, 1, 3);
    } else {
      g.fillStyle = P.grassDark;
      g.fillRect(d.x, d.y, 2, 2);
      g.fillRect(d.x-1, d.y+1, 1, 1);
      g.fillRect(d.x+2, d.y+1, 1, 1);
      g.fillStyle = P.grass2;
      g.fillRect(d.x, d.y, 1, 1);
    }
  }

  for (const lane of lanes) {
    const y = lane.y, h = lane.height;
    g.fillStyle = P.road;
    g.fillRect(0, y, CANVAS_W, h);
    g.fillStyle = P.roadEdge;
    g.fillRect(0, y, CANVAS_W, 1);
    g.fillRect(0, y + h - 1, CANVAS_W, 1);
    g.fillStyle = P.sidewalk;
    g.fillRect(0, y + 1, CANVAS_W, 1);
    g.fillRect(0, y + h - 2, CANVAS_W, 1);
    const ly = y + Math.floor(h / 2);
    for (let lx = 0; lx < CANVAS_W; lx += 8) {
      g.fillStyle = P.roadLine;
      g.fillRect(lx, ly, 4, 1);
    }
  }
}

// ---- DRAW HELPERS ----
function drawSprite(sprite, x, y, flipH) {
  for (let r = 0; r < sprite.length; r++) {
    for (let c = 0; c < sprite[r].length; c++) {
      const col = sprite[r][c];
      if (col === '.') continue;
      const px = flipH ? (sprite[r].length - 1 - c) : c;
      ctx.fillStyle = col;
      ctx.fillRect(Math.floor(x + px), Math.floor(y + r), 1, 1);
    }
  }
}

// ---- TINY PIXEL FONT ----
const FONT = {
  'A':[[1,1,1],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
  'B':[[1,1,0],[1,0,1],[1,1,0],[1,0,1],[1,1,0]],
  'C':[[1,1,1],[1,0,0],[1,0,0],[1,0,0],[1,1,1]],
  'D':[[1,1,0],[1,0,1],[1,0,1],[1,0,1],[1,1,0]],
  'E':[[1,1,1],[1,0,0],[1,1,0],[1,0,0],[1,1,1]],
  'F':[[1,1,1],[1,0,0],[1,1,0],[1,0,0],[1,0,0]],
  'G':[[1,1,1],[1,0,0],[1,0,1],[1,0,1],[1,1,1]],
  'H':[[1,0,1],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
  'I':[[1,1,1],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
  'J':[[0,0,1],[0,0,1],[0,0,1],[1,0,1],[1,1,1]],
  'K':[[1,0,1],[1,0,1],[1,1,0],[1,0,1],[1,0,1]],
  'L':[[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,1,1]],
  'M':[[1,0,1],[1,1,1],[1,0,1],[1,0,1],[1,0,1]],
  'N':[[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,0,1]],
  'O':[[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
  'P':[[1,1,1],[1,0,1],[1,1,1],[1,0,0],[1,0,0]],
  'Q':[[1,1,1],[1,0,1],[1,0,1],[1,1,1],[0,0,1]],
  'R':[[1,1,1],[1,0,1],[1,1,0],[1,0,1],[1,0,1]],
  'S':[[1,1,1],[1,0,0],[1,1,1],[0,0,1],[1,1,1]],
  'T':[[1,1,1],[0,1,0],[0,1,0],[0,1,0],[0,1,0]],
  'U':[[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
  'V':[[1,0,1],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
  'W':[[1,0,1],[1,0,1],[1,0,1],[1,1,1],[1,0,1]],
  'X':[[1,0,1],[1,0,1],[0,1,0],[1,0,1],[1,0,1]],
  'Y':[[1,0,1],[1,0,1],[0,1,0],[0,1,0],[0,1,0]],
  'Z':[[1,1,1],[0,0,1],[0,1,0],[1,0,0],[1,1,1]],
  '0':[[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
  '1':[[0,1,0],[1,1,0],[0,1,0],[0,1,0],[1,1,1]],
  '2':[[1,1,1],[0,0,1],[1,1,1],[1,0,0],[1,1,1]],
  '3':[[1,1,1],[0,0,1],[1,1,1],[0,0,1],[1,1,1]],
  '4':[[1,0,1],[1,0,1],[1,1,1],[0,0,1],[0,0,1]],
  '5':[[1,1,1],[1,0,0],[1,1,1],[0,0,1],[1,1,1]],
  '6':[[1,1,1],[1,0,0],[1,1,1],[1,0,1],[1,1,1]],
  '7':[[1,1,1],[0,0,1],[0,0,1],[0,0,1],[0,0,1]],
  '8':[[1,1,1],[1,0,1],[1,1,1],[1,0,1],[1,1,1]],
  '9':[[1,1,1],[1,0,1],[1,1,1],[0,0,1],[1,1,1]],
  ':':[[0],[1],[0],[1],[0]],
  ' ':[[0],[0],[0],[0],[0]],
};

function drawPixelText(text, cx, y, centered) {
  let totalW = 0;
  for (const ch of text) {
    const glyph = FONT[ch];
    if (glyph) totalW += glyph[0].length + 1;
    else totalW += 2;
  }
  totalW -= 1;
  let x = centered ? Math.floor(cx - totalW / 2) : cx;

  for (const ch of text) {
    const glyph = FONT[ch];
    if (!glyph) { x += 2; continue; }
    for (let r = 0; r < glyph.length; r++) {
      for (let c = 0; c < glyph[r].length; c++) {
        if (glyph[r][c]) {
          ctx.fillStyle = P.cream;
          ctx.fillRect(x + c + 1, y + r + 1, 1, 1);
          ctx.fillStyle = P.dark;
          ctx.fillRect(x + c, y + r, 1, 1);
        }
      }
    }
    x += glyph[0].length + 1;
  }
}

// ---- UPDATE ----
function update() {
  if (mouseIn) curLane = laneAt(mouseY);
  else curLane = -1;

  if (curLane !== -1 && prevLane !== curLane && prevLane !== -1) {
    crossings++;
  }
  prevLane = curLane;

  for (let i = 0; i < lanes.length; i++) {
    const lane = lanes[i];
    const shouldStop = (i === curLane) && mouseIn;
    lane.stopped = shouldStop;

    if (lane.stopped) lane.stopAnim = Math.min(1, lane.stopAnim + 0.06);
    else lane.stopAnim = Math.max(0, lane.stopAnim - 0.04);

    const mult = 1 - lane.stopAnim;

    for (const v of lane.vehicles) {
      v.x += v.speed * v.direction * mult;
      v.brakeLights = lane.stopAnim > 0.3;

      if (v.direction === 1 && v.x > CANVAS_W + 15) v.x = -v.w - Math.random() * 40;
      else if (v.direction === -1 && v.x < -v.w - 15) v.x = CANVAS_W + Math.random() * 40;
    }

    if (lane.vehicles.length < 3 && Math.random() < 0.003) {
      lane.vehicles.push(spawnVehicle(lane));
    }
  }
}

// ---- DRAW ----
function draw() {
  ctx.drawImage(bgCanvas, 0, 0);

  // Lane highlight
  if (curLane !== -1 && mouseIn) {
    const lane = lanes[curLane];
    ctx.fillStyle = 'rgba(248,240,216,0.18)';
    ctx.fillRect(0, lane.y, CANVAS_W, lane.height);
  }

  // Stop indicators
  for (const lane of lanes) {
    if (lane.stopAnim > 0.5 && mouseIn) {
      ctx.fillStyle = P.softRed;
      ctx.fillRect(1, lane.y + 3, 3, 3);
      ctx.fillRect(CANVAS_W - 4, lane.y + 3, 3, 3);
      ctx.fillStyle = P.white;
      ctx.fillRect(2, lane.y + 4, 1, 1);
      ctx.fillRect(CANVAS_W - 3, lane.y + 4, 1, 1);
    }
  }

  // Vehicles
  for (const lane of lanes) {
    for (const v of lane.vehicles) {
      drawSprite(v.sprite, v.x, v.y, v.direction === -1);
      if (v.brakeLights) {
        const tx = v.direction === -1 ? Math.floor(v.x) + v.w - 1 : Math.floor(v.x);
        ctx.fillStyle = P.softRed;
        ctx.fillRect(tx, Math.floor(v.y) + 2, 1, 2);
      }
    }
  }

  // HUD
  drawPixelText('MOUSE CROSSING ROAD', CANVAS_W / 2, 3, true);
  if (crossings > 0) {
    drawPixelText('CROSSINGS: ' + crossings, CANVAS_W / 2, CANVAS_H - 6, true);
  }

  // Mouse cursor
  if (mouseIn) drawSprite(CUR, Math.floor(mouseX), Math.floor(mouseY), false);
}

// ---- GAME LOOP ----
cacheBG();

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);

// ---- RESIZE HANDLER ----
window.addEventListener('resize', () => {
  scale = Math.max(1, Math.min(
    Math.floor(window.innerWidth / CANVAS_W),
    Math.floor(window.innerHeight / CANVAS_H),
    4
  ));
  canvas.style.width = (CANVAS_W * scale) + 'px';
  canvas.style.height = (CANVAS_H * scale) + 'px';
});
