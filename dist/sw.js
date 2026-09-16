const CACHE_NAME = "cantaweb-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./songs/manifest.json",
  "./songs/lyrics/pulso-solar.lrc",
  "./songs/lyrics/ruta-neon.lrc",
  "./songs/lyrics/cabina-azul.lrc",
  "./songs/pulso-solar.wav",
  "./songs/ruta-neon.wav",
  "./songs/cabina-azul.wav",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
