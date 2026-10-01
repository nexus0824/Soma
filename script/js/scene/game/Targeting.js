import { TACTICS } from '../../core/Companion.js';
import * as FX from '../../core/FX.js';
import { t } from '../../i18n/I18n.js';

export default class Targeting {
  constructor(scene) {
    this.scene = scene;
  }

  partyMembers() {
    const scene = this.scene;
    const list = [];
    if (!scene.player.dead) list.push(scene.player);
    for (const c of scene.companions.getChildren()) if (c.active && !c.downed) list.push(c);
    return list;
  }

  nearestTarget(x, y, playerBias = 1) {
    let best = null;
    let bestD = Infinity;
    for (const m of this.partyMembers()) {
      const d = Phaser.Math.Distance.Between(x, y, m.x, m.y) * (m === this.scene.player ? 1 : playerBias);
      if (d < bestD) {
        bestD = d;
        best = m;
      }
    }
    return best;
  }

  toggleTactic(index) {
    const scene = this.scene;
    const c = scene.companions.getChildren()[index];
    if (!c) return;
    const next = TACTICS[(TACTICS.indexOf(c.tactic) + 1) % TACTICS.length];
    c.setTactic(next);
    const tactics = { ...(scene.registry.get('tactics') || {}), [c.clsId]: next };
    scene.registry.set('tactics', tactics);
    scene.events.emit('log', t('game.tacticChanged', { name: t(`class.${c.clsId}.name`), tactic: t(`tactic.${next}`) }), FX.cssColor(c.cls.color));
  }

  nearestEnemy(x, y, range) {
    let best = null;
    let bestD = range;
    for (const e of this.scene.enemies.getChildren()) {
      if (!e.active) continue;
      const d = Phaser.Math.Distance.Between(x, y, e.x, e.y) - e.radius;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  nearestEnemyInCone(x, y, range, dir, halfAngle) {
    let best = null;
    let bestD = range;
    for (const e of this.scene.enemies.getChildren()) {
      if (!e.active) continue;
      const d = Phaser.Math.Distance.Between(x, y, e.x, e.y) - e.radius;
      if (d >= bestD) continue;
      const a = Phaser.Math.Angle.Between(x, y, e.x, e.y);
      if (Math.abs(Phaser.Math.Angle.Wrap(a - dir)) > halfAngle) continue;
      bestD = d;
      best = e;
    }
    return best;
  }
}
