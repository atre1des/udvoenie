const cacheName = 'udvoenie-shell-v1';
const shell = ['./', './app.js', './style.css', './manifest.webmanifest', './icon.png', './icon-192.png'];
const shellURLs = new Set(shell.map(path => new URL(path, self.registration.scope).href));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(shell)));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('udvoenie-shell-') && key !== cacheName)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate' && event.request.url.startsWith(self.registration.scope)) {
    event.respondWith(fetch(event.request).catch(() => caches.match(new URL('./', self.registration.scope))));
  } else if (shellURLs.has(event.request.url)) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
  }
});
