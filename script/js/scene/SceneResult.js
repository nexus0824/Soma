import { GAME_WIDTH, GAME_HEIGHT, FONT } from '../Define.js';
import { DUNGEONS } from '../data/Dungeons.js';
import { t } from '../i18n/I18n.js';

const TXT = (size, color = '#ffffff', extra = {}) => ({ fontFamily: FONT, fontSize: `${size}px`, color, ...extra });

export default class SceneResult extends Phaser.Scene {
  constructor() {
    super('SceneResult');
  }

  init(data) {
    this.character = data.character;
    this.info = data.info;
  }

  create() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const c = this.character;
    const info = this.info;
    const def = DUNGEONS[info.dungeonId];
    const dungeonName = t(`dungeon.${def.id}.name`);
    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x0b0d14);
    this.add.text(cx, cy - 130, t('result.died'), TXT(44, '#ff6b6b', { fontStyle: 'bold' })).setOrigin(0.5);
    this.add.sprite(cx, cy - 50, 'dungeon', `${c.cls.sprite}_hit_anim_f0`).setScale(4).setAngle(90).setAlpha(0.6);
    this.add.text(cx, cy + 10, t('result.where', { cls: t(`class.${c.clsId}.name`), level: c.level, dungeon: dungeonName, floor: info.floor }), TXT(18, '#ffffff', { wordWrap: { width: GAME_WIDTH - 40 }, align: 'center' })).setOrigin(0.5);
    const best = c.bestFloor(info.dungeonId);
    this.add.text(cx, cy + 38, t(def.endless ? 'result.bestEndless' : 'result.bestRegion', { n: best }), TXT(14, '#ffd23f')).setOrigin(0.5);
    this.add.text(cx, cy + 66, t(info.canRetry ? 'result.penaltyRetry' : 'result.penaltyEnd'), TXT(13, '#9aa4b8', { wordWrap: { width: GAME_WIDTH - 60 }, align: 'center' })).setOrigin(0.5);
    let y = cy + 130;
    if (info.canRetry) {
      this.makeButton(cx, y, 320, 46, t('result.retry', { floor: info.floor }), () => {
        this.scene.start('SceneGame', { character: c });
      }, 0x2f6fd6);
      y += 60;
    }
    this.makeButton(cx, y, 320, 46, t('common.toHub'), () => {
      this.scene.start('SceneHub', { character: c });
    }, 0x3d4a66);
  }

  makeButton(x, y, w, h, label, cb, color) {
    const r = this.add.rectangle(x, y, w, h, color, 1).setStrokeStyle(1, 0xffffff, 0.4).setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, TXT(17, '#ffffff', { fontStyle: 'bold' })).setOrigin(0.5);
    r.on('pointerover', () => r.setFillStyle(color, 0.8));
    r.on('pointerout', () => r.setFillStyle(color, 1));
    r.on('pointerdown', cb);
  }
}
