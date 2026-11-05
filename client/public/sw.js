// Service worker của Mật Ong: chỉ dùng để nhận thông báo nhắc học (Web Push).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  event.waitUntil(self.registration.showNotification(data.title || 'Mật Ong', {
    body: data.body || 'Đến giờ học từ vựng rồi!',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'matong-reminder',
    data: { url: data.url || '/practice' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/practice', self.location.origin).href;
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const win = all.find((c) => c.url.startsWith(self.location.origin));
    if (win) { await win.focus(); return win.navigate(url); }
    return self.clients.openWindow(url);
  })());
});
