// Registro del panel de diagnóstico (research R-14). Sustituye al Web Inspector, que necesita una
// Mac: guarda los últimos 50 eventos y errores, los tiempos de recorte, un contador de solicitudes
// de red (para comprobar "0 solicitudes" sin conexión, principio I) y el estado de la integridad.
// No depende de nada de la app para que cualquier módulo pueda reportar sin ciclos.

export type TipoEvento = 'error' | 'aviso' | 'info' | 'tiempo';

export interface Evento {
  tipo: TipoEvento;
  mensaje: string;
  fecha: number;
  /** Milisegundos, en los eventos de tipo `tiempo`. */
  ms?: number;
}

export interface ResultadoIntegridad {
  fecha: number;
  imagenes: number;
  /** IDs de imágenes que ninguna entidad referencia. No se borran solas. */
  huerfanas: string[];
  /** Referencias a imágenes, prendas, maniquíes, outfits o siluetas que no existen. */
  rotas: { tabla: string; id: string; campo: string; ref: string }[];
}

export interface ContadorRed {
  /** Solicitudes que salieron a la red desde la página (sin blob:, data: ni lo servido desde caché). */
  pagina: number;
  /** Lo mismo desde los workers, que lo reportan por postMessage. */
  workers: number;
  /** De esas, las que fueron a otro origen: deben ser 0 (principio I, sin servicios externos). */
  otrosOrigenes: number;
  ultimas: readonly string[];
}

export interface EstadoDiagnostico {
  eventos: readonly Evento[];
  red: ContadorRed;
  /** `id` del recortador y del renderer en uso. */
  componentes: Readonly<Record<string, string>>;
  integridad?: ResultadoIntegridad;
}

export const MAX_EVENTOS = 50;
const MAX_URLS = 10;

const RED_VACIA: ContadorRed = { pagina: 0, workers: 0, otrosOrigenes: 0, ultimas: [] };

let estado: EstadoDiagnostico = {
  eventos: [],
  red: RED_VACIA,
  componentes: {},
};
const oyentes = new Set<() => void>();

function cambiar(nuevo: EstadoDiagnostico) {
  estado = nuevo;
  for (const oyente of oyentes) oyente();
}

export function obtenerEstado(): EstadoDiagnostico {
  return estado;
}

export function suscribir(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

export function registrar(tipo: TipoEvento, mensaje: string, ms?: number): void {
  const evento: Evento = { tipo, mensaje, fecha: Date.now(), ...(ms === undefined ? {} : { ms }) };
  cambiar({ ...estado, eventos: [...estado.eventos, evento].slice(-MAX_EVENTOS) });
}

export function registrarError(error: unknown, contexto?: string): void {
  const texto = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  registrar('error', contexto ? `${contexto}: ${texto}` : texto);
}

/** Por ejemplo `registrarTiempo('recorte', 3012)` (SC-002). */
export function registrarTiempo(nombre: string, ms: number): void {
  registrar('tiempo', nombre, Math.round(ms));
}

export function fijarComponente(nombre: 'recortador' | 'renderer' | (string & {}), id: string): void {
  cambiar({ ...estado, componentes: { ...estado.componentes, [nombre]: id } });
}

export function fijarIntegridad(resultado: ResultadoIntegridad): void {
  cambiar({ ...estado, integridad: resultado });
  if (resultado.huerfanas.length > 0 || resultado.rotas.length > 0) {
    registrar(
      'aviso',
      `Integridad: ${resultado.huerfanas.length} imágenes sin referencia, ${resultado.rotas.length} referencias rotas`,
    );
  }
}

/** Lo que se usa de un PerformanceResourceTiming. */
export interface EntradaRecurso {
  name: string;
  transferSize?: number;
}

/**
 * Solo cuenta lo que salió a la red: los blob: y data: no salen del teléfono, y lo que sirve el
 * service worker o la caché HTTP tiene `transferSize` 0. Si el navegador no informa
 * `transferSize`, se cuenta, para no esconder una solicitud real.
 */
export function esSolicitudDeRed(entrada: EntradaRecurso): boolean {
  if (entrada.name.startsWith('blob:') || entrada.name.startsWith('data:')) return false;
  return typeof entrada.transferSize !== 'number' || entrada.transferSize > 0;
}

function esDeOtroOrigen(url: string): boolean {
  try {
    return typeof location !== 'undefined' && new URL(url, location.href).origin !== location.origin;
  } catch {
    return true;
  }
}

/** Suma al contador las solicitudes que salieron a la red (las URLs ya filtradas con `esSolicitudDeRed`). */
export function contarRed(origen: 'pagina' | 'workers', urls: readonly string[]): void {
  if (urls.length === 0) return;
  cambiar({
    ...estado,
    red: {
      ...estado.red,
      [origen]: estado.red[origen] + urls.length,
      otrosOrigenes: estado.red.otrosOrigenes + urls.filter(esDeOtroOrigen).length,
      ultimas: [...estado.red.ultimas, ...urls].slice(-MAX_URLS),
    },
  });
}

// ---------------------------------------------------------------------------------------------
// Captura en la página y en los workers
// ---------------------------------------------------------------------------------------------

/** Mensaje que manda un worker con `observarRedEnWorker` (src/diagnostico/en-worker.ts). */
export interface MensajeRedWorker {
  tipo: 'percha-diagnostico-red';
  urls: string[];
}

export function esMensajeRedWorker(dato: unknown): dato is MensajeRedWorker {
  return (
    typeof dato === 'object' &&
    dato !== null &&
    (dato as { tipo?: unknown }).tipo === 'percha-diagnostico-red' &&
    Array.isArray((dato as { urls?: unknown }).urls)
  );
}

/** Suma al contador las solicitudes que reporta un worker. */
export function escucharWorker(worker: Worker): void {
  worker.addEventListener('message', (evento: MessageEvent<unknown>) => {
    if (esMensajeRedWorker(evento.data)) contarRed('workers', evento.data.urls);
  });
}

let instalado = false;

/** Captura errores sin manejar y solicitudes de red de la página. Se llama una vez al arrancar. */
export function instalarCapturas(): void {
  if (instalado || typeof window === 'undefined') return;
  instalado = true;

  window.addEventListener('error', (evento) => {
    registrarError(evento.error ?? evento.message, 'Error sin manejar');
  });
  window.addEventListener('unhandledrejection', (evento) => {
    registrarError(evento.reason, 'Promesa rechazada');
  });

  if (typeof PerformanceObserver !== 'undefined') {
    try {
      new PerformanceObserver((lista) => {
        const entradas = lista.getEntries() as EntradaRecurso[];
        contarRed(
          'pagina',
          entradas.filter(esSolicitudDeRed).map((e) => e.name),
        );
      }).observe({ type: 'resource', buffered: true });
    } catch (error) {
      registrarError(error, 'PerformanceObserver');
    }
  }
}

/** Solo para pruebas. */
export function reiniciar(): void {
  cambiar({ eventos: [], red: RED_VACIA, componentes: {} });
}
