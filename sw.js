// ==== Service worker de la App Metas Amables ====
// Permite instalar la app. Siempre pide la versión nueva a GitHub; solo si no
// hay conexión muestra la última que guardó. No toca las llamadas al Worker.
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
