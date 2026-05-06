// Aumentamos a versão para forçar o navegador a descartar o cache antigo
const CACHE_NAME = 'anime-backlog-v4'; 
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './logo.png'  
];

// Instalação: guarda a interface base em cache e força a ativação imediata
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
});

// Ativação: limpa caches antigos (ex: v3, v2) e assume o controle de todas as abas abertas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

// Intercepta requisições usando a estratégia NETWORK FIRST (Rede Primeiro)
self.addEventListener('fetch', event => {
  // Ignora chamadas de API (Jikan e GitHub) para não dar conflito com seus dados
  if (event.request.url.includes('api.github.com') || event.request.url.includes('api.jikan.moe')) {
    return;
  }

  // Responde com a Rede primeiro. Se falhar (offline), usa o Cache.
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Se deu certo baixar da rede, atualiza o cache silenciosamente com a versão mais nova do código
        const resClone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
        return response;
      })
      .catch(() => {
        // Se a internet caiu ou o GitHub Pages falhou, puxa a tela salva do cache
        return caches.match(event.request);
      })
  );
});

// Comunicação com o index.html para pular a espera se necessário
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});