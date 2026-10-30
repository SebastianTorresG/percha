// Para importar dentro de un worker (por ejemplo el del recorte, T063): reporta al hilo principal
// las solicitudes de red que hace el worker, que el PerformanceObserver de la página no ve.

import { esSolicitudDeRed, type EntradaRecurso, type MensajeRedWorker } from './registro';

export function observarRedEnWorker(): void {
  if (typeof PerformanceObserver === 'undefined') return;
  const ambito = globalThis as unknown as { postMessage(mensaje: MensajeRedWorker): void };
  new PerformanceObserver((lista) => {
    const urls = (lista.getEntries() as EntradaRecurso[]).filter(esSolicitudDeRed).map((e) => e.name);
    if (urls.length > 0) ambito.postMessage({ tipo: 'percha-diagnostico-red', urls });
  }).observe({ type: 'resource', buffered: true });
}
