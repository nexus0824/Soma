import { DEPTH, RARITY, MAX_INVENTORY } from '../Define.js';
import { sellPrice, itemName, slotIcon } from '../data/Items.js';
import { weaponLookFor } from '../data/WeaponLooks.js';
import { t } from '../i18n/I18n.js';
import * as FX from './FX.js';

export default class Loot extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, payload) {
    const tex = Loot.textureFor(scene, payload);
    super(scene, x, y, tex.key, tex.frame);
    scene.add.existing(this);
    this.id = scene.registerEntity(this);
    this.payload = payload;
    this.setScale(payload.kind === 'gold' ? 3 : 2.5);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.LOOT + 1);
    this.body.setCircle(8, this.width / 2 - 8, this.height / 2 - 8);
    this.glow = scene.add.image(x, y + 6, 'glow').setDepth(DEPTH.LOOT).setAlpha(0.55);
    if (payload.kind === 'item') this.glow.setTint(RARITY[payload.item.rarity].color).setScale(0.9);
    else this.glow.setTint(0xffd23f).setScale(0.5);
    if (payload.kind === 'gold') this.play('coin');
    scene.tweens.add({ targets: this, y: y - 6, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    scene.tweens.add({ targets: this.glow, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 });
  }

  static textureFor(scene, payload) {
    if (payload.kind === 'gold') return { key: 'dungeon', frame: 'coin_anim_f0' };
    const item = payload.item;
    if (item.slot === 'weapon') return { key: 'dungeon', frame: weaponLookFor(item.cls || scene.player.clsId, item).frame };
    return { key: slotIcon(item.slot), frame: undefined };
  }

  pickup(player) {
    const scene = this.scene;
    const p = this.payload;
    if (p.kind === 'gold') {
      player.gold += p.amount;
      FX.floatText(scene, this.x, this.y - 10, t('game.goldGet', { n: p.amount }), '#ffd23f', 14);
    } else if (player.inventory.length < MAX_INVENTORY) {
      player.inventory.push(p.item);
      scene.events.emit('log', t('game.lootGet', { name: itemName(p.item) }), RARITY[p.item.rarity].css);
    } else {
      const g = sellPrice(p.item);
      player.gold += g;
      scene.events.emit('log', t('game.lootSold', { name: itemName(p.item), gold: g }), '#ff9d5c');
    }
    this.destroy();
  }

  destroy(fromScene) {
    if (this.scene && this.scene.unregisterEntity) this.scene.unregisterEntity(this);
    if (this.glow) this.glow.destroy();
    super.destroy(fromScene);
  }
}
