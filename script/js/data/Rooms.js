export const ROOM_PLAN = [
  { type: 'treasure', count: 1, minRooms: 5, minFloor: 1 },
  { type: 'elite', count: 1, minRooms: 6, minFloor: 2 },
  { type: 'spring', count: 1, minRooms: 8, minFloor: 2, chance: 0.5 },
];

export const SPRING = { hpRatio: 0.4, mpRatio: 0.5 };

export const MIMIC = { chance: 0.2, minFloor: 3, goldMul: 1.5, rarityBonus: 4, shakeRange: 2.5 };

export const ROOM_RULES = { minNormal: 2 };

export const ROOM_PROPS = {
  normal: { frames: ['crate', 'skull'], count: [0, 2] },
  treasure: { frames: ['crate', 'crate', 'skull'], count: [3, 5] },
  elite: { frames: ['skull', 'skull', 'crate'], count: [3, 6] },
  spawn: { frames: [], count: [0, 0] },
  exit: { frames: ['skull'], count: [0, 1] },
  spring: { frames: ['crate'], count: [0, 1] },
};

export const ELITE = {
  hp: 1.8,
  atk: 1.3,
  xp: 2.5,
  gold: 3,
  breakMax: 1.5,
  scale: 1.15,
  dropRarityBonus: 6,
};

export const CHEST = {
  goldBase: 15,
  goldPerLevel: 6,
  itemRarityBonus: 8,
  secondItemChance: 0.5,
  secondItemMinRarity: 'magic',
};
