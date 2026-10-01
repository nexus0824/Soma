import { PIXEL_SCALE } from '../Define.js';
import { CLASSES } from '../data/Classes.js';
import { SKILLS, skillPower } from '../data/Skills.js';
import { computeStats } from './Stats.js';
import Actor from './Actor.js';
import AttackController from '../combat/AttackController.js';
import { runEffect } from '../combat/Effects.js';
import * as FX from './FX.js';
import { t } from '../i18n/I18n.js';
import { BALANCE, mitigate, defenseKFor } from '../data/Balance.js';
import { initSteering, applySteering } from '../ai/Steering.js';
import { defaultLook, weaponLookFor } from '../data/WeaponLooks.js';
import { GAME_RNG, floorRng } from './Rng.js';
import { emptyEquipment, createItem } from '../data/Items.js';

export const TACTICS = ['aggressive', 'follow'];
const REVIVE_MS = 12000;
const AUTO_SKILL_TYPES = new Set(['projectile', 'multishot', 'aoe', 'aoe_forward']);

export default class Companion extends Actor {
  constructor(scene, x, y, clsId, index, tactic) {
    const cls = CLASSES[clsId];
    super(scene, x, y, { spriteKey: cls.sprite, scale: PIXEL_SCALE, bodyRadius: 6, bodyOffsetX: 2, bodyOffsetY: 15, shadowWidth: 40, weaponFrame: defaultLook(clsId).frame, weaponAnim: defaultLook(clsId).anim });
    this.cls = cls;
    this.clsId = clsId;
    this.index = index;
    this.tactic = tactic || 'aggressive';
    this.level = scene.player.level;
    this.recalc();
    this.hp = this.stats.maxHp;
    this.mp = this.stats.maxMp;
    this.attacks = new AttackController(this, cls.combo, cls.comboWindow, BALANCE.companionAttackSpeedMul);
    this.skillReady = 0;
    this.downed = false;
    this.reviveAt = 0;
    this.target = null;
    this.nextThink = scene.combatNow + GAME_RNG.random() * BALANCE.aiThinkMs;
    initSteering(this);
  }

  moveTo(x, y, speed) {
    const d = Phaser.Math.Distance.Between(this.x, this.y, x, y);
    if (d < 1) {
      this.desired.set(0, 0);
      return;
    }
    this.desired.set(((x - this.x) / d) * speed, ((y - this.y) / d) * speed);
  }

  stopMoving() {
    this.desired.set(0, 0);
  }

  buildKit() {
    const scene = this.scene;
    const level = scene.level || 1;
    const rng = floorRng(scene.run && scene.run.seed ? scene.run.seed : 1, level, `companion-${this.clsId}`);
    const kit = emptyEquipment();
    for (const slot of ['weapon', 'chest', 'legs', 'gloves']) kit[slot] = createItem(level, this.clsId, slot, 'common', { rng });
    return kit;
  }

  recalc() {
    if (!this.kit) this.kit = this.buildKit();
    this.stats = computeStats(this.cls, this.level, this.kit);
    if (this.weaponRig) this.setWeaponLook(weaponLookFor(this.clsId, this.kit.weapon));
    this.stats.atk = Math.max(1, Math.round((this.stats.atk + this.level * 0.8) * BALANCE.companionDamageMul));
  }

  update(time, delta) {
    const scene = this.scene;
    const player = scene.player;
    if (this.level !== player.level) {
      const ratio = this.hp / this.stats.maxHp;
      this.level = player.level;
      this.recalc();
      this.hp = Math.round(this.stats.maxHp * ratio);
    }
    if (this.downed) {
      if (time >= this.reviveAt && !player.dead) this.revive(0.5);
      this.syncVisuals();
      return;
    }
    const regenMul = scene.mods ? scene.mods.partyMpRegenMul : 1;
    this.mp = Math.min(this.stats.maxMp, this.mp + this.stats.mpRegen * regenMul * (delta / 1000));
    this.tickBuffs(time);
    if (this.isDashing(time)) this.dashSweep();
    else {
      if (time >= this.nextThink) {
        this.nextThink = time + BALANCE.aiThinkMs;
        this.pickTarget(player);
        if (!this.isLocked(time)) this.think(time, player);
      }
      if (!this.isLocked(time)) applySteering(this, time, this.stats.speed, [scene.enemies.getChildren(), scene.companions.getChildren(), [player]]);
    }
    this.updateAnim(time);
    this.syncVisuals();
  }

