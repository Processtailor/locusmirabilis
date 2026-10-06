#!/usr/bin/env node
/*
 * Generate the telescreen's eye as low-resolution pixel art.
 *
 * The eye is drawn on a 48x28 grid of 5x5-unit cells (viewBox 0 0 240 140) and
 * written in three places so every rendering of it is the same sprite:
 *   - index.html            inline <svg id="surveillance-eye"> (currentColor
 *                           outline/ring so the mood recolours it; #pupil group
 *                           follows the pointer; #pupil-core dilates)
 *   - assets/img/eye.svg    standalone copy for the icon / OG generator
 *   - assets/img/favicon.svg ring + pupil only, 16x16 cells
 *
 * Design (synthesised from the ten-candidate panel): asymmetric almond with a
 * two-cell outline and phosphor hot-spots at the tips, dark limbal ring, bold
 * two-cell iris ring with cardinal ticks, ordered-dither collar, stepped pupil
 * with a two-tone glint. No curves, no gradients, nothing off the grid.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CELL = 5;
const COLS = 48;
const ROWS = 28;
const CX = 120; // iris centre in units — sits on a cell corner so even-diameter rings are symmetric
const CY = 70;

const PAL = {
  outline: 'currentColor',
  sclera: '#1a0000',
  shadow: '#3a0000',
  limbal: '#060000',
  ring: 'currentColor',
  tick: '#ff7070',
  ditherA: '#7a0000',
  ditherB: '#3a0000',
  pupil: '#060000',
  glint: '#ffffff',
  glintSoft: '#ff7070'
};

/* ---- grid helpers -------------------------------------------------------- */
const key = (c, r) => `${c},${r}`;
const centre = (c, r) => [c * CELL + CELL / 2, r * CELL + CELL / 2];
const dist = (c, r) => Math.hypot(centre(c, r)[0] - CX, centre(c, r)[1] - CY);

function almondOpening() {
  // Asymmetric lens: the upper lid sits higher than the lower one (heavier brow).
  const open = new Set();
  const c0 = 3;
  const c1 = 44;
  const upper = 10;
  const lower = 9;
  const centreRow = 14; // boundary between rows 13 and 14 is y=70
  for (let c = c0; c <= c1; c++) {
    const t = (c - c0 + 0.5) / (c1 - c0 + 1);
    const w = Math.pow(Math.sin(Math.PI * t), 0.72);
    const top = Math.round(centreRow - upper * w);
    const bottom = Math.round(centreRow + lower * w);
    for (let r = top; r < bottom; r++) open.add(key(c, r));
  }
  return open;
}

function dilate(set, radius) {
  const out = new Set(set);
  for (const k of set) {
    const [c, r] = k.split(',').map(Number);
    for (let dc = -radius; dc <= radius; dc++) {
      for (let dr = -radius; dr <= radius; dr++) {
        const cc = c + dc;
        const rr = r + dr;
        if (cc >= 0 && cc < COLS && rr >= 0 && rr < ROWS) out.add(key(cc, rr));
      }
    }
  }
  return out;
}

/* ---- paint ------------------------------------------------------------- */
function paint() {
  const open = almondOpening();
  const outline = new Set([...dilate(open, 2)].filter((k) => !open.has(k)));

  const layers = { sclera: [], shadow: [], outline: [], tips: [], limbal: [], ring: [], tick: [], ditherA: [], ditherB: [], pupil: [], glint: [], glintSoft: [] };

  for (const k of open) {
    const [c, r] = k.split(',').map(Number);
    // one cell of shadow directly under the upper lid gives the brow weight
    if (outline.has(key(c, r - 1))) layers.shadow.push([c, r]);
    else layers.sclera.push([c, r]);
  }
  for (const k of outline) layers.outline.push(k.split(',').map(Number));

  // phosphor hot-spots where the beam dwells at the almond tips
  const outlineCols = layers.outline.map(([c]) => c);
  const minC = Math.min(...outlineCols);
  const maxC = Math.max(...outlineCols);
  for (const r of [13, 14]) {
    layers.tips.push([minC, r]);
    layers.tips.push([maxC, r]);
  }

  // iris rings by cell-centre distance from (CX, CY)
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const d = dist(c, r);
      if (d >= 40) continue;
      if (d >= 35) layers.limbal.push([c, r]);
      else if (d >= 25) layers.ring.push([c, r]);
      else if (d >= 15) ((c + r) % 2 === 0 ? layers.ditherA : layers.ditherB).push([c, r]);
      else layers.pupil.push([c, r]);
    }
  }
  // cardinal ticks on the bright ring (two cells each, since the centre is on a corner)
  for (const c of [23, 24]) { layers.tick.push([c, 7]); layers.tick.push([c, 20]); }
  for (const r of [13, 14]) { layers.tick.push([17, r]); layers.tick.push([30, r]); }
  // two-tone glint: a white cell inside the pupil's upper-left edge, a soft cell beyond it
  layers.glint.push([22, 12]);
  layers.glintSoft.push([21, 11]);

  return { layers, open };
}

