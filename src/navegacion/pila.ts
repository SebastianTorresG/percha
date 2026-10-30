// Pila de navegación propia y tipada (research R-3): pantallas y hojas inferiores, sin librería de
// rutas. Cada `ir` o `abrirHoja` agrega una entrada al historial del navegador con una copia del
// estado, así "volver" (y el gesto de atrás de Safari durante el desarrollo) restaura la pantalla.
// La URL nunca cambia: wrangler.jsonc no tiene modo SPA a propósito (T014).
//
// Si iOS recarga la app al volver de segundo plano (por memoria), el estado se recupera de
// `history.state` o, si se perdió, de sessionStorage, y se reconstruyen las entradas del historial.

import { HOJAS, PANTALLAS, type EntradaHoja, type EntradaPantalla, type Pestana } from './rutas';

export interface EstadoNavegacion {
  /** Nunca vacía; la base es una pestaña o el onboarding. */
  pila: readonly EntradaPantalla[];
  hojas: readonly EntradaHoja[];
}

/** Lo que la pila usa del historial del navegador; en las pruebas se reemplaza por uno falso. */
export interface Historial {
  readonly state: unknown;
  pushState(estado: unknown): void;
  replaceState(estado: unknown): void;
  back(): void;
  /** Llama a `oyente` en cada `popstate` con el estado de la entrada; devuelve cómo dejar de escuchar. */
  escuchar(oyente: (estado: unknown) => void): () => void;
}

export interface AlmacenSesion {
  leer(): string | null;
  guardar(valor: string): void;
}

interface Copia extends EstadoNavegacion {
  percha: 1;
}

/** Si el `popstate` de un `volver` no llega en este tiempo, se aplica a mano. */
export const ESPERA_POPSTATE_MS = 400;

function esCopia(valor: unknown): valor is Copia {
  if (typeof valor !== 'object' || valor === null) return false;
  const c = valor as Partial<Copia>;
  return (
    c.percha === 1 &&
    Array.isArray(c.pila) &&
    c.pila.length > 0 &&
    c.pila.every((e) => typeof e === 'object' && e !== null && Object.hasOwn(PANTALLAS, e.pantalla)) &&
    Array.isArray(c.hojas) &&
    c.hojas.every((h) => typeof h === 'object' && h !== null && Object.hasOwn(HOJAS, h.hoja))
  );
}

function copia(estado: EstadoNavegacion): Copia {
  return { percha: 1, pila: estado.pila, hojas: estado.hojas };
}

function sinMarca({ pila, hojas }: Copia): EstadoNavegacion {
  return { pila, hojas };
}

export class Navegacion {
  private actual: EstadoNavegacion;
  private readonly oyentes = new Set<() => void>();
  private readonly dejarDeEscuchar: () => void;
  /** Navegaciones pedidas mientras un `volver` espera su `popstate`. */
  private cola: (() => void)[] = [];
  private esperando: { destino: EstadoNavegacion; temporizador: ReturnType<typeof setTimeout> } | null = null;

  constructor(
    private readonly historial: Historial,
    inicial: EntradaPantalla,
    private readonly almacen?: AlmacenSesion,
  ) {
    this.actual = this.restaurar(inicial);
    this.dejarDeEscuchar = historial.escuchar((estado) => this.alVolverAtras(estado));
  }

  estado(): EstadoNavegacion {
    return this.actual;
  }

  suscribir(oyente: () => void): () => void {
    this.oyentes.add(oyente);
    return () => this.oyentes.delete(oyente);
  }

  /** Abre una pantalla encima de la actual. */
  ir(entrada: EntradaPantalla): void {
    this.cuandoQuieto(() => this.empujar({ pila: [...this.actual.pila, entrada], hojas: [] }));
  }

  /** Reemplaza la pantalla de la cima (por ejemplo, entre pasos de un flujo). */
  reemplazar(entrada: EntradaPantalla): void {
    this.cuandoQuieto(() => this.sustituir({ pila: [...this.actual.pila.slice(0, -1), entrada], hojas: [] }));
  }

  /** Cambia de pestaña: la pila vuelve a tener solo esa pantalla. */
  cambiarPestana(pestana: Pestana): void {
    this.cuandoQuieto(() => this.sustituir({ pila: [{ pantalla: pestana }], hojas: [] }));
  }

  /** Reinicia la navegación a una sola pantalla (por ejemplo, al terminar el onboarding). */
  reiniciar(entrada: EntradaPantalla): void {
    this.cuandoQuieto(() => this.sustituir({ pila: [entrada], hojas: [] }));
  }

  abrirHoja(hoja: EntradaHoja): void {
    this.cuandoQuieto(() => this.empujar({ pila: this.actual.pila, hojas: [...this.actual.hojas, hoja] }));
  }

