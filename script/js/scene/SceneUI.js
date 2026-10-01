import { GAME_WIDTH, GAME_HEIGHT, FONT, RARITY, MAX_INVENTORY, xpToNext } from '../Define.js';
import { LAYOUT } from '../ui/Layout.js';
import { InputState } from '../core/InputState.js';
import { SKILLS } from '../data/Skills.js';
import { EQUIP_SLOTS, equipSlotsFor, equipSlotLabel, compareTarget, isUpgrade, slotIcon, itemSummary, sellPrice, itemName } from '../data/Items.js';
import { weaponLookFor } from '../data/WeaponLooks.js';
import { t } from '../i18n/I18n.js';
import { cssColor } from '../core/FX.js';
import SaveManager from '../manager/SaveManager.js';

const TXT = (size, color = '#ffffff', extra = {}) => ({ fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#000000', strokeThickness: 2, ...extra });
const clamp01 = (v) => Math.max(0, Math.min(1, v));

export default class SceneUI extends Phaser.Scene {
  constructor() {
    super('SceneUI');
  }

  init(data) {
    this.mode = data && data.mode === 'hub' ? 'hub' : 'game';
    this.hubCharacter = data ? data.character : null;
  }

  create() {
    this.panel = null;
    this.panelTab = 'character';
    this.invSelection = null;
    this.tabs = [
      { id: 'character', label: t('panel.tabCharacter'), build: (c, y) => this.buildTabCharacter(c, y) },
      { id: 'inventory', label: t('panel.tabInventory'), build: (c, y) => this.buildTabInventory(c, y) },
      { id: 'skills', label: t('panel.tabSkills'), build: (c, y) => this.buildTabSkills(c, y) },
    ];
    this.input.keyboard.on('keydown-I', () => this.togglePanel());
    this.input.keyboard.on('keydown-ESC', () => this.togglePanel());
    if (this.mode === 'hub') {
      this.openPanel();
      return;
    }
    this.gs = this.scene.get('SceneGame');
    this.buildHud();
    this.buildParty();
    this.buildButtons();
    this.buildJoystick();
    this.gs.events.on('hud', this.onHud, this);
    this.gs.events.on('log', this.log, this);
    this.events.once('shutdown', () => {
      this.gs.events.off('hud', this.onHud, this);
      this.gs.events.off('log', this.log, this);
    });
  }

  subject() {
    return this.mode === 'hub' ? this.hubCharacter : this.gs.player;
  }

  saveSubject() {
    SaveManager.save(this.subject().serialize());
  }

  buildHud() {
    const L = LAYOUT;
    this.bars = this.add.graphics();
    this.hpText = this.add.text(L.hud.x + L.hud.barW / 2, L.hud.y + 8, '', TXT(12)).setOrigin(0.5);
    this.mpText = this.add.text(L.hud.x + L.hud.barW / 2, L.hud.y + 28, '', TXT(9)).setOrigin(0.5);
    this.levelText = this.add.text(L.level.x, L.level.y, '', TXT(13, '#ffd23f', { fontStyle: 'bold' }));
    this.comboText = this.add.text(L.level.x, L.level.y + 18, '', TXT(11, '#ff9d5c', { fontStyle: 'bold' }));
    this.floorText = this.add.text(L.floor.x, L.floor.y, '', TXT(15, '#ffffff', { fontStyle: 'bold' })).setOrigin(0.5);
    this.remainText = this.add.text(L.remain.x, L.remain.y, '', TXT(12)).setOrigin(0.5);
    this.goldText = this.add.text(L.gold.x, L.gold.y, '', TXT(14, '#ffd23f', { fontStyle: 'bold' })).setOrigin(1, 0.5);
    this.bossText = this.add.text(GAME_WIDTH / 2, L.boss.y - 12, '', TXT(12, '#ff8ab0', { fontStyle: 'bold' })).setOrigin(0.5).setVisible(false);
    this.modText = this.add.text(L.mods.x, L.mods.y, '', TXT(10, '#ffb04a'));
    this.logText = this.add.text(L.log.x, L.log.y, '', TXT(14, '#ffffff', { fontStyle: 'bold', wordWrap: { width: GAME_WIDTH - 40 }, align: 'center' })).setOrigin(0.5).setAlpha(0);
  }

  buildParty() {
    const P = LAYOUT.party;
    this.partyBars = this.add.graphics();
    this.partyRows = [0, 1].map((i) => {
      const y = P.y + i * P.rowH;
      const zone = this.add.rectangle(P.x, y, P.w, P.rowH - 4, 0x000000, 0.35).setOrigin(0, 0).setStrokeStyle(1, 0xffffff, 0.15).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', (p, lx, ly, ev) => {
        if (ev && ev.stopPropagation) ev.stopPropagation();
        this.gs.toggleTactic(i);
      });
      const portrait = this.add.sprite(P.x + 20, y + 18, 'dungeon', 'knight_m_idle_anim_f0').setScale(1.3);
      const name = this.add.text(P.x + 42, y + 2, '', TXT(11, '#ffffff', { fontStyle: 'bold' }));
      const tactic = this.add.text(P.x + P.w - 6, y + 2, '', TXT(9, '#c9d1e0')).setOrigin(1, 0);
      const status = this.add.text(P.x + 42, y + 25, '', TXT(8, '#c9d1e0'));
      const hpText = this.add.text(P.x + P.w - 6, y + 25, '', TXT(8, '#ffffff')).setOrigin(1, 0);
      return { y, zone, portrait, name, tactic, status, hpText };
    });
    this.add.text(P.x, P.hint, t('hud.partyHint'), TXT(8, '#8a94a8'));
  }

  onParty(party) {
    const g = this.partyBars;
    const P = LAYOUT.party;
    g.clear();
    this.partyRows.forEach((row, i) => {
      const d = party[i];
      const visible = !!d;
      for (const key of ['zone', 'portrait', 'name', 'tactic', 'status', 'hpText']) row[key].setVisible(visible);
      if (!d) return;
      row.portrait.setFrame(`${d.sprite}_${d.downed ? 'hit' : 'idle'}_anim_f0`).setAlpha(d.downed ? 0.5 : 1).setAngle(d.downed ? 90 : 0);
      row.name.setText(d.name).setColor(cssColor(d.color));
      row.tactic.setText(t(`tactic.${d.tactic}`)).setColor(d.tactic === 'aggressive' ? '#ff9d5c' : '#8be3ff');
      if (d.downed) row.status.setText(t('hud.statusDown', { sec: Math.ceil(d.reviveIn / 1000) })).setColor('#ff6b6b');
      else row.status.setText(t(d.fighting ? 'hud.statusFighting' : 'hud.statusIdle')).setColor(d.fighting ? '#ffd23f' : '#c9d1e0');
      row.hpText.setText(`${Math.ceil(d.hp)} / ${d.maxHp}`);
      const bx = P.x + 42;
      const by = row.y + 16;
      const bw = P.w - 50;
      g.fillStyle(0x3a0d0d, 1);
      g.fillRect(bx, by, bw, 5);
      g.fillStyle(d.downed ? 0x6b2a2a : 0xe63946, 1);
      g.fillRect(bx, by, bw * clamp01(d.hp / d.maxHp), 5);
      g.fillStyle(0x0d1f3a, 1);
      g.fillRect(bx, by + 6, bw, 3);
      g.fillStyle(0x4ea8ff, 1);
      g.fillRect(bx, by + 6, bw * clamp01(d.mp / d.maxMp), 3);
    });
  }

  buildButtons() {
    const L = LAYOUT;
    this.attackBtn = this.add.image(L.attack.x, L.attack.y, 'btn_big').setTint(0xff6b5c).setAlpha(0.85).setInteractive();
    this.add.text(L.attack.x, L.attack.y - 6, t('hud.attack'), TXT(20, '#ffffff', { fontStyle: 'bold' })).setOrigin(0.5);
    this.add.text(L.attack.x, L.attack.y + 17, t('hud.attackHint'), TXT(10, '#ffd9d4')).setOrigin(0.5);
    this.attackBtn.on('pointerdown', () => {
      InputState.attack = true;
      InputState.attackPressed = true;
    });
    this.attackBtn.on('pointerup', () => { InputState.attack = false; });
    this.attackBtn.on('pointerout', () => { InputState.attack = false; });
    this.dodgeBtn = this.add.image(L.dodge.x, L.dodge.y, 'btn_small').setTint(0x8be3ff).setAlpha(0.9).setInteractive();
    this.add.text(L.dodge.x, L.dodge.y, t('hud.dodge'), TXT(12, '#ffffff', { fontStyle: 'bold' })).setOrigin(0.5);
    this.dodgeCd = this.add.graphics();
    this.dodgeBtn.on('pointerdown', () => { InputState.dodgePressed = true; });

    const hints = ['K', 'L', ';'];
    this.skillBtns = L.skills.map(({ x, y }, i) => {
      const img = this.add.image(x, y, 'btn').setAlpha(0.9).setInteractive();
      const label = this.add.text(x, y - 7, '', TXT(15, '#ffffff', { fontStyle: 'bold' })).setOrigin(0.5);
      const cost = this.add.text(x, y + 12, '', TXT(11, '#8be3ff')).setOrigin(0.5);
      const cd = this.add.graphics();
      const cdText = this.add.text(x, y, '', TXT(16, '#ffffff', { fontStyle: 'bold' })).setOrigin(0.5);
      const lv = this.add.text(x + 24, y - 26, '', TXT(11, '#ffd23f')).setOrigin(0.5);
      this.add.text(x - 24, y + 26, hints[i], TXT(10, '#c9d1e0')).setOrigin(0.5);
      img.on('pointerdown', () => { InputState.skills[i] = true; });
      return { img, label, cost, cd, cdText, lv, x, y };
    });

    this.bagBtn = this.add.image(L.bag.x, L.bag.y, 'btn_small').setTint(0x3d4a66).setInteractive();
    this.add.text(L.bag.x, L.bag.y, t('hud.bag'), TXT(12, '#ffffff', { fontStyle: 'bold' })).setOrigin(0.5);
    this.bagBadge = this.add.circle(L.bag.x + 20, L.bag.y - 18, 7, 0xff4a4a).setVisible(false);
    this.bagBtn.on('pointerdown', (p, lx, ly, ev) => {
      if (ev && ev.stopPropagation) ev.stopPropagation();
      this.togglePanel();
    });
  }

  buildJoystick() {
    const J = LAYOUT.joystick;
    this.joyHome = { x: J.x, y: J.y };
    this.joyBase = this.add.image(J.x, J.y, 'joy_base').setAlpha(0.5);
    this.joyThumb = this.add.image(J.x, J.y, 'joy_thumb').setAlpha(0.6);
    this.joyPointer = null;
    this.mousePointer = null;
    const inZone = (p) => p.x >= J.zone.x && p.x <= J.zone.x + J.zone.w && p.y >= J.zone.y && p.y <= J.zone.y + J.zone.h;
    this.input.on('pointerdown', (p) => {
      if (this.panel) return;
      if (!p.wasTouch) {
        if (this.input.hitTestPointer(p).length) return;
        if (p.rightButtonDown()) {
          const w = this.gs.cameras.main.getWorldPoint(p.x, p.y);
          InputState.dodgePressed = true;
          InputState.dodgeTarget = { x: w.x, y: w.y };
          return;
        }
        this.mousePointer = p;
        this.setAim(p);
        InputState.attack = true;
        InputState.attackPressed = true;
        return;
      }
      if (this.joyPointer || !inZone(p)) return;
      this.joyPointer = p;
      this.joyBase.setPosition(p.x, p.y);
      this.joyThumb.setPosition(p.x, p.y);
    });
    this.input.on('pointermove', (p) => {
      if (p === this.joyPointer) this.updateJoy(p);
      else if (p === this.mousePointer) this.setAim(p);
    });
    const release = (p) => {
      if (p === this.mousePointer) {
        this.mousePointer = null;
        InputState.attack = false;
        InputState.releaseAim(this.time.now);
        return;
      }
      if (p !== this.joyPointer) return;
      this.joyPointer = null;
      InputState.moveX = 0;
      InputState.moveY = 0;
      this.joyBase.setPosition(this.joyHome.x, this.joyHome.y);
      this.joyThumb.setPosition(this.joyHome.x, this.joyHome.y);
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
  }

  setAim(p) {
    const w = this.gs.cameras.main.getWorldPoint(p.x, p.y);
    InputState.setAim(w.x, w.y, this.time.now);
  }

  updateJoy(p) {
    const dx = p.x - this.joyBase.x;
    const dy = p.y - this.joyBase.y;
    const d = Math.hypot(dx, dy);
    const max = LAYOUT.joystick.radius;
    const k = d > max ? max / d : 1;
    this.joyThumb.setPosition(this.joyBase.x + dx * k, this.joyBase.y + dy * k);
    const mag = Math.min(1, d / max);
    if (mag < 0.15 || d === 0) {
      InputState.moveX = 0;
      InputState.moveY = 0;
    } else {
      InputState.moveX = (dx / d) * mag;
      InputState.moveY = (dy / d) * mag;
    }
  }

  onHud(d) {
    const g = this.bars;
    const H = LAYOUT.hud;
    g.clear();
    const bx = H.x;
    const by = H.y;
    g.fillStyle(0x000000, 0.6);
    g.fillRect(bx - 2, by - 2, H.barW + 4, H.hpH + 4);
    g.fillStyle(0x3a0d0d, 1);
    g.fillRect(bx, by, H.barW, H.hpH);
    g.fillStyle(0xe63946, 1);
    g.fillRect(bx, by, H.barW * clamp01(d.hp / d.maxHp), H.hpH);
    if (d.shield > 0) {
      g.fillStyle(0x8be3ff, 0.9);
      g.fillRect(bx, by, H.barW * clamp01(d.shield / d.maxHp), 4);
    }
    const mpY = by + H.hpH + 6;
    g.fillStyle(0x000000, 0.6);
    g.fillRect(bx - 2, mpY - 2, H.barW + 4, H.mpH + 4);
    g.fillStyle(0x0d1f3a, 1);
    g.fillRect(bx, mpY, H.barW, H.mpH);
    g.fillStyle(0x4ea8ff, 1);
    g.fillRect(bx, mpY, H.barW * clamp01(d.mp / d.maxMp), H.mpH);
    const xpY = mpY + H.mpH + 4;
    g.fillStyle(0x000000, 0.6);
    g.fillRect(bx - 2, xpY - 2, H.barW + 4, H.xpH + 4);
    g.fillStyle(0xffd23f, 1);
    g.fillRect(bx, xpY, H.barW * clamp01(d.xp / d.xpNext), H.xpH);
    this.hpText.setText(`${Math.ceil(d.hp)} / ${d.maxHp}`);
    this.mpText.setText(t('hud.soma', { mp: Math.floor(d.mp), max: d.maxMp }));
    this.levelText.setText(`Lv.${d.level}${d.buffAtk ? t('hud.atkBuff') : ''}`);
    this.comboText.setText(d.comboActive && d.comboStep > 0 ? t('hud.comboReady', { n: d.comboStep + 1 }) : '');
    this.floorText.setText(d.floorLabel);
    if (d.remaining > 0) this.remainText.setText(t('hud.remaining', { n: d.remaining })).setColor('#ffffff');
    else this.remainText.setText(t('hud.stairs')).setColor('#8be3ff');
    this.goldText.setText(`${d.gold} G`);
    this.bagBadge.setVisible(d.skillPoints > 0);
    this.modText.setText(d.modNames && d.modNames.length ? t('hud.mods', { list: d.modNames.join(' · ') }) : '');
    if (d.boss) {
      const w = LAYOUT.boss.w;
      const x = (GAME_WIDTH - w) / 2;
      const y = LAYOUT.boss.y;
      g.fillStyle(0x000000, 0.6);
      g.fillRect(x - 2, y - 2, w + 4, 12);
      g.fillStyle(0xff5c8a, 1);
      g.fillRect(x, y, w * clamp01(d.boss.hp / d.boss.maxHp), 8);
      this.bossText.setText(d.boss.name).setVisible(true);
    } else {
      this.bossText.setVisible(false);
    }
    d.skills.forEach((s, i) => this.updateSkillButton(i, s));
    this.dodgeCd.clear();
    if (d.dodge && d.dodge.remain > 0) {
      const frac = d.dodge.remain / d.dodge.total;
      this.dodgeCd.fillStyle(0x000000, 0.6);
      this.dodgeCd.slice(LAYOUT.dodge.x, LAYOUT.dodge.y, LAYOUT.dodge.r, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(-90 + 360 * frac), false);
      this.dodgeCd.fillPath();
    }
    this.onParty(d.party || []);
  }

  updateSkillButton(i, s) {
    const b = this.skillBtns[i];
    b.img.setTint(s.affordable ? s.color : 0x555555);
    b.label.setText(s.short);
    b.cost.setText(`${s.cost}`);
    b.lv.setText(`Lv${s.level}`);
    b.cd.clear();
    if (s.remain > 0) {
      const frac = s.remain / s.total;
      b.cd.fillStyle(0x000000, 0.65);
      b.cd.slice(b.x, b.y, LAYOUT.skillR, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(-90 + 360 * frac), false);
      b.cd.fillPath();
      b.cdText.setText((s.remain / 1000).toFixed(1));
    } else {
      b.cdText.setText('');
    }
  }

  log(text, color = '#ffffff') {
    if (this.mode !== 'game') return;
    if (this.logTween) this.logTween.stop();
    this.logText.setText(text).setColor(color).setAlpha(1);
    this.logTween = this.tweens.add({ targets: this.logText, alpha: 0, delay: 1800, duration: 500 });
  }

  togglePanel() {
    if (this.panel) this.closePanel();
    else this.openPanel();
  }

  openPanel(tab) {
    if (this.panel) return;
    if (this.mode === 'game' && (!this.gs.player || this.gs.player.dead || this.gs.transitioning)) return;
    if (tab) this.panelTab = tab;
    if (this.mode === 'game') {
      this.scene.pause('SceneGame');
      InputState.reset();
    }
    this.panel = this.add.container(0, 0).setDepth(100);
    this.buildPanel();
  }

  closePanel() {
    if (!this.panel) return;
    this.panel.destroy();
    this.panel = null;
    this.saveSubject();
    if (this.mode === 'hub') {
      const hub = this.scene.get('SceneHub');
      this.scene.resume('SceneHub');
      hub.refresh();
      this.scene.stop();
      return;
    }
    this.scene.resume('SceneGame');
  }

  refreshPanel() {
    if (!this.panel) return;
    this.panel.removeAll(true);
    this.buildPanel();
  }

  makeButton(container, x, y, w, h, label, cb, color = 0x3d6bff, size = 13) {
    const r = this.add.rectangle(x, y, w, h, color, 1).setStrokeStyle(1, 0xffffff, 0.3).setInteractive({ useHandCursor: true });
    const t = this.add.text(x, y, label, TXT(size, '#ffffff', { fontStyle: 'bold' })).setOrigin(0.5);
    r.on('pointerdown', (p, lx, ly, ev) => {
      if (ev && ev.stopPropagation) ev.stopPropagation();
      cb();
    });
    container.add([r, t]);
    return r;
  }

  addText(container, x, y, text, size, color, extra) {
    const t = this.add.text(x, y, text, TXT(size, color, extra));
    container.add(t);
    return t;
  }

  buildPanel() {
    const c = this.panel;
    const P = LAYOUT.panel;
    const bg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setInteractive();
    bg.on('pointerdown', (ptr, lx, ly, ev) => {
      if (ev && ev.stopPropagation) ev.stopPropagation();
    });
    const box = this.add.rectangle(P.x + P.w / 2, P.y + P.h / 2, P.w, P.h, 0x141826, 0.98).setStrokeStyle(2, 0x3d4a66);
    c.add([bg, box]);
    const tabW = (P.w - 24) / this.tabs.length;
    this.tabs.forEach((tab, i) => {
      const x = P.x + 12 + tabW * i + tabW / 2;
      const active = tab.id === this.panelTab;
      this.makeButton(c, x, P.tabY, tabW - 6, 32, tab.label, () => {
        this.panelTab = tab.id;
        this.refreshPanel();
      }, active ? 0x2f6fd6 : 0x232a3d, 14);
    });
    const tab = this.tabs.find((t) => t.id === this.panelTab) || this.tabs[0];
    tab.build(c, P.contentY);
    if (this.mode === 'hub') {
      this.makeButton(c, GAME_WIDTH / 2, P.bottomY, 240, 34, t('panel.closeHub'), () => this.closePanel(), 0x3d6bff, 13);
      return;
    }
    this.makeButton(c, GAME_WIDTH / 2 - 110, P.bottomY, 200, 34, t('panel.close'), () => this.closePanel(), 0x3d6bff, 13);
    this.makeButton(c, GAME_WIDTH / 2 + 120, P.bottomY, 200, 34, t('panel.saveAndHub'), () => {
      this.panel.destroy();
      this.panel = null;
      this.gs.returnToHub();
    }, 0x3d4a66, 13);
  }

  buildTabCharacter(c, startY) {
    const p = this.subject();
    const s = p.stats;
    const hp = p.hp !== undefined ? Math.ceil(p.hp) : s.maxHp;
    const mp = p.mp !== undefined ? Math.floor(p.mp) : s.maxMp;
    const x = LAYOUT.panel.x + 20;
    let y = startY;
    this.addText(c, x, y, `${t(`class.${p.clsId}.name`)}  Lv.${p.level}`, 22, cssColor(p.cls.color), { fontStyle: 'bold' });
    y += 34;
    this.addText(c, x, y, t('panel.xpGold', { xp: p.xp, next: xpToNext(p.level), gold: p.gold }), 13, '#c9d1e0');
    y += 28;
    const lines = [
      t('panel.hp', { hp, max: s.maxHp }),
      t('panel.soma', { mp, max: s.maxMp, regen: s.mpRegen.toFixed(1) }),
      t('panel.atkDefSpd', { atk: s.atk, def: s.def, speed: s.speed }),
      t('panel.critEtc', { crit: Math.round(s.crit * 100), lifesteal: Math.round(s.lifesteal * 100), cdr: Math.round(s.cdr * 100) }),
    ];
    for (const line of lines) {
      this.addText(c, x, y, line, 14, '#ffffff');
      y += 24;
    }
    const CH = LAYOUT.character;
    const column = CH.equipY !== null && CH.equipY !== undefined;
    let ex = column ? CH.equipX : x;
    let ey = column ? CH.equipY : y + 12;
    this.addText(c, ex, ey, t('panel.equipped'), 16, '#8be3ff', { fontStyle: 'bold' });
    ey += 28;
    for (const slot of EQUIP_SLOTS) {
      const item = p.equipment[slot.id];
      this.addText(c, ex, ey, equipSlotLabel(slot.id), 12, '#9aa4b8');
      if (item) this.addText(c, ex + 70, ey, `${itemName(item)}   ${itemSummary(item)}`, 12, RARITY[item.rarity].css, { wordWrap: { width: CH.equipWrap } });
      else this.addText(c, ex + 70, ey, t('panel.emptySlot'), 12, '#6b7386');
      ey += 24;
    }
    const noteY = column ? y + 12 : ey + 8;
    this.addText(c, x, noteY, t('panel.comboNote'), 11, '#8a94a8', { wordWrap: { width: CH.noteWrap } });
  }

  invSelectionValid(p) {
    const sel = this.invSelection;
    if (!sel) return false;
    if (sel.kind === 'bag') return p.inventory.includes(sel.item);
    return !!p.equipment[sel.slotId];
  }

  gridLeft(cols, x) {
    const I = LAYOUT.inventory;
    const w = cols * I.cell + (cols - 1) * I.gap;
    const left = x === null || x === undefined ? LAYOUT.panel.x + (LAYOUT.panel.w - w) / 2 : x;
    return left + I.cell / 2;
  }

  itemCell(c, x, y, item, opts = {}) {
    const I = LAYOUT.inventory;
    const border = item ? RARITY[item.rarity].color : 0x3d4a66;
    const box = this.add.rectangle(x, y, I.cell, I.cell, opts.selected ? 0x2a3350 : 0x1b2030, 1).setStrokeStyle(opts.selected ? 3 : 2, opts.selected ? 0xffffff : border).setInteractive({ useHandCursor: true });
    c.add(box);
    const p = this.subject();
    let icon;
    if (item && item.slot === 'weapon') icon = this.add.image(x, y, 'dungeon', weaponLookFor(item.cls || p.clsId, item).frame).setScale(I.iconScale * 0.9);
    else if (item) icon = this.add.image(x, y, slotIcon(item.slot)).setScale(I.iconScale);
    else if (opts.slotType) icon = this.add.image(x, y, opts.slotType === 'weapon' ? 'dungeon' : slotIcon(opts.slotType), opts.slotType === 'weapon' ? weaponLookFor(p.clsId, null).frame : undefined).setScale(I.iconScale * (opts.slotType === 'weapon' ? 0.9 : 1)).setAlpha(0.22);
    if (icon) c.add(icon);
    if (opts.label) c.add(this.add.text(x, y + I.cell / 2 - 8, opts.label, TXT(9, '#9aa4b8')).setOrigin(0.5));
    if (item && opts.upgrade) c.add(this.add.text(x + I.cell / 2 - 6, y - I.cell / 2 + 2, '▲', TXT(11, '#7dff9a', { fontStyle: 'bold' })).setOrigin(1, 0));
    if (item && item.rarity === 'unique') c.add(this.add.text(x - I.cell / 2 + 4, y - I.cell / 2 + 2, '★', TXT(10, RARITY.unique.css)));
    box.on('pointerdown', (ptr, lx, ly, ev) => {
      if (ev && ev.stopPropagation) ev.stopPropagation();
      if (opts.onSelect) opts.onSelect();
    });
    return box;
  }

  buildTabInventory(c, startY) {
    const p = this.subject();
    const I = LAYOUT.inventory;
    if (!this.invSelectionValid(p)) this.invSelection = null;
    const sel = this.invSelection;
    const dollX = this.gridLeft(I.doll.cols, I.doll.x);
    this.addText(c, dollX - I.cell / 2, I.doll.y - 26, t('panel.equipmentTitle'), 16, '#8be3ff', { fontStyle: 'bold' });
    EQUIP_SLOTS.forEach((slot, i) => {
      const col = i % I.doll.cols;
      const row = Math.floor(i / I.doll.cols);
      const x = dollX + col * (I.cell + I.gap);
      const y = I.doll.y + I.cell / 2 + row * (I.cell + I.gap);
      const item = p.equipment[slot.id];
      this.itemCell(c, x, y, item, {
        slotType: slot.type,
        label: equipSlotLabel(slot.id),
        selected: !!sel && sel.kind === 'equip' && sel.slotId === slot.id,
        onSelect: () => {
          if (!item) return;
          this.invSelection = { kind: 'equip', slotId: slot.id };
          this.refreshPanel();
        },
      });
    });
    const bagX = this.gridLeft(I.bag.cols, I.bag.x);
    this.addText(c, bagX - I.cell / 2, I.bag.y - 26, t('panel.bagTitle', { n: p.inventory.length, max: MAX_INVENTORY }), 16, '#ffffff', { fontStyle: 'bold' });
    for (let i = 0; i < MAX_INVENTORY; i++) {
      const col = i % I.bag.cols;
      const row = Math.floor(i / I.bag.cols);
      const x = bagX + col * (I.cell + I.gap);
      const y = I.bag.y + I.cell / 2 + row * (I.cell + I.gap);
      const item = p.inventory[i] || null;
      this.itemCell(c, x, y, item, {
        upgrade: item ? isUpgrade(p.equipment, item) : false,
        selected: !!sel && sel.kind === 'bag' && sel.item === item,
        onSelect: () => {
          if (!item) return;
          this.invSelection = { kind: 'bag', item };
          this.refreshPanel();
        },
      });
    }
    this.buildItemDetail(c, p, sel);
  }

  buildItemDetail(c, p, sel) {
    const D = LAYOUT.inventory.detail;
    const x = D.x;
    const w = D.w;
    const top = D.y;
    const h = D.h;
    const by = top + h - 26;
    c.add(this.add.rectangle(x + w / 2, top + h / 2, w, h, 0x0f121c, 0.9).setStrokeStyle(1, 0x3d4a66));
    if (!sel) {
      this.addText(c, x + 12, top + 14, t('panel.detailHint'), 12, '#6b7386', { wordWrap: { width: w - 24 } });
      return;
    }
    const item = sel.kind === 'bag' ? sel.item : p.equipment[sel.slotId];
    let y = top + 12;
    this.addText(c, x + 12, y, itemName(item), 16, RARITY[item.rarity].css, { fontStyle: 'bold' });
    y += 26;
    const slotLabel = sel.kind === 'bag' ? t(`slot.${item.slot}`) : equipSlotLabel(sel.slotId);
    this.addText(c, x + 12, y, t('panel.detailMeta', { slot: slotLabel, floor: item.floor, score: item.score }), 11, '#9aa4b8');
    y += 20;
    this.addText(c, x + 12, y, itemSummary(item), 12, '#c9d1e0', { wordWrap: { width: w - 24 } });
    y += 40;
    if (sel.kind === 'bag') {
      const cur = compareTarget(p.equipment, item);
      if (!cur) this.addText(c, x + 12, y, t('panel.compareEmpty'), 11, '#7dff9a');
      else if (item.score > cur.score) this.addText(c, x + 12, y, t('panel.compareBetter', { name: itemName(cur), score: cur.score }), 11, '#7dff9a', { wordWrap: { width: w - 24 } });
      else this.addText(c, x + 12, y, t('panel.compareWorse', { name: itemName(cur), score: cur.score }), 11, '#ff9d5c', { wordWrap: { width: w - 24 } });
      const slots = equipSlotsFor(item.slot);
      const btnW = slots.length > 1 ? 150 : 120;
      let bx = x + 12 + btnW / 2;
      for (const slot of slots) {
        const label = slots.length > 1 ? t('panel.equipInto', { slot: equipSlotLabel(slot.id) }) : t('panel.equip');
        this.makeButton(c, bx, by, btnW, 30, label, () => {
          const name = itemName(item);
          p.equip(item, slot.id);
          this.invSelection = { kind: 'equip', slotId: slot.id };
          this.log(t('panel.equipLog', { name }), RARITY[item.rarity].css);
          this.refreshPanel();
        }, 0x2f6fd6, 12);
        bx += btnW + 10;
      }
      this.makeButton(c, x + w - 12 - 60, by, 120, 30, t('panel.sell', { gold: sellPrice(item) }), () => {
        const name = itemName(item);
        const g = p.sell(item);
        this.invSelection = null;
        this.log(t('panel.sellLog', { name, gold: g }), '#ffd23f');
        this.refreshPanel();
      }, 0x6b4a2b, 12);
      return;
    }
    this.makeButton(c, x + 12 + 60, by, 120, 30, t('panel.unequip'), () => {
      if (p.inventory.length >= MAX_INVENTORY) {
        this.log(t('panel.bagFull'), '#ff9d5c');
        return;
      }
      p.unequip(sel.slotId);
      this.invSelection = null;
      this.refreshPanel();
    }, 0x3d4a66, 12);
  }

  buildTabSkills(c, startY) {
    const p = this.subject();
    const x = LAYOUT.panel.x + 20;
    let y = startY;
    this.addText(c, x, y, t('panel.skillsTitle', { n: p.skillPoints }), 18, p.skillPoints > 0 ? '#ffd23f' : '#ffffff', { fontStyle: 'bold' });
    y += 36;
    p.cls.skills.forEach((id) => {
      const sk = SKILLS[id];
      const lv = p.skillLevels[id] || 1;
      const base = sk.damage !== undefined ? sk.damage : sk.value;
      this.addText(c, x, y, t('panel.skillLine', { name: t(`skill.${id}.name`), lv, max: sk.maxLevel }), 16, cssColor(sk.color), { fontStyle: 'bold' });
      this.addText(c, x, y + 24, t(`skill.${id}.desc`), 12, '#c9d1e0', { wordWrap: { width: GAME_WIDTH - 130 } });
      this.addText(c, x, y + 62, t('panel.skillInfo', { cost: sk.cost, cd: (sk.cooldown / 1000).toFixed(1), power: Math.round((base + sk.perLevel * (lv - 1)) * 100) }), 11, '#9aa4b8');
      if (p.skillPoints > 0 && lv < sk.maxLevel) {
        this.makeButton(c, GAME_WIDTH - 52, y + 14, 40, 30, '+', () => {
          if (p.upgradeSkill(id)) this.refreshPanel();
        }, 0xd6a52f, 18);
      }
      y += 100;
    });
    this.addText(c, x, y + 4, t('panel.skillsNote'), 11, '#6b7386', { wordWrap: { width: GAME_WIDTH - 60 } });
  }
}
