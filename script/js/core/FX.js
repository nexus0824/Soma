import { DEPTH, FONT } from '../Define.js';

function feedbackTweens(scene) {
  return scene.fxTweens || scene.tweens;
}

export function cssColor(hex) {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

export function floatText(scene, x, y, text, color = '#ffffff', size = 15) {
  const t = scene.add.text(x, y, String(text), {
    fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#000000', strokeThickness: 3, fontStyle: 'bold',
  }).setOrigin(0.5).setDepth(DEPTH.TEXT);
  feedbackTweens(scene).add({ targets: t, y: y - 42, alpha: 0, duration: 750, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  return t;
}

export function burst(scene, x, y, color, count = 8, dist = 40) {
  for (let i = 0; i < count; i++) {
    const p = scene.add.image(x, y, 'particle').setTint(color).setDepth(DEPTH.FX).setScale(Phaser.Math.FloatBetween(0.5, 1.2));
    const a = Math.random() * Math.PI * 2;
    const d = dist * Phaser.Math.FloatBetween(0.4, 1);
    feedbackTweens(scene).add({
      targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, scale: 0,
      duration: Phaser.Math.Between(300, 500), ease: 'Cubic.easeOut', onComplete: () => p.destroy(),
    });
  }
}

export function spark(scene, x, y, angle, color, count = 6, dist = 30) {
  const glow = scene.add.image(x, y, 'glow').setTint(color).setDepth(DEPTH.FX).setScale(0.55).setAlpha(0.9);
  feedbackTweens(scene).add({ targets: glow, scale: 0.2, alpha: 0, duration: 120, ease: 'Cubic.easeOut', onComplete: () => glow.destroy() });
  const cone = Phaser.Math.DegToRad(55);
  for (let i = 0; i < count; i++) {
    const a = angle + Phaser.Math.FloatBetween(-cone, cone);
    const d = dist * Phaser.Math.FloatBetween(0.5, 1);
    const p = scene.add.image(x, y, 'particle').setTint(color).setDepth(DEPTH.FX).setRotation(a).setScale(Phaser.Math.FloatBetween(1, 1.6), 0.5);
    feedbackTweens(scene).add({
      targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, scaleX: 0.2,
      duration: Phaser.Math.Between(160, 260), ease: 'Cubic.easeOut', onComplete: () => p.destroy(),
    });
  }
}

export function corpse(actor, angle, dist = 46) {
  const scene = actor.scene;
  const img = scene.add.image(actor.x, actor.y, 'dungeon', actor.frame.name)
    .setScale(actor.scaleX, actor.scaleY).setFlipX(actor.flipX).setDepth(actor.depth).setTintFill(0xffffff);
  scene.time.delayedCall(60, () => {
    if (img.active) img.clearTint();
  });
  const hasDir = angle !== null && angle !== undefined;
  const spin = hasDir && Math.cos(angle) < 0 ? -90 : 90;
  feedbackTweens(scene).add({
    targets: img,
    x: actor.x + (hasDir ? Math.cos(angle) * dist : 0),
    y: actor.y + (hasDir ? Math.sin(angle) * dist : 0),
    angle: hasDir ? spin : 0,
    alpha: 0,
    duration: 420,
    ease: 'Cubic.easeOut',
    onComplete: () => img.destroy(),
  });
}

export function ring(scene, x, y, radius, color, duration = 320, width = 4) {
  const g = scene.add.graphics({ x, y }).setDepth(DEPTH.FX);
  g.lineStyle(width, color, 1);
  g.strokeCircle(0, 0, radius);
  g.setScale(0.2);
  feedbackTweens(scene).add({ targets: g, scale: 1, alpha: 0, duration, ease: 'Cubic.easeOut', onComplete: () => g.destroy() });
}

export function slash(scene, x, y, angle, color = 0xffffff, scale = 1, mirror = false) {
  const s = scene.add.image(x, y, 'slash').setRotation(angle).setTint(color).setDepth(DEPTH.FX).setAlpha(0.9);
  s.setScale(scale * 0.7, mirror ? -scale * 0.7 : scale * 0.7);
  scene.tweens.add({ targets: s, scaleX: scale, scaleY: mirror ? -scale : scale, alpha: 0, duration: 180, ease: 'Cubic.easeOut', onComplete: () => s.destroy() });
}

export function flash(target, duration = 70) {
  if (!target.active) return;
  target.setTintFill(0xffffff);
  target.scene.time.delayedCall(duration, () => {
    if (target.active) target.clearTint();
  });
}

export function shadowFor(scene, x, y, widthPx) {
  return scene.add.image(x, y, 'shadow').setDepth(DEPTH.SHADOW).setScale(widthPx / 36).setAlpha(0.6);
}
