/* Service worker : fonctionnement hors ligne */
const CACHE = "devis-btp-v6";
const PAGES = ["/", "/catalogue", "/historique", "/parametres", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png",
  "/images/hero.jpg", "/images/banner-doc.jpg", "/images/masonry-strip.jpg", "/images/tiling-strip.jpg", "/images/rebar-strip.jpg", "/images/wood-strip.jpg",
  "/images/masonry-sm.jpg", "/images/tiling-sm.jpg", "/images/rebar-sm.jpg", "/images/wood-sm.jpg", "/images/tiles.jpg", "/images/site.jpg", "/images/wood.jpg",
  "/images/banner-chantier.jpg", "/templates/prestige.jpg", "/templates/classique.jpg", "/templates/moderne.jpg", "/templates/chantier.jpg",
  "/pdfjs/pdf.min.mjs", "/pdfjs/pdf.worker.min.mjs"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => Promise.all(PAGES.map((u) => c.add(u).catch(() => null)))).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

// La page envoie la liste des fichiers déjà chargés pour les mettre en cache
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "CACHE_URLS" && Array.isArray(data.urls)) {
    caches.open(CACHE).then((c) =>
      Promise.all(
        data.urls
          .filter((u) => typeof u === "string" && u.startsWith(self.location.origin) && !u.includes("/api/"))
          .map((u) => c.match(u).then((hit) => hit || c.add(u).catch(() => null))),
      ),
    );
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // Pages : réseau d'abord, cache si hors ligne
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(url.pathname, copy));
          return res;
        })
        .catch(() => caches.match(url.pathname).then((r) => r || caches.match("/"))),
    );
    return;
  }

  // Fichiers statiques : cache d'abord
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && (url.pathname.startsWith("/_next/") || /\.(png|jpg|svg|ico|webmanifest|woff2?|css|js|mjs)$/.test(url.pathname))) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
