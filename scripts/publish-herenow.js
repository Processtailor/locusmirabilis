#!/usr/bin/env node
/*
 * Publish dist/ to here.now — an instant preview link for any branch.
 *
 *   npm run build && node scripts/publish-herenow.js
 *     anonymous: a temporary site that expires after 24 hours (no account needed)
 *
 *   HERENOW_API_KEY=... node scripts/publish-herenow.js [--slug locus-mirabilis]
 *     account-owned, permanent, updatable under the same slug
 *
 *   node scripts/publish-herenow.js --dir some/folder
 *     publish another static folder (must contain index.html)
 *
 * Flow (https://here.now/docs): POST a file manifest → PUT each file to its
 * presigned URL → POST finalize. The site URL is printed last.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const argv = process.argv.slice(2);
const DIST = argv.includes('--dir') ? path.resolve(argv[argv.indexOf('--dir') + 1]) : path.join(ROOT, 'dist');
const API = 'https://here.now/api/v1';
const CLIENT = 'locus-mirabilis/scripts/publish-herenow.js';
const API_KEY = process.env.HERENOW_API_KEY || '';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

function walk(dir, base = '') {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) out.push(...walk(abs, rel));
    else if (name !== '.nojekyll') {
      out.push({ path: rel, abs, size: stat.size, contentType: MIME[path.extname(name).toLowerCase()] || 'application/octet-stream' });
    }
  }
  return out;
}

function headers(extra = {}) {
  const h = { 'X-HereNow-Client': CLIENT, ...extra };
  if (API_KEY) h.Authorization = `Bearer ${API_KEY}`;
  return h;
}

async function call(pathname, body) {
  const res = await fetch(`${API}${pathname}`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body)
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${pathname} → HTTP ${res.status}: ${text.slice(0, 500)}`);
  try { return JSON.parse(text); } catch { throw new Error(`${pathname} → unexpected response: ${text.slice(0, 200)}`); }
}

async function putFile(url, file) {
  const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': file.contentType }, body: fs.readFileSync(file.abs) });
  if (!res.ok) throw new Error(`upload ${file.path} → HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

async function main() {
  const slugArg = argv.includes('--slug') ? argv[argv.indexOf('--slug') + 1] : '';
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    throw new Error(`${path.relative(ROOT, DIST) || 'dist'}/index.html not found — run \`npm run build\` first (or pass --dir <folder>)`);
  }
  const files = walk(DIST);
  const total = files.reduce((n, f) => n + f.size, 0);
  process.stdout.write(`publishing ${files.length} files (${(total / 1024).toFixed(0)} KB) ${API_KEY ? 'to your account' : 'anonymously (expires in 24 h)'}\n`);

  const manifest = { files: files.map(({ path: p, size, contentType }) => ({ path: p, size, contentType })) };
  const created = await call(slugArg ? `/publish/${encodeURIComponent(slugArg)}` : '/publish', manifest);
  const slug = created.slug || (created.site && created.site.slug) || slugArg;
  const upload = created.upload || created;
  const uploads = upload.uploads || [];
  if (!slug || !upload.versionId || !uploads.length) {
    throw new Error(`unexpected create response: ${JSON.stringify(created).slice(0, 500)}`);
  }

  const byPath = new Map(uploads.map((u) => [u.path, u]));
  const queue = files.slice();
  const workers = Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const file = queue.shift();
      const target = byPath.get(file.path) || uploads[files.indexOf(file)];
      if (!target || !target.url) throw new Error(`no upload URL for ${file.path}`);
      await putFile(target.url, file);
    }
  });
  await Promise.all(workers);

  const done = await call(`/publish/${encodeURIComponent(slug)}/finalize`, { versionId: upload.versionId });
  const siteUrl = done.siteUrl || (done.site && done.site.url);
  process.stdout.write(`\nSITE: ${siteUrl}\n`);
  if (done.claimUrl) process.stdout.write(`CLAIM (make it permanent, keep private): ${done.claimUrl}\n`);
  if (!API_KEY) process.stdout.write('This anonymous site expires 24 hours after publishing.\n');
}

main().catch((err) => {
  process.stderr.write(`${err.message || err}\n`);
  process.exit(1);
});
