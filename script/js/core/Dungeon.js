import { TILE } from '../Define.js';
import { AUTOTILE_LOOKUP, neighborMask } from '../data/Autotile.js';
import { GAME_RNG } from './Rng.js';
import { ROOM_PLAN, ROOM_RULES, MIMIC } from '../data/Rooms.js';

export const FLOOR_FRAMES = ['floor_1', 'floor_2', 'floor_3', 'floor_4', 'floor_5', 'floor_6', 'floor_7', 'floor_8'];
export const WALL_RING = 1;

function intersects(a, b, pad) {
  return a.x - pad < b.x + b.w && a.x + a.w + pad > b.x && a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;
}

export function generateDungeon(cols, rows, gen = {}, rng = GAME_RNG) {
  const roomCount = gen.roomCount || 8;
  const roomW = gen.roomW || [5, 9];
  const roomH = gen.roomH || [4, 7];
  const grid = Array.from({ length: rows }, () => new Array(cols).fill(0));
  const rooms = [];
  let attempts = 0;
  while (rooms.length < roomCount && attempts < 400) {
    attempts++;
    const w = rng.between(roomW[0], roomW[1]);
    const h = rng.between(roomH[0], roomH[1]);
    const x = rng.between(2, cols - w - 3);
    const y = rng.between(2, rows - h - 3);
    const r = { x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) };
    if (rooms.some((o) => intersects(r, o, 2))) continue;
    rooms.push(r);
  }
  const carve = (x, y) => {
    if (x > 0 && y > 0 && x < cols - 1 && y < rows - 1) grid[y][x] = 1;
  };
  for (const r of rooms) {
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) carve(x, y);
  }
  const hLine = (y, x0, x1) => {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      carve(x, y);
      carve(x, y + 1);
    }
  };
  const vLine = (x, y0, y1) => {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
      carve(x, y);
      carve(x + 1, y);
    }
  };
  for (const [a, b] of corridorPairs(rooms, gen.loops === undefined ? 0.15 : gen.loops, rng)) {
    if (rng.chance(0.5)) {
      hLine(a.cy, a.cx, b.cx);
      vLine(b.cx, a.cy, b.cy);
    } else {
      vLine(a.cx, a.cy, b.cy);
      hLine(b.cy, a.cx, b.cx);
    }
  }
  let spawnRoom = rooms[0];
  for (const r of rooms) if (r.cx < spawnRoom.cx) spawnRoom = r;
  let exitRoom = spawnRoom;
  let best = -1;
  for (const r of rooms) {
    const d = (r.cx - spawnRoom.cx) ** 2 + (r.cy - spawnRoom.cy) ** 2;
    if (d > best) {
      best = d;
      exitRoom = r;
    }
  }
  assignRoomTypes(rooms, spawnRoom, exitRoom, gen.floor || 1, rng, gen.roomRng || rng, gen.roomPlan || ROOM_PLAN);
  return { grid, rooms, spawnRoom, exitRoom };
}

function corridorPairs(rooms, loops, rng) {
  const edges = [];
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i];
      const b = rooms[j];
      edges.push({ i, j, d: (a.cx - b.cx) ** 2 + (a.cy - b.cy) ** 2 });
    }
  }
  edges.sort((e1, e2) => e1.d - e2.d);
  const parent = rooms.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const chosen = [];
  const rest = [];
  for (const e of edges) {
    const a = find(e.i);
    const b = find(e.j);
    if (a === b) {
      rest.push(e);
      continue;
    }
    parent[a] = b;
    chosen.push(e);
  }
  const shortRest = rest.slice(0, Math.ceil(rest.length * 0.3));
  for (const e of shortRest) if (rng.chance(loops)) chosen.push(e);
  return chosen.map((e) => [rooms[e.i], rooms[e.j]]);
}

function assignRoomTypes(rooms, spawnRoom, exitRoom, floor, rng, roomRng, plans) {
  for (const r of rooms) r.type = 'normal';
  spawnRoom.type = 'spawn';
  exitRoom.type = 'exit';
  const pool = rng.shuffle(rooms.filter((r) => r.type === 'normal'));
  for (const plan of plans) {
    if (rooms.length < plan.minRooms || floor < plan.minFloor) continue;
    if (plan.chance !== undefined && plan.chance < 1 && !roomRng.chance(plan.chance)) continue;
    for (let i = 0; i < plan.count && pool.length > ROOM_RULES.minNormal; i++) pool.pop().type = plan.type;
  }
  for (const r of rooms) {
    if (r.type !== 'treasure') continue;
    r.mimic = floor >= MIMIC.minFloor && roomRng.chance(MIMIC.chance);
  }
}

export function buildTileIndices(grid, ring = WALL_RING, rng = GAME_RNG) {
  const rows = grid.length;
  const cols = grid[0].length;
  const isFloor = (x, y) => y >= 0 && y < rows && x >= 0 && x < cols && grid[y][x] === 1;
  const isWall = (x, y) => !isFloor(x, y);
  const nearFloor = (x, y) => {
    for (let dy = -ring; dy <= ring; dy++) for (let dx = -ring; dx <= ring; dx++) if (isFloor(x + dx, y + dy)) return true;
    return false;
  };
  const floor = Array.from({ length: rows }, () => new Array(cols).fill(-1));
  const walls = Array.from({ length: rows }, () => new Array(cols).fill(-1));
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (isFloor(x, y)) {
        floor[y][x] = rng.chance(0.82) ? 0 : rng.between(1, FLOOR_FRAMES.length - 1);
        continue;
      }
      if (!nearFloor(x, y)) continue;
      floor[y][x] = 0;
      walls[y][x] = AUTOTILE_LOOKUP[neighborMask(isWall, x, y)];
    }
  }
  return { floor, walls };
}

export function roomRandomTile(room, rng = GAME_RNG) {
  return {
    x: rng.between(room.x + 1, room.x + room.w - 2),
    y: rng.between(room.y + 1, room.y + room.h - 2),
  };
}

export function tileToWorld(tx, ty) {
  return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
}
