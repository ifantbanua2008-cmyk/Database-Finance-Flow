/* ═══════════════════════════════════════════
   FINANCE FLOW — Service Worker
   https://keuangan.edgeone.app/
═══════════════════════════════════════════ */

const CACHE_NAME    = 'finance-flow-v1';
const RUNTIME_CACHE = 'finance-flow-runtime-v1';

const PRECACHE_ASSETS = [
  '/1.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

/* ── INSTALL ── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE — hapus cache lama ── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== RUNTIME_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── FETCH ── */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  /* Apps Script — selalu network, jangan cache */
  if (url.hostname === 'script.google.com') {
    event.respondWith(fetch(event.request));
    return;
  }

  /* Google Fonts — cache first */
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(cacheFirst(event.request, RUNTIME_CACHE));
    return;
  }

  /* Aset lokal — cache first */
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(event.request, CACHE_NAME));
    return;
  }

  /* Lainnya — network */
  event.respondWith(fetch(event.request));
});

/* ── Cache First Strategy ── */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response(
      `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"/>
       <meta name="viewport" content="width=device-width,initial-scale=1"/>
       <title>Offline — Finance Flow</title>
       <style>
         *{box-sizing:border-box;margin:0;padding:0}
         body{min-height:100vh;display:flex;align-items:center;justify-content:center;
              flex-direction:column;gap:16px;background:#080a0f;color:#e8eaf5;
              font-family:sans-serif;text-align:center;padding:32px}
         .ico{width:64px;height:64px;border-radius:16px;background:#1a1505;
              border:1px solid rgba(201,168,76,.3);display:flex;align-items:center;
              justify-content:center;font-size:28px;margin:0 auto 8px}
         h1{font-size:24px;color:#c9a84c;margin-bottom:4px}
         p{color:#7b7f9e;font-size:13px;line-height:1.7}
         button{margin-top:16px;padding:12px 32px;border-radius:10px;border:none;
                background:linear-gradient(135deg,#c9a84c,#a07830);
                color:#080a0f;font-size:13px;font-weight:600;cursor:pointer}
       </style></head><body>
       <div class="ico">◈</div>
       <h1>Finance Flow</h1>
       <p>Kamu sedang offline.<br/>Periksa koneksi internet dan coba lagi.</p>
       <button onclick="location.reload()">Coba Lagi</button>
       </body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
