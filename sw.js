const CACHE_NAME = 'manager-os-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './pharm.html',
    './training.html',
    './nutrition.html',
    './assets/style.css',
    './assets/training.css', /* Твій новий файл стилів */
    './assets/js/common.js',
    './assets/js/utils.js',
    './assets/js/nutrition.js',
    './assets/js/pharm.js',
    './assets/js/training.js',
    './icon.png',
    './manifest.json'
];
// Кешування під час встановлення
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Робота офлайн (Network First, then Cache)
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});
