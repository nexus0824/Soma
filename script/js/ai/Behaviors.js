import * as FX from '../core/FX.js';
import { t } from '../i18n/I18n.js';

const BEHAVIORS = {
  chase(e, ctx) {
    const { target, dist, time, speed } = ctx;
    if (dist > e.def.attackRange + target.radius) e.navigateTo(target.x, target.y, speed);
    else {
      e.stopMoving();
      if (time >= e.nextAttack) e.startMelee(time, target);
    }
  },

  ranged(e, ctx) {
    const { target, dist, dx, dy, time, speed } = ctx;
    const nav = e.scene.nav;
    const visible = !nav || nav.hasLineOfSight(e.x, e.y, target.x, target.y);
    if (dist > e.def.attackRange || !visible) e.navigateTo(target.x, target.y, speed);
    else if (dist < e.def.keepDistance) e.moveToward(-dx, -dy, dist, speed);
    else e.stopMoving();
    if (visible && dist <= e.def.attackRange && time >= e.nextAttack) e.shoot(time, Math.atan2(dy, dx));
  },
};

const ABILITIES = {
  ring(e, cfg) {
    for (let i = 0; i < cfg.count; i++) {
      const a = (Math.PI * 2 * i) / cfg.count;
      e.scene.fireProjectile('enemy', e.x, e.y, a, {
        texture: 'proj_enemy', speed: cfg.speed, range: cfg.range, size: 12, damage: Math.round(e.atk * (cfg.damageMul || 1)),
      });
    }
    FX.ring(e.scene, e.x, e.y, 60, e.def.color, 400, 5);
  },

  summon(e, cfg) {
    e.scene.summonMinions(e, cfg.count, cfg.minion, cfg.cap);
    FX.floatText(e.scene, e.x, e.y - e.displayHeight / 2 - 10, t('game.summon'), '#ff8ab0', 16);
  },
};

export function registerBehavior(id, fn) {
  BEHAVIORS[id] = fn;
}

export function registerAbility(id, fn) {
  ABILITIES[id] = fn;
}

export function runBehavior(id, e, ctx) {
  const fn = BEHAVIORS[id] || BEHAVIORS.chase;
  fn(e, ctx);
}

export function runAbility(id, e, cfg) {
  const fn = ABILITIES[id];
  if (!fn) {
    console.warn(`unknown ability type: ${id}`);
    return;
  }
  fn(e, cfg);
}
