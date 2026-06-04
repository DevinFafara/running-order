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

    // URL absolue construite depuis le scope du SW pour que l'icône soit
    // accessible depuis les serveurs Apple/Google (nécessaire pour l'affichage)
    const base = self.registration.scope; // ex: https://forum.hellfest.fr/running-order/
    event.waitUntil(
        self.registration.showNotification(data.title || 'RO Planner', {
            body: data.body || '',
            icon: base + 'icons/icon-192x192.png',
            badge: base + 'icons/icon-72x72.png',
            tag: data.tag || 'ro-planner',
            data: { url: data.url || base },
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
