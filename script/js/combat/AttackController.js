import { runEffect } from './Effects.js';

export default class AttackController {
  constructor(actor, combo, comboWindow, speedMul = 1) {
    this.actor = actor;
    this.combo = combo;
    this.comboWindow = comboWindow;
    this.speedMul = speedMul;
    this.step = 0;
    this.nextAllowed = 0;
    this.comboResetAt = 0;
    this.bufferUntil = 0;
  }

  get currentStep() {
    return this.combo[this.step];
  }

  buffer(time, ms = 320) {
    this.bufferUntil = time + ms;
  }

  wantsAttack(time, held) {
    return held || time < this.bufferUntil;
  }

  canAttack(time) {
    return !this.actor.isLocked(time) && time >= this.nextAllowed;
  }

  tryAttack(time, angle) {
    if (!this.canAttack(time)) return false;
    if (time > this.comboResetAt) this.step = 0;
    const s = this.combo[this.step];
    const actor = this.actor;
    const duration = s.duration * this.speedMul;
    actor.facing = angle;
    actor.lockUntil = time + duration;
    if (s.lunge) actor.setVelocity(Math.cos(angle) * s.lunge, Math.sin(angle) * s.lunge);
    else actor.setVelocity(0, 0);
    actor.playWeaponAnim(s.anim || 'swing', duration, angle);
    runEffect(actor, s, angle, s.damage);
    this.step = (this.step + 1) % this.combo.length;
    this.nextAllowed = time + (s.duration + s.recovery) * this.speedMul;
    this.comboResetAt = this.nextAllowed + this.comboWindow;
    this.bufferUntil = 0;
    return true;
  }

  reset() {
    this.step = 0;
    this.bufferUntil = 0;
  }
}
