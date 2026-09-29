import { DEPTH } from '../Define.js';

export default class Projectile extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture) {
    super(scene, x, y, texture || 'proj_bolt');
  }

  fire(owner, x, y, angle, cfg) {
    this.owner = owner;
    this.cfg = cfg;
    if (cfg.atlasFrame) this.setTexture('dungeon', cfg.atlasFrame);
    else this.setTexture(cfg.texture);
    this.setActive(true).setVisible(true);
    this.body.enable = true;
    this.body.reset(x, y);
    this.setRotation(angle + (cfg.rotationOffset || 0));
    this.setScale(cfg.scale || 1);
    this.setDepth(DEPTH.PROJECTILE);
    this.clearTint();
    if (cfg.tint) this.setTint(cfg.tint);
    this.startX = x;
    this.startY = y;
    this.hits = new Set();
    const r = cfg.size / 2 / (cfg.scale || 1);
    this.body.setCircle(r, this.width / 2 - r, this.height / 2 - r);
    this.scene.physics.velocityFromRotation(angle, cfg.speed, this.body.velocity);
  }

  update() {
    if (!this.active) return;
    if (Phaser.Math.Distance.Between(this.startX, this.startY, this.x, this.y) > this.cfg.range) this.kill();
  }

  kill() {
    if (!this.active) return;
    this.setActive(false).setVisible(false);
    this.body.stop();
    this.body.enable = false;
  }
}
