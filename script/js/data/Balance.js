export const BALANCE = {
  defenseK: 40,
  defenseKPerLevel: 4,
  enemyDefenseK: 30,
  playerInvulnMs: 250,
  companionInvulnMs: 250,
  companionDamageMul: 0.6,
  companionAttackSpeedMul: 1.5,
  enemyCountBase: 16,
  enemyCountPerFloor: 4,
  enemyCountMax: 50,
  bossFloorCountMul: 0.6,
  packMin: 4,
  packMax: 7,
  packRadius: 70,
  packAlertRange: 240,
  enemyHpPerLevel: 0.22,
  enemyAtkPerLevel: 0.13,
  enemyXpPerLevel: 0.15,
  enemyGoldPerLevel: 0.2,
  levelUpHealRatio: 0.5,
  aiThinkMs: 100,
  aggroNeedsSight: true,
  playerAggroBias: 1.6,
  separationStrength: 1.1,
  separationHoldMul: 0.4,
  separationMargin: 6,
  separationRange: 120,
  steerSmoothing: 0.35,
  stuckCheckMs: 400,
  stuckMinMove: 8,
  sidestepMs: 350,
  hitStopScale: 0,
  bossEnrage: { after: 120000, step: 10000, perStep: 0.1, max: 1.0 },
  drops: { itemChance: 0.05, goldChance: 0.4, goldMul: 1.5, commonUntilFloor: 2, elitePackBonusChance: 0.5, pityKills: 18 },
  hitStaggerMs: 0,
  retreat: { trigger: 120, stop: 170, duration: 400, cooldown: 2500, speedMul: 1.5, probeDeg: [0, 40, -40, 80, -80, 115, -115], probeDist: 90 },
  dodge: { distance: 170, duration: 170, cooldown: 2500, invulnExtra: 60, ghostEvery: 40 },
};

export function defenseKFor(level) {
  return BALANCE.defenseK + BALANCE.defenseKPerLevel * (Math.max(1, level) - 1);
}

export function mitigate(raw, defense, k = BALANCE.defenseK) {
  if (defense <= 0) return raw;
  return raw * (1 - defense / (defense + k));
}
