import { DEPTH } from '../Define.js';
import { ENEMIES } from '../data/Enemies.js';
import { runBehavior, runAbility } from '../ai/Behaviors.js';
import { initSteering, applySteering } from '../ai/Steering.js';
import Actor from './Actor.js';
import * as FX from './FX.js';
import { t } from '../i18n/I18n.js';
import { BALANCE, mitigate } from '../data/Balance.js';
import { GAME_RNG } from './Rng.js';

export default class Enemy extends Actor {
  constructor(scene, x, y, typeId, scale) {
    const def = ENEMIES[typeId];
    super(scene, x, y, { spriteKey: def.sprite, scale: def.scale, bodyRadius: def.bodyRadius });
    this.def = def;
    this.typeId = typeId;
    this.level = scale.level;
    this.maxHp = Math.max(1, Math.round(def.hp * scale.hp));
    this.hp = this.maxHp;
    this.atk = Math.max(1, Math.round(def.atk * scale.atk));
    this.defense = Math.round(def.def + (scale.level - 1) * 0.5);
    this.xp = Math.max(1, Math.round(def.xp * scale.xp));
    this.goldValue = def.gold * scale.gold;
    this.speed = def.speed * scale.speed;
    this.breakMax = def.breakMax * scale.breakMax;
    this.mode = 'idle';
    this.aggro = false;
    this.nextAttack = 0;
    this.nextThink = scene.combatNow + GAME_RNG.random() * BALANCE.aiThinkMs;
    this.nextWander = 0;
    this.target = null;
    this.barKey = null;
    this.breakGauge = 0;
    this.breakUntil = 0;
    this.slowUntil = 0;
    this.knockUntil = 0;
    this.dotUntil = 0;
    this.dotDamage = 0;
    this.nextDot = 0;
    this.windupUntil = 0;
    this.windupTarget = null;
    this.staggerUntil = 0;
    this.retreatUntil = 0;
    this.nextRetreat = 0;
    this.retreatDir = new Phaser.Math.Vector2();
    this.castUntil = 0;
    this.castFn = null;
    this.castTelegraph = null;
    this.charge = null;
    this.suicide = false;
    this.abilityState = [];
    this.wander = new Phaser.Math.Vector2();
    initSteering(this);
    this.bar = scene.add.graphics().setDepth(DEPTH.BAR);
  }

  get target() {
    return this.scene.entityById(this.targetId);
  }

  set target(v) {
    this.targetId = v ? v.id : null;
  }

  get windupTarget() {
    return this.scene.entityById(this.windupTargetId);
  }

  set windupTarget(v) {
    this.windupTargetId = v ? v.id : null;
  }

  netState() {
    return { ...super.netState(), type: this.typeId, mode: this.mode, breakGauge: this.breakGauge, aggro: this.aggro, targetId: this.targetId };
  }

  update(time, delta) {
    if (!this.active) return;
    const player = this.scene.player;
    this.syncVisuals();
    this.updateBar();
    if (this.dotUntil > time && time >= this.nextDot) {
      this.nextDot = time + 500;
      this.takeDamage({ amount: this.dotDamage, crit: false }, 0, null, { silent: true });
      if (!this.active) return;
    }
    if (this.mode === 'windup' && time >= this.windupUntil) this.releaseMelee(time);
    if (this.mode === 'cast' && time >= this.castUntil) this.releaseCast(time);
    if (!this.active) return;
    if (this.mode === 'charge') {
      this.updateCharge(time);
      return;
    }
    if (this.breakUntil > time || this.knockUntil > time || this.staggerUntil > time || this.mode === 'windup' || this.mode === 'cast' || player.dead) {
      if (this.knockUntil <= time) this.setVelocity(0, 0);
      this.play(`${this.spriteKey}_idle`, true);
      return;
    }
    if (time >= this.nextThink) {
      this.nextThink = time + BALANCE.aiThinkMs;
      this.think(time);
      if (!this.active) return;
    }
    applySteering(this, time, this.speed * (this.slowUntil > time ? 0.45 : 1), [this.scene.enemies.getChildren(), this.scene.companions.getChildren()]);
    const v = this.body.velocity;
    const t = this.target;
    if (Math.abs(v.x) > 1) this.facing = Math.atan2(v.y, v.x);
    else if (t && t.active) this.facing = Math.atan2(t.y - this.y, t.x - this.x);
    this.updateAnim(time);
  }

