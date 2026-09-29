const CHANNELS = ['dx', 'dy', 'angle', 'dist', 'scale', 'alpha'];
const LINEAR = (v) => v;
const BLEND_IN_MS = 50;
const BLEND_OUT_MS = 90;

function resolveFrames(anim) {
  if (anim.resolved) return anim.resolved;
  const base = { dx: 0, dy: 0, angle: 0, dist: 8, scale: 1, alpha: 1, ...(anim.base || {}) };
  let carry = { ...base };
  const out = anim.frames.map((f) => {
    const frame = { ...carry, ...f };
    frame.easeFn = f.ease ? Phaser.Tweens.Builders.GetEaseFunction(f.ease) : LINEAR;
    carry = frame;
    return frame;
  });
  anim.resolved = out;
  return out;
}

export function restTransform(anims, ownerScale, left = false) {
  const r = anims.rest || {};
  return {
    dx: (left ? -(r.dx || 0) : (r.dx || 0)) * ownerScale,
    dy: (r.dy || 0) * ownerScale,
    rotation: Phaser.Math.DegToRad(left ? -(r.angle || 0) : (r.angle || 0)),
    scale: ownerScale * (anims.scale === undefined ? 1 : anims.scale),
    origin: anims.origin || [0.5, 0.5],
    depthOffset: restDepthOffset(anims, left),
  };
}

export function restDepthOffset(anims, left) {
  const mode = anims.restDepth || 'behind';
  if (mode === 'front') return 1;
  if (mode === 'hand') return left ? -1 : 1;
  return -1;
}

export default class PoseRig {
  constructor(scene, owner, image, anims) {
    this.scene = scene;
    this.owner = owner;
    this.image = image;
    this.anims = anims;
    this.baseScale = anims.scale === undefined ? 1 : anims.scale;
    this.current = null;
    this.progress = 0;
    this.tween = null;
    this.aim = 0;
    this.sampled = {};
    this.pose = { x: 0, y: 0, rotation: 0, scale: 1, alpha: 1, depth: 0, flip: false };
    this.applied = { x: 0, y: 0, rotation: 0, scale: 1, alpha: 1, valid: false };
    this.blendFrom = null;
    this.blendStart = 0;
    this.blendMs = 0;
    this.lastTime = 0;
  }

  has(name) {
    return !!this.anims[name];
  }

  setAnims(anims) {
    if (this.anims === anims) return;
    this.stop();
    this.anims = anims;
    this.baseScale = anims.scale === undefined ? 1 : anims.scale;
    this.image.setOrigin(anims.origin[0], anims.origin[1]);
  }

  play(name, duration, aim = 0, onComplete, blendMs = BLEND_IN_MS) {
    const anim = this.anims[name];
    if (!anim) return false;
    this.stop();
    this.beginBlend(anim.blendIn === undefined ? blendMs : anim.blendIn);
    this.current = anim;
    this.aim = aim;
    this.progress = 0;
    this.tween = this.scene.tweens.add({
      targets: this,
      progress: 1,
      duration: Math.max(1, duration),
      onComplete: () => {
        this.tween = null;
        this.current = null;
        this.beginBlend(anim.blendOut === undefined ? BLEND_OUT_MS : anim.blendOut);
        if (onComplete) onComplete();
      },
    });
    return true;
  }

  stop(blendMs = 0) {
    if (this.tween) {
      this.tween.remove();
      this.tween = null;
    }
    if (this.current && blendMs > 0) this.beginBlend(blendMs);
    this.current = null;
  }

  beginBlend(ms) {
    if (!ms || !this.applied.valid) return;
    const a = this.applied;
    this.blendFrom = { ox: a.x - this.owner.x, oy: a.y - this.owner.y, rotation: a.rotation, scale: a.scale, alpha: a.alpha };
    this.blendStart = this.lastTime;
    this.blendMs = ms;
  }

