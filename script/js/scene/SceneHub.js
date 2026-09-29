import { GAME_WIDTH, GAME_HEIGHT, FONT } from '../Define.js';
import { DUNGEONS, DUNGEON_ORDER, isUnlocked, getDaily, makeRun } from '../data/Dungeons.js';
import { cssColor } from '../core/FX.js';
import { WEAPON_ANIMS } from '../data/WeaponAnims.js';
import { restTransform } from '../anim/PoseRig.js';
import { weaponLookFor } from '../data/WeaponLooks.js';
import { t } from '../i18n/I18n.js';
import SaveManager from '../manager/SaveManager.js';

const TXT = (size, color = '#ffffff', extra = {}) => ({ fontFamily: FONT, fontSize: `${size}px`, color, ...extra });

export default class SceneHub extends Phaser.Scene {
  constructor() {
    super('SceneHub');
  }

  init(data) {
    this.character = data.character;
    this.summary = data.summary || null;
  }

  create() {
    SaveManager.save(this.character.serialize());
    this.build();
    this.events.on('wake', () => this.refresh());
  }

  refresh() {
    this.children.removeAll(true);
    this.build();
  }

  build() {
    const c = this.character;
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0b0d14);
    this.add.text(cx, 34, t('hub.title'), TXT(26, '#8be3ff', { fontStyle: 'bold' })).setOrigin(0.5);

    const sprite = this.add.sprite(44, 88, 'dungeon', `${c.cls.sprite}_idle_anim_f0`).setScale(2.5);
    sprite.play(`${c.cls.sprite}_idle`);
    const look = weaponLookFor(c.clsId, c.equipment.weapon);
    const rt = restTransform(WEAPON_ANIMS[look.anim], 2.5);
    this.add.image(44 + rt.dx, 88 + rt.dy, 'dungeon', look.frame).setOrigin(rt.origin[0], rt.origin[1]).setScale(rt.scale).setRotation(rt.rotation).setDepth(sprite.depth + rt.depthOffset);
    this.add.text(80, 68, `${t(`class.${c.clsId}.name`)}  Lv.${c.level}`, TXT(18, cssColor(c.cls.color), { fontStyle: 'bold' }));
    this.add.text(80, 94, t('hub.statLine', { gold: c.gold, atk: c.stats.atk, def: c.stats.def, hp: c.stats.maxHp }), TXT(12, '#c9d1e0'));
    this.makeButton(GAME_WIDTH - 150, 88, 110, 34, t(c.skillPoints > 0 ? 'hub.gearSkillsAlert' : 'hub.gearSkills'), () => this.openPanel(), c.skillPoints > 0 ? 0xd6a52f : 0x2f6fd6, 13);
    this.makeButton(GAME_WIDTH - 46, 88, 76, 34, t('common.title'), () => {
      SaveManager.save(c.serialize());
      this.scene.start('SceneTitle');
    }, 0x3d4a66, 12);

    let y = 132;
    if (this.summary) {
      this.add.text(cx, y, this.summary, TXT(13, '#ffd23f', { fontStyle: 'bold', wordWrap: { width: GAME_WIDTH - 40 }, align: 'center' })).setOrigin(0.5, 0);
      y += 34;
      this.summary = null;
    }

