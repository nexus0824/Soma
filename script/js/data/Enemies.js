export const ENEMIES = {
  goblin: {
    sprite: 'goblin', scale: 3, bodyRadius: 5, hp: 46, atk: 12, def: 0, speed: 170, xp: 8, gold: 2, color: 0x8be36a,
    behavior: 'chase', attackRange: 30, attackCooldown: 800, windup: 280, breakMax: 30, aggroRange: 330,
  },
  shaman: {
    sprite: 'orc_shaman', scale: 3, bodyRadius: 5, hp: 62, atk: 15, def: 1, speed: 115, xp: 15, gold: 3, color: 0xb07cff,
    behavior: 'ranged', attackRange: 300, retreat: { trigger: 120, stop: 170 }, attackCooldown: 1500, projectileSpeed: 340,
    breakMax: 40, aggroRange: 380,
  },
  ogre: {
    sprite: 'ogre', scale: 2.4, bodyRadius: 9, hp: 190, atk: 26, def: 4, speed: 95, xp: 26, gold: 5, color: 0xd0684a,
    behavior: 'chase', attackRange: 50, attackCooldown: 1400, windup: 450, breakMax: 90, aggroRange: 320, knockbackResist: 0.6,
  },
  skeleton: {
    sprite: 'skelet', scale: 3, bodyRadius: 5, hp: 88, atk: 17, def: 3, speed: 145, xp: 18, gold: 3, color: 0xe8eef5,
    behavior: 'chase', attackRange: 30, attackCooldown: 750, windup: 240, breakMax: 45, aggroRange: 350,
  },
  chort: {
    sprite: 'chort', scale: 3, bodyRadius: 5, hp: 135, atk: 23, def: 3, speed: 185, xp: 30, gold: 5, color: 0xff5c5c,
    behavior: 'chase', attackRange: 32, attackCooldown: 650, windup: 200, breakMax: 60, aggroRange: 400,
  },
  guardian: {
    sprite: 'big_demon', scale: 3, bodyRadius: 11, hp: 1100, atk: 36, def: 8, speed: 100, xp: 320, gold: 60, color: 0xff5c8a,
    behavior: 'chase', attackRange: 64, attackCooldown: 1300, windup: 480, projectileSpeed: 280,
    breakMax: 240, aggroRange: 600, boss: true, knockbackResist: 1,
    abilities: [
      { type: 'ring', first: 2500, cooldown: 4000, count: 12, speed: 280, range: 440, damageMul: 0.8 },
      { type: 'summon', first: 5000, cooldown: 8000, count: 4, minion: 'goblin', cap: 20 },
    ],
  },
};

export function pickWeighted(table) {
  const total = table.reduce((s, t) => s + t.w, 0);
  let roll = Math.random() * total;
  for (const t of table) {
    roll -= t.w;
    if (roll <= 0) return t.id;
  }
  return table[table.length - 1].id;
}
