import { IMPACTS } from '../data/Impacts.js';
import * as FX from '../core/FX.js';

function merge(names) {
  const out = { stop: 0, spark: 0, sparkDist: 0, shake: 0, shakeMs: 0 };
  for (const n of names) {
    const p = IMPACTS[n];
    if (!p) continue;
    for (const k in p) out[k] = Math.max(out[k] || 0, p[k]);
  }
  return out;
}

function escalations(base, r) {
  const names = [base];
  if (r.crit) names.push('crit');
  if (r.brokeNow) names.push('break');
  if (r.killed) names.push('kill');
  return names;
}

function sparkColor(r) {
  if (r.brokeNow) return 0xff5c8a;
  if (r.crit) return 0xffd23f;
  return 0xffffff;
}

export function applyHits(source, results, impact = 'light') {
  if (!results.length) return;
  const scene = source.scene;
  const all = [];
  for (const r of results) {
    const names = escalations(impact, r);
    all.push(...names);
    const p = merge(names);
    const e = r.target;
    if (r.angle === null || r.angle === undefined) {
      FX.burst(scene, e.x, e.y, sparkColor(r), p.spark, p.sparkDist);
      continue;
    }
    const cx = e.x - Math.cos(r.angle) * e.radius;
    const cy = e.y - Math.sin(r.angle) * e.radius;
    FX.spark(scene, cx, cy, r.angle, sparkColor(r), p.spark, p.sparkDist);
  }
  if (!source.isPlayer) return;
  const g = merge(all);
  if (g.stop) scene.hitStop(g.stop);
  if (g.shake) scene.cameras.main.shake(g.shakeMs, g.shake);
}
