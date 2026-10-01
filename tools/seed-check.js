import { makeRun } from '../script/js/data/Dungeons.js';

export const DEFAULT_PLAN = {
  seeds: [101, 202, 303, 404, 505],
  dungeons: ['ruins', 'catacombs', 'furnace', 'abyss'],
  floors: [1, 2, 3, 4, 5, 6, 7, 8],
};

export function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function tick(game, n = 1) {
  for (let i = 0; i < n; i++) {
    game.loop.delta = 16;
    game.step(performance.now(), 16);
  }
}

export function ensureRun(game, clsId = 'blade') {
  if (game.scene.isActive('SceneGame')) return game.scene.getScene('SceneGame');
  tick(game, 3);
  if (game.scene.isActive('SceneTitle')) {
    game.scene.getScene('SceneTitle').startNew(clsId);
    tick(game, 5);
  }
  const hub = game.scene.getScene('SceneHub');
  hub.character.run = makeRun('ruins');
  hub.startRun();
  tick(game, 10);
  return game.scene.getScene('SceneGame');
}

export function loadFloor(game, dungeonId, seed, floor) {
  let s = game.scene.getScene('SceneGame');
  s.character.run = makeRun(dungeonId, { seed });
  s.character.run.floor = floor;
  s.scene.restart({ character: s.character });
  for (let i = 0; i < 30; i++) {
    tick(game, 1);
    s = game.scene.getScene('SceneGame');
    if (game.scene.isActive('SceneGame') && s.enemies && s.enemies.children && s.dungeon && s.floor === floor && s.dungeonDef.id === dungeonId) break;
  }
  return s;
}

export function snapshotFloor(s) {
  const enemies = s.enemies.getChildren()
    .map((e) => `${e.typeId}${e.elite ? '*' : ''}@${Math.round(e.x / 8)},${Math.round(e.y / 8)}`)
    .sort()
    .join(';');
  const objects = s.interactables
    .map((it) => `${it.kind}${it.mimic ? '!' : ''}@${Math.round(it.baseX !== undefined ? it.baseX : it.x)},${Math.round(it.y)}`)
    .sort()
    .join(';');
  return {
    dungeon: s.dungeonDef.id,
    seed: s.run.seed,
    floor: s.floor,
    rooms: s.dungeon.rooms.map((r) => r.type).join(','),
    count: s.enemies.getLength(),
    hash: hashString(enemies),
    objects,
    boss: s.boss ? `${s.boss.typeId}@${Math.round(s.boss.x)},${Math.round(s.boss.y)}` : '',
  };
}

export function captureSnapshots(game, plan = DEFAULT_PLAN) {
  ensureRun(game);
  const out = [];
  for (const dungeon of plan.dungeons) {
    for (const seed of plan.seeds) {
      for (const floor of plan.floors) out.push(snapshotFloor(loadFloor(game, dungeon, seed, floor)));
    }
  }
  return out;
}

export function diffSnapshots(before, after) {
  const key = (r) => `${r.dungeon}/${r.seed}/${r.floor}`;
  const map = new Map(after.map((r) => [key(r), r]));
  const mismatches = [];
  for (const b of before) {
    const a = map.get(key(b));
    if (!a) {
      mismatches.push({ key: key(b), reason: 'missing' });
      continue;
    }
    for (const f of ['rooms', 'count', 'hash', 'objects', 'boss']) {
      if (a[f] !== b[f]) mismatches.push({ key: key(b), field: f, before: b[f], after: a[f] });
    }
  }
  return mismatches;
}

export function saveBaseline(key, data) {
  localStorage.setItem(`soma_baseline_${key}`, JSON.stringify(data));
}

export function loadBaseline(key) {
  const raw = localStorage.getItem(`soma_baseline_${key}`);
  return raw ? JSON.parse(raw) : null;
}

export function measurePerf(game, frames = 300) {
  const s = game.scene.getScene('SceneGame');
  for (const e of s.enemies.getChildren()) e.aggro = true;
  let total = 0;
  let n = 0;
  for (let i = 0; i < frames; i++) {
    tick(game, 1);
    s.player.hp = s.player.stats.maxHp;
    if (i >= 30) {
      total += s.perfUpdateMs;
      n++;
    }
  }
  return { enemies: s.enemies.getLength(), avgUpdateMs: +(total / n).toFixed(3), frames: n };
}
