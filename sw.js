/* Guarda la pantalla en el celular para que la app abra sin señal.
   Al subir una versión nueva de index.html, sube también el número de CACHE. */
const VERSION = 44;                 // igual que VERSION_APP de index.html
const CACHE = 'checks-v' + VERSION;
const ARCHIVOS = ['./', 'index.html', 'manifest.json', 'icono-192.png', 'icono-512.png', 'icono-180.png'];

// Al instalarse baja SIEMPRE la versión más nueva de GitHub (nunca una copia vieja del navegador)
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(ARCHIVOS.map(u =>
      fetch(new Request(u, { cache: 'reload' })).then(r => { if (!r.ok) throw new Error(u); return c.put(u, r); }))
      // config.js (tu link /exec): se guarda si existe, sin detener la instalación
      .concat(fetch(new Request('config.js', { cache: 'reload' })).then(r => r.ok ? c.put('config.js', r) : null).catch(() => null))))
    .then(() => self.skipWaiting()));
});

// La pantalla pregunta qué versión trae este service worker
self.addEventListener('message', e => {
  if (e.data === 'version' && e.source) e.source.postMessage({ version: VERSION });
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Lo más nuevo de GitHub; si no contesta en "ms" (sin señal o señal débil), lo guardado
function nuevoOGuardado(url, clave, ms) {
  return caches.match(clave).then(guardado => {
    const red = fetch(url, { cache: 'no-cache', credentials: 'same-origin' }).then(r => {
      if (r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(clave, copia)); }
      return r;
    });
    if (!guardado) return red;
    const tardo = new Promise(res => setTimeout(() => res(guardado), ms));
    return Promise.race([red.catch(() => guardado), tardo]);
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  // Solo archivos de la propia app; lo que va al servidor (Apps Script) no se toca
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  // La pantalla: la más nueva de GitHub; sin señal o si tarda más de 3 s, la guardada
  if (req.mode === 'navigate') { e.respondWith(nuevoOGuardado(req.url, 'index.html', 3000)); return; }
  // config.js (tu link /exec): igual, pero sin esperar más de 2.5 s
  if (new URL(req.url).pathname.endsWith('/config.js')) { e.respondWith(nuevoOGuardado(req.url, 'config.js', 2500)); return; }
  // Íconos y demás: de lo guardado, y si no está, de internet
  e.respondWith(caches.match(req).then(r => r || fetch(req)));
});
