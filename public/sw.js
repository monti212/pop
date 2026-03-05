const CACHE_VERSION = 'v1.0.1';
const CACHE_NAME = `uhuru-ai-${CACHE_VERSION}`;

const STATIC_CACHE = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`;
const API_CACHE = `${CACHE_NAME}-api`;

// Maximum entries per cache to prevent unbounded growth on Android
const MAX_STATIC_ENTRIES = 100;
const MAX_DYNAMIC_ENTRIES = 50;
const MAX_API_ENTRIES = 30;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

const API_CACHE_DURATION = 1000 * 60 * 30;

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Skip waiting');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name.startsWith('uhuru-ai-') && name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== API_CACHE;
            })
            .map((name) => {
              console.log('[Service Worker] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[Service Worker] Claiming clients');
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (url.origin === location.origin) {
    if (request.url.includes('/assets/')) {
      event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    }
    else if (request.url.match(/\.(js|css|png|jpg|jpeg|svg|gif|woff|woff2|ttf|eot)$/)) {
      event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    }
    else if (request.url.includes('/index.html') || request.url === url.origin + '/') {
      event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE));
    }
    else {
      event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE));
    }
  }
  else if (url.hostname.includes('supabase.co') || url.pathname.includes('/functions/')) {
    event.respondWith(networkFirstWithCacheStrategy(request, API_CACHE));
  }
  else if (url.hostname.includes('openai.com') || url.hostname.includes('anthropic.com')) {
    event.respondWith(fetch(request));
  }
  else {
    event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE));
  }
});

async function cacheFirstStrategy(request, cacheName) {
  try {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      trimCache(cacheName, MAX_STATIC_ENTRIES);
    }

    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Cache-first strategy failed:', error);

    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response('Offline - Resource not available', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain',
      }),
    });
  }
}

async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      trimCache(cacheName, MAX_DYNAMIC_ENTRIES);
    }

    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Network first failed, trying cache:', error.message);

    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    if (request.destination === 'document') {
      const fallbackResponse = await caches.match('/index.html');
      if (fallbackResponse) {
        return fallbackResponse;
      }
    }

    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain',
      }),
    });
  }
}

async function networkFirstWithCacheStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request.clone());

    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);

      // Clone the response and store it with a timestamp header instead of
      // re-serializing the body (avoids heavy JSON parse on Android)
      const headers = new Headers(networkResponse.headers);
      headers.set('x-sw-cached-at', String(Date.now()));
      const body = await networkResponse.clone().arrayBuffer();
      cache.put(request, new Response(body, {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers
      }));
      trimCache(cacheName, MAX_API_ENTRIES);
    }

    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] API call failed, checking cache:', error.message);

    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      const cachedAt = Number(cachedResponse.headers.get('x-sw-cached-at') || 0);
      const age = Date.now() - cachedAt;

      if (age < API_CACHE_DURATION) {
        console.log('[Service Worker] Serving cached API response');
        return cachedResponse;
      } else {
        console.log('[Service Worker] Cached API response expired');
      }
    }

    return new Response(JSON.stringify({
      error: 'Offline - No cached data available',
      offline: true
    }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    });
  }
}

// Trim cache to a maximum number of entries (FIFO eviction)
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    // Delete oldest entries (first in the list)
    const excess = keys.length - maxEntries;
    for (let i = 0; i < excess; i++) {
      await cache.delete(keys[i]);
    }
  }
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            return caches.delete(cacheName);
          })
        );
      })
    );
  }
});
