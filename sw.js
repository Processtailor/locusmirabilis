/*
 * Locus Mirabilis — service worker.
 *
 * Versioned, conservative caching so the telescreen keeps working offline:
 *  - navigations: network first, fall back to the cached shell;
 *  - same-origin assets: cache first (they are versioned by ?v=BUILD in the
 *    HTML, so a new deploy never serves a stale script against a new page).
 * The BUILD placeholder is stamped by scripts/build.js at deploy time.
 */
'use strict';

const VERSION = '__BUILD__';
const CACHE = `locus-mirabilis-${VERSION}`;
const SHELL = [
  './',
  './index.html',
  './404.html',
  './manifest.webmanifest',
  `./assets/css/styles.css?v=${VERSION}`,
  `./assets/js/i18n.js?v=${VERSION}`,
  `./assets/js/audio.js?v=${VERSION}`,
  `./assets/js/app.js?v=${VERSION}`,
  './assets/fonts/VT323-latin.woff2',
  './assets/fonts/VT323-latin-ext.woff2',
  './assets/fonts/Orbitron-latin.woff2',
  './assets/img/favicon.svg',
  './assets/img/icon-192.png',
  './assets/img/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match('./index.html')))
        .then((response) => response || new Response('TELEKRAN ÇEVRİMDIŞI. / TELESCREEN OFFLINE.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        }))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      });
    })
  );
});
