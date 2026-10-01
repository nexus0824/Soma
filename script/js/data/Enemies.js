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
    abilities: [
      { type: 'slam', first: 2000, cooldown: 5000, range: 150, windup: 750, radius: 85, damageMul: 1.6 },
    ],
  },
  brute: {
    sprite: 'orc_warrior', scale: 3, bodyRadius: 6, hp: 120, atk: 20, def: 3, speed: 130, xp: 22, gold: 4, color: 0xd9a066,
    behavior: 'chase', attackRange: 34, attackCooldown: 900, windup: 300, breakMax: 70, aggroRange: 360, knockbackResist: 0.3,
    abilities: [
      { type: 'charge', first: 300, cooldown: 4500, range: 320, minRange: 80, windup: 550, speed: 560, duration: 450, damageMul: 1.4, recovery: 350, wallStun: 900 },
    ],
  },
  bomber: {
    sprite: 'tiny_zombie', scale: 3, bodyRadius: 4, hp: 34, atk: 28, def: 0, speed: 205, xp: 12, gold: 2, color: 0x9be36a,
    behavior: 'kamikaze', attackRange: 40, attackCooldown: 800, breakMax: 25, aggroRange: 380,
    fuse: { windup: 650, radius: 80, damageMul: 1.3 },
    deathBlast: { radius: 60, damageMul: 0.7, delay: 500 },
  },
  warden: {
    sprite: 'masked_orc', scale: 3, bodyRadius: 6, hp: 150, atk: 18, def: 5, speed: 120, xp: 24, gold: 4, color: 0x7fb3ff,
    behavior: 'chase', attackRange: 34, attackCooldown: 1000, windup: 350, breakMax: 80, aggroRange: 340, knockbackResist: 0.5,
    guard: { arc: 130, mul: 0.25, breakMul: 0.5 },
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
      { type: 'slam', first: 3500, cooldown: 6000, range: 200, windup: 900, radius: 120, damageMul: 1.3 },
      { type: 'charge', first: 6000, cooldown: 7000, range: 420, minRange: 140, windup: 700, speed: 600, duration: 550, damageMul: 1.2, recovery: 400, wallStun: 1200 },
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
