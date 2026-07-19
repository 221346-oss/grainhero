// GrainHero Service Worker
// Handles push notifications, offline caching, and background sync

const CACHE_NAME = 'grainhero-v1';
const urlsToCache = [
  '/',
  '/offline'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache opened');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('[SW] Cache installation failed:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }
          // Clone and cache successful responses
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        });
      })
      .catch(() => {
        // Return offline page if available
        return caches.match('/offline');
      })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');

  if (!event.data) {
    console.warn('[SW] No data in push event');
    return;
  }

  let notificationData = {};

  try {
    notificationData = event.data.json();
    console.log('[SW] Push data parsed:', notificationData);
  } catch (error) {
    console.error('[SW] Failed to parse push data as JSON:', error);
    notificationData = {
      notification: {
        title: 'GrainHero Notification',
        body: event.data.text()
      }
    };
  }

  // Handle various payload structures
  const notification = notificationData.notification || notificationData;
  const data = notificationData.data || {};

  const options = {
    body: notification.body || notification.message || '',
    icon: notification.icon || '/icon-192x192.png',
    badge: notification.badge || '/badge-72x72.png',
    tag: notification.tag || 'notification',
    requireInteraction: notification.requireInteraction || false,
    data: data,
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Close' }
    ]
  };

  // Add vibration pattern if enabled
  if (data?.vibration) {
    options.vibrate = [200, 100, 200];
  }

  event.waitUntil(
    self.registration.showNotification(
      notification.title || 'GrainHero',
      options
    )
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();

  const urlToOpen = event.notification.data?.action_url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clients) => {
      // Check if there's already a window/tab open with the target URL
      for (let i = 0; i < clients.length; i++) {
        const client = clients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window/tab with the target URL
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
});

// Background sync event (for retrying failed operations)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);

  if (event.tag === 'sync-notifications') {
    event.waitUntil(
      fetch('/api/notifications/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }).catch((error) => {
        console.error('[SW] Sync notifications failed:', error);
      })
    );
  }
});

// Periodic background sync (if supported)
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', (event) => {
    console.log('[SW] Periodic sync event:', event.tag);

    if (event.tag === 'check-notifications') {
      event.waitUntil(
        fetch('/api/notifications/unread-count')
          .then(() => {
            console.log('[SW] Periodic sync completed');
          })
          .catch((error) => {
            console.error('[SW] Periodic sync failed:', error);
          })
      );
    }
  });
}

// Message event - for communication with clients
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLIENTS_CLAIM') {
    self.clients.claim();
  }
});