  canSee(actor) {
    if (Phaser.Math.Distance.Between(this.x, this.y, actor.x, actor.y) > this.def.aggroRange) return false;
    const cone = this.def.visionAngle || 360;
    if (cone < 360) {
      const a = Phaser.Math.Angle.Between(this.x, this.y, actor.x, actor.y);
      if (Math.abs(Phaser.Math.Angle.Wrap(a - this.facing)) > Phaser.Math.DegToRad(cone / 2)) return false;
    }
    if (!BALANCE.aggroNeedsSight) return true;
    return this.scene.nav.hasLineOfSight(this.x, this.y, actor.x, actor.y);
  }

  think(time) {
    const player = this.scene.player;
    if (!this.scene.isFloorAt(this.body.center.x, this.body.center.y)) this.scene.placeActorAt(this, this.body.center.x, this.body.center.y);
    if (!this.aggro && !player.dead && this.canSee(player)) {
      this.aggro = true;
      this.scene.alertPack(this);
    }
    const target = this.scene.nearestTarget(this.x, this.y, BALANCE.playerAggroBias) || player;
    this.target = target;
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const speed = this.speed * (this.slowUntil > time ? 0.45 : 1);
    if (!this.aggro) {
      this.wanderStep(time, speed);
      return;
    }
    runBehavior(this.def.behavior, this, { target, dist, dx, dy, time, speed });
    this.runAbilities(time);
  }

  wanderStep(time, speed) {
    if (time >= this.nextWander) {
      this.nextWander = time + GAME_RNG.between(900, 1800);
      if (GAME_RNG.chance(0.5)) this.wander.set(0, 0);
      else this.wander.setToPolar(GAME_RNG.random() * Math.PI * 2, 1);
    }
    this.desired.set(this.wander.x * speed * 0.4, this.wander.y * speed * 0.4);
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

  isFree() {
    return this.mode !== 'windup' && this.mode !== 'cast' && this.mode !== 'charge';
  }

  runAbilities(time) {
    if (!this.isFree()) return;
    const list = this.def.abilities || [];
    const tgt = this.target;
    const dist = tgt && tgt.active ? Phaser.Math.Distance.Between(this.x, this.y, tgt.x, tgt.y) : Infinity;
    for (let i = 0; i < list.length; i++) {
      const ab = list[i];
      const st = this.abilityState[i] || (this.abilityState[i] = { next: time + (ab.first || ab.cooldown) });
      if (time < st.next) continue;
      if (ab.range && dist > ab.range) continue;
      if (ab.minRange && dist < ab.minRange) continue;
      st.next = time + ab.cooldown;
      runAbility(ab.type, this, ab);
      if (!this.isFree() || !this.active) return;
    }
  }

  beginCast(time, windup, fn, telegraph = null, tint = 0xffd0d0) {
    this.cancelCast();
    this.mode = 'cast';
    this.setVelocity(0, 0);
    this.desired.set(0, 0);
    this.castUntil = time + windup;
    this.castFn = fn;
    this.castTelegraph = telegraph;
    this.setTint(tint);
  }

  releaseCast(time) {
    const fn = this.castFn;
    this.castFn = null;
    this.castTelegraph = null;
    this.clearTint();
    this.mode = 'chase';
    if (fn && this.breakUntil <= time) fn(time);
  }

  cancelCast() {
    if (this.castTelegraph) this.castTelegraph.destroy();
    this.castTelegraph = null;
    this.castFn = null;
    this.charge = null;
    if (this.mode === 'cast' || this.mode === 'charge') this.mode = 'chase';
  }

  startCharge(time, angle, cfg) {
    this.mode = 'charge';
    this.facing = angle;
    this.charge = { vx: Math.cos(angle) * cfg.speed, vy: Math.sin(angle) * cfg.speed, until: time + cfg.duration, cfg, hit: new Set() };
    this.setTint(0xffb0b0);
  }

  updateCharge(time) {
    const c = this.charge;
    if (!c) {
      this.mode = 'chase';
      return;
    }
    this.setVelocity(c.vx, c.vy);
    this.play(`${this.spriteKey}_run`, true);
    this.setFlipX(c.vx < 0);
    for (const p of this.scene.partyMembers()) {
      if (c.hit.has(p)) continue;
      if (Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y) > this.radius + p.radius + 6) continue;
      c.hit.add(p);
      p.takeDamage(Math.round(this.atk * (c.cfg.damageMul || 1)), time);
    }
    const blocked = !this.body.blocked.none;
    if (time >= c.until || blocked) this.endCharge(time, blocked);
  }

