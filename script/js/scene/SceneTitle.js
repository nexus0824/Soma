import { GAME_WIDTH, GAME_HEIGHT, FONT } from '../Define.js';
import { LAYOUT } from '../ui/Layout.js';
import { CLASSES } from '../data/Classes.js';
import Character from '../core/Character.js';
import { cssColor } from '../core/FX.js';
import { WEAPON_ANIMS } from '../data/WeaponAnims.js';
import { restTransform } from '../anim/PoseRig.js';
import { defaultLook } from '../data/WeaponLooks.js';
import { t, getLanguage, setLanguage, nextLanguage } from '../i18n/I18n.js';
import SaveManager from '../manager/SaveManager.js';

const TXT = (size, color = '#ffffff', extra = {}) => ({ fontFamily: FONT, fontSize: `${size}px`, color, ...extra });

export default class SceneTitle extends Phaser.Scene {
  constructor() {
    super('SceneTitle');
  }

  create() {
    const T = LAYOUT.title;
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0b0d14);
    for (let i = 0; i < Math.ceil(GAME_WIDTH / 48); i++) {
      this.add.image(i * 48 + 24, GAME_HEIGHT - 24, 'dungeon', 'floor_1').setScale(3).setAlpha(0.35);
      this.add.image(i * 48 + 24, GAME_HEIGHT - 72, 'dungeon', 'wall_mid').setScale(3).setAlpha(0.35);
    }
    this.add.text(cx, T.logoY, 'SOMA', TXT(72, '#8be3ff', { fontStyle: 'bold', stroke: '#0b0d14', strokeThickness: 8 })).setOrigin(0.5);
    this.add.text(cx, T.subtitleY, t('title.subtitle'), TXT(15, '#9aa4b8')).setOrigin(0.5);
    this.makeButton(T.buttons.x, T.buttons.langY, T.buttons.w, 30, t('title.language', { name: t('lang.name') }), () => {
      setLanguage(nextLanguage());
      this.scene.restart();
    }, 0x232a3d, 11);

    const save = SaveManager.load();
    let cardY = T.cardsY;
    if (save && CLASSES[save.clsId]) {
      const cleared = Object.keys(save.progress.cleared).length;
      const label = t('title.continue', { cls: t(`class.${save.clsId}.name`), level: save.level, cleared });
      this.makeButton(cx, T.continueY, T.continueW, 44, label, () => {
        this.scene.start('SceneHub', { character: new Character(save) });
      }, 0x2f6fd6, 15);
      this.add.text(cx, T.warnY, t('title.overwriteWarn'), TXT(12, '#ff9d5c')).setOrigin(0.5);
      cardY = T.cardsYWithSave;
    } else {
      this.add.text(cx, T.chooseY, t('title.choose'), TXT(18, '#ffffff')).setOrigin(0.5);
    }

    const C = T.card;
    const totalW = C.cols * C.w + (C.cols - 1) * C.gapX;
    const startX = (GAME_WIDTH - totalW) / 2 + C.w / 2;
    Object.keys(CLASSES).forEach((id, i) => {
      const cls = CLASSES[id];
      const col = i % C.cols;
      const row = Math.floor(i / C.cols);
      const x = startX + col * (C.w + C.gapX);
      const y = cardY + row * (C.h + C.gapY) + C.h / 2;
      const card = this.add.rectangle(x, y, C.w, C.h, 0x141826, 0.95).setStrokeStyle(2, 0x3d4a66).setInteractive({ useHandCursor: true });
      const look = defaultLook(id);
      const rt = restTransform(WEAPON_ANIMS[look.anim], 4);
      const placeHero = (hx, hy) => {
        const sprite = this.add.sprite(hx, hy, 'dungeon', `${cls.sprite}_idle_anim_f0`).setScale(4);
        sprite.play(`${cls.sprite}_idle`);
        this.add.image(hx + rt.dx, hy + rt.dy, 'dungeon', look.frame).setOrigin(rt.origin[0], rt.origin[1]).setScale(rt.scale).setRotation(rt.rotation).setDepth(sprite.depth + rt.depthOffset);
      };
      if (C.stacked) {
        const top = y - C.h / 2;
        placeHero(x, top + 50);
        this.add.text(x, top + 120, t(`class.${id}.name`), TXT(22, cssColor(cls.color), { fontStyle: 'bold' })).setOrigin(0.5);
        this.add.text(x, top + 148, t(`class.${id}.desc`), TXT(12, '#c9d1e0', { wordWrap: { width: C.w - 24 }, align: 'center' })).setOrigin(0.5, 0);
        this.add.text(x, y + C.h / 2 - 20, t('title.companionNote'), TXT(11, '#8a94a8')).setOrigin(0.5);
      } else {
        const left = x - C.w / 2;
        placeHero(left + 50, y - 4);
        this.add.text(left + 120, y - 52, t(`class.${id}.name`), TXT(24, cssColor(cls.color), { fontStyle: 'bold' }));
        this.add.text(left + 120, y - 18, t(`class.${id}.desc`), TXT(13, '#c9d1e0', { wordWrap: { width: C.w - 140 } }));
        this.add.text(left + 120, y + 36, t('title.companionNote'), TXT(11, '#8a94a8'));
      }
      card.on('pointerover', () => card.setStrokeStyle(2, cls.color));
      card.on('pointerout', () => card.setStrokeStyle(2, 0x3d4a66));
      card.on('pointerdown', () => this.startNew(id));
    });

    this.add.text(cx, T.hintPcY, t('title.hintPc'), TXT(11, '#9aa4b8', { wordWrap: { width: GAME_WIDTH - 40 }, align: 'center' })).setOrigin(0.5);
    this.add.text(cx, T.hintMobileY, t('title.hintMobile'), TXT(11, '#9aa4b8')).setOrigin(0.5);
    this.add.text(GAME_WIDTH - 8, GAME_HEIGHT - 8, t('title.credit'), TXT(10, '#6b7386')).setOrigin(1, 1);
    this.registry.set('lang', getLanguage());
  }

  startNew(clsId) {
    const character = Character.create(clsId);
    SaveManager.save(character.serialize());
    this.scene.start('SceneHub', { character });
  }

  makeButton(x, y, w, h, label, cb, color, size) {
    const r = this.add.rectangle(x, y, w, h, color, 1).setStrokeStyle(1, 0xffffff, 0.4).setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, TXT(size, '#ffffff', { fontStyle: 'bold' })).setOrigin(0.5);
    r.on('pointerover', () => r.setFillStyle(color, 0.8));
    r.on('pointerout', () => r.setFillStyle(color, 1));
    r.on('pointerdown', cb);
    return r;
  }
}
