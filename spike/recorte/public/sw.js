// Service worker del spike: deja la página y el modelo en caché para probar el recorte sin
// conexión (research R-0, punto 6). Cuenta las solicitudes que salen a la red para que la
// página pueda mostrar si el recorte usó la red o solo la caché.

const SHELL = 'percha-spike-shell-v1';
const MODELO = 'percha-spike-modelo-1.7.0';
let solicitudesRed = 0;

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      const respuesta = await fetch('/index.html', { cache: 'no-cache' });
      const html = await respuesta.clone().text();
      const urls = new Set(['/manifest.webmanifest', '/icono-180.png']);
      for (const m of html.matchAll(/(?:src|href)="(\/[^"]+)"/g)) urls.add(m[1]);
      urls.delete('/index.html');
      await cache.put('/index.html', respuesta);
      await cache.addAll([...urls]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    (async () => {
      for (const nombre of await caches.keys()) {
        if (nombre !== SHELL && nombre !== MODELO) await caches.delete(nombre);
      }
      await self.clients.claim();
    })(),
  );
});

async function deRed(peticion) {
  solicitudesRed += 1;
  return fetch(peticion);
}

async function primeroCache(nombreCache, peticion) {
  const cache = await caches.open(nombreCache);
  const guardada = await cache.match(peticion);
  if (guardada) return guardada;
  const respuesta = await deRed(peticion);
  if (respuesta.ok) await cache.put(peticion, respuesta.clone());
  return respuesta;
}

async function primeroRed(peticion) {
  try {
    const respuesta = await deRed(peticion);
    if (respuesta.ok) {
      const cache = await caches.open(SHELL);
      await cache.put('/index.html', respuesta.clone());
    }
    return respuesta;
  } catch {
    const cache = await caches.open(SHELL);
    return (await cache.match('/index.html')) ?? Response.error();
  }
}

self.addEventListener('fetch', (evento) => {
  const url = new URL(evento.request.url);
  if (evento.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/modelos/')) {
    evento.respondWith(primeroCache(MODELO, evento.request));
  } else if (evento.request.mode === 'navigate') {
    evento.respondWith(primeroRed(evento.request));
  } else {
    evento.respondWith(primeroCache(SHELL, evento.request));
  }
});

self.addEventListener('message', (evento) => {
  if (evento.data === 'contador') {
    evento.ports[0]?.postMessage(solicitudesRed);
  } else if (evento.data === 'reiniciar-contador') {
    solicitudesRed = 0;
    evento.ports[0]?.postMessage(solicitudesRed);
  }
});
