import { RARITY } from '../Define.js';
import { t, raw } from '../i18n/I18n.js';
import { rollLook } from './WeaponLooks.js';
import { GAME_RNG } from '../core/Rng.js';

const PCT_STATS = new Set(['atkMul', 'crit', 'lifesteal', 'cdr']);

export const AFFIXES = [
  { stat: 'atk', min: 4, max: 10, perFloor: 0.8 },
  { stat: 'atkMul', min: 0.08, max: 0.2, perFloor: 0.006 },
  { stat: 'def', min: 2, max: 5, perFloor: 0.35 },
  { stat: 'hp', min: 20, max: 60, perFloor: 4 },
  { stat: 'mp', min: 10, max: 24, perFloor: 2.5 },
  { stat: 'crit', min: 0.02, max: 0.06, perFloor: 0.003 },
  { stat: 'speed', min: 8, max: 20, perFloor: 1 },
  { stat: 'mpRegen', min: 0.3, max: 0.8, perFloor: 0.05 },
  { stat: 'lifesteal', min: 0.02, max: 0.05, perFloor: 0.002 },
  { stat: 'cdr', min: 0.04, max: 0.1, perFloor: 0.003 },
];

export const SLOTS = {
  weapon: { stat: 'atk', min: 10, max: 16, perFloor: 1.4, weight: 3, icon: null },
  head: { stat: 'def', min: 2, max: 4, perFloor: 0.35, weight: 1, icon: 'icon_head' },
  cloak: { stat: 'speed', min: 4, max: 10, perFloor: 0.5, weight: 1, icon: 'icon_cloak' },
  chest: { stat: 'def', min: 3, max: 6, perFloor: 0.6, weight: 2, icon: 'icon_chest' },
  legs: { stat: 'hp', min: 20, max: 40, perFloor: 3.5, weight: 1, icon: 'icon_legs' },
  boots: { stat: 'speed', min: 3, max: 8, perFloor: 0.4, weight: 1, icon: 'icon_boots' },
  gloves: { stat: 'atk', min: 2, max: 5, perFloor: 0.5, weight: 1, icon: 'icon_gloves' },
  ring: { stat: 'crit', min: 0.02, max: 0.05, perFloor: 0.002, weight: 2, icon: 'icon_ring' },
  necklace: { stat: 'mp', min: 10, max: 20, perFloor: 2.5, weight: 1, icon: 'icon_necklace' },
};

export const SLOT_IDS = Object.keys(SLOTS);

export const RARITY_GROWTH = {
  magic: { perLevel: 0, perBonus: 0.5 },
  rare: { perLevel: 0.25, perBonus: 0.8 },
  unique: { perLevel: 0.05, perBonus: 0.15 },
};

export const EQUIP_SLOTS = [
  { id: 'weapon', type: 'weapon' },
  { id: 'head', type: 'head' },
  { id: 'cloak', type: 'cloak' },
  { id: 'chest', type: 'chest' },
  { id: 'legs', type: 'legs' },
  { id: 'boots', type: 'boots' },
  { id: 'gloves', type: 'gloves' },
  { id: 'ring1', type: 'ring' },
  { id: 'ring2', type: 'ring' },
  { id: 'necklace', type: 'necklace' },
];

const SCORE_WEIGHT = {
  atk: 3, atkMul: 100, def: 2.5, hp: 0.5, mp: 0.4, crit: 150, speed: 0.3, mpRegen: 8, lifesteal: 220, cdr: 110,
};

let uidSeq = 1;

export function emptyEquipment() {
  const e = {};
  for (const s of EQUIP_SLOTS) e[s.id] = null;
  return e;
}

export function equipSlotsFor(type) {
  return EQUIP_SLOTS.filter((s) => s.type === type);
}

export function equipSlotLabel(slotId) {
  if (raw(`equipSlot.${slotId}`)) return t(`equipSlot.${slotId}`);
  const def = EQUIP_SLOTS.find((s) => s.id === slotId);
  return t(`slot.${def ? def.type : slotId}`);
}

export function bestEquipSlotFor(equipment, item) {
  const slots = equipSlotsFor(item.slot);
  const empty = slots.find((s) => !equipment[s.id]);
  if (empty) return empty.id;
  let worst = slots[0];
  for (const s of slots) if (equipment[s.id].score < equipment[worst.id].score) worst = s;
  return worst.id;
}

export function compareTarget(equipment, item) {
  return equipment[bestEquipSlotFor(equipment, item)] || null;
}

