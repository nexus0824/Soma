export const BIT = { N: 1, E: 2, S: 4, W: 8, NE: 16, SE: 32, SW: 64, NW: 128 };

const TEMPLATE_3X3_MINIMAL = [
  'S', 'ES', 'ESW', 'SW', 'NESW+nw', 'ESW+se', 'ESW+sw', 'NESW+ne', 'ES+se', 'NESW+se+sw', 'ESW+se+sw', 'SW+sw',
  'NS', 'NES', 'NESW', 'NSW', 'NES+se', 'NESW+ne+se+sw', 'NESW+se+sw+nw', 'NSW+sw', 'NES+ne+se', 'NESW+ne+sw', null, 'NESW+sw+nw',
  'N', 'NE', 'NEW', 'NW', 'NES+ne', 'NESW+ne+se+nw', 'NESW+ne+sw+nw', 'NSW+nw', 'NESW+ne+se', 'NESW+ne+se+sw+nw', 'NESW+se+nw', 'NSW+sw+nw',
  '', 'E', 'EW', 'W', 'NESW+sw', 'NEW+ne', 'NEW+nw', 'NESW+se', 'NE+ne', 'NEW+ne+nw', 'NESW+ne+nw', 'NW+nw',
];

function parseMask(desc) {
  const [edges, ...corners] = desc.split('+');
  let m = 0;
  for (const ch of edges) m |= BIT[ch];
  for (const c of corners) m |= BIT[c.toUpperCase()];
  return m;
}

export function buildAutotileLookup(template = TEMPLATE_3X3_MINIMAL) {
  const lookup = new Int16Array(256).fill(-1);
  template.forEach((desc, cell) => {
    if (desc === null) return;
    lookup[parseMask(desc)] = cell;
  });
  return lookup;
}

export const AUTOTILE_LOOKUP = buildAutotileLookup();
export const AUTOTILE_COLS = 12;
export const AUTOTILE_CELLS = TEMPLATE_3X3_MINIMAL.length;

export function neighborMask(isWall, x, y) {
  const n = isWall(x, y - 1);
  const e = isWall(x + 1, y);
  const s = isWall(x, y + 1);
  const w = isWall(x - 1, y);
  let m = 0;
  if (n) m |= BIT.N;
  if (e) m |= BIT.E;
  if (s) m |= BIT.S;
  if (w) m |= BIT.W;
  if (n && e && isWall(x + 1, y - 1)) m |= BIT.NE;
  if (s && e && isWall(x + 1, y + 1)) m |= BIT.SE;
  if (s && w && isWall(x - 1, y + 1)) m |= BIT.SW;
  if (n && w && isWall(x - 1, y - 1)) m |= BIT.NW;
  return m;
}
