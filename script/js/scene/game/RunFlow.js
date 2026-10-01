import { MAX_INVENTORY } from '../../Define.js';
import { createItem, rollRarity, itemName } from '../../data/Items.js';
import { t } from '../../i18n/I18n.js';
import SaveManager from '../../manager/SaveManager.js';

const OUTCOMES = [];

export function registerRunOutcome(handler) {
  OUTCOMES.push(handler);
}

export function runOutcomeFor(scene) {
  return OUTCOMES.find((o) => o.match(scene));
}

registerRunOutcome({
  id: 'daily',
  match: (scene) => !!scene.run.daily,
  canRetry: () => false,
  finish(scene) {
    const c = scene.character;
    c.progress.dailyDone = scene.run.dateKey;
    const opts = scene.itemOpts();
    const reward = createItem(scene.level + 2, c.clsId, undefined, rollRarity(scene.level, 'rare', opts.rarityBonus + 10), opts);
    if (c.inventory.length < MAX_INVENTORY) c.inventory.push(reward);
    else c.gold += 200;
    return t('game.dailyDone', { reward: c.inventory.includes(reward) ? itemName(reward) : t('game.dailyDoneGold', { gold: 200 }) });
  },
});

registerRunOutcome({
  id: 'normal',
  match: () => true,
  canRetry: (scene) => !scene.dungeonDef.endless,
  finish(scene) {
    const c = scene.character;
    const def = scene.dungeonDef;
    const first = !c.isCleared(def.id);
    c.markCleared(def.id);
    return t(first ? 'game.firstClear' : 'game.clear', { dungeon: t(`dungeon.${def.id}.name`) });
  },
});

export default class RunFlow {
  constructor(scene) {
    this.scene = scene;
  }

  openPortal() {
    const scene = this.scene;
    if (scene.portalOpen) return;
    scene.portalOpen = true;
    scene.portal.clearTint();
    scene.portalGlow.setVisible(true);
    scene.tweens.add({ targets: scene.portalGlow, alpha: 0.3, scale: 2.0, duration: 800, yoyo: true, repeat: -1 });
    const last = !scene.dungeonDef.endless && scene.floor >= scene.run.floors;
    scene.events.emit('log', t(last ? 'game.stairsOpenLast' : 'game.stairsOpen'), '#8be3ff');
    this.save();
  }

  tryExit() {
    const scene = this.scene;
    if (!scene.portalOpen || scene.transitioning || scene.player.dead) return;
    if (!scene.dungeonDef.endless && scene.floor >= scene.run.floors) this.finishRun();
    else this.nextFloor();
  }

  nextFloor() {
    const scene = this.scene;
    scene.transitioning = true;
    scene.player.setVelocity(0, 0);
    scene.run.floor = scene.floor + 1;
    scene.character.setBest(scene.run.dungeonId, scene.run.floor);
    this.save();
    scene.cameras.main.fadeOut(350, 0, 0, 0);
    scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      scene.scene.restart({ character: scene.character });
    });
  }

  finishRun() {
    const scene = this.scene;
    scene.transitioning = true;
    scene.player.setVelocity(0, 0);
    const c = scene.character;
    const summary = runOutcomeFor(scene).finish(scene);
    c.run = null;
    this.save();
    scene.events.emit('log', summary, '#ffd23f');
    scene.cameras.main.fadeOut(600, 0, 0, 0);
    scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      scene.scene.stop('SceneUI');
      scene.scene.start('SceneHub', { character: c, summary });
    });
  }

  onPlayerDead() {
    const scene = this.scene;
    const c = scene.character;
    c.gold = Math.floor(c.gold * 0.8);
    const canRetry = runOutcomeFor(scene).canRetry(scene);
    const info = { dungeonId: scene.run.dungeonId, floor: scene.floor, canRetry };
    if (!canRetry) c.run = null;
    this.save();
    scene.events.emit('log', t('game.died'), '#ff6b6b');
    scene.time.delayedCall(900, () => {
      scene.cameras.main.fadeOut(400, 0, 0, 0);
      scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        scene.scene.stop('SceneUI');
        scene.scene.start('SceneResult', { character: c, info });
      });
    });
  }

  save() {
    SaveManager.save(this.scene.character.serialize());
  }

  returnToHub() {
    const scene = this.scene;
    this.save();
    scene.scene.stop('SceneUI');
    scene.scene.start('SceneHub', { character: scene.character });
  }
}
