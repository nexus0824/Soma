import fs from 'node:fs';
import path from 'node:path';

const [,, srcDir, outDir] = process.argv;
if (!srcDir || !outDir) {
  console.error('usage: node tools/build-atlas.mjs <0x72 pack dir> <assets/atlas>');
  process.exit(1);
}

const listFile = fs.readdirSync(srcDir).find((f) => f.startsWith('tile_list'));
const pngFile = fs.readdirSync(srcDir).find((f) => /^0x72_DungeonTilesetII.*\.png$/.test(f));
const lines = fs.readFileSync(path.join(srcDir, listFile), 'utf8').split(/\r?\n/);

const frames = {};
for (const line of lines) {
  const m = line.trim().match(/^(\S+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)$/);
  if (!m) continue;
  const [, name, x, y, w, h] = m;
  frames[name] = {
    frame: { x: +x, y: +y, w: +w, h: +h },
    rotated: false,
    trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w: +w, h: +h },
    sourceSize: { w: +w, h: +h },
  };
}

const png = fs.readFileSync(path.join(srcDir, pngFile));
const width = png.readUInt32BE(16);
const height = png.readUInt32BE(20);

fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(path.join(srcDir, pngFile), path.join(outDir, 'dungeon.png'));
fs.writeFileSync(path.join(outDir, 'dungeon.json'), JSON.stringify({
  frames,
  meta: { image: 'dungeon.png', size: { w: width, h: height }, scale: '1', source: '0x72 DungeonTileset II v1.7 (CC0)' },
}, null, 0));
const readme = path.join(srcDir, 'README');
if (fs.existsSync(readme)) fs.copyFileSync(readme, path.join(outDir, 'README_0x72.txt'));
fs.writeFileSync(path.join(outDir, 'LICENSE_0x72.txt'), '0x72 DungeonTileset II v1.7 by 0x72 (https://0x72.itch.io/dungeontileset-ii)\nAssets: CC0 1.0 Universal. Code: MIT.\n');
console.log(`atlas: ${Object.keys(frames).length} frames, ${width}x${height}`);