  endCharge(time, blocked) {
    const cfg = this.charge ? this.charge.cfg : {};
    this.charge = null;
    this.mode = 'chase';
    this.clearTint();
    this.setVelocity(0, 0);
    this.desired.set(0, 0);
    this.staggerUntil = time + (blocked ? (cfg.wallStun || 700) : (cfg.recovery || 300));
    if (blocked) {
      FX.burst(this.scene, this.x, this.y, 0xffffff, 8, 30);
      this.scene.cameras.main.shake(100, 0.004);
    }
  }

  retreatParams() {
    return { ...BALANCE.retreat, ...(this.def.retreat || {}) };
  }

  beginRetreat(time, dx, dy) {
    const r = this.retreatParams();
    const nav = this.scene.nav;
    const away = Math.atan2(-dy, -dx);
    for (const deg of r.probeDeg) {
      const a = away + Phaser.Math.DegToRad(deg);
      const px = this.x + Math.cos(a) * r.probeDist;
      const py = this.y + Math.sin(a) * r.probeDist;
      const end = nav.toTile(px, py);
      if (!nav.isFloor(end.tx, end.ty) || !nav.rayClear(this.x, this.y, px, py)) continue;
      this.retreatDir.set(Math.cos(a), Math.sin(a));
      this.retreatUntil = time + r.duration;
      this.nextRetreat = time + r.cooldown;
      return true;
    }
    this.nextRetreat = time + r.cooldown * 0.5;
    return false;
  }

  moveToward(dx, dy, dist, spd) {
    if (dist < 1) {
      this.desired.set(0, 0);
      return;
    }
    this.desired.set((dx / dist) * spd, (dy / dist) * spd);
  }

  startMelee(time, target) {
    this.mode = 'windup';
    this.nextAttack = time + this.def.attackCooldown;
    this.setVelocity(0, 0);
    this.setTint(0xff9a9a);
    this.windupUntil = time + this.def.windup;
    this.windupTarget = target;
  }