/* ---- emit -------------------------------------------------------------- */
function runs(cells) {
  // merge horizontal runs of cells into single rects
  const byRow = new Map();
  for (const [c, r] of cells) {
    if (!byRow.has(r)) byRow.set(r, new Set());
    byRow.get(r).add(c);
  }
  const rects = [];
  for (const [r, cols] of [...byRow.entries()].sort((a, b) => a[0] - b[0])) {
    const sorted = [...cols].sort((a, b) => a - b);
    let start = sorted[0];
    let prev = sorted[0];
    for (let i = 1; i <= sorted.length; i++) {
      if (sorted[i] === prev + 1) { prev = sorted[i]; continue; }
      rects.push([start, r, prev - start + 1]);
      start = sorted[i];
      prev = sorted[i];
    }
  }
  return rects;
}

function pathFor(cells) {
  return runs(cells).map(([c, r, w]) => `M${c * CELL} ${r * CELL}h${w * CELL}v${CELL}h${-w * CELL}z`).join('');
}

function layer(cells, fill, extra = '') {
  if (!cells.length) return '';
  return `<path fill="${fill}" d="${pathFor(cells)}"${extra}/>`;
}

function octagon(cx, cy, apothem) {
  // regular octagon: circumradius = apothem / cos(22.5deg) stays inside the resting pupil disc
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    const R = apothem / Math.cos(Math.PI / 8);
    pts.push(`${(cx + R * Math.cos(a)).toFixed(2)},${(cy + R * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}

function buildEye({ inline }) {
  const { layers, open } = paint();
  const color = (name) => (inline ? PAL[name] : PAL[name] === 'currentColor' ? '#ff2a2a' : PAL[name]);
  const ids = inline ? { root: ' id="surveillance-eye"', clip: 'eye-opening', pupil: ' id="pupil"', core: ' id="pupil-core"' }
    : { root: '', clip: 'eye-opening-static', pupil: '', core: '' };

  const parts = [
    `<svg${ids.root} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${COLS * CELL} ${ROWS * CELL}" aria-hidden="true" focusable="false" shape-rendering="crispEdges">`,
    `<defs><clipPath id="${ids.clip}"><path d="${pathFor([...open].map((k) => k.split(',').map(Number)))}"/></clipPath></defs>`,
    layer(layers.sclera, color('sclera')),
    layer(layers.shadow, color('shadow')),
    layer(layers.outline, color('outline')),
    layer(layers.tips, color('tick')),
    `<g clip-path="url(#${ids.clip})"><g${ids.pupil}>`,
    layer(layers.limbal, color('limbal')),
    layer(layers.ring, color('ring')),
    layer(layers.tick, color('tick')),
    layer(layers.ditherA, color('ditherA')),
    layer(layers.ditherB, color('ditherB')),
    layer(layers.pupil, color('pupil')),
    // the dilating core hides inside the resting pupil and grows to exactly 8 cells (40 units) at 1.45x
    `<polygon${ids.core} fill="${color('pupil')}" points="${octagon(CX, CY, 40 / 1.45 / 2)}"/>`,
    layer(layers.glint, color('glint')),
    layer(layers.glintSoft, color('glintSoft')),
    '</g></g>',
    '</svg>'
  ];
  return parts.filter(Boolean).join('\n');
}

function buildFavicon() {
  // 16x16 cells of 4 units: ring + collar + pupil + glint, no almond (it would not survive 16 px)
  const S = 4;
  const cx = 32;
  const cy = 32;
  const cells = { ring: [], ditherA: [], ditherB: [], pupil: [] };
  for (let c = 0; c < 16; c++) {
    for (let r = 0; r < 16; r++) {
      const d = Math.hypot(c * S + S / 2 - cx, r * S + S / 2 - cy);
      if (d >= 28) continue;
      if (d >= 20) cells.ring.push([c, r]);
      else if (d >= 12) ((c + r) % 2 === 0 ? cells.ditherA : cells.ditherB).push([c, r]);
      else cells.pupil.push([c, r]);
    }
  }
  const p = (list) => list.map(([c, r]) => `M${c * S} ${r * S}h${S}v${S}h${-S}z`).join('');
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" shape-rendering="crispEdges">',
    '<rect width="64" height="64" fill="#020202"/>',
    `<path fill="#ff2a2a" d="${p(cells.ring)}"/>`,
    `<path fill="#7a0000" d="${p(cells.ditherA)}"/>`,
    `<path fill="#3a0000" d="${p(cells.ditherB)}"/>`,
    `<path fill="#060000" d="${p(cells.pupil)}"/>`,
    '<path fill="#ffffff" d="M24 24h4v4h-4z"/>',
    '</svg>',
    ''
  ].join('\n');
}

function main() {
  const inlineSvg = buildEye({ inline: true }).replace(' xmlns="http://www.w3.org/2000/svg"', '');
  const indexPath = path.join(ROOT, 'index.html');
  const html = fs.readFileSync(indexPath, 'utf8');
  const re = /<svg id="surveillance-eye"[\s\S]*?<\/svg>/;
  if (!re.test(html)) throw new Error('index.html: <svg id="surveillance-eye"> not found');
  const indented = inlineSvg.split('\n').map((line, i) => (i === 0 ? line : `                        ${line}`)).join('\n');
  fs.writeFileSync(indexPath, html.replace(re, indented));
  fs.writeFileSync(path.join(ROOT, 'assets/img/eye.svg'), buildEye({ inline: false }) + '\n');
  fs.writeFileSync(path.join(ROOT, 'assets/img/favicon.svg'), buildFavicon());
  process.stdout.write(`eye written: index.html (${inlineSvg.length} B inline), assets/img/eye.svg, assets/img/favicon.svg\n`);
}

if (require.main === module) main();
module.exports = { buildEye, buildFavicon };
