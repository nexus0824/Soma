import { xpToNext } from '../Define.js';
import { CLASSES } from '../data/Classes.js';
import { SKILLS } from '../data/Skills.js';
import { sellPrice, createItem, emptyEquipment, bestEquipSlotFor, equipSlotsFor } from '../data/Items.js';
import { computeStats } from './Stats.js';

export const SAVE_VERSION = 4;

export default class Character {
  constructor(data) {
    this.clsId = data.clsId;
    this.cls = CLASSES[data.clsId];
    this.level = data.level;
    this.xp = data.xp;
    this.gold = data.gold;
    this.equipment = data.equipment;
    this.inventory = data.inventory;
    this.skillLevels = data.skillLevels || {};
    this.skillPoints = data.skillPoints || 0;
    this.progress = data.progress || { cleared: {}, best: {}, dailyDone: null };
    this.run = data.run || null;
    this.recalc();
  }

  static create(clsId) {
    const c = new Character({
      clsId,
      level: 1,
      xp: 0,
      gold: 0,
      equipment: emptyEquipment(),
      inventory: [],
      skillLevels: {},
      skillPoints: 0,
      progress: { cleared: {}, best: {}, dailyDone: null },
      run: null,
    });
    c.equipment.weapon = createItem(1, clsId, 'weapon', 'common');
    c.recalc();
    return c;
  }

  recalc() {
    this.stats = computeStats(this.cls, this.level, this.equipment);
  }

  gainXp(amount) {
    this.xp += amount;
    let levels = 0;
    while (this.xp >= xpToNext(this.level)) {
      this.xp -= xpToNext(this.level);
      this.level++;
      this.skillPoints++;
      levels++;
    }
    if (levels) this.recalc();
    return levels;
  }

  equip(item, slotId) {
    const idx = this.inventory.indexOf(item);
    if (idx < 0) return false;
    const target = slotId && equipSlotsFor(item.slot).some((s) => s.id === slotId) ? slotId : bestEquipSlotFor(this.equipment, item);
    this.inventory.splice(idx, 1);
    const prev = this.equipment[target];
    this.equipment[target] = item;
    if (prev) this.inventory.push(prev);
    this.recalc();
    return true;
  }

  unequip(slot) {
    const item = this.equipment[slot];
    if (!item) return false;
    this.equipment[slot] = null;
    this.inventory.push(item);
    this.recalc();
    return true;
  }

  sell(item) {
    const idx = this.inventory.indexOf(item);
    if (idx < 0) return 0;
    this.inventory.splice(idx, 1);
    const g = sellPrice(item);
    this.gold += g;
    return g;
  }

  upgradeSkill(id) {
    const sk = SKILLS[id];
    const lv = this.skillLevels[id] || 1;
    if (!sk || this.skillPoints <= 0 || lv >= sk.maxLevel) return false;
    this.skillLevels[id] = lv + 1;
    this.skillPoints--;
    return true;
  }

  isCleared(dungeonId) {
    return !!this.progress.cleared[dungeonId];
  }

  markCleared(dungeonId) {
    this.progress.cleared[dungeonId] = true;
  }

  bestFloor(dungeonId) {
    return this.progress.best[dungeonId] || 0;
  }

  setBest(dungeonId, floor) {
    if (floor > this.bestFloor(dungeonId)) this.progress.best[dungeonId] = floor;
  }

  serialize() {
    return {
      v: SAVE_VERSION,
      clsId: this.clsId,
      level: this.level,
      xp: this.xp,
      gold: this.gold,
      equipment: this.equipment,
      inventory: this.inventory,
      skillLevels: this.skillLevels,
      skillPoints: this.skillPoints,
      progress: this.progress,
      run: this.run,
    };
  }
}
