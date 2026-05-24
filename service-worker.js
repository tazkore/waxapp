// WAXAPP Service Worker — Push Notifications + PWA Cache
const CACHE_NAME = 'waxapp-v1';
const ICON_URL = '/waxapp-icon.svg';

// ── Instalación: cachear assets clave ─────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(['/favicon.ico', ICON_URL]).catch(() => {})
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Push Notification ──────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let payload = {
    title: 'WAXAPP',
    body: '¡Tienes una nueva notificación!',
    icon: ICON_URL,
    badge: ICON_URL,
    data: { url: '/' },
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = {
        title: parsed.title || 'WAXAPP',
        body: parsed.body || payload.body,
        icon: parsed.icon || ICON_URL,
        badge: parsed.badge || ICON_URL,
        data: parsed.data || { url: '/' },
        tag: parsed.tag,
        requireInteraction: parsed.requireInteraction || false,
      };
    } catch {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      data: payload.data,
      tag: payload.tag,
      requireInteraction: payload.requireInteraction,
      vibrate: [200, 100, 200],
    })
  );
});

// ── Click en notificación ──────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ── Background Sync (carrito abandonado) ─────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-abandoned-cart') {
    event.waitUntil(syncAbandonedCart());
  }
});

async function syncAbandonedCart() {
  // El frontend guarda datos en IndexedDB bajo 'waxapp-sync-queue'
  // Este handler los envía cuando se recupera la conexión
  try {
    const db = await openIDB('waxapp-sync', 1);
    const tx = db.transaction('queue', 'readwrite');
    const store = tx.objectStore('queue');
    const items = await storeGetAll(store);
    for (const item of items) {
      try {
        await fetch('/api/sync', { method: 'POST', body: JSON.stringify(item) });
        store.delete(item.id);
      } catch { /* will retry next sync */ }
    }
  } catch { /* IndexedDB not available */ }
}

function openIDB(name, version) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, version);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
  });
}

function storeGetAll(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