  think(time, player) {
    const t = this.target && this.target.active ? this.target : null;
    const s = this.stats.speed * 0.95;
    const engage = this.cls.engageRange;
    const nav = this.scene.nav;
    if (t && !player.dead) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y) - t.radius;
      const ang = Phaser.Math.Angle.Between(this.x, this.y, t.x, t.y);
      const visible = nav.hasLineOfSight(this.x, this.y, t.x, t.y);
      if (d > engage || !visible) this.navigateTo(t.x, t.y, s);
      else if (engage > 120 && d < engage * 0.4) this.desired.set(-Math.cos(ang) * s, -Math.sin(ang) * s);
      else this.stopMoving();
      this.facing = ang;
      if (visible && d <= engage + 10) {
        if (time >= this.skillReady && this.tryAutoSkill(time, ang)) return;
        if (this.attacks.canAttack(time)) this.attacks.tryAttack(time, ang);
      }
      this.trackStuck(time, player);
      return;
    }
    const slotAngle = player.facing + Math.PI + (this.index === 0 ? -0.7 : 0.7);
    let gx = player.x + Math.cos(slotAngle) * 66;
    let gy = player.y + Math.sin(slotAngle) * 66;
    if (!this.scene.isFloorAt(gx, gy)) {
      gx = player.x;
      gy = player.y;
    }
    const d = Phaser.Math.Distance.Between(this.x, this.y, gx, gy);
    const dPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    if (dPlayer > 720 || (dPlayer > 200 && nav.distance(nav.fieldTo(player.x, player.y), this.x, this.y) === -1) || !this.scene.isFloorAt(this.body.center.x, this.body.center.y)) {
      this.warpTo(player);
    } else if (d > 36) {
      this.navigateTo(gx, gy, dPlayer > 220 ? s * 1.4 : s);
      this.facing = Math.atan2(this.desired.y, this.desired.x);
    } else {
      this.stopMoving();
    }
    this.trackStuck(time, player);
  }

  trackStuck(time, player) {
    const wantsMove = this.body.velocity.length() > 5;
    if (!wantsMove) {
      this.stuckSince = 0;
      return;
    }
    const moved = Phaser.Math.Distance.Between(this.x, this.y, this.lastX || this.x, this.lastY || this.y);
    if (time - (this.lastMoveCheck || 0) < 400) return;
    this.lastMoveCheck = time;
    if (moved < 6) {
      if (!this.stuckSince) this.stuckSince = time;
      else if (time - this.stuckSince > 1500 && Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) > 160) this.warpTo(player);
    } else {
      this.stuckSince = 0;
    }
    this.lastX = this.x;
    this.lastY = this.y;
  }

  warpTo(player) {
    const spot = this.scene.nav.nearestClearWorld(player.x, player.y, this.radius);
    if (!spot) return;
    this.scene.placeActorAt(this, spot.x, spot.y, true);
    this.stuckSince = 0;
    FX.burst(this.scene, this.x, this.y, this.cls.color, 8, 30);
  }

  pickTarget(player) {
    const scene = this.scene;
    if (this.tactic === 'aggressive') {
      const e = scene.nearestEnemy(this.x, this.y, 320);
      this.target = e && Phaser.Math.Distance.Between(player.x, player.y, e.x, e.y) < 460 ? e : null;
    } else {
      this.target = scene.nearestEnemy(player.x, player.y, 180);
    }
  }

  tryAutoSkill(time, angle) {
    const sk = SKILLS[this.cls.skills[0]];
    if (!sk || !AUTO_SKILL_TYPES.has(sk.type) || this.mp < sk.cost) return false;
    this.mp -= sk.cost;
    this.skillReady = time + sk.cooldown * 1.6;
    this.lockUntil = time + (sk.castLock || 160);
    this.setVelocity(0, 0);
    this.playWeaponAnim(sk.anim || 'cast', sk.castLock || 160, angle);
    runEffect(this, { ...sk, id: this.cls.skills[0], offset: Math.min(sk.offset || 0, 120) }, angle, skillPower(sk, 1));
    return true;
  }

  get target() {
    return this.scene.entityById(this.targetId);
  }

  set target(v) {
    this.targetId = v ? v.id : null;
  }

  netState() {
    return { ...super.netState(), cls: this.clsId, mp: this.mp, downed: this.downed, tactic: this.tactic, targetId: this.targetId };
  }

  takeDamage(raw, time) {
    if (this.downed || time < this.invulnUntil) return;
    let amount = Math.max(1, Math.round(mitigate(raw * GAME_RNG.floatBetween(0.9, 1.1), this.stats.def, defenseKFor(this.scene.level))));
    amount = this.absorbWithShield(amount);
    if (amount <= 0) return;
    this.hp -= amount;
    this.invulnUntil = time + BALANCE.companionInvulnMs;
    this.hitReact(time);
    FX.floatText(this.scene, this.x, this.y - this.displayHeight / 2 - 4, amount, '#ffb0a0', 14);
    if (this.hp <= 0) this.down(time);
  }

  down(time) {
    this.downed = true;
    this.hp = 0;
    this.reviveAt = time + REVIVE_MS;
    this.target = null;
    this.attacks.reset();
    this.setVelocity(0, 0);
    this.body.enable = false;
    this.anims.stop();
    this.setFrame(`${this.spriteKey}_hit_anim_f0`);
    this.setAngle(90).setAlpha(0.55);
    this.weapon.setVisible(false);
    this.scene.events.emit('log', t('game.companionDown', { name: t(`class.${this.clsId}.name`), sec: REVIVE_MS / 1000 }), '#ffb0a0');
  }

  revive(ratio) {
    this.downed = false;
    this.hp = Math.max(1, Math.round(this.stats.maxHp * ratio));
    this.body.enable = true;
    this.setAngle(0).setAlpha(1);
    this.weapon.setVisible(true);
    this.invulnUntil = this.scene.combatNow + 1000;
    FX.ring(this.scene, this.x, this.y, 50, this.cls.color, 500, 4);
    this.scene.events.emit('log', t('game.companionRevive', { name: t(`class.${this.clsId}.name`) }), FX.cssColor(this.cls.color));
  }

  setTactic(tactic) {
    this.tactic = tactic;
    this.nextThink = 0;
  }

  hudData(time) {
    return {
      name: t(`class.${this.clsId}.name`),
      color: this.cls.color,
      sprite: this.cls.sprite,
      hp: this.hp,
      maxHp: this.stats.maxHp,
      mp: this.mp,
      maxMp: this.stats.maxMp,
      downed: this.downed,
      reviveIn: Math.max(0, this.reviveAt - time),
      tactic: this.tactic,
      fighting: !!(this.target && this.target.active),
    };
  }
}
