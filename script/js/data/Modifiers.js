export const MODIFIERS = {
  swift: { enemySpeedMul: 1.35 },
  ironhide: { breakMaxMul: 2 },
  drought: { partyMpRegenMul: 0.5 },
  swarm: { enemyCountMul: 1.5, enemyHpMul: 0.7 },
  bounty: { dropChanceMul: 2 },
  elite: { enemyAtkMul: 1.3, xpMul: 1.4 },
};

export const MODIFIER_IDS = Object.keys(MODIFIERS);

const DEFAULTS = {
  enemySpeedMul: 1,
  enemyHpMul: 1,
  enemyAtkMul: 1,
  enemyCountMul: 1,
  breakMaxMul: 1,
  partyMpRegenMul: 1,
  dropChanceMul: 1,
  xpMul: 1,
};

export function combineModifiers(ids = []) {
  const out = { ...DEFAULTS, ids: [...ids] };
  for (const id of ids) {
    const m = MODIFIERS[id];
    if (!m) continue;
    for (const key of Object.keys(DEFAULTS)) if (m[key] !== undefined) out[key] *= m[key];
  }
  return out;
}
