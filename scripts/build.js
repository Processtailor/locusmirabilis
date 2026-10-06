#!/usr/bin/env node
/*
 * Build: copy the static site into dist/ and stamp the build id.
 *   BUILD_ID=abc1234 node scripts/build.js
 * There is no bundler on purpose — the page is plain HTML/CSS/JS. The build
 * only (1) selects the files that ship and (2) replaces __BUILD__ /
 * __BUILD_DATE__ so caches and the on-screen stamp follow each deploy.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist');
const BUILD_ID = (process.env.BUILD_ID || 'dev').trim().slice(0, 12);
const BUILD_DATE = new Date().toISOString().slice(0, 10);

const SHIP = [
  'index.html',
  '404.html',
  'changelog.html',
  'manifest.webmanifest',
  'sw.js',
  'robots.txt',
  '.nojekyll',
  'CHANGELOG.md',
  'assets',
  'archive'
];
const STAMP_EXT = new Set(['.html', '.js', '.css', '.webmanifest', '.json', '.txt', '.svg', '.md']);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const entry of SHIP) {
  const src = path.join(ROOT, entry);
  if (!fs.existsSync(src)) {
    process.stderr.write(`warn: ${entry} not found, skipping\n`);
    continue;
  }
  fs.cpSync(src, path.join(OUT, entry), { recursive: true });
}

let stamped = 0;
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    const stat = fs.statSync(file);
    if (stat.isDirectory()) { walk(file); continue; }
    if (!STAMP_EXT.has(path.extname(name))) continue;
    if (file.includes(`${path.sep}archive${path.sep}`)) continue; // archived versions ship untouched
    const before = fs.readFileSync(file, 'utf8');
    const after = before.replace(/__BUILD__/g, BUILD_ID).replace(/__BUILD_DATE__/g, BUILD_DATE);
    if (after !== before) {
      fs.writeFileSync(file, after);
      stamped++;
    }
  }
})(OUT);

process.stdout.write(`built dist/ (build ${BUILD_ID}, ${BUILD_DATE}); stamped ${stamped} files\n`);
