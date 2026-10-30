// Datos del dispositivo y del navegador que explican los resultados del spike.

declare const __VARIANTE__: string;

export const VARIANTE = __VARIANTE__;
export const CACHE_MODELO = 'percha-spike-modelo-1.7.0';

const mb = (bytes: number) => `${(bytes / 1e6).toFixed(1)} MB`;

export async function estadoPermisoCamara(): Promise<string> {
  try {
    const estado = await navigator.permissions.query({ name: 'camera' as PermissionName });
    return estado.state;
  } catch {
    return 'no disponible';
  }
}

async function webgpu(): Promise<string> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  if (!gpu) return 'no';
  try {
    return (await gpu.requestAdapter()) ? 'sí (con adaptador)' : 'sí, pero sin adaptador';
  } catch (error) {
    return `error: ${error instanceof Error ? error.message : error}`;
  }
}

export async function cacheModelo(): Promise<{ archivos: number; bytes: number }> {
  const cache = await caches.open(CACHE_MODELO);
  let bytes = 0;
  const peticiones = await cache.keys();
  for (const peticion of peticiones) {
    const respuesta = await cache.match(peticion);
    if (respuesta) bytes += (await respuesta.blob()).size;
  }
  return { archivos: peticiones.length, bytes };
}

export async function leerEntorno(): Promise<[string, string][]> {
  const standalone =
    matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const estimacion = await navigator.storage?.estimate?.().catch(() => undefined);
  const persistente = await navigator.storage?.persisted?.().catch(() => undefined);
  const cache = await cacheModelo().catch(() => undefined);

  return [
    ['Variante', VARIANTE],
    ['Pantalla de inicio (standalone)', standalone ? 'sí' : 'no'],
    ['crossOriginIsolated', String(self.crossOriginIsolated)],
    ['SharedArrayBuffer', typeof SharedArrayBuffer === 'undefined' ? 'no' : 'sí'],
    ['WebGPU', await webgpu()],
    ['OffscreenCanvas', typeof OffscreenCanvas === 'undefined' ? 'no' : 'sí'],
    ['Núcleos (hardwareConcurrency)', String(navigator.hardwareConcurrency ?? '?')],
    ['Conexión', navigator.onLine ? 'en línea' : 'sin conexión'],
    ['Service worker', navigator.serviceWorker?.controller ? 'controla la página' : 'no controla la página'],
    ['Caché del modelo', cache ? `${cache.archivos} archivos, ${mb(cache.bytes)}` : 'no disponible'],
    [
      'Almacenamiento',
      estimacion ? `${mb(estimacion.usage ?? 0)} usados de ${mb(estimacion.quota ?? 0)}` : 'estimate() no disponible',
    ],
    ['Almacenamiento persistente', persistente === undefined ? 'no disponible' : persistente ? 'sí' : 'no'],
    ['Permiso de cámara', await estadoPermisoCamara()],
    ['Navegador', navigator.userAgent],
  ];
}

/** Solicitudes que salieron a la red, contadas por el service worker desde que arrancó. */
export async function contadorRed(mensaje: 'contador' | 'reiniciar-contador' = 'contador'): Promise<number | null> {
  const sw = navigator.serviceWorker?.controller;
  if (!sw) return null;
  return new Promise((resolver) => {
    const canal = new MessageChannel();
    canal.port1.onmessage = (evento) => resolver(evento.data);
    setTimeout(() => resolver(null), 1000);
    sw.postMessage(mensaje, [canal.port2]);
  });
}
