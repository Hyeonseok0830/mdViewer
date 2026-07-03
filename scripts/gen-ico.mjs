// SVG → PNG(multi-size) → ICO 변환 + AppX/MSIX 타일 에셋 생성
// @resvg/resvg-js 로 SVG를 정확히 래스터화합니다.
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svgData = readFileSync(join(root, 'assets', 'icon.svg'), 'utf-8');

// ── ICO (16~256px) ───────────────────────────────────────────────
const icoSizes = [16, 32, 48, 64, 128, 256];

function renderPng(size, svgSrc) {
  const src = svgSrc || svgData;
  const resvg = new Resvg(src, {
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
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(n, 4);

  const entries = pngBuffers.map((png, i) => {
    const s = icoSizes[i];
    const e = Buffer.allocUnsafe(16);
    e[0] = s >= 256 ? 0 : s;
    e[1] = s >= 256 ? 0 : s;
    e[2] = 0; e[3] = 0;
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += png.length;
    return e;
  });

  return Buffer.concat([header, ...entries, ...pngBuffers]);
}

const pngs = icoSizes.map(s => renderPng(s));
const ico = buildIco(pngs);
writeFileSync(join(root, 'assets', 'icon.ico'), ico);
console.log('assets/icon.ico 생성 완료 (' + icoSizes.join(', ') + 'px)');

// ── 메인 앱 아이콘 (1024×1024) ──────────────────────────────────
const png1024 = renderPng(1024);
writeFileSync(join(root, 'assets', 'icon.png'), png1024);
console.log('assets/icon.png 생성 완료 (1024x1024)');

// ── AppX / MSIX 타일 에셋 ────────────────────────────────────────
// Microsoft Store에서 요구하는 5종 타일 이미지를 미리 생성.
// electron-builder는 assets/appx/ 디렉터리가 있으면 자동 생성 대신 이 파일들을 사용함.
mkdirSync(join(root, 'assets', 'appx'), { recursive: true });

const BG = '#1e1b4b'; // package.json appx.backgroundColor 와 동일

// 정사각형 타일: 원본 SVG를 해당 크기로 렌더링
const squareTiles = [
  { name: 'Square44x44Logo.png',   size: 44  },
  { name: 'StoreLogo.png',         size: 50  },
  { name: 'Square150x150Logo.png', size: 150 },
  { name: 'Square310x310Logo.png', size: 310 },
];

for (const { name, size } of squareTiles) {
  const buf = renderPng(size);
  writeFileSync(join(root, 'assets', 'appx', name), buf);
  console.log('assets/appx/' + name + ' 생성 완료 (' + size + 'x' + size + ')');
}

// 와이드 타일 (310×150): 아이콘(150×150)을 중앙에 배치
// SVG 뷰포트를 310×150으로 감싸고 원본을 scale+translate로 배치
const innerScale = 150 / 256;          // 원본 256px → 150px
const innerX    = (310 - 150) / 2;     // 수평 중앙 여백 = 80px
const wideSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 310 150" width="310" height="150">
  <rect width="310" height="150" fill="${BG}"/>
  <g transform="translate(${innerX},0) scale(${innerScale})">
    ${svgData.replace(/<svg[^>]*>/, '').replace('</svg>', '')}
  </g>
</svg>`;

const widePng = renderPng(310, wideSvg);
writeFileSync(join(root, 'assets', 'appx', 'Wide310x150Logo.png'), widePng);
console.log('assets/appx/Wide310x150Logo.png 생성 완료 (310x150)');

console.log('\n✓ 모든 아이콘 에셋 생성 완료');
