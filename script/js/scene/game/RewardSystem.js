import { TILE } from '../../Define.js';
import { createItem, rollRarity } from '../../data/Items.js';
import { dropMulFor } from '../../data/Enemies.js';
import { BALANCE } from '../../data/Balance.js';
import { ELITE, CHEST, MIMIC } from '../../data/Rooms.js';
import { GAME_RNG } from '../../core/Rng.js';
import Loot from '../../core/Loot.js';
import { t } from '../../i18n/I18n.js';

const KILL_REWARDS = [];

export function registerKillReward(handler) {
  KILL_REWARDS.push(handler);
}

export function killRewardFor(enemy) {
  return KILL_REWARDS.find((h) => h.match(enemy));
}

registerKillReward({
  id: 'boss',
  match: (e) => !!e.def.boss,
  reward(scene, e) {
    const opts = scene.itemOpts();
    scene.dropLoot(e.x, e.y, { kind: 'item', item: createItem(scene.level, scene.player.clsId, undefined, rollRarity(scene.level, 'rare', opts.rarityBonus), opts) });
    scene.dropLoot(e.x, e.y, { kind: 'item', item: createItem(scene.level, scene.player.clsId, undefined, rollRarity(scene.level, 'magic', opts.rarityBonus), opts) });
    scene.boss = null;
    scene.events.emit('log', t('game.bossDown', { name: t(`enemy.${e.typeId}`) }), '#ff8ab0');
    scene.cameras.main.shake(300, 0.01);
  },
});

registerKillReward({
  id: 'mimic',
  match: (e) => !!e.def.mimic,
  reward(scene, e) {
    scene.dropChestRewards(e.x, e.y, { goldMul: MIMIC.goldMul, rarityBonus: MIMIC.rarityBonus });
    scene.events.emit('log', t('game.mimicDown'), '#ffd23f');
  },
});

registerKillReward({
  id: 'elite',
  match: (e) => !!e.elite,
  reward(scene, e) {
    if (!e.room || scene.remainingInRoom(e.room) > 1) return;
    const opts = scene.itemOpts();
    scene.dropLoot(e.x, e.y, { kind: 'item', item: createItem(scene.level, scene.player.clsId, undefined, rollRarity(scene.level, 'magic', opts.rarityBonus + ELITE.dropRarityBonus), opts) });
    if (GAME_RNG.chance(BALANCE.drops.elitePackBonusChance)) scene.dropLoot(e.x, e.y, { kind: 'item', item: createItem(scene.level, scene.player.clsId, undefined, rollRarity(scene.level, 'magic', opts.rarityBonus), opts) });
  },
});

registerKillReward({
  id: 'normal',
  match: () => true,
  reward(scene, e) {
    const D = BALANCE.drops;
    const rewards = scene.rewards;
    rewards.killsSinceDrop++;
    const forced = rewards.killsSinceDrop >= D.pityKills;
    if (!forced && !GAME_RNG.chance(D.itemChance * scene.mods.dropChanceMul * dropMulFor(e.typeId))) return;
    rewards.killsSinceDrop = 0;
    const opts = scene.itemOpts();
    const minRarity = scene.floor > D.commonUntilFloor ? 'magic' : undefined;
    scene.dropLoot(e.x, e.y, { kind: 'item', item: createItem(scene.level, scene.player.clsId, undefined, rollRarity(scene.level, minRarity, opts.rarityBonus), opts) });
  },
});

export default class RewardSystem {
  constructor(scene) {
    this.scene = scene;
    this.killsSinceDrop = 0;
  }

  itemOpts() {
    const def = this.scene.dungeonDef;
    return { rarityBonus: def.rarityBonus || 0, slotBias: def.dropBias };
  }

  onEnemyKilled(e) {
    const scene = this.scene;
    scene.player.gainXp(e.xp);
    const D = BALANCE.drops;
    if (e.def.boss || GAME_RNG.chance(D.goldChance)) {
      this.dropLoot(e.x, e.y, { kind: 'gold', amount: Math.max(1, Math.round(e.goldValue * D.goldMul * GAME_RNG.floatBetween(0.7, 1.4))) });
    }
    killRewardFor(e).reward(scene, e);
    if (scene.remaining() - 1 <= 0) scene.openPortal();
  }

  dropLoot(x, y, payload) {
    const scene = this.scene;
    const ox = x + GAME_RNG.between(-28, 28);
    const oy = y + GAME_RNG.between(-20, 20);
    const onFloor = scene.isFloorAt(ox, oy);
    const loot = new Loot(scene, onFloor ? ox : x, onFloor ? oy : y, payload);
    scene.loots.add(loot);
  }

  dropChestRewards(x, y, bonus = {}) {
    const scene = this.scene;
    const c = scene.character;
    const gold = Math.round((CHEST.goldBase + CHEST.goldPerLevel * scene.level) * (bonus.goldMul || 1) * GAME_RNG.floatBetween(0.8, 1.3));
    this.dropLoot(x, y, { kind: 'gold', amount: gold });
    const opts = this.itemOpts();
    const rarityBonus = opts.rarityBonus + CHEST.itemRarityBonus + (bonus.rarityBonus || 0);
    this.dropLoot(x, y, { kind: 'item', item: createItem(scene.level, c.clsId, undefined, rollRarity(scene.level, 'magic', rarityBonus), opts) });
    if (GAME_RNG.chance(CHEST.secondItemChance)) this.dropLoot(x, y, { kind: 'item', item: createItem(scene.level, c.clsId, undefined, rollRarity(scene.level, CHEST.secondItemMinRarity, opts.rarityBonus + (bonus.rarityBonus || 0)), opts) });
  }

  openChest(chest) {
    this.dropChestRewards(chest.x, chest.y + TILE);
    this.scene.events.emit('log', t('game.chestOpen'), '#ffd23f');
  }
}