export function isUpgrade(equipment, item) {
  const cur = compareTarget(equipment, item);
  return !cur || item.score > cur.score;
}

export function slotIcon(slotType) {
  return SLOTS[slotType].icon;
}

function roundStat(stat, value) {
  if (PCT_STATS.has(stat)) return Math.round(value * 1000) / 1000;
  if (stat === 'mpRegen') return Math.round(value * 10) / 10;
  return Math.round(value);
}

function rollValue(def, floor, rng = GAME_RNG) {
  const bonus = def.perFloor * (floor - 1);
  return def.min + bonus + rng.random() * (def.max - def.min);
}

export function rollRarity(floor, minRarity, bonus = 0, rng = GAME_RNG) {
  const order = ['common', 'magic', 'rare', 'unique'];
  const minIdx = minRarity ? order.indexOf(minRarity) : 0;
  const table = order.slice(minIdx).map((id) => ({
    id,
    w: RARITY[id].weight + (RARITY_GROWTH[id] ? RARITY_GROWTH[id].perLevel * floor + RARITY_GROWTH[id].perBonus * bonus : 0),
  }));
  const total = table.reduce((s, tbl) => s + tbl.w, 0);
  let roll = rng.random() * total;
  for (const tbl of table) {
    roll -= tbl.w;
    if (roll <= 0) return tbl.id;
  }
  return table[table.length - 1].id;
}

function pickSlot(bias, rng = GAME_RNG) {
  if (bias && bias.slot && SLOTS[bias.slot] && rng.chance(bias.weight)) return bias.slot;
  const total = SLOT_IDS.reduce((s, id) => s + SLOTS[id].weight, 0);
  let roll = rng.random() * total;
  for (const id of SLOT_IDS) {
    roll -= SLOTS[id].weight;
    if (roll <= 0) return id;
  }
  return SLOT_IDS[SLOT_IDS.length - 1];
}

export function createItem(floor, clsId, slot, rarityId, opts = {}) {
  const rng = opts.rng || GAME_RNG;
  const slotId = slot || pickSlot(opts.slotBias, rng);
  const rarity = rarityId || rollRarity(floor, opts.minRarity, opts.rarityBonus || 0, rng);
  const slotDef = SLOTS[slotId];
  const tier = Math.min(2, Math.floor((floor - 1) / 5));
  const base = { stat: slotDef.stat, value: roundStat(slotDef.stat, rollValue(slotDef, floor, rng) * RARITY[rarity].baseMul) };
  const pool = AFFIXES.filter((a) => a.stat !== slotDef.stat);
  const affixes = [];
  for (let i = 0; i < RARITY[rarity].affixes && pool.length; i++) {
    const idx = Math.floor(rng.random() * pool.length);
    const def = pool.splice(idx, 1)[0];
    affixes.push({ stat: def.stat, value: roundStat(def.stat, rollValue(def, floor, rng) * RARITY[rarity].affixMul) });
  }
  const item = {
    uid: `${Date.now().toString(36)}${(uidSeq++).toString(36)}`,
    slot: slotId, cls: clsId, rarity, base, affixes, floor, tier,
  };
  if (slotId === 'weapon') item.look = rollLook(clsId, tier, rng).id;
  item.score = itemScore(item);
  return item;
}

export function itemBaseName(item) {
  const table = raw(`itemBase.${item.slot}`);
  const list = item.slot === 'weapon' ? table[item.cls] || table.blade : table;
  return list[Math.min(item.tier || 0, list.length - 1)];
}

export function itemName(item) {
  let name = itemBaseName(item);
  if (item.affixes.length) name = t('itemName.affixed', { affix: t(`affix.${item.affixes[0].stat}`), base: name });
  if (item.rarity === 'unique') name = t('itemName.unique', { name });
  return name;
}

export function itemScore(item) {
  let score = SCORE_WEIGHT[item.base.stat] * item.base.value;
  for (const a of item.affixes) score += SCORE_WEIGHT[a.stat] * a.value;
  return Math.round(score);
}

export function formatStat(stat, value) {
  let v;
  if (PCT_STATS.has(stat)) v = `${Math.round(value * 100)}%`;
  else if (Number.isInteger(value)) v = `${value}`;
  else v = value.toFixed(1);
  return `${t(`stat.${stat}`)} +${v}`;
}

export function itemSummary(item) {
  return [formatStat(item.base.stat, item.base.value), ...item.affixes.map((a) => formatStat(a.stat, a.value))].join(' · ');
}

export function sellPrice(item) {
  return Math.round((4 + item.floor * 3) * RARITY[item.rarity].price);
}
