// Generates Gridzy's original Android launcher icons and splash images from code-drawn SVG.
// Run with: npm run assets --workspace @gridzy/mobile
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const RES = join(here, '../android/app/src/main/res');
const OUT = join(here, '../assets');

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

// Same palette as the game (apps/web/src/render/palette.ts).
const COLORS = { yellow: '#ffc93c', red: '#f04a4a', cyan: '#2fd3e8', purple: '#a15cf0' };
const BG_TOP = '#4b5cf0';
const BG_BOTTOM = '#7a35d0';

function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const target = amount > 0 ? 255 : 0;
  const t = Math.abs(amount);
  const mix = (c) => Math.round(c + (target - c) * t);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Glossy beveled block, matching the in-game block drawing. */
function block(x, y, s, color) {
  const b = s * 0.15;
  const lo = 0;
  const hi = s;
  const face = s - b * 2;
  const pts = (arr) => arr.map((v) => v.toFixed(2)).join(' ');
  return `<g transform="translate(${x} ${y})">
    <rect x="0" y="0" width="${s}" height="${s}" rx="${s * 0.1}" fill="${shade(color, -0.42)}"/>
    <polygon points="${pts([lo, lo, hi, lo, hi - b, lo + b, lo + b, lo + b])}" fill="${shade(color, 0.45)}"/>
    <polygon points="${pts([lo, lo, lo + b, lo + b, lo + b, hi - b, lo, hi])}" fill="${shade(color, 0.22)}"/>
    <polygon points="${pts([hi, lo, hi, hi, hi - b, hi - b, hi - b, lo + b])}" fill="${shade(color, -0.18)}"/>
    <polygon points="${pts([lo, hi, hi, hi, hi - b, hi - b, lo + b, hi - b])}" fill="${shade(color, -0.34)}"/>
    <rect x="${b}" y="${b}" width="${face}" height="${face}" fill="${color}"/>
    <rect x="${b}" y="${b + face * 0.55}" width="${face}" height="${face * 0.45}" fill="#000" opacity="0.07"/>
    <rect x="${b + face * 0.1}" y="${b + face * 0.1}" width="${face * 0.42}" height="${face * 0.16}" rx="${face * 0.08}" fill="#fff" opacity="0.6"/>
    <circle cx="${b + face * 0.62}" cy="${b + face * 0.18}" r="${face * 0.07}" fill="#fff" opacity="0.45"/>
  </g>`;
}

function sparkle(cx, cy, r) {
  const i = r * 0.22;
  return `<polygon fill="#fff" points="${[
    cx,
    cy - r,
    cx + i,
    cy - i,
    cx + r,
    cy,
    cx + i,
    cy + i,
    cx,
    cy + r,
    cx - i,
    cy + i,
    cx - r,
    cy,
    cx - i,
    cy - i,
  ].join(' ')}"/>`;
}

/**
 * The mark, drawn in a 108×108 adaptive-icon canvas. Everything stays inside the
 * central 66-unit safe zone so no launcher mask can clip it.
 */
function mark() {
  const s = 20;
  const gap = 2.5;
  const x0 = 54 - s - gap / 2;
  const y0 = 56 - s - gap / 2;
  return `
    <ellipse cx="54" cy="${y0 + 2 * s + gap + 3}" rx="22" ry="3.2" fill="#14082e" opacity="0.25"/>
    ${block(x0, y0 + s + gap, s, COLORS.cyan)}
    ${block(x0 + s + gap, y0 + s + gap, s, COLORS.purple)}
    ${block(x0, y0, s, COLORS.yellow)}
    <g transform="rotate(10 ${x0 + s + gap + s / 2} ${y0 + s / 2}) translate(2 -3.5)">
      ${block(x0 + s + gap, y0, s, COLORS.red)}
    </g>
    ${sparkle(76, 31, 5)}
    ${sparkle(70.5, 24, 2.4)}`;
}

const gradient = (id) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="${BG_TOP}"/><stop offset="1" stop-color="${BG_BOTTOM}"/></linearGradient>`;

const svg = (w, h, viewBox, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${viewBox}">${body}</svg>`;

/** Adaptive icon foreground: the mark on transparency. */
const foregroundSvg = (px) => svg(px, px, '0 0 108 108', mark());

/** Legacy square icon (pre-Android 8): rounded square, background + mark. */
const legacySvg = (px) =>
  svg(
    px,
    px,
    '18 18 72 72',
    `<defs>${gradient('bg')}</defs>
     <rect x="18" y="18" width="72" height="72" rx="16" fill="url(#bg)"/>${mark()}`,
  );

/** Legacy round icon. */
const roundSvg = (px) =>
  svg(
    px,
    px,
    '18 18 72 72',
    `<defs>${gradient('bg')}</defs><circle cx="54" cy="54" r="36" fill="url(#bg)"/>${mark()}`,
  );

/** Full-screen splash for Android 11 and older (Android 12+ uses the system splash). */
function splashSvg(w, h) {
  const size = Math.min(w, h) * 0.5;
  const x = (w - size) / 2;
  const y = (h - size) / 2;
  return svg(
    w,
    h,
    `0 0 ${w} ${h}`,
    `<defs><linearGradient id="sb" x1="0" y1="0" x2="0.4" y2="1">
       <stop offset="0" stop-color="#3b4fe0"/><stop offset="1" stop-color="#6a2fc4"/></linearGradient></defs>
     <rect width="${w}" height="${h}" fill="url(#sb)"/>
     <svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="18 18 72 72">${mark()}</svg>`,
  );
}

async function render(svgText, width, height, file) {
  await mkdir(dirname(file), { recursive: true });
  // Rasterize at (at least) the target size so edges stay crisp.
  await sharp(Buffer.from(svgText), { density: 300 })
    .resize(width, height, { fit: 'fill' })
    .png({ compressionLevel: 9 })
    .toFile(file);
}

const SPLASH_PORTRAIT = {
  mdpi: [320, 480],
  hdpi: [480, 800],
  xhdpi: [720, 1280],
  xxhdpi: [960, 1600],
  xxxhdpi: [1280, 1920],
};

const jobs = [];
for (const [name, scale] of Object.entries(DENSITIES)) {
  const icon = Math.round(48 * scale);
  const fg = Math.round(108 * scale);
  const dir = join(RES, `mipmap-${name}`);
  jobs.push(render(legacySvg(icon * 4), icon, icon, join(dir, 'ic_launcher.png')));
  jobs.push(render(roundSvg(icon * 4), icon, icon, join(dir, 'ic_launcher_round.png')));
  jobs.push(render(foregroundSvg(fg * 4), fg, fg, join(dir, 'ic_launcher_foreground.png')));

  const [pw, ph] = SPLASH_PORTRAIT[name];
  jobs.push(render(splashSvg(pw, ph), pw, ph, join(RES, `drawable-port-${name}`, 'splash.png')));
  jobs.push(render(splashSvg(ph, pw), ph, pw, join(RES, `drawable-land-${name}`, 'splash.png')));
}
jobs.push(render(splashSvg(480, 800), 480, 800, join(RES, 'drawable', 'splash.png')));
// Store-listing icon (Google Play requires 512×512).
jobs.push(render(legacySvg(2048), 512, 512, join(OUT, 'icon-512.png')));

await Promise.all(jobs);
console.log(`Generated ${jobs.length} images.`);
