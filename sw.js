// ==== Service worker de la App Amable Meta ====
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
  // Los vídeos van directos (piden trozos sueltos y no se pueden guardar así)
  if(req.headers.has('range') || /\.mp4$/i.test(new URL(req.url).pathname)) return;
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

// Aviso de las 20:00 si aún no has marcado tu práctica de hoy: primero tu clima, después registrar la práctica
self.addEventListener('push', e => {
  e.waitUntil(self.registration.showNotification('📝 ¿Has registrado hoy?', {
    body: 'Cuenta cómo te has sentido y cómo ha sido tu entorno, hayas hecho o no tu práctica. Te llevará un minuto 🌱',
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