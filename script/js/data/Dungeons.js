import { MODIFIER_IDS } from './Modifiers.js';
import { Rng, hashString, GAME_RNG } from '../core/Rng.js';

export const DUNGEONS = {
  ruins: {
    id: 'ruins',
    order: 0, floors: 8, baseLevel: 1, requires: null, boss: 'guardian', bossEvery: 4,
    tint: 0xffffff, rarityBonus: 0, dropBias: { slot: 'weapon', weight: 0.45 }, modifiers: [],
    spawn: [
      { id: 'goblin', w: 60 },
      { id: 'shaman', w: 25 },
      { id: 'brute', w: 15, minFloor: 2 },
      { id: 'ogre', w: 12, minFloor: 3 },
      { id: 'bomber', w: 12, minFloor: 4 },
    ],
    gen: { roomCount: 8, roomW: [5, 9], roomH: [4, 7] },
  },
  catacombs: {
    id: 'catacombs',
    order: 1, floors: 10, baseLevel: 9, requires: 'ruins', boss: 'guardian', bossEvery: 5,
    tint: 0xa9b8d8, rarityBonus: 3, dropBias: { slot: 'chest', weight: 0.45 }, modifiers: ['ironhide'],
    spawn: [
      { id: 'skeleton', w: 55 },
      { id: 'shaman', w: 25 },
      { id: 'goblin', w: 20 },
      { id: 'warden', w: 18 },
      { id: 'bomber', w: 10, minFloor: 3 },
      { id: 'chort', w: 12, minFloor: 6 },
    ],
    gen: { roomCount: 11, roomW: [4, 7], roomH: [3, 6] },
  },
  furnace: {
    id: 'furnace',
    order: 2, floors: 10, baseLevel: 19, requires: 'catacombs', boss: 'guardian', bossEvery: 5,
    tint: 0xffb28a, rarityBonus: 6, dropBias: { slot: 'ring', weight: 0.45 }, modifiers: ['swift'],
    spawn: [
      { id: 'chort', w: 45 },
      { id: 'ogre', w: 35 },
      { id: 'brute', w: 25 },
      { id: 'skeleton', w: 20 },
      { id: 'warden', w: 15, minFloor: 4 },
    ],
    gen: { roomCount: 9, roomW: [6, 10], roomH: [5, 8] },
  },
  abyss: {
    id: 'abyss',
    order: 3, floors: Infinity, endless: true, baseLevel: 30, perFloor: 0.2, requires: 'furnace', boss: 'guardian', bossEvery: 5,
    tint: 0xb48cff, rarityBonus: 10, dropBias: null, modifiers: [],
    spawn: [
      { id: 'goblin', w: 30 },
      { id: 'shaman', w: 25 },
      { id: 'skeleton', w: 30 },
      { id: 'ogre', w: 25 },
      { id: 'chort', w: 30 },
      { id: 'brute', w: 25 },
      { id: 'warden', w: 20 },
      { id: 'bomber', w: 15 },
    ],
    gen: { roomCount: 10, roomW: [5, 9], roomH: [4, 7] },
  },
};

export const DUNGEON_ORDER = Object.values(DUNGEONS).sort((a, b) => a.order - b.order).map((d) => d.id);
export const DAILY_FLOORS = 5;

export function isUnlocked(def, character) {
  return !def.requires || !!character.progress.cleared[def.requires];
}

export function spawnTableFor(def, floor) {
  return def.spawn.filter((s) => !s.minFloor || floor >= s.minFloor);
}

export function difficultyLevel(def, floor) {
  return def.baseLevel + floor - 1;
}

export function isBossFloor(def, floor, floors) {
  if (def.endless) return floor % def.bossEvery === 0;
  if (Number.isFinite(floors) && floor === floors) return true;
  return floor % def.bossEvery === 0 && floor < floors;
}

export function dateKey(date = new Date()) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
}

export function getDaily(character, date = new Date()) {
  const key = dateKey(date);
  const rng = new Rng(hashString(`soma-daily-${key}`));
  const unlocked = DUNGEON_ORDER.filter((id) => !DUNGEONS[id].endless && isUnlocked(DUNGEONS[id], character));
  const rolled = rng.pick(unlocked) || 'ruins';
  const pinned = character.progress.dailyPick;
  const dungeonId = pinned && pinned.key === key ? pinned.dungeonId : rolled;
  character.progress.dailyPick = { key, dungeonId };
  const pool = MODIFIER_IDS.filter((id) => id !== 'bounty');
  const mods = [];
  while (mods.length < 2 && pool.length) mods.push(pool.splice(Math.floor(rng.next() * pool.length), 1)[0]);
  mods.push('bounty');
  return { key, dungeonId, modifiers: mods, floors: DAILY_FLOORS, done: character.progress.dailyDone === key };
}

export function makeRun(dungeonId, opts = {}) {
  const def = DUNGEONS[dungeonId];
  return {
    dungeonId,
    floor: 1,
    floors: opts.floors ?? def.floors,
    modifiers: opts.modifiers ?? def.modifiers,
    daily: !!opts.daily,
    dateKey: opts.dateKey || null,
    seed: opts.seed ?? (opts.daily && opts.dateKey ? hashString(`soma-daily-run-${opts.dateKey}`) : GAME_RNG.between(1, 2147483646)),
  };
}
