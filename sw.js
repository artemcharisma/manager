const CACHE_NAME = 'manager-os-v2'; // КОЛИ РОБИТЕ ЗМІНИ В КОДІ - МІНЯЙТЕ ВЕРСІЮ (v3, v4 і т.д.)
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './pharm.html',
    './training.html',
    './nutrition.html',
    './assets/style.css',
    './assets/training.css',
    './assets/js/common.js',
    './assets/js/utils.js',
    './assets/js/nutrition.js',
    './assets/js/pharm.js',
    './assets/js/training.js',
    './icon.png',
    './manifest.json'
];

// 1. ВСТАНОВЛЕННЯ ТА КЕШУВАННЯ
self.addEventListener('install', event => {
    self.skipWaiting(); // Змушує Service Worker активуватися миттєво
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// 2. ОЧИЩЕННЯ СТАРОГО КЕШУ (ВАЖЛИВО!)
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    // Якщо ім'я кешу не збігається з поточною версією - видаляємо його
                    if (cache !== CACHE_NAME) {
                        console.log('Видалено старий кеш:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Миттєво бере контроль над відкритими вкладками
    );
});

// 3. РОБОТА ОФЛАЙН (Network First, then Cache)
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});
