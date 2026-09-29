import { GAME_WIDTH, GAME_HEIGHT, FONT } from '../Define.js';
import ResourceManager from '../manager/ResourceManager.js';

export default class ScenePreload extends Phaser.Scene {
  constructor() {
    super('ScenePreload');
  }

  preload() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.add.text(cx, cy - 40, 'SOMA', { fontFamily: FONT, fontSize: '48px', color: '#8be3ff', fontStyle: 'bold' }).setOrigin(0.5);
    const barBg = this.add.rectangle(cx, cy + 20, 320, 14, 0x1b1f2e).setStrokeStyle(1, 0x3d4a66);
    const bar = this.add.rectangle(cx - 158, cy + 20, 0, 10, 0x8be3ff).setOrigin(0, 0.5);
    this.load.on('progress', (v) => bar.setSize(316 * v, 10));
    this.load.on('complete', () => {
      barBg.destroy();
      bar.destroy();
    });
    this.load.atlas('dungeon', 'assets/atlas/dungeon.png', 'assets/atlas/dungeon.json');
    this.load.image('atlas_walls', 'assets/atlas/atlas_walls_low-16x16.png');
  }

  create() {
    ResourceManager.buildAll(this);
    this.scene.start('SceneTitle');
  }
}
