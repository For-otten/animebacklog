// ── Anime Backlog Service Worker ──
// v6: HTML nunca entra no cache — garante que mudanças no index.html chegam imediatamente.
const CACHE_NAME = 'anime-backlog-v6';

// Só assets verdadeiramente estáticos ficam em cache (sem HTML!)
const ASSETS_TO_CACHE = [
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

  // Nunca interceptar APIs externas ou métodos não-GET
  if (
    url.includes('api.github.com') ||
    url.includes('api.jikan.moe') ||
    url.includes('fonts.googleapis.com') ||
    url.includes('fonts.gstatic.com') ||
    event.request.method !== 'GET'
  ) return;

  // ── NAVEGAÇÃO (HTML): sempre busca da rede, sem cache ──
  // Isso garante que mudanças no index.html chegam IMEDIATAMENTE,
  // sem precisar de Ctrl+Shift+R. Offline: cai no cache se existir.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() =>
        caches.match('./index.html').then(cached =>
          cached || new Response('Offline', { status: 503 })
        )
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