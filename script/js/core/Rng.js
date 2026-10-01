export function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class Rng {
  constructor(seed = 1) {
    this.seed = (seed >>> 0) || 1;
    this.state = this.seed;
  }

  next() {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  random() {
    return this.next();
  }

  chance(p) {
    return this.next() < p;
  }

  between(min, max) {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  floatBetween(min, max) {
    return min + this.next() * (max - min);
  }

  pick(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }

  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  derive(label) {
    return new Rng(hashString(`${this.seed}:${label}`));
  }
}

export function seedFor(seed, floor, label = '') {
  return hashString(`${seed}:${floor}:${label}`);
}

export function floorRng(seed, floor, label = '') {
  return new Rng(seedFor(seed, floor, label));
}

export function randomSeed() {
  return (Math.floor(Math.random() * 2147483646) + 1) >>> 0;
}

export const GAME_RNG = new Rng(randomSeed());
