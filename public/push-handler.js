// Service Worker push handler — importé par le SW généré par workbox
// Gère la réception des push serveur et les clics sur notifications

self.addEventListener('push', (event) => {
    if (!event.data) return;

    let data;
    try {
        data = event.data.json();
    } catch (e) {
        data = { title: 'RO Planner', body: event.data.text() };
    }

    event.waitUntil(
        self.registration.showNotification(data.title || 'RO Planner', {
            body: data.body || '',
            icon: '/running-order/icons/icon-192x192.png',
            badge: '/running-order/icons/icon-72x72.png',
            tag: data.tag || 'ro-planner',
            data: { url: data.url || '/running-order/' },
            requireInteraction: false,
            vibrate: [200, 100, 200],
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/running-order/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (const client of windowClients) {
                if (client.url.includes('/running-order/') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});
