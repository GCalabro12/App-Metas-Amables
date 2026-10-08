// ==== Service worker de la App Metas Amables ====
// Permite instalar la app. Siempre pide la versión nueva a GitHub; solo si no
// hay conexión muestra la última que guardó. No toca las llamadas al Worker.
// Avisos en el móvil: el Worker manda un aviso sin contenido y aquí se pone el texto.
const CACHE = 'metas-amables-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  const req = e.request;
  // Solo los archivos de la propia app (el Worker, Stripe, fuentes… van directos)
  if(req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const pagina = req.mode === 'navigate';
  e.respondWith(
    fetch(req, pagina ? { cache: 'no-cache' } : undefined)
      .then(res => {
        if(res.ok){
          const copia = res.clone();
          caches.open(CACHE).then(c => c.put(pagina ? './' : req, copia));
        }
        return res;
      })
      .catch(() => caches.match(pagina ? './' : req, { ignoreSearch: true })
        .then(guardada => guardada || Response.error()))
  );
});

// «Tu meta tiene sed»: llega a las 20:00 si aún no has marcado tu práctica de hoy
self.addEventListener('push', e => {
  e.waitUntil(self.registration.showNotification('🥀 Tu meta tiene sed', {
    body: 'Aún estás a tiempo: haz tu práctica de hoy y márcala en la app. Un pequeño paso basta 🌱',
    icon: 'icon-192.png', badge: 'badge-96.png', image: 'aviso-planta-sed.jpg', tag: 'planta', renotify: true, data: { url: './?regar=1' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ventanas => {
    // Con la app abierta: se le pide que abra el momento de regar; si no, se abre con ?regar=1
    for(const v of ventanas){ if('focus' in v){ v.postMessage({ abrir: 'regar' }); return v.focus(); } }
    return self.clients.openWindow((e.notification.data && e.notification.data.url) || './');
  }));
});