  /** Cierra la hoja de arriba, si hay. */
  cerrarHoja(): void {
    this.cuandoQuieto(() => {
      if (this.actual.hojas.length > 0) this.atras({ pila: this.actual.pila, hojas: this.actual.hojas.slice(0, -1) });
    });
  }

  /** Cierra la hoja de arriba o, si no hay, vuelve a la pantalla anterior. En la base no hace nada. */
  volver(): void {
    this.cuandoQuieto(() => {
      const { pila, hojas } = this.actual;
      if (hojas.length > 0) this.atras({ pila, hojas: hojas.slice(0, -1) });
      else if (pila.length > 1) this.atras({ pila: pila.slice(0, -1), hojas: [] });
    });
  }

  desmontar(): void {
    this.dejarDeEscuchar();
    if (this.esperando) clearTimeout(this.esperando.temporizador);
    this.oyentes.clear();
  }

  // -------------------------------------------------------------------------------------------

  private restaurar(inicial: EntradaPantalla): EstadoNavegacion {
    if (esCopia(this.historial.state)) {
      const estado = sinMarca(this.historial.state);
      this.guardarEnSesion(estado);
      return estado;
    }
    const guardada = this.leerDeSesion();
    if (guardada) {
      // El historial se perdió (recarga de iOS): se reconstruye una entrada por nivel para que
      // "volver" siga funcionando paso a paso.
      const { pila, hojas } = guardada;
      this.historial.replaceState(copia({ pila: pila.slice(0, 1), hojas: [] }));
      for (let i = 2; i <= pila.length; i++) this.historial.pushState(copia({ pila: pila.slice(0, i), hojas: [] }));
      for (let i = 1; i <= hojas.length; i++) this.historial.pushState(copia({ pila, hojas: hojas.slice(0, i) }));
      return guardada;
    }
    const base: EstadoNavegacion = { pila: [inicial], hojas: [] };
    this.historial.replaceState(copia(base));
    this.guardarEnSesion(base);
    return base;
  }

  private empujar(estado: EstadoNavegacion) {
    this.historial.pushState(copia(estado));
    this.fijar(estado);
  }

  private sustituir(estado: EstadoNavegacion) {
    this.historial.replaceState(copia(estado));
    this.fijar(estado);
  }

  private atras(destino: EstadoNavegacion) {
    this.esperando = {
      destino,
      temporizador: setTimeout(() => {
        // No llegó el popstate (no había entrada anterior): se aplica a mano.
        this.esperando = null;
        this.sustituir(destino);
        this.vaciarCola();
      }, ESPERA_POPSTATE_MS),
    };
    this.historial.back();
  }

  private alVolverAtras(estado: unknown) {
    if (this.esperando) {
      clearTimeout(this.esperando.temporizador);
      this.esperando = null;
    }
    if (esCopia(estado)) {
      this.fijar(sinMarca(estado));
    } else {
      // Se salió del historial de la app (solo pasa en Safari durante el desarrollo).
      this.sustituir({ pila: this.actual.pila.slice(0, 1), hojas: [] });
    }
    this.vaciarCola();
  }

  private cuandoQuieto(accion: () => void) {
    if (this.esperando) this.cola.push(accion);
    else accion();
  }

  private vaciarCola() {
    const pendientes = this.cola;
    this.cola = [];
    for (const accion of pendientes) this.cuandoQuieto(accion);
  }

  private fijar(estado: EstadoNavegacion) {
    this.actual = estado;
    this.guardarEnSesion(estado);
    for (const oyente of this.oyentes) oyente();
  }

  private guardarEnSesion(estado: EstadoNavegacion) {
    try {
      this.almacen?.guardar(JSON.stringify(copia(estado)));
    } catch {
      // Sin sessionStorage solo se pierde la restauración tras una recarga.
    }
  }

  private leerDeSesion(): EstadoNavegacion | null {
    try {
      const texto = this.almacen?.leer();
      const valor: unknown = texto ? JSON.parse(texto) : null;
      return esCopia(valor) ? sinMarca(valor) : null;
    } catch {
      return null;
    }
  }
}

/** El historial real del navegador. */
export function historialDelNavegador(): Historial {
  return {
    get state() {
      return history.state;
    },
    pushState: (estado) => history.pushState(estado, ''),
    replaceState: (estado) => history.replaceState(estado, ''),
    back: () => history.back(),
    escuchar(oyente) {
      const alPop = (evento: PopStateEvent) => oyente(evento.state);
      window.addEventListener('popstate', alPop);
      return () => window.removeEventListener('popstate', alPop);
    },
  };
}

const CLAVE_SESION = 'percha.navegacion';

export function almacenDeSesion(): AlmacenSesion {
  return {
    leer: () => sessionStorage.getItem(CLAVE_SESION),
    guardar: (valor) => sessionStorage.setItem(CLAVE_SESION, valor),
  };
}
