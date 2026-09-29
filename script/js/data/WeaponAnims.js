export const WEAPON_ANIMS = {
  sword: {
    scale: 0.72,
    muzzle: 14,
    origin: [0.5, 0.9],
    restDepth: 'front',
    rest: { dx: 3, dy: 7, angle: 125 },
    run: { angle: 135, bob: 1.5 },
    swing: {
      space: 'aim',
      base: { dy: 5, dist: 4 },
      frames: [
        { t: 0, angle: 10 },
        { t: 0.45, angle: 145, dist: 7, ease: 'Cubic.easeOut' },
        { t: 1, angle: 150, dist: 5 },
      ],
    },
    swingBack: {
      space: 'aim',
      base: { dy: 5, dist: 4 },
      frames: [
        { t: 0, angle: 170 },
        { t: 0.45, angle: 35, dist: 7, ease: 'Cubic.easeOut' },
        { t: 1, angle: 30, dist: 5 },
      ],
    },
    finisher: {
      space: 'aim',
      base: { dy: 5, dist: 3 },
      frames: [
        { t: 0, angle: -50, scale: 1 },
        { t: 0.2, angle: -70, dist: 2, ease: 'Sine.easeOut' },
        { t: 0.55, angle: 175, dist: 10, scale: 1.15, ease: 'Back.easeOut' },
        { t: 1, angle: 180, dist: 8, scale: 1 },
      ],
    },
    cast: {
      space: 'local',
      frames: [
        { t: 0, dx: 1, dy: 5, angle: 26 },
        { t: 0.4, dx: 3, dy: -1, angle: -20, ease: 'Cubic.easeOut' },
        { t: 1, dx: 1, dy: 5, angle: 26, ease: 'Sine.easeInOut' },
      ],
    },
  },
  bow: {
    scale: 0.6,
    muzzle: 0,
    origin: [0.5, 0.5],
    rest: { dx: 6, dy: 6, angle: -12 },
    run: { angle: -20, bob: 1 },
    aim: {
      space: 'aim',
      base: { dy: 6, dist: 7 },
      frames: [
        { t: 0, angle: 0, dist: 6 },
        { t: 0.3, angle: 0, dist: 10, scale: 1.08, ease: 'Cubic.easeOut' },
        { t: 1, angle: 0, dist: 7, scale: 1 },
      ],
    },
    volley: {
      space: 'aim',
      base: { dy: 6, dist: 8 },
      frames: [
        { t: 0, angle: -25, dist: 6 },
        { t: 0.4, angle: 25, dist: 11, scale: 1.12, ease: 'Sine.easeInOut' },
        { t: 1, angle: 0, dist: 8, scale: 1 },
      ],
    },
    cast: {
      space: 'aim',
      base: { dy: 6, dist: 8 },
      frames: [
        { t: 0, angle: 0, dist: 6 },
        { t: 0.5, angle: 0, dist: 12, scale: 1.15, ease: 'Back.easeOut' },
        { t: 1, angle: 0, dist: 8, scale: 1 },
      ],
    },
  },
  staff: {
    scale: 0.6,
    muzzle: 15,
    origin: [0.5, 0.6],
    rest: { dx: 6, dy: 6, angle: -8 },
    run: { angle: -14, bob: 1.5 },
    thrust: {
      space: 'aim',
      base: { dy: 6, dist: 6 },
      frames: [
        { t: 0, angle: 90, dist: 6 },
        { t: 0.4, angle: 90, dist: 16, ease: 'Cubic.easeOut' },
        { t: 1, angle: 90, dist: 8, ease: 'Sine.easeIn' },
      ],
    },
    cast: {
      space: 'aim',
      base: { dy: 6, dist: 8 },
      frames: [
        { t: 0, angle: 60, dist: 8 },
        { t: 0.35, angle: 100, dist: 14, scale: 1.15, ease: 'Cubic.easeOut' },
        { t: 1, angle: 90, dist: 8, scale: 1 },
      ],
    },
    raise: {
      space: 'local',
      frames: [
        { t: 0, dx: 6, dy: 6, angle: -8 },
        { t: 0.4, dx: 4, dy: -2, angle: -25, scale: 1.1, ease: 'Cubic.easeOut' },
        { t: 1, dx: 6, dy: 6, angle: -8, scale: 1, ease: 'Sine.easeInOut' },
      ],
    },
  },
};
