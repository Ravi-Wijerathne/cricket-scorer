const CACHE_NAME = 'cricket-scorer-v5';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/models/Match.js',
  '/models/Team.js',
  '/models/Player.js',
  '/models/Innings.js',
  '/models/Over.js',
  '/models/BallEvent.js',
  '/engines/ScoringEngine.js',
  '/engines/StatsEngine.js',
  '/engines/RulesEngine.js',
  '/services/StorageService.js',
  '/services/UndoService.js',
  '/ui/MatchSetup.js',
  '/ui/ScoringUI.js',
  '/ui/ScorecardUI.js',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first with cache fallback
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// Background sync for match data
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-match-data') {
    event.waitUntil(syncMatchData());
  }
});

async function syncMatchData() {
  // Placeholder for future cloud sync functionality
  console.log('[ServiceWorker] Syncing match data...');
}
