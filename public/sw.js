const IMAGE_CACHE_NAME = 'matum-images-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function isCacheableImageRequest(request) {
  if (request.method !== 'GET') return false;
  const url = request.url || '';
  if (request.destination === 'image') return true;
  if (url.includes('/storage/v1/object/public/')) return true;
  if (/\.(jpe?g|png|webp|gif|svg|avif)(\?.*)?$/i.test(url)) return true;
  return false;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!isCacheableImageRequest(request)) return;

  event.respondWith(
    caches.open(IMAGE_CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(request, { ignoreVary: true });
      if (cachedResponse) {
        // Revalidar en segundo plano si hay conexión
        if (navigator.onLine) {
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
                cache.put(request, networkResponse.clone()).catch(() => {});
              }
            })
            .catch(() => {});
        }
        return cachedResponse;
      }

      try {
        const networkResponse = await fetch(request);
        if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
          cache.put(request, networkResponse.clone()).catch(() => {});
        }
        return networkResponse;
      } catch (err) {
        // Intentar match sin query params como último recurso
        const fallback = await cache.match(request.url.split('?')[0], { ignoreSearch: true });
        if (fallback) return fallback;
        throw err;
      }
    })
  );
});
