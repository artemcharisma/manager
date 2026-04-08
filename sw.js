const CACHE_NAME = 'manager-os-v3'; // БАМПНУЛИ ВЕРСІЮ
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

// 2. ОЧИЩЕННЯ СТАРОГО КЕШУ
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('Видалено старий кеш:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Миттєво бере контроль над відкритими вкладками
    );
});

// Допоміжна функція для таймауту (щоб не чекати вічно на поганому 3G)
const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms));

// 3. РОЗУМНА МАРШРУТИЗАЦІЯ ЗАПИТІВ
self.addEventListener('fetch', event => {
    const req = event.request;
    const url = new URL(req.url);

    // Ігноруємо не-GET запити та запити на інші домени
    if (req.method !== 'GET' || !url.origin.includes(location.origin)) return;

    // СТРАТЕГІЯ 1: HTML сторінки -> Network First with Timeout (3 секунди)
    if (req.headers.get('accept').includes('text/html') || url.pathname.endsWith('.html') || url.pathname === '/') {
        event.respondWith(
            Promise.race([fetch(req), timeout(3000)])
                .then(networkRes => {
                    // Мережа відповіла швидко: оновлюємо кеш і віддаємо сторінку
                    const clone = networkRes.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
                    return networkRes;
                })
                .catch(() => {
                    // Таймаут або немає інтернету: миттєво віддаємо з кешу
                    return caches.match(req);
                })
        );
    } 
    // СТРАТЕГІЯ 2: Скрипти, Стилі, Картинки -> Stale-While-Revalidate
    else {
        event.respondWith(
            caches.match(req).then(cachedRes => {
                // Завжди робимо фоновий запит для оновлення кешу
                const fetchPromise = fetch(req).then(networkRes => {
                    caches.open(CACHE_NAME).then(cache => cache.put(req, networkRes.clone()));
                    return networkRes;
                }).catch(() => { 
                    // Ігноруємо помилки мережі у фоні (ми ж в офлайні)
                });
                
                // Якщо файл є в кеші - віддаємо його МИТТЄВО (UI завантажується за 0.01с)
                // Якщо файлу в кеші ще немає - чекаємо на мережу
                return cachedRes || fetchPromise;
            })
        );
    }
});
