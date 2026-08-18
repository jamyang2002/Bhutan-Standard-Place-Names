const CACHE = "bhutan-place-names-v5";
const SCOPE_PATH = new URL(self.registration.scope).pathname.replace(/\/$/, "");
const scoped = (path) => `${SCOPE_PATH}${path}`;
const ASSETS = [
  scoped("/"),
  scoped("/index.html"),
  scoped("/src/app.js"),
  scoped("/src/styles.css"),
  scoped("/logo.png"),
  scoped("/Font/Joyig.ttf"),
  scoped("/Font/DDC_Uchen.ttf"),
  scoped("/public/manifest.webmanifest"),
  scoped("/public/icons/icon.svg"),
  scoped("/public/data/places.json"),
  scoped("/public/data/hierarchy.json"),
  scoped("/public/data/config.json"),
  scoped("/public/data/data-validation-report.json")
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(scoped("/index.html"))))
  );
});
