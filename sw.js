// Mudei para v3 para forçar os celulares a baixarem o novo visual do app!
const CACHE_NAME = 'anime-backlog-v3'; 
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './logo.png'  
];

// Instalação: guarda a interface em cache
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
});

// Ativação: limpa caches antigos se houver atualização
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
});

// Intercepta requisições
self.addEventListener('fetch', event => {
  // Ignora chamadas de API (Jikan e GitHub) para não dar conflito
  if (event.request.url.includes('api.github.com') || event.request.url.includes('api.jikan.moe')) {
    return;
  }

  // Responde com o cache, se falhar tenta a rede
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});