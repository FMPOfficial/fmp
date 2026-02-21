/* ========= Flame Mod Paradise – service-worker.js (v3) ========= */

const PRECACHE     = "fmp-precache-v2";   // ← bump when deploying new JS/CSS/HTML
const RUNTIME_IMG  = "fmp-img-v1";
const RUNTIME_JSON = "fmp-json-v1";

const urlsToCache = [
  "/", "/index.html", "/style.css",
  "/storage.js", "/script.js", "/layout.js",
  "/manifest.json",
  "/assets/placeholder.jpg",
  "/assets/icons/icon-192.png", "/assets/icons/icon-512.png",
  "/data/tools.json", "/data/bots.json", "/data/checkers.json",
  "/data/game.json", "/data/others.json", "/data/cookies.json",
  "/data/methods.json", "/data/membership.json"
];

/* ---------- INSTALL (pre-cache shell) ---------- */
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(PRECACHE).then((c) => c.addAll(urlsToCache))
  );
  self.skipWaiting();   // activate new SW immediately
});

/* ---------- ACTIVATE (clean old caches) ---------- */
self.addEventListener("activate", (e) => {
  const keep = [PRECACHE, RUNTIME_IMG, RUNTIME_JSON];
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();   // take control of all open tabs immediately
});

/* ---------- FETCH ---------- */
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  if (req.method !== "GET") return;

  /* 1 — IMAGES: cache-first */
  if (/\.(png|jpe?g|webp|gif|svg)$/i.test(url.pathname)) {
    e.respondWith(
      caches.open(RUNTIME_IMG).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        const fresh = await fetch(req);
        cache.put(req, fresh.clone());
        return fresh;
      })
    );
    return;
  }

  /* 2 — JSON data: network-first (fresh data, offline fallback) */
  if (url.pathname.endsWith(".json")) {
    e.respondWith(
      fetch(req)
        .then((resp) => {
          const clone = resp.clone();
          caches.open(RUNTIME_JSON).then((cache) => cache.put(req, clone));
          return resp;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  /* 3 — HTML/JS/CSS: network-first (ensures new deploys land fast) */
  if (/\.(html|js|css)$/i.test(url.pathname) || url.pathname === "/" || url.pathname.endsWith("/")) {
    e.respondWith(
      fetch(req)
        .then((resp) => {
          const clone = resp.clone();
          caches.open(PRECACHE).then((cache) => cache.put(req, clone));
          return resp;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  /* 4 — Everything else: network with cache fallback */
  e.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});