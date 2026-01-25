const CACHE_NAME = 'cricket-scorer-v1';
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
  '/ui/ScorecardUI.js'
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

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached response if found
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Add to cache
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // Return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
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