  releaseMelee(time) {
    const target = this.windupTarget;
    this.windupTarget = null;
    this.clearTint();
    this.mode = 'chase';
    if (this.breakUntil > time) return;
    const p = target && target.active && !target.dead && !target.downed ? target : this.scene.player;
    const d = Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, p.x, p.y);
    FX.slash(this.scene, this.x + Math.cos(angle) * 20, this.y + Math.sin(angle) * 20, angle, 0xff6b6b, 0.7);
    if (d <= this.def.attackRange + p.radius + 30) p.takeDamage(this.atk, time);
  }

  shoot(time, angle) {
    this.nextAttack = time + this.def.attackCooldown;
    this.scene.fireProjectile('enemy', this.x, this.y, angle, {
      texture: 'proj_enemy', speed: this.def.projectileSpeed, range: this.def.attackRange + 100, size: 12, damage: this.atk,
    });
    this.setTint(0xffc0ff);
    this.scene.time.delayedCall(120, () => {
      if (this.active) this.clearTint();
    });
  }

  takeDamage(dmg, breakAmt, knockAngle, opts = {}) {
    if (!this.active) return null;
    const now = this.scene.combatNow;
    if (!this.aggro) this.scene.alertPack(this);
    this.aggro = true;
    const broken = this.breakUntil > now;
    let amount = Math.max(1, mitigate(dmg.amount, this.defense, BALANCE.enemyDefenseK));
    if (broken) amount *= 1.5;
    const guard = this.def.guard;
    let guarded = false;
    if (guard && !broken && knockAngle !== null && knockAngle !== undefined) {
      const from = Phaser.Math.Angle.Wrap(knockAngle + Math.PI);
      guarded = Math.abs(Phaser.Math.Angle.Wrap(from - this.facing)) <= Phaser.Math.DegToRad(guard.arc / 2);
    }
    if (guarded) {
      amount *= guard.mul;
      breakAmt = breakAmt * (guard.breakMul === undefined ? guard.mul : guard.breakMul);
    }
    amount = Math.max(1, Math.round(amount));
    this.hp -= amount;
    if (!opts.silent) {
      const color = guarded ? '#9aa4b8' : dmg.crit ? '#ffd23f' : broken ? '#ff8a5c' : '#ffffff';
      FX.floatText(this.scene, this.x, this.y - this.displayHeight / 2 - 4, amount, color, dmg.crit ? 20 : 15);
      if (guarded) FX.floatText(this.scene, this.x, this.y - this.displayHeight / 2 - 22, t('game.guard'), '#9aa4b8', 11);
      this.hitReact(now, 120);
      const stagger = BALANCE.hitStaggerMs * (1 - (this.def.knockbackResist || 0));
      if (stagger > 0) this.staggerUntil = Math.max(this.staggerUntil, now + stagger);
    }
    let brokeNow = false;
    if (!broken && breakAmt) {
      this.breakGauge += breakAmt;
      if (this.breakGauge >= this.breakMax) {
        brokeNow = true;
        this.breakGauge = 0;
        this.breakUntil = now + (this.def.boss ? 1200 : 1700);
        this.cancelCast();
        this.mode = 'chase';
        this.clearTint();
        FX.floatText(this.scene, this.x, this.y - this.displayHeight / 2 - 24, t('game.breakText'), '#ff5c8a', 18);
        FX.ring(this.scene, this.x, this.y, this.radius + 20, 0xff5c8a, 300, 3);
      }
    }
    const resist = this.def.knockbackResist || 0;
    const knock = (opts.knockback ?? 200) * (1 - resist) * (broken ? 1.3 : 1) * (guarded ? guard.mul : 1);
    if (knockAngle !== null && knockAngle !== undefined && knock > 0) {
      this.setVelocity(Math.cos(knockAngle) * knock, Math.sin(knockAngle) * knock);
      this.knockUntil = now + 110;
    }
    const killed = this.hp <= 0;
    if (killed) this.die(knockAngle);
    return { target: this, amount, crit: !!dmg.crit, brokeNow, killed, guarded, angle: knockAngle };
  }

  die(angle) {
    if (!this.active) return;
    this.cancelCast();
    const blast = this.def.deathBlast;
    if (blast && !this.suicide) this.scene.hazards.scheduleBlast(this.x, this.y, blast.radius, Math.round(this.atk * (blast.damageMul || 1)), blast.delay, { color: this.def.color, shake: 0.004 });
    FX.burst(this.scene, this.x, this.y, this.def.color, 14, 60);
    FX.corpse(this, angle);
    this.scene.onEnemyKilled(this);
    this.destroy();
  }

  updateBar() {
    const g = this.bar;
    g.setPosition(this.x, this.y - this.displayHeight / 2 - 8);
    const now = this.scene.combatNow;
    const broken = this.breakUntil > now;
    const key = (this.hp << 1) + (broken ? 1 : 0) + this.breakGauge * 100000;
    if (key === this.barKey) return;
    this.barKey = key;
    g.clear();
    if (this.hp >= this.maxHp && this.breakGauge === 0 && !broken) return;
    const w = Math.max(30, this.displayWidth * 0.9);
    const x = -w / 2;
    g.fillStyle(0x000000, 0.7);
    g.fillRect(x - 1, -1, w + 2, 6);
    g.fillStyle(0xff4a4a, 1);
    g.fillRect(x, 0, w * Math.max(0, this.hp / this.maxHp), 4);
    const breakRatio = broken ? 1 : this.breakGauge / this.breakMax;
    g.fillStyle(broken ? 0xffffff : 0xff5c8a, 1);
    g.fillRect(x, 5, w * Math.min(1, breakRatio), 2);
  }

  destroy(fromScene) {
    if (this.bar) this.bar.destroy();
    super.destroy(fromScene);
  }
}
