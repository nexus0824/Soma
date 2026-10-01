import { DEPTH } from '../Define.js';
import * as FX from '../core/FX.js';

class Telegraph {
  constructor(scene, cfg, now) {
    this.scene = scene;
    this.cfg = cfg;
    this.start = now;
    this.end = now + Math.max(1, cfg.duration);
    this.g = scene.add.graphics().setDepth(DEPTH.DECAL + 1);
    this.done = false;
    this.draw(0);
  }

  update(time) {
    if (this.done) return;
    const p = Phaser.Math.Clamp((time - this.start) / (this.end - this.start), 0, 1);
    this.draw(p);
    if (p >= 1) this.destroy();
  }

  draw(p) {
    const c = this.cfg;
    const g = this.g;
    const color = c.color || 0xff6b6b;
    g.clear();
    g.setPosition(c.x, c.y).setRotation(c.angle || 0);
    if (c.shape === 'line') {
      const w = c.width || 24;
      g.fillStyle(color, 0.16);
      g.fillRect(0, -w / 2, c.length, w);
      g.fillStyle(color, 0.45);
      g.fillRect(0, -w / 2, c.length * p, w);
      g.lineStyle(2, color, 0.9);
      g.strokeRect(0, -w / 2, c.length, w);
      return;
    }
    if (c.shape === 'cone') {
      const half = Phaser.Math.DegToRad((c.arc || 90) / 2);
      g.fillStyle(color, 0.16);
      g.slice(0, 0, c.radius, -half, half, false);
      g.fillPath();
      g.fillStyle(color, 0.45);
      g.slice(0, 0, c.radius * p, -half, half, false);
      g.fillPath();
      g.lineStyle(2, color, 0.9);
      g.slice(0, 0, c.radius, -half, half, false);
      g.strokePath();
      return;
    }
    g.fillStyle(color, 0.16);
    g.fillCircle(0, 0, c.radius);
    g.fillStyle(color, 0.45);
    g.fillCircle(0, 0, c.radius * p);
    g.lineStyle(2, color, 0.9);
    g.strokeCircle(0, 0, c.radius);
  }

  destroy() {
    if (this.done) return;
    this.done = true;
    this.g.destroy();
  }
}

export default class HazardManager {
  constructor(scene) {
    this.scene = scene;
    this.telegraphs = [];
    this.blasts = [];
  }

  telegraph(cfg) {
    const tg = new Telegraph(this.scene, cfg, this.scene.combatNow);
    this.telegraphs.push(tg);
    return tg;
  }

  blastAt(x, y, radius, damage, opts = {}) {
    const scene = this.scene;
    const time = scene.combatNow;
    let hits = 0;
    for (const p of scene.partyMembers()) {
      if (Phaser.Math.Distance.Between(x, y, p.x, p.y) > radius + p.radius) continue;
      p.takeDamage(damage, time);
      hits++;
    }
    const color = opts.color || 0xff6b6b;
    FX.ring(scene, x, y, radius, color, 320, 5);
    FX.burst(scene, x, y, color, 12, radius * 0.8);
    if (opts.shake) scene.cameras.main.shake(opts.shakeMs || 120, opts.shake);
    return hits;
  }

  scheduleBlast(x, y, radius, damage, delay, opts = {}) {
    const tg = this.telegraph({ shape: 'circle', x, y, radius, duration: delay, color: opts.color });
    this.blasts.push({ at: this.scene.combatNow + delay, x, y, radius, damage, opts, tg });
  }

  update(time) {
    for (const tg of this.telegraphs) tg.update(time);
    this.telegraphs = this.telegraphs.filter((tg) => !tg.done);
    if (!this.blasts.length) return;
    const due = this.blasts.filter((b) => time >= b.at);
    if (!due.length) return;
    this.blasts = this.blasts.filter((b) => time < b.at);
    for (const b of due) {
      b.tg.destroy();
      this.blastAt(b.x, b.y, b.radius, b.damage, b.opts);
    }
  }

  clear() {
    for (const tg of this.telegraphs) tg.destroy();
    this.telegraphs = [];
    this.blasts = [];
  }
}
