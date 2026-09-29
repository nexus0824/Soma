import { GAME_HEIGHT } from '../Define.js';

const DEBUG_KEY = 'soma_debug';

export default class SceneDebug extends Phaser.Scene {
  constructor() {
    super({ key: 'SceneDebug', active: true });
  }

  create() {
    let enabled = false;
    try {
      enabled = new URLSearchParams(location.search).get('debug') === '1' || localStorage.getItem(DEBUG_KEY) === '1';
    } catch (e) {
      enabled = false;
    }
    this.enabled = enabled;
    this.text = this.add.text(6, GAME_HEIGHT - 6, '', {
      fontFamily: 'Consolas, monospace', fontSize: '11px', color: '#7CFC00', backgroundColor: 'rgba(0,0,0,0.65)', padding: { x: 4, y: 3 },
    }).setOrigin(0, 1).setDepth(1e6).setScrollFactor(0).setVisible(enabled);
    this.input.keyboard.addCapture('F3');
    this.input.keyboard.on('keydown-F3', () => this.toggle());
    this.stepMs = 0;
    this.renderMs = 0;
    this.acc = 0;
    const events = Phaser.Core.Events;
    this.game.events.on(events.PRE_STEP, () => { this.t0 = performance.now(); });
    this.game.events.on(events.PRE_RENDER, () => { this.t1 = performance.now(); });
    this.game.events.on(events.POST_RENDER, () => {
      const now = performance.now();
      if (this.t0 === undefined) return;
      this.stepMs = this.stepMs * 0.9 + (this.t1 - this.t0) * 0.1;
      this.renderMs = this.renderMs * 0.9 + (now - this.t1) * 0.1;
    });
  }

  toggle() {
    this.enabled = !this.enabled;
    this.text.setVisible(this.enabled);
    try {
      localStorage.setItem(DEBUG_KEY, this.enabled ? '1' : '0');
    } catch (e) {
      return;
    }
  }

  collect() {
    const scenes = this.game.scene.getScenes(true).filter((s) => s !== this);
    let objects = 0;
    let texts = 0;
    let tweens = 0;
    let timers = 0;
    for (const s of scenes) {
      objects += s.children.length;
      for (const o of s.children.list) if (o.type === 'Text') texts++;
      tweens += s.tweens.getTweens().length;
      timers += s.time._active.length;
    }
    const gs = this.game.scene.getScene('SceneGame');
    const gameActive = gs && gs.scene.isActive();
    const lines = [
      `fps ${this.game.loop.actualFps.toFixed(0)}  step ${this.stepMs.toFixed(2)}ms  render ${this.renderMs.toFixed(2)}ms`,
      `objects ${objects}  texts ${texts}  tweens ${tweens}  timers ${timers}`,
    ];
    if (gameActive) {
      const world = gs.physics.world;
      const proj = gs.playerProjectiles.countActive(true) + gs.enemyProjectiles.countActive(true);
      lines.push(`game.update ${(gs.perfUpdateMs || 0).toFixed(2)}ms  bodies ${world.bodies.size}+${world.staticBodies.size}  enemies ${gs.remaining()}  proj ${proj}  loot ${gs.loots.countActive(true)}`);
      lines.push(`nav fields ${gs.nav.fields.size}  floor ${gs.floor}  ${gs.dungeonDef.id}`);
    }
    if (performance.memory) lines.push(`heap ${(performance.memory.usedJSHeapSize / 1048576).toFixed(1)}MB`);
    return lines.join('\n');
  }

  update(time, delta) {
    if (!this.enabled) return;
    this.acc += delta;
    if (this.acc < 250) return;
    this.acc = 0;
    this.text.setText(this.collect());
  }
}
