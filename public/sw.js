const CACHE_NAME = "tahara-guide-v1";
const APP_SHELL = [
  "./",
  "./manifest.webmanifest",
  "./pwa/icon.svg",
  "./pwa/icon-192.png",
  "./pwa/icon-512.png",
  "./pwa/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const requests = APP_SHELL.map((path) => new Request(new URL(path, self.location.href).toString(), { cache: "reload" }));
      return cache.addAll(requests);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return cache.match(new URL("./", self.location.href).toString());
      }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        if (!response.ok || response.type === "opaque") {
          return response;
        }

        const clonedResponse = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clonedResponse));
        return response;
      });
    }),
  );
});
