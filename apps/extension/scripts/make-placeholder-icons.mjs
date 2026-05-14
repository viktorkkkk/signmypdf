/**
 * One-shot placeholder icon generator — runs by hand when the icons
 * need to be regenerated. NOT part of postinstall (icons are checked
 * into git so contributors don't need to re-render on every clone).
 *
 * Renders 16/32/48/128 PNGs of a centred white "pen" silhouette on a
 * #2563eb background. Pure Node stdlib — no graphics deps. Final
 * artwork is intentionally simple so contributors recognise these as
 * placeholders, not finished marks.
 *
 *   node scripts/make-placeholder-icons.mjs
 */
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, crc32 } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '../public/icons');

const BG = [0x25, 0x63, 0xeb, 0xff]; // #2563eb solid
const FG = [0xff, 0xff, 0xff, 0xff]; // white pen silhouette
const SIZES = [16, 32, 48, 128];

/** Build a square pixel buffer for an icon of given size. The "pen"
 *  silhouette is a thick diagonal stroke with a triangular nib at the
 *  bottom-left — drawn from a normalised template so the icon scales
 *  proportionally at every size. */
function buildPixels(size) {
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const inPen = isPenPixel(x, y, size);
      const c = inPen ? FG : BG;
      buf[idx + 0] = c[0];
      buf[idx + 1] = c[1];
      buf[idx + 2] = c[2];
      buf[idx + 3] = c[3];
    }
  }
  return buf;
}

/** A diagonal pen body running top-right → bottom-left with a small
 *  triangular nib at the bottom-left. Coordinates are derived from
 *  the icon size so everything scales together. */
function isPenPixel(x, y, size) {
  // Pen body: a band of thickness `thickness` around the line y = -x + size.
  const nx = (x + 0.5) / size; // 0..1
  const ny = (y + 0.5) / size;
  // Diagonal line: nx + ny = 1.0. Band thickness in normalised units.
  const dist = Math.abs(nx + ny - 1.0);
  const bodyThickness = 0.16;
  const bodyInBand = dist < bodyThickness / 2;
  // Clip the band so it doesn't run into the corners — leave 12% margins.
  const bodyClipped = bodyInBand && nx > 0.18 && ny > 0.18 && nx < 0.82 && ny < 0.82;
  // Nib triangle near the bottom-left corner.
  const nibTip = nx < 0.22 && ny > 0.78 && (nx + ny) > 0.92 && (ny - nx) < 0.62;
  return bodyClipped || nibTip;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(size, pixels) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // colour type RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace
  // Add a per-row filter byte (0 = None) before each scanline.
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[(stride + 1) * y] = 0;
    pixels.copy(raw, (stride + 1) * y + 1, y * stride, (y + 1) * stride);
  }
  const idat = deflateSync(raw);
  const iend = Buffer.alloc(0);
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', iend)]);
}

for (const size of SIZES) {
  const pixels = buildPixels(size);
  const png = encodePng(size, pixels);
  const out = resolve(outDir, `icon-${size}.png`);
  writeFileSync(out, png);
  console.log(`[icons] wrote ${out} (${png.length} bytes)`);
}
