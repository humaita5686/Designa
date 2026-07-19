const CACHE_NAME = 'designa-v2.8';
const urlsToCache = [
    './',
    'index.html',
    'manifest.json',
    '1000322334.png'
];

// Instalar o Service Worker e fazer cache dos arquivos
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache).catch(() => {
                    console.log('Alguns arquivos não puderam ser cacheados');
                });
            })
    );
    self.skipWaiting();
});

// Ativar o Service Worker e limpar cache antigo
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Estratégia: tenta rede primeiro, fallback para cache; para navegations retorna index.html do cache
self.addEventListener('fetch', event => {
    // Ignora requisições que não são GET
    if (event.request.method !== 'GET') {
        return;
    }

    // Para requisições de navegação (SPA routes), atende com index.html do cache quando offline
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    if (!response || response.status !== 200 || response.type === 'error') {
                        return response;
                    }

                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                })
                .catch(() => {
                    return caches.match('index.html').then(resp => resp || new Response('Offline - conteúdo não disponível', {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: new Headers({ 'Content-Type': 'text/plain' })
                    }));
                })
        );
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Se a requisição foi bem-sucedida, atualiza o cache
                if (!response || response.status !== 200 || response.type === 'error') {
                    return response;
                }

                const responseToCache = response.clone();
                caches.open(CACHE_NAME)
                    .then(cache => {
                        cache.put(event.request, responseToCache);
                    });

                return response;
            })
            .catch(() => {
                // Se a rede falhar, tenta o cache
                return caches.match(event.request)
                    .then(response => {
                        return response || new Response('Offline - conteúdo não disponível', {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: new Headers({
                                'Content-Type': 'text/plain'
                            })
                        });
                    });
            })
    );
});
