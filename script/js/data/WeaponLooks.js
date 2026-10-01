import { GAME_RNG } from '../core/Rng.js';

export const WEAPON_LOOKS = {
  blade: [
    { id: 'rusty_sword', frame: 'weapon_rusty_sword', anim: 'sword', minTier: 0 },
    { id: 'regular_sword', frame: 'weapon_regular_sword', anim: 'sword', minTier: 0 },
    { id: 'knight_sword', frame: 'weapon_knight_sword', anim: 'sword', minTier: 1 },
    { id: 'duel_sword', frame: 'weapon_duel_sword', anim: 'sword', minTier: 1 },
    { id: 'golden_sword', frame: 'weapon_golden_sword', anim: 'sword', minTier: 2 },
    { id: 'anime_sword', frame: 'weapon_anime_sword', anim: 'sword', minTier: 2 },
    { id: 'red_gem_sword', frame: 'weapon_red_gem_sword', anim: 'sword', minTier: 2 },
  ],
  archer: [
    { id: 'bow', frame: 'weapon_bow', anim: 'bow', minTier: 0 },
    { id: 'bow_2', frame: 'weapon_bow_2', anim: 'bow', minTier: 1 },
  ],
  caster: [
    { id: 'green_staff', frame: 'weapon_green_magic_staff', anim: 'staff', minTier: 0 },
    { id: 'red_staff', frame: 'weapon_red_magic_staff', anim: 'staff', minTier: 1 },
  ],
};

export function defaultLook(clsId) {
  return WEAPON_LOOKS[clsId][0];
}

export function lookById(clsId, id) {
  return WEAPON_LOOKS[clsId].find((l) => l.id === id) || null;
}

export function rollLook(clsId, tier, rng = GAME_RNG) {
  const pool = WEAPON_LOOKS[clsId].filter((l) => l.minTier <= tier);
  const top = Math.max(...pool.map((l) => l.minTier));
  const best = pool.filter((l) => l.minTier === top);
  return rng.pick(best);
}

export function weaponLookFor(clsId, item) {
  if (!item) return defaultLook(clsId);
  const byId = item.look ? lookById(clsId, item.look) : null;
  if (byId) return byId;
  const pool = WEAPON_LOOKS[clsId].filter((l) => l.minTier <= (item.tier || 0));
  return pool[pool.length - 1] || defaultLook(clsId);
}
