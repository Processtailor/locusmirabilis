#!/usr/bin/env node
/*
 * Zero-dependency static server for local development and tests.
 *   node scripts/serve.js [--port 4173] [--root .]
 * Serves the given root, strips query strings (the ?v=BUILD cache busters),
 * maps "/" to index.html and unknown paths to 404.html with a 404 status.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

function createServer(root) {
  const absRoot = path.resolve(root);
  return http.createServer((req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      res.writeHead(400);
      res.end('Bad request');
      return;
    }
    if (pathname.endsWith('/')) pathname += 'index.html';
    const filePath = path.normalize(path.join(absRoot, pathname));
    if (!filePath.startsWith(absRoot)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    fs.stat(filePath, (err, stat) => {
      if (!err && stat.isDirectory()) {
        res.writeHead(301, { Location: pathname + '/' });
        res.end();
        return;
      }
      if (err || !stat.isFile()) {
        const notFound = path.join(absRoot, '404.html');
        fs.readFile(notFound, (err404, body) => {
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(err404 ? '404' : body);
        });
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': 'no-store'
      });
      fs.createReadStream(filePath).pipe(res);
    });
  });
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const read = (flag, fallback) => {
    const i = args.indexOf(flag);
    return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
  };
  const port = Number(process.env.PORT || read('--port', 4173));
  const root = read('--root', path.join(__dirname, '..'));
  createServer(root).listen(port, '127.0.0.1', () => {
    process.stdout.write(`Locus Mirabilis telescreen: http://127.0.0.1:${port}/  (root: ${path.resolve(root)})\n`);
  });
}

module.exports = { createServer };
