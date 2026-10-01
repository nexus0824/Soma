export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;
export const TILE = 48;
export const PIXEL_SCALE = 3;
export const MAP_COLS = 44;
export const MAP_ROWS = 40;
export const MAX_INVENTORY = 20;
export const SAVE_KEY = 'soma_html5_save_v1';
export const FONT = '"Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", Arial, sans-serif';

export const DEPTH = {
  FLOOR: 0,
  DECAL: 1,
  SHADOW: 2,
  LOOT: 3,
  ACTOR: 10,
  PROJECTILE: 5000,
  FX: 6000,
  BAR: 7000,
  TEXT: 8000,
};

export const RARITY = {
  common: { color: 0xd0d0d0, css: '#d0d0d0', affixes: 0, weight: 60, price: 1 },
  magic: { color: 0x5ea9ff, css: '#5ea9ff', affixes: 1, weight: 28, price: 2.5 },
  rare: { color: 0xffd23f, css: '#ffd23f', affixes: 2, weight: 10, price: 6 },
  unique: { color: 0xff7b3a, css: '#ff7b3a', affixes: 3, weight: 2, price: 15 },
};

export function xpToNext(level) {
  return Math.floor(40 * Math.pow(level, 1.45));
}

export function actorDepth(y) {
  return DEPTH.ACTOR + y;
}
