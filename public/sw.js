const IMAGE_CACHE_NAME = 'matum-images-v1';
const STATIC_CACHE_NAME = 'matum-static-v1';
const VALID_CACHES = new Set([IMAGE_CACHE_NAME, STATIC_CACHE_NAME]);

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => (!VALID_CACHES.has(key) ? caches.delete(key) : Promise.resolve()))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isCacheableImageRequest(request) {
  if (request.method !== 'GET') return false;
  const url = request.url || '';
  if (request.destination === 'image') return true;
  if (url.includes('/storage/v1/object/public/')) return true;
  if (/\.(jpe?g|png|webp|gif|svg|avif)(\?.*)?$/i.test(url)) return true;
  return false;
}

function isCacheableStaticRequest(request) {
  if (request.method !== 'GET') return false;
  const url = request.url || '';
  if (/\/assets\/[^/]+\.(js|css)(\?.*)?$/i.test(url)) return true;
  if (url.startsWith('https://fonts.gstatic.com/')) return true;
  return false;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (isCacheableStaticRequest(request)) {
    event.respondWith(
      caches.open(STATIC_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        const networkResponse = await fetch(request);
        if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
          cache.put(request, networkResponse.clone()).catch(() => {});
        }
        return networkResponse;
      })
    );
    return;
  }

  if (!isCacheableImageRequest(request)) return;

  event.respondWith(
    caches.open(IMAGE_CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(request, { ignoreVary: true });
      if (cachedResponse) {
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
