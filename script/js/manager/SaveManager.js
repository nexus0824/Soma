import { SAVE_KEY } from '../Define.js';
import { DUNGEONS } from '../data/Dungeons.js';
import { emptyEquipment, createItem } from '../data/Items.js';

function migrateItems(data) {
  const fix = (item) => {
    if (!item) return item;
    if (!item.cls) item.cls = data.clsId;
    delete item.name;
    for (const a of item.affixes || []) delete a.name;
    return item;
  };
  for (const slot of Object.keys(data.equipment || {})) data.equipment[slot] = fix(data.equipment[slot]);
  data.inventory = (data.inventory || []).map(fix);
  data.v = 3;
  return data;
}

function migrateSlots(data) {
  const convert = (item) => {
    if (!item) return item;
    if (item.slot === 'armor') item.slot = 'chest';
    else if (item.slot === 'accessory') item.slot = item.tier === 1 ? 'necklace' : 'ring';
    return item;
  };
  const old = data.equipment || {};
  const eq = emptyEquipment();
  data.inventory = (data.inventory || []).map(convert);
  for (const key of Object.keys(old)) {
    const item = convert(old[key]);
    if (!item) continue;
    if (key in eq) eq[key] = item;
    else if (item.slot === 'ring') eq.ring1 = item;
    else if (item.slot in eq) eq[item.slot] = item;
    else data.inventory.push(item);
  }
  data.equipment = eq;
  data.v = 4;
  return data;
}

function rerollItems(data) {
  const reroll = (item) => {
    if (!item) return item;
    const fresh = createItem(item.floor || 1, item.cls || data.clsId, item.slot, item.rarity);
    fresh.uid = item.uid || fresh.uid;
    if (item.look) fresh.look = item.look;
    return fresh;
  };
  for (const slot of Object.keys(data.equipment || {})) data.equipment[slot] = reroll(data.equipment[slot]);
  data.inventory = (data.inventory || []).map(reroll);
  data.v = 5;
  return data;
}

function migrate(data) {
  if (data.v >= 5) return data;
  if (data.v === 4) return rerollItems(data);
  if (data.v === 3) return rerollItems(migrateSlots(data));
  if (data.v === 2) return rerollItems(migrateSlots(migrateItems(data)));
  const floor = Math.max(1, data.floor || 1);
  const capped = Math.min(floor, DUNGEONS.ruins.floors);
  return rerollItems(migrateSlots(migrateItems({
    v: 2,
    clsId: data.clsId,
    level: data.level,
    xp: data.xp,
    gold: data.gold,
    equipment: data.equipment,
    inventory: data.inventory,
    skillLevels: data.skillLevels || {},
    skillPoints: data.skillPoints || 0,
    progress: { cleared: {}, best: { ruins: Math.min(data.maxFloor || floor, DUNGEONS.ruins.floors) }, dailyDone: null },
    run: { dungeonId: 'ruins', floor: capped, floors: DUNGEONS.ruins.floors, modifiers: [], daily: false, dateKey: null },
  })));
}

export default class SaveManager {
  static load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !data.clsId) return null;
      return migrate(data);
    } catch (e) {
      return null;
    }
  }

  static save(data) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      return false;
    }
    return true;
  }

  static clear() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {
      return;
    }
  }
}
