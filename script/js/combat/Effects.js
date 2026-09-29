import * as FX from '../core/FX.js';
import { t } from '../i18n/I18n.js';
import { applyHits } from './HitFeedback.js';

const EFFECTS = {
  arc(actor, cfg, angle, power) {
    const scene = actor.scene;
    FX.slash(scene, actor.x + Math.cos(angle) * 30, actor.y + Math.sin(angle) * 30, angle, cfg.color || 0xffffff, cfg.fx || 1, !!cfg.mirror);
    return landHits(actor, cfg, scene.meleeHit(actor.x, actor.y, angle, cfg.range, cfg.arc, () => actor.rollDamage(power), cfg.breakAmt, actor, cfg.knockback));
  },

  projectile(actor, cfg, angle, power) {
    const m = actor.muzzlePoint ? actor.muzzlePoint(angle) : { x: actor.x + Math.cos(angle) * 18, y: actor.y + Math.sin(angle) * 18 - 6 };
    actor.scene.fireProjectile('player', m.x, m.y, angle, {
      texture: cfg.texture, speed: cfg.speed, range: cfg.range, size: cfg.size, pierce: !!cfg.pierce,
      damage: actor.rollDamage(power), breakAmt: cfg.breakAmt, knockback: cfg.knockback, tint: cfg.color, source: actor, impact: cfg.impact,
    });
    return 0;
  },

  multishot(actor, cfg, angle, power) {
    for (let k = 0; k < cfg.count; k++) {
      const off = Phaser.Math.DegToRad(cfg.spread) * (k - (cfg.count - 1) / 2);
      EFFECTS.projectile(actor, cfg, angle + off, power);
    }
    return 0;
  },

  aoe(actor, cfg, angle, power) {
    const scene = actor.scene;
    FX.ring(scene, actor.x, actor.y, cfg.radius, cfg.color || 0xffffff, 350, 6);
    FX.burst(scene, actor.x, actor.y, cfg.color || 0xffffff, 12, cfg.radius);
    return landHits(actor, cfg, scene.aoeHit(actor.x, actor.y, cfg.radius, () => actor.rollDamage(power), cfg.breakAmt, effectsOf(actor, cfg), actor, cfg.knockback));
  },

  aoe_forward(actor, cfg, angle, power) {
    const scene = actor.scene;
    const tx = actor.x + Math.cos(angle) * cfg.offset;
    const ty = actor.y + Math.sin(angle) * cfg.offset;
    FX.ring(scene, tx, ty, cfg.radius, cfg.color || 0xffffff, 400, 6);
    FX.burst(scene, tx, ty, cfg.color || 0xffffff, 16, cfg.radius * 0.8);
    return landHits(actor, cfg, scene.aoeHit(tx, ty, cfg.radius, () => actor.rollDamage(power), cfg.breakAmt, effectsOf(actor, cfg), actor, cfg.knockback));
  },

  buff(actor, cfg, angle, power) {
    actor.applyBuff(cfg, power);
    FX.ring(actor.scene, actor.x, actor.y, 60, cfg.color || 0xffffff, 500, 5);
    if (cfg.id) FX.floatText(actor.scene, actor.x, actor.y - actor.displayHeight / 2 - 10, t(`skill.${cfg.id}.name`), FX.cssColor(cfg.color || 0xffffff), 16);
    return 0;
  },

  dash(actor, cfg, angle, power) {
    actor.startDash(cfg, angle, power);
    FX.burst(actor.scene, actor.x, actor.y, cfg.color || 0xffffff, 10, 40);
    return 0;
  },
};

function landHits(actor, cfg, results) {
  applyHits(actor, results, cfg.impact);
  return results.length;
}

function effectsOf(actor, cfg) {
  return {
    slow: cfg.slow,
    burn: cfg.burn ? { damage: Math.max(1, Math.round(actor.stats.atk * cfg.burn)), duration: cfg.burnDuration } : null,
  };
}

export function registerEffect(type, fn) {
  EFFECTS[type] = fn;
}

export function hasEffect(type) {
  return !!EFFECTS[type];
}

export function runEffect(actor, cfg, angle, power) {
  const fn = EFFECTS[cfg.type];
  if (!fn) {
    console.warn(`unknown effect type: ${cfg.type}`);
    return 0;
  }
  return fn(actor, cfg, angle, power);
}
