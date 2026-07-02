// SVG → PNG(multi-size) → ICO 변환
// @resvg/resvg-js 로 SVG를 정확히 래스터화합니다.
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svgData = readFileSync(join(root, 'assets', 'icon.svg'), 'utf-8');

const sizes = [16, 32, 48, 64, 128, 256];

function renderPng(size) {
  const resvg = new Resvg(svgData, {
    fitTo: { mode: 'width', value: size },
    font: { loadSystemFonts: false },
  });
  return resvg.render().asPng();
}

function buildIco(pngBuffers) {
  const n = pngBuffers.length;
  const dirSize = 6 + n * 16;
  let offset = dirSize;

  const header = Buffer.allocUnsafe(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: ICO
  header.writeUInt16LE(n, 4); // count

  const entries = pngBuffers.map((png, i) => {
    const s = sizes[i];
    const e = Buffer.allocUnsafe(16);
    e[0] = s >= 256 ? 0 : s;  // width  (0 = 256)
    e[1] = s >= 256 ? 0 : s;  // height (0 = 256)
    e[2] = 0; e[3] = 0;       // color count, reserved
    e.writeUInt16LE(1, 4);    // planes
    e.writeUInt16LE(32, 6);   // bit count
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += png.length;
    return e;
  });

  return Buffer.concat([header, ...entries, ...pngBuffers]);
}

const pngs = sizes.map(renderPng);
const ico = buildIco(pngs);
writeFileSync(join(root, 'assets', 'icon.ico'), ico);
console.log('assets/icon.ico 생성 완료 (' + sizes.join(', ') + 'px)');

// APPX/Microsoft Store 타일용 고해상도 PNG (1024x1024)
const png1024 = renderPng(1024);
writeFileSync(join(root, 'assets', 'icon.png'), png1024);
console.log('assets/icon.png 생성 완료 (1024x1024)');
