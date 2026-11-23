const IMAGE_CACHE_NAME = 'matum-images-v2';
const STATIC_CACHE_NAME = 'matum-static-v2';
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
  if (url.startsWith('https://fonts.gstatic.com/')) return true;
  try {
    const parsedUrl = new URL(url);
    if (
      parsedUrl.origin === self.location.origin &&
      /^\/assets\/[^/]+\.(js|css)$/i.test(parsedUrl.pathname)
    ) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

function isValidStaticResponse(request, response) {
  if (!response) return false;
  const url = request.url || '';
  const contentType = (response.headers.get('content-type') || '').toLowerCase();

  if (url.startsWith('https://fonts.gstatic.com/')) {
    return response.type === 'opaque' || (response.ok && !contentType.includes('text/html'));
  }

  if (!response.ok || contentType.includes('text/html')) {
    return false;
  }

  let pathname = url;
  try {
    pathname = new URL(url).pathname;
  } catch {
    pathname = url.split('?')[0];
  }

  if (/\.js$/i.test(pathname)) {
    return /(javascript|ecmascript)/i.test(contentType);
  }

  if (/\.css$/i.test(pathname)) {
    return contentType.includes('text/css');
  }

  return false;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (isCacheableStaticRequest(request)) {
    event.respondWith(
      caches.open(STATIC_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          if (isValidStaticResponse(request, cachedResponse)) {
            return cachedResponse;
          }
          await cache.delete(request).catch(() => {});
        }
        const networkResponse = await fetch(request);
        if (isValidStaticResponse(request, networkResponse)) {
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
      const isCorsRequest = request.mode === 'cors';
      const cachedResponse = await cache.match(request, { ignoreVary: true });
      if (cachedResponse && (!isCorsRequest || cachedResponse.type !== 'opaque')) {
        return cachedResponse;
      }

      try {
        const networkResponse = await fetch(request);
        if (
          networkResponse &&
          (networkResponse.ok || (!isCorsRequest && networkResponse.type === 'opaque'))
        ) {
          cache.put(request, networkResponse.clone()).catch(() => {});
        }
        return networkResponse;
      } catch (err) {
        // Intentar match sin query params como último recurso
        const fallback = await cache.match(request.url.split('?')[0], { ignoreSearch: true });
        if (fallback && (!isCorsRequest || fallback.type !== 'opaque')) return fallback;
        throw err;
      }
    })
  );
});
