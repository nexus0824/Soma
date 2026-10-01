import { GAME_WIDTH as W, GAME_HEIGHT as H } from '../Define.js';

function buildLayout() {
  const panel = { x: 12, y: 24, w: W - 24, h: H - 48, tabY: 44, contentY: 80, bottomY: H - 44 };
  return {
    hud: { x: 12, y: 12, barW: 210, hpH: 16, mpH: 9, xpH: 4 },
    level: { x: 230, y: 8 },
    floor: { x: W / 2, y: 18 },
    remain: { x: W / 2, y: 42 },
    gold: { x: W - 62, y: 24 },
    bag: { x: W - 30, y: 26 },
    boss: { y: 62, w: 420 },
    party: { x: 12, y: 70, w: 226, rowH: 40, hint: 154 },
    mods: { x: 12, y: 168 },
    log: { x: W / 2, y: H - 150 },
    joystick: { x: 110, y: H - 110, radius: 46, zone: { x: 0, y: H * 0.35, w: W * 0.45, h: H * 0.65 } },
    attack: { x: W - 78, y: H - 110, r: 46 },
    dodge: { x: W - 78, y: H - 30, r: 24 },
    skills: [
      { x: W - 192, y: H - 80 },
      { x: W - 182, y: H - 170 },
      { x: W - 96, y: H - 214 },
    ],
    skillR: 32,
    panel,
    inventory: {
      cell: 56, gap: 8, iconScale: 2.3,
      doll: { cols: 5, x: 28, y: 106 },
      bag: { cols: 7, x: 400, y: 106 },
      detail: { x: 28, y: 306, w: W - 56, h: panel.bottomY - 30 - 306 },
    },
    character: { equipX: 470, equipY: panel.contentY, equipWrap: 400, noteWrap: 400 },
    title: {
      logoY: 64, subtitleY: 112,
      buttons: { x: W - 70, langY: 26, w: 120 },
      continueY: 156, continueW: 600, warnY: 184, chooseY: 160,
      cardsY: 215, cardsYWithSave: 215,
      card: { w: (W - 64) / 3, h: 225, cols: 3, gapX: 12, gapY: 0, stacked: true },
      hintPcY: H - 56, hintMobileY: H - 34,
    },
    hub: {
      listY: 128,
      daily: { h: 80 },
      card: { cols: 2, h: 108, gapX: 12, gapY: 10 },
      footerY: H - 16,
    },
  };
}

export const LAYOUT = buildLayout();
