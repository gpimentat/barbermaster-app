const CACHE_NAME = 'barbermaster-v15';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json'
];

// Install
self.addEventListener('install', (event) => {
    console.log('SW: Instalando v15...');
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
});

// Fetch - Estratégia: Network First para evitar arquivos zumbis (MIME Error)
self.addEventListener('fetch', (event) => {
    // FORÇAR REDE para HTML e Manifest para garantir atualização
    if (event.request.mode === 'navigate' ||
        event.request.url.includes('index.html') ||
        event.request.url.includes('manifest.json')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Para outros recursos, Cache Primeiro (com fallback para rede)
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});

// Activate
self.addEventListener('activate', (event) => {
    console.log('SW: Ativando v15 e limpando caches antigos...');
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('SW: Deletando cache antigo:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
        ])
    );
});

// Push Notifications Listener
self.addEventListener('push', (event) => {
    let data = { title: 'BarberMaster', body: 'Nova notificação!', icon: '/icon-192-v15.png' };

    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon || '/icon-192-v15.png',
        badge: '/icon-192-v15.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/'
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification Click Listener
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
