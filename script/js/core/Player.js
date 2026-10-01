import { xpToNext, PIXEL_SCALE } from '../Define.js';
import { SKILLS, skillPower } from '../data/Skills.js';
import Actor from './Actor.js';
import AttackController from '../combat/AttackController.js';
import { runEffect } from '../combat/Effects.js';
import * as FX from './FX.js';
import { t } from '../i18n/I18n.js';
import { BALANCE, mitigate } from '../data/Balance.js';
import { InputState } from './InputState.js';
import { weaponLookFor } from '../data/WeaponLooks.js';
import { GAME_RNG } from './Rng.js';

export default class Player extends Actor {
  constructor(scene, x, y, character) {
    const cls = character.cls;
    super(scene, x, y, { spriteKey: cls.sprite, scale: PIXEL_SCALE, bodyRadius: 6, bodyOffsetX: 2, bodyOffsetY: 15, shadowWidth: 40, weaponFrame: weaponLookFor(character.clsId, character.equipment.weapon).frame, weaponAnim: weaponLookFor(character.clsId, character.equipment.weapon).anim });
    this.character = character;
    this.cls = cls;
    this.clsId = character.clsId;
    this.recalc();
    this.hp = this.stats.maxHp;
    this.mp = this.stats.maxMp;
    this.attacks = new AttackController(this, cls.combo, cls.comboWindow, 1);
    this.skillReady = [0, 0, 0];
    this.dodgeReady = 0;
    this.nextGhost = 0;
    this.dead = false;
  }

  get isPlayer() {
    return true;
  }

  get stats() {
    return this.character ? this.character.stats : this.fallbackStats;
  }

  set stats(v) {
    if (this.character) this.character.stats = v;
    else this.fallbackStats = v;
  }

  get level() { return this.character.level; }
  get xp() { return this.character.xp; }
  get gold() { return this.character.gold; }
  set gold(v) { this.character.gold = v; }
  get equipment() { return this.character.equipment; }
  get inventory() { return this.character.inventory; }
  get skillLevels() { return this.character.skillLevels; }
  get skillPoints() { return this.character.skillPoints; }

  recalc() {
    this.character.recalc();
    this.hp = Math.min(this.hp ?? this.stats.maxHp, this.stats.maxHp);
    this.mp = Math.min(this.mp ?? this.stats.maxMp, this.stats.maxMp);
    this.setWeaponLook(weaponLookFor(this.clsId, this.equipment.weapon));
  }

  update(time, delta, move, actions) {
    if (this.dead) return;
    const s = this.stats;
    if (!this.isDashing(time) && !this.scene.isFloorAt(this.body.center.x, this.body.center.y)) this.scene.placeActorAt(this, this.body.center.x, this.body.center.y);
    const regenMul = this.scene.mods ? this.scene.mods.partyMpRegenMul : 1;
    this.mp = Math.min(s.maxMp, this.mp + s.mpRegen * regenMul * (delta / 1000));
    this.tickBuffs(time);
    const moveLen = Math.hypot(move.x, move.y);
    if (actions.dodge && time >= this.dodgeReady && !this.isDashing(time)) this.startDodge(time, move, moveLen, actions.dodgeTarget);
    if (this.isDashing(time)) {
      this.dashSweep();
      this.ghostTrail(time);
    } else if (this.isLocked(time)) {
      if (actions.attackPressed) this.attacks.buffer(time);
    } else {
      if (moveLen > 0.01) {
        const nx = move.x / moveLen;
        const ny = move.y / moveLen;
        const spd = s.speed * Math.min(1, moveLen);
        this.setVelocity(nx * spd, ny * spd);
        this.facing = Math.atan2(ny, nx);
      } else {
        this.setVelocity(0, 0);
      }
      if (this.attacks.wantsAttack(time, actions.attack) && this.attacks.canAttack(time)) {
        this.attacks.tryAttack(time, this.aimAngle(move, moveLen));
      }
      for (let i = 0; i < 3; i++) if (actions.skills[i]) this.useSkill(i, time);
    }
    this.updateAnim(time);
    this.syncVisuals();
  }

  startDodge(time, move, moveLen, target) {
    const cfg = { ...BALANCE.dodge, ...(this.cls.dodge || {}) };
    let angle;
    if (target) angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    else if (moveLen > 0.01) angle = Math.atan2(move.y, move.x);
    else angle = this.facing;
    this.facing = angle;
    this.dodgeReady = time + cfg.cooldown;
    this.startDash({ distance: cfg.distance, dashDuration: cfg.duration, breakAmt: 0 }, angle, 0);
    this.invulnUntil = this.dashUntil + cfg.invulnExtra;
    this.attacks.nextAllowed = Math.min(this.attacks.nextAllowed, this.dashUntil);
    if (this.weaponRig) this.weaponRig.stop(60);
    this.nextGhost = 0;
    FX.burst(this.scene, this.x, this.y + this.displayHeight / 2 - 6, 0xd8e6ff, 6, 26);
  }

  ghostTrail(time) {
    if (time < this.nextGhost) return;
    this.nextGhost = time + BALANCE.dodge.ghostEvery;
    const ghost = this.scene.add.image(this.x, this.y, 'dungeon', this.frame.name).setScale(this.scaleX, this.scaleY).setFlipX(this.flipX).setTint(0x8be3ff).setAlpha(0.45).setDepth(this.depth - 1);
    this.scene.tweens.add({ targets: ghost, alpha: 0, duration: 220, onComplete: () => ghost.destroy() });
  }

