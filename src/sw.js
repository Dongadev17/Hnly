/* ============================================================
 * Hnly service worker — app-shell + CDN asset caching for offline.
 * Data endpoints (HN Firebase, Algolia, Algeria WP API, analytics)
 * are network-only: they fail cleanly offline and the app falls
 * back to its own localStorage snapshots. This file must ship
 * verbatim (unminified) in the Corex build.
 * ============================================================ */

const VERSION = "1.0.5";

// App shell — same-origin files that make the UI render.
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./version.json",
  "./assets/logo.png",
];

// Cross-origin assets needed to run the page at all. Stale-while-revalidate.
const RUNTIME_ASSETS = [
  "https://zap.fihelay497.workers.dev/js",
  "https://zap.fihelay497.workers.dev/css",
  "https://cdn.tailwindcss.com/3.4.17",
  "https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap",
  "https://cdn.jsdelivr.net/npm/@mdi/font@7.4.47/css/materialdesignicons.min.css",
];

const CACHE_PREFIX = "hnly-v";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_PREFIX + VERSION)
      .then((cache) =>
        Promise.all([
          cache.addAll(APP_SHELL),
          Promise.allSettled(RUNTIME_ASSETS.map((url) => cache.add(url))),
        ]),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_PREFIX + VERSION)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Network-only origins (data / analytics): let them fail cleanly.
  const networkOnlyHosts = [
    "hacker-news.firebaseio.com",
    "hn.algolia.com",
    "cloud.umami.is",
    "scripts.simpleanalyticscdn.com",
    "queue.simpleanalyticscdn.com",
    "hnly.netlify.app",
  ];
  if (networkOnlyHosts.some((host) => url.hostname === host)) return;

  // Cross-origin CDN assets: stale-while-revalidate.
  const isCacheableCrossOrigin =
    url.origin !== self.location.origin &&
    (url.hostname === "zap.fihelay497.workers.dev" ||
      url.hostname === "cdn.tailwindcss.com" ||
      url.hostname === "fonts.googleapis.com" ||
      url.hostname === "fonts.gstatic.com" ||
      url.hostname === "cdn.jsdelivr.net" ||
      url.hostname === "algeriatech.news");

  // Same-origin shell: network-first for fresh HTML, cache fallback offline.
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_PREFIX + VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((hit) => hit || caches.match("./")),
        ),
    );
    return;
  }

  if (!isCacheableCrossOrigin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_PREFIX + VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
