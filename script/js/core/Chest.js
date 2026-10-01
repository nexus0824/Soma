import { DEPTH, TILE, actorDepth } from '../Define.js';
import { MIMIC } from '../data/Rooms.js';
import * as FX from './FX.js';
import { t } from '../i18n/I18n.js';

export default class Chest extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, room, opts = {}) {
    super(scene, x, y, 'dungeon', 'chest_full_open_anim_f0');
    scene.add.existing(this);
    this.setScale(3);
    this.setDepth(actorDepth(this.y + this.displayHeight / 2 - 6));
    this.id = scene.registerEntity(this);
    this.room = room;
    this.mimic = !!opts.mimic;
    this.baseX = x;
    this.kind = 'chest';
    this.blinkWhenActive = true;
    this.promptKey = 'hud.open';
    this.minimapColor = 0xffd23f;
    this.state = 'locked';
    this.setTint(0x666666);
    this.glow = scene.add.image(x, y + 8, 'glow').setDepth(DEPTH.LOOT).setTint(0xffd23f).setScale(1.2).setVisible(false);
  }

  update(time) {
    if (this.state === 'locked' && this.scene.remainingInRoom(this.room) === 0) this.activate();
    if (this.mimic && this.state === 'active') this.twitch(time);
  }

  twitch(time) {
    const p = this.scene.player;
    const near = p && Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y) <= TILE * MIMIC.shakeRange;
    const slot = Math.floor(time / 90);
    const shaking = near && slot % 24 < 4;
    this.setX(this.baseX + (shaking ? (slot % 2 ? 1.5 : -1.5) : 0));
  }

  activate() {
    this.state = 'active';
    this.clearTint();
    this.glow.setVisible(true).setAlpha(0.3);
    this.scene.fxTweens.add({ targets: this.glow, alpha: 0.65, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    FX.floatText(this.scene, this.x, this.y - 30, t('game.chestReady'), '#ffd23f', 14);
    FX.ring(this.scene, this.x, this.y, 40, 0xffd23f, 500, 3);
  }

  canInteract(actor) {
    return this.state === 'active' && Phaser.Math.Distance.Between(this.x, this.y, actor.x, actor.y) <= TILE * 1.6;
  }

  interact() {
    if (this.mimic) return this.reveal();
    return this.open();
  }

  reveal() {
    if (this.state !== 'active') return false;
    this.state = 'used';
    this.scene.spawnMimic(this);
    return true;
  }

  open() {
    if (this.state !== 'active') return false;
    this.state = 'used';
    this.glow.destroy();
    this.glow = null;
    this.play({ key: 'chest_full_open', repeat: 0 });
    this.once('animationcomplete', () => this.setFrame('chest_empty_open_anim_f2'));
    this.scene.openChest(this);
    return true;
  }

  netState() {
    return { id: this.id, kind: this.kind, x: this.baseX, y: this.y, state: this.state };
  }

  destroy(fromScene) {
    if (this.scene && this.scene.unregisterEntity) this.scene.unregisterEntity(this);
    if (this.scene && this.scene.removeInteractable) this.scene.removeInteractable(this);
    if (this.glow) this.glow.destroy();
    super.destroy(fromScene);
  }
}
