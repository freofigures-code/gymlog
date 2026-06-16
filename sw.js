// ─── MUDE ESTE NÚMERO A CADA ATUALIZAÇÃO DO APP ───────────────────────────
const VERSION = '4';
// ───────────────────────────────────────────────────────────────────────────
const CACHE = 'gymlog-v' + VERSION;
const ASSETS = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

// INSTALL: abre o novo cache e já assume o controle sem esperar
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      return c.addAll(ASSETS);
    })
  );
  // Não espera o app fechar — ativa imediatamente
  self.skipWaiting();
});

// ACTIVATE: apaga TODOS os caches antigos e assume controle das abas abertas
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(k) { return k !== CACHE; })
          .map(function(k) {
            console.log('[SW] Deletando cache antigo:', k);
            return caches.delete(k);
          })
      );
    }).then(function() {
      // Assume controle de todas as abas abertas imediatamente
      return self.clients.claim();
    })
  );
});

// FETCH: index.html sempre vem da rede (garante atualização)
// Demais assets: cache primeiro, fallback para rede
self.addEventListener('fetch', function(e) {
  // NUNCA cacheia POST ou requisições para a API
  if (e.request.method !== 'GET') return;
  if (e.request.url.indexOf('easypanel.host') !== -1) return;
  if (e.request.url.indexOf('api.anthropic.com') !== -1) return;
  if (e.request.url.indexOf('supabase.co') !== -1) return;

  var url = new URL(e.request.url);

  // HTML sempre da rede primeiro (garante pegar a versão mais recente)
  if (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(e.request)
        .then(function(networkResponse) {
          var clone = networkResponse.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
          return networkResponse;
        })
        .catch(function() {
          // Sem internet: serve do cache
          return caches.match(e.request);
        })
    );
    return;
  }

  // Demais assets: cache primeiro, fallback para rede
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(networkResponse) {
        var clone = networkResponse.clone();
        caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        return networkResponse;
      });
    })
  );
});