  sample(anim, p) {
    const frames = resolveFrames(anim);
    const out = this.sampled;
    let i = 0;
    while (i < frames.length - 1 && p > frames[i + 1].t) i++;
    const a = frames[i];
    const b = frames[Math.min(i + 1, frames.length - 1)];
    const span = b.t - a.t;
    const u = span > 0 ? b.easeFn(Phaser.Math.Clamp((p - a.t) / span, 0, 1)) : 1;
    for (const ch of CHANNELS) out[ch] = a[ch] + (b[ch] - a[ch]) * u;
    return out;
  }

  restPose(time) {
    const o = this.owner;
    const moving = o.body && o.body.velocity.length() > 5;
    const pose = { ...this.anims.rest, ...(moving && this.anims.run ? this.anims.run : {}) };
    const out = this.sampled;
    out.dx = pose.dx || 0;
    out.dy = (pose.dy || 0) + (moving && pose.bob ? Math.sin(time * 0.02) * pose.bob : 0);
    out.angle = pose.angle || 0;
    out.dist = pose.dist || 0;
    out.scale = pose.scale === undefined ? 1 : pose.scale;
    out.alpha = pose.alpha === undefined ? 1 : pose.alpha;
    return out;
  }

  computeTarget(time) {
    const o = this.owner;
    const s = o.scaleX;
    const left = o.flipX;
    const ch = this.current ? this.sample(this.current, this.progress) : this.restPose(time);
    const space = (this.current && this.current.space) || 'local';
    const out = this.pose;
    if (space === 'aim') {
      const a = this.aim;
      const dist = ch.dist * s;
      out.x = o.x + Math.cos(a) * dist;
      out.y = o.y + ch.dy * s + Math.sin(a) * dist * 0.5;
      out.rotation = a + Phaser.Math.DegToRad(ch.angle);
      out.flip = false;
      out.depth = o.depth + (Math.sin(a) < -0.3 ? -1 : 1);
    } else {
      out.x = o.x + (left ? -ch.dx : ch.dx) * s;
      out.y = o.y + ch.dy * s;
      out.rotation = Phaser.Math.DegToRad(left ? -ch.angle : ch.angle);
      out.flip = left;
      out.depth = o.depth + restDepthOffset(this.anims, left);
    }
    out.scale = s * this.baseScale * ch.scale;
    out.alpha = ch.alpha;
    return out;
  }

  update(time) {
    const o = this.owner;
    const p = this.computeTarget(time);
    const out = this.applied;
    out.x = p.x;
    out.y = p.y;
    out.rotation = p.rotation;
    out.scale = p.scale;
    out.alpha = p.alpha;
    if (this.blendFrom) {
      const u = this.blendMs > 0 ? Phaser.Math.Clamp((time - this.blendStart) / this.blendMs, 0, 1) : 1;
      if (u >= 1) {
        this.blendFrom = null;
      } else {
        const f = this.blendFrom;
        out.x = o.x + f.ox + (p.x - o.x - f.ox) * u;
        out.y = o.y + f.oy + (p.y - o.y - f.oy) * u;
        out.rotation = f.rotation + Phaser.Math.Angle.Wrap(p.rotation - f.rotation) * u;
        out.scale = f.scale + (out.scale - f.scale) * u;
        out.alpha = f.alpha + (out.alpha - f.alpha) * u;
      }
    }
    this.image.setPosition(out.x, out.y).setRotation(out.rotation).setFlipX(p.flip).setDepth(p.depth).setScale(out.scale).setAlpha(out.alpha);
    out.valid = true;
    this.lastTime = time;
  }

  muzzlePoint() {
    const p = this.pose;
    const along = (this.anims.muzzle || 0) * p.scale;
    const r = p.rotation;
    return { x: p.x + Math.sin(r) * along, y: p.y - Math.cos(r) * along };
  }

  destroy() {
    this.stop();
    if (this.image) this.image.destroy();
    this.image = null;
  }
}
