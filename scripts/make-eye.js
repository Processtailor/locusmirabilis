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
 * Design (synthesised from a ten-candidate panel and an adversarial review):
 * asymmetric almond with a two-cell outline, a chequered brow shadow, dark
 * limbal ring, bold two-cell iris ring cut into four arcs by dark cardinal
 * notches, a two-step ordered-dither collar, a stepped pupil with a two-tone
 * phosphor glint, and a whole-cell dilated pupil for suspect mood. No curves,
 * no gradients, nothing off the grid, no smooth tweens.
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
  notch: '#060000',
  collarOuterA: '#c81e1e', // mid red: the collar ramps bright ring → mid chequer → dark chequer → void
  collarOuterB: '#7a0000',
  collarInnerA: '#7a0000',
  collarInnerB: '#3a0000',
  pupil: '#060000',
  glint: '#ffe4e4',       // over-driven phosphor white, not paper white
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

  const layers = { sclera: [], shadow: [], outline: [], limbal: [], ring: [], notch: [], collarOuterA: [], collarOuterB: [], collarInnerA: [], collarInnerB: [], pupil: [], glint: [], glintSoft: [] };

  for (const k of open) {
    const [c, r] = k.split(',').map(Number);
    // a 50% chequer of shadow directly under the upper lid gives the brow weight without a flat band
    if (outline.has(key(c, r - 1)) && (c + r) % 2 === 0) layers.shadow.push([c, r]);
    else layers.sclera.push([c, r]);
  }
  for (const k of outline) layers.outline.push(k.split(',').map(Number));

  // iris rings by cell-centre distance from (CX, CY)
  const chequer = (c, r) => (c + r) % 2 === 0;
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const d = dist(c, r);
      if (d >= 40) continue;
      const cardinal = (c === 23 || c === 24) || (r === 13 || r === 14); // the two cells straddling each axis
      if (d >= 35) layers.limbal.push([c, r]);
      else if (d >= 25) (cardinal ? layers.notch : layers.ring).push([c, r]);        // dark notches cut the ring into four arcs
      else if (d >= 20) (chequer(c, r) ? layers.collarOuterA : layers.collarOuterB).push([c, r]);
      else if (d >= 15) (chequer(c, r) ? layers.collarInnerA : layers.collarInnerB).push([c, r]);
      else layers.pupil.push([c, r]);
    }
  }
  // two-tone glint bar inside the pupil's upper-left: phosphor white decaying to soft red
  layers.glint.push([22, 12]);
  layers.glintSoft.push([23, 12]);

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

function dilatedPupil() {
  // 8 cells across with one-cell corner cuts: x100–140, y50–90 on the grid
  const cells = [];
  for (let c = 20; c < 28; c++) {
    for (let r = 10; r < 18; r++) {
      const edgeC = c === 20 || c === 27;
      const edgeR = r === 10 || r === 17;
      if (edgeC && edgeR) continue;
      cells.push([c, r]);
    }
  }
  return cells;
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
    `<g clip-path="url(#${ids.clip})"><g${ids.pupil}>`,
    layer(layers.limbal, color('limbal')),
    layer(layers.ring, color('ring')),
    layer(layers.notch, color('notch')),
    layer(layers.collarOuterA, color('collarOuterA')),
    layer(layers.collarOuterB, color('collarOuterB')),
    layer(layers.collarInnerA, color('collarInnerA')),
    layer(layers.collarInnerB, color('collarInnerB')),
    layer(layers.pupil, color('pupil')),
    // suspect mood: the void dilates to a stepped 8-cell octagon, whole cells only (CSS fades it in with steps())
    inline ? `<path${ids.core} fill="${color('pupil')}" d="${pathFor(dilatedPupil())}"/>` : '',
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
  const cells = { ring: [], ditherA: [], ditherB: [], ditherC: [], pupil: [] };
  for (let c = 0; c < 16; c++) {
    for (let r = 0; r < 16; r++) {
      const d = Math.hypot(c * S + S / 2 - cx, r * S + S / 2 - cy);
      if (d >= 28) continue;
      if (d >= 20) cells.ring.push([c, r]);
      else if (d >= 16) ((c + r) % 2 === 0 ? cells.ditherA : cells.ditherB).push([c, r]);
      else if (d >= 12) ((c + r) % 2 === 0 ? cells.ditherB : cells.ditherC).push([c, r]);
      else cells.pupil.push([c, r]);
    }
  }
  const p = (list) => list.map(([c, r]) => `M${c * S} ${r * S}h${S}v${S}h${-S}z`).join('');
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" shape-rendering="crispEdges">',
    '<rect width="64" height="64" fill="#020202"/>',
    `<path fill="#ff2a2a" d="${p(cells.ring)}"/>`,
    `<path fill="#c81e1e" d="${p(cells.ditherA)}"/>`,
    `<path fill="#7a0000" d="${p(cells.ditherB)}"/>`,
    `<path fill="#3a0000" d="${p(cells.ditherC)}"/>`,
    `<path fill="#060000" d="${p(cells.pupil)}"/>`,
    '<path fill="#ffe4e4" d="M24 24h4v4h-4z"/>',
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
