// SVG → PNG(s) → ICO 변환 스크립트
// SVG를 직접 읽어 간단한 PNG를 생성한 뒤 ICO로 묶습니다.
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// 단색 PNG를 순수 JS로 생성 (zlib 압축 포함)
import { deflateSync } from 'zlib';

function createPng(size, bgColor, fgColor) {
  const w = size, h = size;
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);

  function chunk(type, data) {
    const len = Buffer.allocUnsafe(4);
    len.writeUInt32BE(data.length);
    const tBuf = Buffer.from(type);
    const body = Buffer.concat([tBuf, data]);
    const crc = crc32(body);
    const crcBuf = Buffer.allocUnsafe(4);
    crcBuf.writeUInt32BE(crc >>> 0);
    return Buffer.concat([len, body, crcBuf]);
  }

  // IHDR
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // IDAT
  const raw = [];
  for (let y = 0; y < h; y++) {
    raw.push(0); // filter byte
    for (let x = 0; x < w; x++) {
      const cx = x - w / 2, cy = y - h / 2;
      const r = Math.sqrt(cx * cx + cy * cy);
      const inner = w * 0.22, outer = w * 0.38;
      if (r >= inner && r <= outer) {
        raw.push(fgColor[0], fgColor[1], fgColor[2]);
      } else if (r < inner) {
        // # 심볼 (단순화)
        const px = Math.floor((x / w) * 8), py = Math.floor((y / h) * 8);
        const hash = [
          [0,0,1,0,1,0,0,0],
          [0,0,1,0,1,0,0,0],
          [1,1,1,1,1,1,1,0],
          [0,0,1,0,1,0,0,0],
          [1,1,1,1,1,1,1,0],
          [0,0,1,0,1,0,0,0],
          [0,0,1,0,1,0,0,0],
          [0,0,0,0,0,0,0,0],
        ];
        if (hash[py] && hash[py][px]) {
          raw.push(fgColor[0], fgColor[1], fgColor[2]);
        } else {
          raw.push(bgColor[0], bgColor[1], bgColor[2]);
        }
      } else {
        raw.push(bgColor[0], bgColor[1], bgColor[2]);
      }
    }
  }
  const compressed = deflateSync(Buffer.from(raw));
  const idat = chunk('IDAT', compressed);
  const iend = chunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, chunk('IHDR', ihdr), idat, iend]);
}

// CRC32 구현
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  const table = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[i] = c;
    }
    return t;
  })();
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

const bg = [0x0d, 0x11, 0x17]; // #0d1117
const fg = [0x58, 0xa6, 0xff]; // #58a6ff

const sizes = [16, 32, 48, 64, 128, 256];
const pngs = sizes.map(s => createPng(s, bg, fg));

// ICO 포맷 조립
function buildIco(pngBuffers) {
  const n = pngBuffers.length;
  const headerSize = 6 + n * 16;
  let offset = headerSize;

  const header = Buffer.allocUnsafe(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(n, 4);

  const dirEntries = [];
  for (let i = 0; i < n; i++) {
    const e = Buffer.allocUnsafe(16);
    const s = sizes[i];
    e[0] = s >= 256 ? 0 : s;
    e[1] = s >= 256 ? 0 : s;
    e[2] = 0; e[3] = 0;
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(pngBuffers[i].length, 8);
    e.writeUInt32LE(offset, 12);
    offset += pngBuffers[i].length;
    dirEntries.push(e);
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers]);
}

const ico = buildIco(pngs);
writeFileSync(join(root, 'assets', 'icon.ico'), ico);
console.log('assets/icon.ico 생성 완료 (' + sizes.join(',') + 'px)');
