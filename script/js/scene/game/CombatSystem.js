import { BALANCE } from '../../data/Balance.js';
import * as FX from '../../core/FX.js';
import { applyHits } from '../../combat/HitFeedback.js';

export default class CombatSystem {
  constructor(scene) {
    this.scene = scene;
    this.now = 0;
    this.hitStopEnd = 0;
  }

  meleeHit(x, y, angle, range, arcDeg, dmgFn, breakAmt, source = this.scene.player, knockback) {
    const half = Phaser.Math.DegToRad(arcDeg / 2);
    const results = [];
    for (const e of [...this.scene.enemies.getChildren()]) {
      if (!e.active) continue;
      if (Phaser.Math.Distance.Between(x, y, e.x, e.y) - e.radius > range) continue;
      const a = Phaser.Math.Angle.Between(x, y, e.x, e.y);
      if (Math.abs(Phaser.Math.Angle.Wrap(a - angle)) > half) continue;
      const r = e.takeDamage(dmgFn(), breakAmt, a, { knockback });
      source.onDealt(r.amount);
      results.push(r);
    }
    return results;
  }

  aoeHit(x, y, radius, dmgFn, breakAmt, effects = {}, source = this.scene.player, knockback) {
    const now = this.now;
    const results = [];
    for (const e of [...this.scene.enemies.getChildren()]) {
      if (!e.active) continue;
      if (Phaser.Math.Distance.Between(x, y, e.x, e.y) - e.radius > radius) continue;
      const a = Phaser.Math.Angle.Between(x, y, e.x, e.y);
      if (effects.slow) e.slowUntil = now + effects.slow;
      if (effects.burn) {
        e.dotUntil = now + effects.burn.duration;
        e.dotDamage = effects.burn.damage;
        e.nextDot = now + 500;
      }
      const r = e.takeDamage(dmgFn(), breakAmt, a, { knockback });
      source.onDealt(r.amount);
      results.push(r);
    }
    return results;
  }

  fireProjectile(owner, x, y, angle, cfg) {
    const c = { ...cfg };
    if (c.texture === 'arrow') {
      c.atlasFrame = 'weapon_arrow';
      c.rotationOffset = Math.PI / 2;
      c.scale = 2;
    }
    if (c.texture === 'proj_wave') c.scale = 1.5;
    const group = owner === 'player' ? this.scene.playerProjectiles : this.scene.enemyProjectiles;
    const p = group.get(x, y);
    if (!p) return null;
    p.fire(owner, x, y, angle, c);
    return p;
  }

  onProjectileHitEnemy(a, b) {
    const p = a.cfg ? a : b;
    const e = a.cfg ? b : a;
    if (!p.cfg || !p.hits || !p.active || !e.active || p.hits.has(e)) return;
    p.hits.add(e);
    const angle = p.rotation - (p.cfg.rotationOffset || 0);
    const r = e.takeDamage(p.cfg.damage, p.cfg.breakAmt, angle, { knockback: p.cfg.knockback });
    const source = p.cfg.source && p.cfg.source.active ? p.cfg.source : this.scene.player;
    source.onDealt(r.amount);
    applyHits(source, [r], p.cfg.impact);
    if (!p.cfg.pierce) p.kill();
  }

  onProjectileHitParty(a, b) {
    const p = a.cfg ? a : b;
    const target = a.cfg ? b : a;
    if (!p.cfg || !p.active || target.dead || target.downed) return;
    p.kill();
    FX.burst(this.scene, p.x, p.y, 0xff5cd6, 5, 20);
    target.takeDamage(p.cfg.damage, this.now);
  }

  hitStop(ms) {
    const scene = this.scene;
    const end = scene.time.now + ms;
    if (end <= this.hitStopEnd) return;
    this.hitStopEnd = end;
    const s = BALANCE.hitStopScale;
    scene.physics.world.pause();
    scene.anims.globalTimeScale = s;
    scene.tweens.timeScale = s;
  }

  clearHitStop() {
    const scene = this.scene;
    if (scene.physics && scene.physics.world) scene.physics.world.resume();
    if (scene.anims) scene.anims.globalTimeScale = 1;
    if (scene.tweens) scene.tweens.timeScale = 1;
    this.hitStopEnd = 0;
  }

  advanceCombatClock(delta) {
    if (this.hitStopEnd && this.scene.time.now >= this.hitStopEnd) this.clearHitStop();
    const d = this.hitStopEnd ? delta * BALANCE.hitStopScale : delta;
    this.now += d;
    return d;
  }
}
