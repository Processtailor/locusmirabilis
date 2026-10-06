#!/usr/bin/env node
/*
 * Render the PWA icons and the Open Graph image with headless Chromium.
 *   node scripts/make-images.js
 * Uses the site's own fonts via the local dev server so the artwork matches
 * the page. Outputs into assets/img/ (committed — the build has no image step).
 */
'use strict';

const path = require('path');
const fs = require('fs');
const { chromium } = require('@playwright/test');
const { createServer } = require('./serve');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'img');

const EYE = (size, pad) => `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 140" width="${size - pad * 2}" height="${(size - pad * 2) * 140 / 240}">
    <defs>
      <radialGradient id="g" cx="50%" cy="50%" r="50%">
        <stop offset="0" stop-color="#ff7070"/><stop offset="0.55" stop-color="#ff2a2a"/><stop offset="1" stop-color="#5a0000"/>
      </radialGradient>
      <clipPath id="c"><path d="M12 70 C 50 5, 190 5, 228 70 C 190 135, 50 135, 12 70 Z"/></clipPath>
    </defs>
    <path d="M12 70 C 50 5, 190 5, 228 70 C 190 135, 50 135, 12 70 Z" fill="#1a0000" stroke="#ff2a2a" stroke-width="7" stroke-linejoin="round"/>
    <g clip-path="url(#c)">
      <circle cx="120" cy="70" r="42" fill="url(#g)"/>
      <circle cx="120" cy="70" r="42" fill="none" stroke="#ff2a2a" stroke-width="2"/>
      <circle cx="120" cy="70" r="17" fill="#060000"/>
      <circle cx="106" cy="56" r="6" fill="#fff" opacity="0.9"/>
    </g>
  </svg>`;

function iconPage(size, pad, radius) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;background:transparent}
    .box{width:${size}px;height:${size}px;background:#020202;border-radius:${radius}px;display:flex;align-items:center;justify-content:center;
      box-shadow: inset 0 0 ${size * 0.25}px rgba(0,0,0,0.9)}
    svg{filter: drop-shadow(0 0 ${size * 0.04}px #ff2a2a) drop-shadow(0 0 ${size * 0.1}px rgba(255,42,42,0.6))}
  </style></head><body><div class="box">${EYE(size, pad)}</div></body></html>`;
}

function ogPage(base) {
  return `<!doctype html><html><head><meta charset="utf-8">
  <style>
    @font-face{font-family:'VT323';src:url('${base}/assets/fonts/VT323-latin-ext.woff2') format('woff2');unicode-range:U+0100-02BA,U+1E00-1EFF}
    @font-face{font-family:'VT323';src:url('${base}/assets/fonts/VT323-latin.woff2') format('woff2');unicode-range:U+0000-00FF}
    @font-face{font-family:'Orbitron';font-weight:400 900;src:url('${base}/assets/fonts/Orbitron-latin.woff2') format('woff2')}
    html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:#020202}
    .og{position:relative;width:1200px;height:630px;display:flex;align-items:center;gap:60px;padding:0 90px;box-sizing:border-box;
        background: radial-gradient(ellipse at 30% 50%, rgba(80,0,0,0.55), rgba(2,2,2,0) 60%), #020202}
    .og::after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0 3px, rgba(0,0,0,0.22) 3px 5px);pointer-events:none}
    .og::before{content:'';position:absolute;inset:0;box-shadow:inset 0 0 220px rgba(0,0,0,0.95);pointer-events:none;z-index:1}
    .eye svg{filter: drop-shadow(0 0 18px #ff2a2a) drop-shadow(0 0 60px rgba(255,42,42,0.6))}
    .text{color:#00ff41;font-family:'VT323',monospace;text-shadow:0 0 8px rgba(0,255,65,0.45)}
    .k{font-size:30px;letter-spacing:0.25em;color:rgba(0,255,65,0.6)}
    h1{margin:10px 0 0;font-size:92px;line-height:0.95;letter-spacing:0.06em;color:#ff2a2a;text-shadow:0 0 18px #ff2a2a,0 0 60px rgba(255,42,42,0.5)}
    .sub{margin-top:22px;font-size:36px;letter-spacing:0.12em}
    .sub .c{animation:none}
    .brand{position:absolute;right:90px;bottom:40px;font-family:'Orbitron',monospace;font-size:22px;letter-spacing:0.35em;color:rgba(0,255,65,0.55)}
    .rec{position:absolute;left:90px;top:40px;font-size:26px;letter-spacing:0.2em;color:#ff2a2a}
    .rec i{display:inline-block;width:16px;height:16px;border-radius:50%;background:#ff2a2a;box-shadow:0 0 12px #ff2a2a;margin-right:12px;vertical-align:-1px}
  </style></head><body>
  <div class="og">
    <div class="rec text"><i></i>KAYIT · 13:00:00</div>
    <div class="eye">${EYE(520, 20)}</div>
    <div class="text">
      <div class="k">VATANDAŞ TANIMLANIYOR...</div>
      <h1>GÖZETİM<br>ALTINDASIN</h1>
      <div class="sub">&gt; BİR KOMUT YAZIN<span class="c">_</span></div>
    </div>
    <div class="brand">LOCUS MIRABILIS</div>
  </div></body></html>`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = createServer(ROOT);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  try {
    const shots = [
      { file: 'icon-192.png', size: 192, pad: 18, radius: 0 },
      { file: 'icon-512.png', size: 512, pad: 48, radius: 0 },
      { file: 'icon-512-maskable.png', size: 512, pad: 110, radius: 0 },
      { file: 'apple-touch-icon.png', size: 180, pad: 18, radius: 0 }
    ];
    for (const shot of shots) {
      const page = await browser.newPage({ viewport: { width: shot.size, height: shot.size }, deviceScaleFactor: 1 });
      await page.setContent(iconPage(shot.size, shot.pad, shot.radius));
      await page.locator('.box').screenshot({ path: path.join(OUT, shot.file), omitBackground: true });
      await page.close();
      process.stdout.write(`wrote ${shot.file}\n`);
    }
    const og = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    await og.route(`${base}/__og.html`, (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: ogPage(base) }));
    await og.goto(`${base}/__og.html`, { waitUntil: 'networkidle' });
    await og.evaluate(() => document.fonts.ready);
    await og.screenshot({ path: path.join(OUT, 'og.png') });
    await og.close();
    process.stdout.write('wrote og.png\n');
  } finally {
    await browser.close();
    server.close();
  }
})().catch((err) => {
  process.stderr.write(`${err.stack || err}\n`);
  process.exit(1);
});