    y = this.buildDailyCard(y + 4);
    for (const id of DUNGEON_ORDER) y = this.buildDungeonCard(DUNGEONS[id], y);
    this.add.text(cx, GAME_HEIGHT - 20, t('hub.footer'), TXT(10, '#6b7386', { wordWrap: { width: GAME_WIDTH - 30 }, align: 'center' })).setOrigin(0.5);
  }

  buildDailyCard(y) {
    const c = this.character;
    const daily = getDaily(c);
    const h = 96;
    const card = this.add.rectangle(GAME_WIDTH / 2, y + h / 2, GAME_WIDTH - 24, h, 0x1c1f36, 0.98).setStrokeStyle(2, daily.done ? 0x3d4a66 : 0xffd23f);
    this.add.text(24, y + 10, t('hub.daily', { dungeon: t(`dungeon.${daily.dungeonId}.name`), floors: daily.floors }), TXT(16, '#ffd23f', { fontStyle: 'bold' }));
    const modText = daily.modifiers.map((id) => t('hub.modDesc', { name: t(`modifier.${id}.name`), desc: t(`modifier.${id}.desc`) })).join('  ');
    this.add.text(24, y + 36, modText, TXT(11, '#c9d1e0', { wordWrap: { width: GAME_WIDTH - 170 } }));
    if (daily.done) {
      this.add.text(GAME_WIDTH - 24, y + h / 2, t('hub.dailyDone'), TXT(16, '#8a94a8', { fontStyle: 'bold' })).setOrigin(1, 0.5);
    } else {
      const inProgress = c.run && c.run.daily && c.run.dateKey === daily.key;
      this.makeButton(GAME_WIDTH - 74, y + h / 2, 100, 40, inProgress ? t('hub.continueFloor', { floor: c.run.floor }) : t('hub.challenge'), () => {
        if (!inProgress) c.run = makeRun(daily.dungeonId, { floors: daily.floors, modifiers: daily.modifiers, daily: true, dateKey: daily.key });
        this.startRun();
      }, 0xd6a52f, 14);
    }
    card.setInteractive();
    return y + h + 12;
  }

  buildDungeonCard(def, y) {
    const c = this.character;
    const unlocked = isUnlocked(def, c);
    const cleared = c.isCleared(def.id);
    const best = c.bestFloor(def.id);
    const inProgress = c.run && !c.run.daily && c.run.dungeonId === def.id;
    const h = 118;
    const color = unlocked ? 0x141826 : 0x0f111a;
    const card = this.add.rectangle(GAME_WIDTH / 2, y + h / 2, GAME_WIDTH - 24, h, color, 0.98).setStrokeStyle(2, unlocked ? def.tint : 0x2a2f45);
    const nameColor = unlocked ? cssColor(def.tint) : '#6b7386';
    this.add.text(24, y + 10, t(`dungeon.${def.id}.name`), TXT(20, nameColor, { fontStyle: 'bold' }));
    const floors = def.endless ? t('hub.endless') : t('hub.floorsN', { n: def.floors });
    const mods = def.modifiers.length ? '  ·  ' + def.modifiers.map((m) => t(`modifier.${m}.name`)).join(', ') : '';
    this.add.text(24, y + 38, `${floors}  ·  ${t('hub.recLevel', { level: def.baseLevel })}${mods}`, TXT(12, '#9aa4b8'));
    this.add.text(24, y + 58, t(`dungeon.${def.id}.desc`), TXT(11, unlocked ? '#c9d1e0' : '#5a627a', { wordWrap: { width: GAME_WIDTH - 180 } }));
    let status;
    if (!unlocked) status = t('hub.needClear', { dungeon: t(`dungeon.${def.requires}.name`) });
    else if (def.endless) status = best > 0 ? t('hub.bestFloor', { n: best }) : t('hub.noRecord');
    else if (inProgress) status = t('hub.inProgress', { floor: c.run.floor, floors: c.run.floors });
    else if (cleared) status = t('hub.cleared', { n: best });
    else status = best > 0 ? t('hub.reached', { n: best }) : t('hub.unexplored');
    this.add.text(24, y + 94, status, TXT(12, cleared ? '#8be3ff' : '#ffd23f'));
    if (unlocked) {
      let label = t('hub.enter');
      if (inProgress) label = t('hub.continueFloor', { floor: c.run.floor });
      else if (cleared && !def.endless) label = t('hub.retry');
      this.makeButton(GAME_WIDTH - 74, y + h / 2, 100, 40, label, () => {
        if (!inProgress) c.run = makeRun(def.id);
        this.startRun();
      }, def.endless ? 0x7b4fbf : 0x2f6fd6, 14);
    }
    card.setInteractive();
    return y + h + 10;
  }

  startRun() {
    SaveManager.save(this.character.serialize());
    this.scene.start('SceneGame', { character: this.character });
  }

  openPanel() {
    this.scene.launch('SceneUI', { mode: 'hub', character: this.character });
    this.scene.pause();
  }

  makeButton(x, y, w, h, label, cb, color, size) {
    const r = this.add.rectangle(x, y, w, h, color, 1).setStrokeStyle(1, 0xffffff, 0.4).setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, TXT(size, '#ffffff', { fontStyle: 'bold' })).setOrigin(0.5);
    r.on('pointerover', () => r.setFillStyle(color, 0.8));
    r.on('pointerout', () => r.setFillStyle(color, 1));
    r.on('pointerdown', (p, lx, ly, ev) => {
      if (ev && ev.stopPropagation) ev.stopPropagation();
      cb();
    });
    return r;
  }
}
