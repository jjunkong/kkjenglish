self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(clients.claim()); });
self.addEventListener('fetch', e => {
  const r = e.request;
  // 페이지(HTML)는 항상 서버에서 새로 받는다 — 옛 화면이 남지 않도록
  if (r.mode === 'navigate' || r.destination === 'document') {
    e.respondWith(
      fetch(r, { cache: 'no-store' }).catch(() => fetch(r)).catch(() => new Response(''))
    );
    return;
  }
  e.respondWith(fetch(r).catch(() => new Response('')));
});
