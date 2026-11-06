/* Guarda la pantalla en el celular para que la app abra sin señal.
   Al subir una versión nueva de index.html, cambia el número de CACHE. */
const CACHE = 'checks-v35';
const ARCHIVOS = ['./', 'index.html', 'manifest.json', 'icono-192.png', 'icono-512.png', 'icono-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  // Solo archivos de la propia app; lo que va al servidor (Apps Script) no se toca
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  if (req.mode === 'navigate') {
    // La pantalla: primero la versión más nueva; sin señal (o si tarda), la guardada
    e.respondWith((async () => {
      const guardada = await caches.match('index.html');
      const red = fetch(req).then(r => {
        if (r.ok) caches.open(CACHE).then(c => c.put('index.html', r.clone()));
        return r;
      });
      if (!guardada) return red;
      const tardo = new Promise(res => setTimeout(() => res(guardada), 4000));
      return Promise.race([red.catch(() => guardada), tardo]);
    })());
    return;
  }
  // Íconos y demás: de lo guardado, y si no está, de internet
  e.respondWith(caches.match(req).then(r => r || fetch(req)));
});