  aimAngle(move, moveLen) {
    const scene = this.scene;
    if (InputState.hasAim(scene.time.now)) return Phaser.Math.Angle.Between(this.x, this.y, InputState.aim.x, InputState.aim.y);
    const range = this.cls.engageRange + 50;
    if (moveLen > 0.01) {
      const dir = Math.atan2(move.y, move.x);
      const e = scene.nearestEnemyInCone(this.x, this.y, range, dir, Phaser.Math.DegToRad(55));
      return e ? Phaser.Math.Angle.Between(this.x, this.y, e.x, e.y) : dir;
    }
    const e = scene.nearestEnemy(this.x, this.y, range);
    return e ? Phaser.Math.Angle.Between(this.x, this.y, e.x, e.y) : this.facing;
  }

  useSkill(i, time) {
    const id = this.cls.skills[i];
    const sk = SKILLS[id];
    if (!sk || time < this.skillReady[i]) return;
    const scene = this.scene;
    if (this.mp < sk.cost) {
      scene.events.emit('log', t('game.noSoma'), '#8be3ff');
      this.skillReady[i] = time + 300;
      return;
    }
    this.mp -= sk.cost;
    this.skillReady[i] = time + sk.cooldown * (1 - this.stats.cdr);
    const power = skillPower(sk, this.skillLevels[id] || 1);
    const angle = sk.type === 'dash' ? this.facing : this.aimAngle({ x: 0, y: 0 }, 0);
    this.facing = angle;
    this.lockUntil = time + (sk.castLock || 160);
    this.setVelocity(0, 0);
    if (sk.type !== 'buff' && sk.type !== 'dash') this.playWeaponAnim(sk.anim || 'cast', sk.castLock || 160, angle);
    else if (sk.type === 'buff') this.playWeaponAnim(sk.anim || 'raise', 400, angle);
    runEffect(this, { ...sk, id }, angle, power);
    scene.events.emit('skill-used', i);
  }

  netState() {
    return { ...super.netState(), cls: this.clsId, mp: this.mp, dead: this.dead };
  }

  takeDamage(raw, time) {
    if (this.dead || time < this.invulnUntil) return;
    let amount = Math.max(1, Math.round(mitigate(raw * GAME_RNG.floatBetween(0.9, 1.1), this.stats.def)));
    amount = this.absorbWithShield(amount);
    if (amount <= 0) return;
    this.hp -= amount;
    this.invulnUntil = time + BALANCE.playerInvulnMs;
    this.hitReact(time);
    FX.floatText(this.scene, this.x, this.y - this.displayHeight / 2 - 4, amount, '#ff6b6b', 17);
    this.scene.cameras.main.shake(90, 0.004);
    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
    }
  }

  die() {
    this.dead = true;
    this.setVelocity(0, 0);
    this.anims.stop();
    this.setFrame(`${this.spriteKey}_hit_anim_f0`);
    this.weapon.setVisible(false);
    this.scene.tweens.add({ targets: this, angle: 90, alpha: 0.3, duration: 600, ease: 'Cubic.easeOut' });
    this.scene.onPlayerDead();
  }

  gainXp(amount) {
    const levels = this.character.gainXp(amount);
    if (!levels) return;
    this.recalc();
    this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.maxHp * BALANCE.levelUpHealRatio);
    this.mp = this.stats.maxMp;
    FX.ring(this.scene, this.x, this.y, 80, 0xffd23f, 600, 6);
    FX.burst(this.scene, this.x, this.y, 0xffd23f, 18, 70);
    FX.floatText(this.scene, this.x, this.y - this.displayHeight / 2 - 20, t('game.levelUpFloat', { level: this.level }), '#ffd23f', 20);
    this.scene.events.emit('log', t('game.levelUp', { level: this.level, n: levels }), '#ffd23f');
  }

  equip(item, slotId) {
    if (this.character.equip(item, slotId)) this.recalc();
  }

  unequip(slot) {
    if (this.character.unequip(slot)) this.recalc();
  }

  sell(item) {
    return this.character.sell(item);
  }

  upgradeSkill(id) {
    return this.character.upgradeSkill(id);
  }

  serialize() {
    return this.character.serialize();
  }

  hudData(time, remaining, boss) {
    return {
      hp: this.hp,
      maxHp: this.stats.maxHp,
      mp: this.mp,
      maxMp: this.stats.maxMp,
      level: this.level,
      xp: this.xp,
      xpNext: xpToNext(this.level),
      gold: this.gold,
      skillPoints: this.skillPoints,
      shield: this.shield,
      buffAtk: this.buffAtkUntil > time,
      dodge: { remain: Math.max(0, this.dodgeReady - time), total: (this.cls.dodge && this.cls.dodge.cooldown) || BALANCE.dodge.cooldown },
      comboStep: this.attacks.step,
      comboActive: time < this.attacks.comboResetAt,
      remaining,
      boss: boss && boss.active ? { name: t(`enemy.${boss.typeId}`), hp: boss.hp, maxHp: boss.maxHp } : null,
      skills: this.cls.skills.map((id, i) => {
        const sk = SKILLS[id];
        return {
          id, short: t(`skill.${id}.short`), cost: sk.cost, level: this.skillLevels[id] || 1, color: sk.color,
          remain: Math.max(0, this.skillReady[i] - time), total: sk.cooldown * (1 - this.stats.cdr), affordable: this.mp >= sk.cost,
        };
      }),
    };
  }
}
