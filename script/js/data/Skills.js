export const SKILLS = {
  slash_wave: {
    cost: 8, cooldown: 2200, type: 'projectile', damage: 1.8, perLevel: 0.3,
    speed: 520, range: 320, texture: 'proj_wave', size: 26, pierce: true, breakAmt: 20, color: 0x9ff0ff, maxLevel: 5, impact: 'medium',
  },
  spin: {
    cost: 14, cooldown: 5000, type: 'aoe', radius: 120, damage: 1.5, perLevel: 0.3,
    breakAmt: 45, color: 0x9ff0ff, maxLevel: 5, impact: 'medium',
  },
  war_cry: {
    cost: 12, cooldown: 12000, type: 'buff', buff: 'atk', value: 0.35, perLevel: 0.08, duration: 6000,
    color: 0xffb04a, maxLevel: 5,
  },
  triple_shot: {
    cost: 7, cooldown: 1800, type: 'multishot', count: 3, spread: 16, damage: 0.9, perLevel: 0.2,
    speed: 640, range: 380, texture: 'proj_shot', size: 12, breakAmt: 8, color: 0xffd23f, maxLevel: 5, impact: 'medium',
  },
  pierce_shot: {
    cost: 12, cooldown: 4500, type: 'projectile', damage: 2.4, perLevel: 0.4,
    speed: 820, range: 520, texture: 'proj_pierce', size: 16, pierce: true, breakAmt: 30, color: 0xffe36a, maxLevel: 5, impact: 'medium',
  },
  dash: {
    cost: 6, cooldown: 3500, type: 'dash', distance: 200, damage: 1.0, perLevel: 0.2,
    breakAmt: 10, color: 0x8be3ff, maxLevel: 5, impact: 'medium',
  },
  arrow_rain: {
    cost: 13, cooldown: 4200, type: 'aoe_forward', offset: 150, radius: 95, damage: 1.7, perLevel: 0.3,
    slow: 1500, breakAmt: 16, knockback: 60, color: 0xffe36a, maxLevel: 5, impact: 'medium',
  },
  fire_burst: {
    cost: 14, cooldown: 3200, type: 'aoe_forward', offset: 150, radius: 95, damage: 2.0, perLevel: 0.35,
    burn: 0.15, burnDuration: 3000, breakAmt: 15, color: 0xff7b3a, maxLevel: 5, impact: 'medium',
  },
  frost_nova: {
    cost: 12, cooldown: 5500, type: 'aoe', radius: 140, damage: 1.1, perLevel: 0.25,
    slow: 3500, breakAmt: 25, color: 0x9fd8ff, maxLevel: 5, impact: 'medium',
  },
  soma_shield: {
    cost: 15, cooldown: 14000, type: 'buff', buff: 'shield', value: 0.4, perLevel: 0.1, duration: 8000,
    color: 0x8be3ff, maxLevel: 5,
  },
};

export function skillPower(skill, level) {
  const lv = Math.max(1, level || 1);
  return (skill.damage !== undefined ? skill.damage : skill.value) + skill.perLevel * (lv - 1);
}
