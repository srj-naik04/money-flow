// MoneyFlow service worker — app-shell caching with an offline fallback.
// Data is NOT cached here (TanStack Query persists to IndexedDB); /api/* is network-only.

const CACHE = "moneyflow-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([OFFLINE_URL, "/icon.svg"])),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Never cache the data API — TanStack Query owns that layer.
  if (url.pathname.startsWith("/api/")) return;

  // Navigations: network-first, cache the result, fall back to cache/offline page.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const cache = await caches.open(CACHE);
          cache.put(req, res.clone());
          return res;
        } catch {
          const cache = await caches.open(CACHE);
          return (
            (await cache.match(req)) ||
            (await cache.match(OFFLINE_URL)) ||
            new Response("Offline", { status: 503, statusText: "Offline" })
          );
        }
      })(),
    );
    return;
  }

  // Static assets / icons: stale-while-revalidate.
  if (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icon")) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});
