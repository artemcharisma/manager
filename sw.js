const CACHE_NAME = 'manager-os-v2'; // Я изменил версию на v2
const ASSETS = [
    '/',
    '/index.html',
    '/pharm.html',
    '/training.html',
    '/nutrition.html',
    '/common.css',
    '/common.js',
    '/chart.min.js',
    '/icon.png',
    '/manifest.json'
];

// 1. Установка и кеширование статики
self.addEventListener('install', e => {
    self.skipWaiting(); // Заставляет новый SW активироваться немедленно
    e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

// 2. Активация и удаление старых кешей (чтобы не забивать память)
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => {
                if (key !== CACHE_NAME) return caches.delete(key);
            })
        )).then(() => self.clients.claim())
    );
});

// 3. Стратегия запросов
self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);
    const isHTML = e.request.headers.get('accept').includes('text/html');

    // Стратегия для HTML: Сначала Сеть, потом Кеш (Network First)
    // Это гарантирует, что ты всегда видишь свежие правки, если есть интернет
    if (isHTML) {
        e.respondWith(
            fetch(e.request)
                .then(res => {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                    return res;
                })
                .catch(() => caches.match(e.request))
        );
        return;
    }

    // Стратегия для остального (CSS, JS, Images): Сначала Кеш, потом Сеть (Cache First)
    e.respondWith(
        caches.match(e.request).then(response => response || fetch(e.request))
    );
});
