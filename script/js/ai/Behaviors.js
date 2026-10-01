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
    const r = e.retreatParams();
    if (e.retreatUntil > time && dist > r.stop) e.retreatUntil = 0;
    if (e.retreatUntil <= time && visible && dist < r.trigger && time >= e.nextRetreat) e.beginRetreat(time, dx, dy);
    if (e.retreatUntil > time) {
      e.desired.set(e.retreatDir.x * speed * r.speedMul, e.retreatDir.y * speed * r.speedMul);
      return;
    }
    if (dist > e.def.attackRange || !visible) e.navigateTo(target.x, target.y, speed);
    else e.stopMoving();
    if (visible && dist <= e.def.attackRange && time >= e.nextAttack) e.shoot(time, Math.atan2(dy, dx));
  },

  kamikaze(e, ctx) {
    const { target, dist, time, speed } = ctx;
    const fuse = e.def.fuse;
    if (dist > e.def.attackRange + target.radius) {
      e.navigateTo(target.x, target.y, speed);
      return;
    }
    e.stopMoving();
    if (time < e.nextAttack) return;
    e.nextAttack = time + e.def.attackCooldown;
    const tg = e.scene.hazards.telegraph({ shape: 'circle', x: e.x, y: e.y, radius: fuse.radius, duration: fuse.windup, color: e.def.color });
    e.beginCast(time, fuse.windup, () => {
      e.scene.hazards.blastAt(e.x, e.y, fuse.radius, Math.round(e.atk * (fuse.damageMul || 1)), { color: e.def.color, shake: 0.006 });
      e.suicide = true;
      e.die(null);
    }, tg, 0xffffff);
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

  slam(e, cfg) {
    const t = e.target;
    if (!t) return;
    const x = t.x;
    const y = t.y;
    const tg = e.scene.hazards.telegraph({ shape: 'circle', x, y, radius: cfg.radius, duration: cfg.windup, color: e.def.color });
    e.beginCast(e.scene.combatNow, cfg.windup, () => {
      e.scene.hazards.blastAt(x, y, cfg.radius, Math.round(e.atk * (cfg.damageMul || 1)), { color: e.def.color, shake: 0.006, shakeMs: 150 });
    }, tg);
  },

  charge(e, cfg) {
    const t = e.target;
    if (!t) return;
    const angle = Phaser.Math.Angle.Between(e.x, e.y, t.x, t.y);
    const full = (cfg.speed * cfg.duration) / 1000;
    const length = e.scene.nav.clearLength(e.x, e.y, angle, full) + e.radius;
    const tg = e.scene.hazards.telegraph({ shape: 'line', x: e.x, y: e.y, angle, length, width: e.radius * 2 + 10, duration: cfg.windup, color: e.def.color });
    e.beginCast(e.scene.combatNow, cfg.windup, (time) => e.startCharge(time, angle, cfg), tg);
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
