const CACHE_NAME = "bloodline-cache-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only cache GET requests to avoid crashing on POST/PUT
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        // Cache the newly retrieved asset
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Offline fallback
        return caches.match("/");
      });
    })
  );
});

// Real-time Push Notification Listener
self.addEventListener("push", (event) => {
  let title = "Bloodline Alert";
  let body = "New blood request matched nearby. Tap to view details.";
  
  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      body = data.body || body;
    } catch {
      body = event.data.text() || body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: "https://images.unsplash.com/photo-584515979956-d9f6e5d09982?w=192&h=192&fit=crop",
      badge: "https://images.unsplash.com/photo-584515979956-d9f6e5d09982?w=96&h=96&fit=crop",
      tag: "blood-emergency",
      vibrate: [200, 100, 200]
    })
  );
});
