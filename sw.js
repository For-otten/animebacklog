// ── Anime Backlog Service Worker ──
// v6: HTML sempre buscado da rede quando online (cache: no-store bypassa HTTP cache),
//     mas salvo no SW cache para funcionar offline normalmente.
const CACHE_NAME = 'anime-backlog-v6';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './logo.png'
];

// ── INSTALL ──
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(
        ASSETS_TO_CACHE.map(url =>
          cache.add(url).catch(err => console.warn(`[SW] Falha ao cachear ${url}:`, err))
        )
      )
    )
  );
});

// ── ACTIVATE ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => {
          console.log('[SW] Deletando cache antigo:', key);
          return caches.delete(key);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH ──
self.addEventListener('fetch', event => {
  const url = event.request.url;

  if (
    url.includes('api.github.com') ||
    url.includes('api.jikan.moe') ||
    url.includes('fonts.googleapis.com') ||
    url.includes('fonts.gstatic.com') ||
    event.request.method !== 'GET'
  ) return;

  // ── NAVEGAÇÃO (HTML): Network First com cache: no-store ──
  // cache: 'no-store' força o browser a ignorar o HTTP cache nativo
  // e sempre buscar da rede — garante que mudanças no index.html chegam
  // imediatamente sem Ctrl+Shift+R.
  // Se a rede falhar (offline), serve o index.html do SW cache normalmente.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(networkResponse => {
          // Online: atualiza o SW cache com a versão mais nova
          if (networkResponse && networkResponse.status === 200) {
            const cloned = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
          }
          return networkResponse;
        })
        .catch(() =>
          // Offline: serve do SW cache
          caches.match(event.request)
            .then(cached => cached || caches.match('./index.html'))
        )
    );
    return;
  }

  // ── OUTROS ASSETS: Network First com fallback para cache ──
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        }
        return networkResponse;
      })
      .catch(() =>
        caches.match(event.request).then(cached => cached || caches.match('./index.html'))
      )
  );
});

// ── MENSAGENS ──
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});