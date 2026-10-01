import { actorDepth } from '../Define.js';
import * as FX from './FX.js';
import PoseRig from '../anim/PoseRig.js';
import { WEAPON_ANIMS } from '../data/WeaponAnims.js';
import { GAME_RNG } from './Rng.js';
import { t } from '../i18n/I18n.js';
import { applyHits } from '../combat/HitFeedback.js';

export default class Actor extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, cfg) {
    super(scene, x, y, 'dungeon', `${cfg.spriteKey}_idle_anim_f0`);
    scene.add.existing(this);
    this.setScale(cfg.scale);
    scene.physics.add.existing(this);
    this.id = scene.registerEntity ? scene.registerEntity(this) : null;
    this.spriteKey = cfg.spriteKey;
    this.radius = cfg.bodyRadius * cfg.scale;
    const r = cfg.bodyRadius;
    this.body.setCircle(r, cfg.bodyOffsetX ?? this.width / 2 - r, cfg.bodyOffsetY ?? this.height - r * 2 - 1);
    this.setCollideWorldBounds(true);
    this.shadow = FX.shadowFor(scene, x, y, cfg.shadowWidth || this.displayWidth * 0.8);
    this.weapon = null;
    this.weaponRig = null;
    if (cfg.weaponFrame) {
      const anims = WEAPON_ANIMS[cfg.weaponAnim] || WEAPON_ANIMS.sword;
      this.weapon = scene.add.image(x, y, 'dungeon', cfg.weaponFrame).setOrigin(anims.origin[0], anims.origin[1]).setScale(cfg.scale);
      this.weaponRig = new PoseRig(scene, this, this.weapon, anims);
    }
    this.hasHitFrame = scene.textures.get('dungeon').has(`${cfg.spriteKey}_hit_anim_f0`);
    this.facing = 0;
    this.hitUntil = 0;
    this.lockUntil = 0;
    this.invulnUntil = 0;
    this.buffAtk = 0;
    this.buffAtkUntil = 0;
    this.shield = 0;
    this.shieldUntil = 0;
    this.dashUntil = 0;
    this.dashHits = null;
    this.stats = { atk: 1, crit: 0, maxHp: 1, maxMp: 0, lifesteal: 0 };
    this.play(`${this.spriteKey}_idle`);
  }

  get isPlayer() {
    return false;
  }

  get feetY() {
    return this.y + this.displayHeight / 2;
  }

  isLocked(time) {
    return time < this.lockUntil;
  }

  setWeaponLook(look) {
    if (!this.weapon || !look) return;
    const anims = WEAPON_ANIMS[look.anim] || WEAPON_ANIMS.sword;
    this.weapon.setFrame(look.frame);
    this.weaponRig.setAnims(anims);
  }

  playWeaponAnim(name, duration, angle) {
    if (!this.weaponRig) return false;
    const anim = this.weaponRig.has(name) ? name : 'cast';
    const ok = this.weaponRig.play(anim, duration + 60, angle);
    if (ok) this.weaponRig.update(this.scene.combatNow);
    return ok;
  }

  muzzlePoint(angle) {
    if (this.weaponRig && this.weaponRig.current) return this.weaponRig.muzzlePoint();
    return { x: this.x + Math.cos(angle) * 18, y: this.y + Math.sin(angle) * 18 - 6 };
  }

  syncVisuals() {
    this.setDepth(actorDepth(this.feetY));
    this.shadow.setPosition(this.x, this.feetY - 4);
    if (this.weaponRig) this.weaponRig.update(this.scene.combatNow);
  }

  updateAnim(time) {
    if (time > this.hitUntil) {
      const moving = this.body.velocity.length() > 5;
      this.play(`${this.spriteKey}_${moving ? 'run' : 'idle'}`, true);
    }
    this.setFlipX(Math.cos(this.facing) < 0);
  }

  hitReact(time, ms = 160) {
    if (this.hasHitFrame) {
      this.hitUntil = time + ms;
      this.anims.stop();
      this.setFrame(`${this.spriteKey}_hit_anim_f0`);
    } else {
      FX.flash(this);
    }
  }

  moveTo(x, y, speed) {
    const d = Phaser.Math.Distance.Between(this.x, this.y, x, y);
    if (d < 1) return;
    this.setVelocity(((x - this.x) / d) * speed, ((y - this.y) / d) * speed);
  }

  navigateTo(x, y, speed) {
    const nav = this.scene.nav;
    if (!nav || nav.hasLineOfSight(this.x, this.y, x, y, this.radius)) {
      this.moveTo(x, y, speed);
      return true;
    }
    const field = nav.fieldTo(x, y);
    const step = nav.nextStep(field, this.x, this.y);
    if (!step) {
      this.moveTo(x, y, speed);
      return false;
    }
    this.moveTo(step.x, step.y, speed);
    return true;
  }

  rollDamage(mult) {
    let d = this.stats.atk * mult * (1 + this.buffAtk);
    const crit = GAME_RNG.chance(this.stats.crit);
    if (crit) d *= 1.6;
    return { amount: Math.max(1, Math.round(d * GAME_RNG.floatBetween(0.9, 1.1))), crit };
  }

  onDealt(amount) {
    if (this.stats.lifesteal > 0 && amount > 0) this.heal(amount * this.stats.lifesteal);
  }

  heal(amount) {
    this.hp = Math.min(this.stats.maxHp, this.hp + amount);
  }

  tickBuffs(time) {
    if (this.buffAtkUntil && time > this.buffAtkUntil) {
      this.buffAtk = 0;
      this.buffAtkUntil = 0;
    }
    if (this.shieldUntil && time > this.shieldUntil) {
      this.shield = 0;
      this.shieldUntil = 0;
    }
  }

  applyBuff(cfg, power) {
    const time = this.scene.combatNow;
    if (cfg.buff === 'atk') {
      this.buffAtk = power;
      this.buffAtkUntil = time + cfg.duration;
    } else if (cfg.buff === 'shield') {
      this.shield = Math.round(this.stats.maxHp * power);
      this.shieldUntil = time + cfg.duration;
    }
  }

  absorbWithShield(amount) {
    if (this.shield <= 0) return amount;
    const absorbed = Math.min(this.shield, amount);
    this.shield -= absorbed;
    FX.floatText(this.scene, this.x, this.y - this.displayHeight / 2, t('game.absorb', { n: absorbed }), '#8be3ff', 13);
    return amount - absorbed;
  }

  startDash(cfg, angle, power) {
    const time = this.scene.combatNow;
    const dur = cfg.dashDuration || 180;
    this.dashUntil = time + dur;
    this.lockUntil = this.dashUntil;
    this.invulnUntil = time + dur + 60;
    this.dashHits = new Set();
    this.dashPower = power;
    this.dashBreak = cfg.breakAmt;
    this.dashImpact = cfg.impact;
    const v = cfg.distance / (dur / 1000);
    this.setVelocity(Math.cos(angle) * v, Math.sin(angle) * v);
  }

  isDashing(time) {
    return time < this.dashUntil;
  }

  dashSweep() {
    if (!this.dashPower) return;
    for (const e of this.scene.enemies.getChildren()) {
      if (!e.active || this.dashHits.has(e)) continue;
      if (Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y) > e.radius + 34) continue;
      this.dashHits.add(e);
      const r = e.takeDamage(this.rollDamage(this.dashPower), this.dashBreak, this.facing, { knockback: 160 });
      this.onDealt(r.amount);
      applyHits(this, [r], this.dashImpact);
    }
  }

  netState() {
    return {
      id: this.id,
      x: Math.round(this.x * 10) / 10,
      y: Math.round(this.y * 10) / 10,
      hp: this.hp,
      facing: Math.round(this.facing * 1000) / 1000,
    };
  }

  destroy(fromScene) {
    if (this.scene && this.scene.unregisterEntity) this.scene.unregisterEntity(this);
    if (this.shadow) this.shadow.destroy();
    if (this.weaponRig) this.weaponRig.destroy();
    super.destroy(fromScene);
  }
}
