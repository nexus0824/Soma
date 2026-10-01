import { BALANCE } from '../data/Balance.js';

export function initSteering(actor) {
  actor.desired = new Phaser.Math.Vector2();
  actor.sep = new Phaser.Math.Vector2();
  actor.sideDir = new Phaser.Math.Vector2();
  actor.sidestepUntil = 0;
  actor.progressAt = 0;
  actor.progressX = actor.x;
  actor.progressY = actor.y;
  actor.wasHolding = true;
}

export function computeSeparation(actor, lists, margin) {
  const out = actor.sep.set(0, 0);
  const range = BALANCE.separationRange;
  for (const list of lists) {
    for (const o of list) {
      if (o === actor || !o.active || o.downed || o.dead) continue;
      const dx = actor.x - o.x;
      const dy = actor.y - o.y;
      if (Math.abs(dx) > range || Math.abs(dy) > range) continue;
      const minD = actor.radius + o.radius + margin;
      const d2 = dx * dx + dy * dy;
      if (d2 >= minD * minD) continue;
      if (d2 < 1) {
        const a = Math.random() * Math.PI * 2;
        out.x += Math.cos(a);
        out.y += Math.sin(a);
        continue;
      }
      const d = Math.sqrt(d2);
      const push = (minD - d) / minD;
      out.x += (dx / d) * push;
      out.y += (dy / d) * push;
    }
  }
  return out;
}

export function trackProgress(actor, time, wantsMove) {
  if (time - actor.progressAt < BALANCE.stuckCheckMs) return;
  const moved = Phaser.Math.Distance.Between(actor.x, actor.y, actor.progressX, actor.progressY);
  actor.progressAt = time;
  actor.progressX = actor.x;
  actor.progressY = actor.y;
  if (!wantsMove || moved >= BALANCE.stuckMinMove || time < actor.sidestepUntil) return;
  const d = actor.desired;
  const len = Math.hypot(d.x, d.y) || 1;
  const sign = Math.random() < 0.5 ? 1 : -1;
  actor.sideDir.set((-d.y / len) * sign, (d.x / len) * sign);
  actor.sidestepUntil = time + BALANCE.sidestepMs;
}

export function applySteering(actor, time, maxSpd, lists) {
  const holding = actor.desired.x === 0 && actor.desired.y === 0;
  if (actor.wasHolding && !holding) {
    actor.progressAt = time;
    actor.progressX = actor.x;
    actor.progressY = actor.y;
  }
  actor.wasHolding = holding;
  let dx = actor.desired.x;
  let dy = actor.desired.y;
  if (time < actor.sidestepUntil && !holding) {
    dx = actor.sideDir.x * maxSpd * 0.9;
    dy = actor.sideDir.y * maxSpd * 0.9;
  }
  const sep = computeSeparation(actor, lists, holding ? 0 : BALANCE.separationMargin);
  const strength = BALANCE.separationStrength * (holding ? BALANCE.separationHoldMul : 1);
  let vx = dx + sep.x * maxSpd * strength;
  let vy = dy + sep.y * maxSpd * strength;
  const len = Math.hypot(vx, vy);
  const cap = holding ? maxSpd * 0.5 : Math.max(maxSpd * 1.15, Math.hypot(actor.desired.x, actor.desired.y));
  if (len > cap) {
    vx *= cap / len;
    vy *= cap / len;
  }
  const v = actor.body.velocity;
  const k = BALANCE.steerSmoothing;
  actor.setVelocity(v.x + (vx - v.x) * k, v.y + (vy - v.y) * k);
  trackProgress(actor, time, !holding);
}
