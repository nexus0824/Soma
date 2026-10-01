import { DEPTH, TILE, actorDepth } from '../Define.js';
import { SPRING } from '../data/Rooms.js';
import * as FX from './FX.js';
import { t } from '../i18n/I18n.js';

export default class Spring extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, room) {
    super(scene, x, y, 'dungeon', 'wall_fountain_basin_blue_anim_f0');
    scene.add.existing(this);
    this.setScale(3);
    this.setDepth(actorDepth(this.y + this.displayHeight / 2 - 6));
    this.play('wall_fountain_basin_blue');
    this.id = scene.registerEntity(this);
    this.room = room;
    this.kind = 'spring';
    this.promptKey = 'hud.drink';
    this.minimapColor = 0x6cff8a;
    this.blinkWhenActive = false;
    this.state = 'active';
    this.glow = scene.add.image(x, y + 8, 'glow').setDepth(DEPTH.LOOT).setTint(0x6cff8a).setScale(1.1).setAlpha(0.35);
    scene.fxTweens.add({ targets: this.glow, alpha: 0.6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  canInteract(actor) {
    return this.state === 'active' && Phaser.Math.Distance.Between(this.x, this.y, actor.x, actor.y) <= TILE * 1.6;
  }

  healActor(actor) {
    if (!actor || !actor.active || actor.dead || actor.downed) return null;
    const hp = Math.round(actor.stats.maxHp * SPRING.hpRatio);
    const mp = Math.round(actor.stats.maxMp * SPRING.mpRatio);
    actor.hp = Math.min(actor.stats.maxHp, actor.hp + hp);
    actor.mp = Math.min(actor.stats.maxMp, actor.mp + mp);
    FX.ring(this.scene, actor.x, actor.y, 36, 0x6cff8a, 400, 3);
    return { hp, mp };
  }

  interact() {
    if (this.state !== 'active') return false;
    this.state = 'used';
    const scene = this.scene;
    const gained = this.healActor(scene.player);
    for (const c of scene.companions.getChildren()) this.healActor(c);
    this.anims.stop();
    this.setFrame('wall_fountain_basin_blue_anim_f0').setTint(0x777777);
    if (this.glow) {
      this.glow.destroy();
      this.glow = null;
    }
    if (gained) scene.events.emit('log', t('game.springUsed', { hp: gained.hp, mp: gained.mp }), '#6cff8a');
    return true;
  }

  netState() {
    return { id: this.id, kind: this.kind, x: this.x, y: this.y, state: this.state };
  }

  destroy(fromScene) {
    if (this.scene && this.scene.unregisterEntity) this.scene.unregisterEntity(this);
    if (this.scene && this.scene.removeInteractable) this.scene.removeInteractable(this);
    if (this.glow) this.glow.destroy();
    super.destroy(fromScene);
  }
}
