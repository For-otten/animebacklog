// ── Anime Backlog Service Worker ──
// Incrementar a versão força o navegador a descartar o cache antigo e instalar o novo imediatamente.
const CACHE_NAME = 'anime-backlog-v5';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './logo.png'
];

// ── INSTALL: faz cache dos assets e pula a fila de espera imediatamente ──
self.addEventListener('install', event => {
  // skipWaiting() aqui garante que o novo SW não fica esperando
  // as abas antigas fecharem – ele assume controle ao instalar.
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // addAll() falha se qualquer asset não for baixado.
      // Usamos um loop com catch individual para ser resiliente.
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url =>
          cache.add(url).catch(err => console.warn(`[SW] Falha ao cachear ${url}:`, err))
        )
      );
    })
  );
});

// ── ACTIVATE: remove caches antigos e assume controle de TODAS as abas ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deletando cache antigo:', key);
            return caches.delete(key);
          })
      )
    ).then(() => {
      // clients.claim() faz o novo SW assumir o controle das abas abertas
      // sem precisar que o usuário feche e reabra o app.
      return self.clients.claim();
    })
  );
});

// ── FETCH: estratégia Network First com fallback para Cache ──
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Ignora chamadas de API externas – nunca interceptar GitHub ou Jikan
  // pois elas precisam de rede real e não fazem sentido em cache.
  if (
    url.includes('api.github.com') ||
    url.includes('api.jikan.moe') ||
    url.includes('fonts.googleapis.com') ||
    url.includes('fonts.gstatic.com') ||
    // Ignora requisições que não são GET (POST, PATCH etc.)
    event.request.method !== 'GET'
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Requisição bem-sucedida: atualiza o cache com a versão mais nova
        // de forma silenciosa (sem bloquear a resposta ao usuário).
        if (networkResponse && networkResponse.status === 200) {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        }
        return networkResponse;
      })
      .catch(() => {
        // Sem rede: entrega o que tiver em cache.
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Fallback final: retorna index.html para rotas desconhecidas (SPA behavior).
          return caches.match('./index.html');
        });
      })
  );
});

// ── MENSAGENS: comunicação com o index.html ──
self.addEventListener('message', event => {
  // O index.html envia SKIP_WAITING quando detecta um novo SW disponível.
  // Isso permite forçar a atualização sem esperar o usuário fechar o app.
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});