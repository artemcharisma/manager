const CACHE_NAME = 'manager-os-net-first';

self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // Є інтернет? Беремо свіже і оновлюємо кеш
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return networkResponse;
            })
            .catch(() => {
                // Немає інтернету? Віддаємо старе
                return caches.match(event.request);
            })
    );
});
