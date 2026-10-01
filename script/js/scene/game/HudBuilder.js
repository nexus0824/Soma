import { t } from '../../i18n/I18n.js';

export function buildHud(scene, time) {
  const hud = scene.player.hudData(time, scene.remaining(), scene.boss);
  hud.party = scene.companions.getChildren().map((c) => c.hudData(time));
  hud.floorLabel = scene.floorLabel();
  hud.modNames = scene.modNames();
  hud.interact = scene.interactTarget ? scene.interactTarget.promptKey : null;
  if (hud.boss && scene.boss && scene.boss.enrageMul > 0) hud.boss.name = `${hud.boss.name} ${t('hud.enraged', { pct: Math.round(scene.boss.enrageMul * 100) })}`;
  return hud;
}
