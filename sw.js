// ==== Service worker de la App Amable Meta ====
// Permite instalar la app. Siempre pide la versión nueva a GitHub; solo si no
// hay conexión muestra la última que guardó. No toca las llamadas al Worker.
// Avisos en el móvil: el Worker manda un aviso sin contenido y aquí se pone el texto.
const CACHE = 'metas-amables-v1';

// Archivos que se ven al abrir la app (animaciones de Prácti y fondos, 9-11-2026): se guardan ya al instalar,
// para que funcionen sin conexión desde el primer día. Si alguno falla, la instalación sigue igual.
const PRECARGA = [
  'practi-saludo.json',
  'practi-empujon-saludo.json',
  'practi-leyendo.json',
  'practi-leyendo-cae.json',
  'practi-escribiendo1.json',
  'practi-escribiendo2.json',
  'practi-sesion.json',
  'practi-pizarra.json',
  'practi-calma.json',
  'practi-celebracion.json',
  'practi-animo.json',
  'practi-cartel.json',
  'fondo-nivel-1.jpg',
  'fondo-nivel-2.jpg',
  'fondo-nivel-3.jpg',
  'fondo-nivel-4.jpg',
  'fondo-nivel-5.jpg',
  'fondo-neutro.jpg',
  'fondo-paso-0.jpg',
  'fondo-paso-a.jpg',
  'fondo-paso-b.jpg',
  'fondo-paso-c.jpg',
  'fondo-paso-d.jpg'
];
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(PRECARGA.map(u => c.add(u).catch(() => {}))))
    .catch(() => {}));
});
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  const req = e.request;
  // Solo los archivos de la propia app (el Worker, Stripe, fuentes… van directos)
  if(req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // Los vídeos van directos (piden trozos sueltos y no se pueden guardar así)
  if(req.headers.has('range') || /\.mp4$/i.test(new URL(req.url).pathname)) return;
  // El juego (iframe) también es una navegación, pero no es la app: se guarda con su propio nombre, no como './'
  // Lo mismo con privacidad.html, terminos.html, etc.: solo la app (/ o /index.html) se guarda como './'
  const pagina = req.mode === 'navigate' && req.destination !== 'iframe' && /\/(index\.html)?$/.test(new URL(req.url).pathname);
  // Lo que lleva ?… y no es una página (p. ej. la comprobación de versión nueva) no se guarda: llenaría la caché
  const guardar = pagina || !new URL(req.url).search;
  e.respondWith(
    fetch(req, pagina ? { cache: 'no-cache' } : undefined)
      .then(res => {
        if(res.ok && guardar){
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