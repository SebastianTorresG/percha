import { afterEach, describe, expect, it, vi } from 'vitest';
import { ESPERA_POPSTATE_MS, Navegacion, type AlmacenSesion, type Historial } from '../../src/navegacion/pila';

/** Historial como el del navegador: `back()` es asíncrono y avisa con popstate. */
class HistorialFalso implements Historial {
  entradas: unknown[] = [null];
  indice = 0;
  private oyentes = new Set<(estado: unknown) => void>();
  get state() {
    return this.entradas[this.indice];
  }
  pushState(estado: unknown) {
    this.entradas = [...this.entradas.slice(0, this.indice + 1), structuredClone(estado)];
    this.indice++;
  }
  replaceState(estado: unknown) {
    this.entradas[this.indice] = structuredClone(estado);
  }
  back() {
    if (this.indice === 0) return; // como el navegador: sin entrada anterior no pasa nada
    this.indice--;
    queueMicrotask(() => this.emitir());
  }
  /** El gesto de atrás de Safari, sin pasar por la app. */
  atrasDelNavegador() {
    this.back();
  }
  emitir() {
    for (const o of this.oyentes) o(this.state);
  }
  escuchar(oyente: (estado: unknown) => void) {
    this.oyentes.add(oyente);
    return () => this.oyentes.delete(oyente);
  }
}

function almacenFalso(inicial: string | null = null): AlmacenSesion & { valor: string | null } {
  return {
    valor: inicial,
    leer() {
      return this.valor;
    },
    guardar(v) {
      this.valor = v;
    },
  };
}

const esperarPopstate = () => new Promise((r) => setTimeout(r, 0));
const nombres = (n: Navegacion) => n.estado().pila.map((e) => e.pantalla);

afterEach(() => {
  vi.useRealTimers();
});

describe('Navegacion', () => {
  it('empieza en la pantalla inicial y la deja en el historial', () => {
    const historial = new HistorialFalso();
    const nav = new Navegacion(historial, { pantalla: 'hoy' });
    expect(nav.estado()).toEqual({ pila: [{ pantalla: 'hoy' }], hojas: [] });
    expect(historial.entradas).toHaveLength(1);
    expect(historial.state).toMatchObject({ percha: 1, pila: [{ pantalla: 'hoy' }] });
  });

  it('ir apila y agrega una entrada al historial; volver regresa con popstate', async () => {
    const historial = new HistorialFalso();
    const nav = new Navegacion(historial, { pantalla: 'closet' });
    nav.ir({ pantalla: 'detallePrenda', params: { prendaId: 'p1' } });
    expect(nombres(nav)).toEqual(['closet', 'detallePrenda']);
    expect(nav.estado().pila[1]).toEqual({ pantalla: 'detallePrenda', params: { prendaId: 'p1' } });
    expect(historial.entradas).toHaveLength(2);

    nav.volver();
    await esperarPopstate();
    expect(nombres(nav)).toEqual(['closet']);
    expect(historial.indice).toBe(0);
  });

  it('volver en la base no sale de la app', async () => {
    const historial = new HistorialFalso();
    const nav = new Navegacion(historial, { pantalla: 'hoy' });
    nav.volver();
    await esperarPopstate();
    expect(nombres(nav)).toEqual(['hoy']);
    expect(historial.indice).toBe(0);
  });

  it('reemplazar cambia la cima sin agregar entradas', () => {
    const historial = new HistorialFalso();
    const nav = new Navegacion(historial, { pantalla: 'taller' });
    nav.ir({ pantalla: 'crearPlaneada' });
    nav.reemplazar({ pantalla: 'detalleTaller', params: { prendaId: 'p2' } });
    expect(nombres(nav)).toEqual(['taller', 'detalleTaller']);
    expect(historial.entradas).toHaveLength(2);
  });

  it('cambiarPestana deja solo esa pestaña, sin agregar entradas', () => {
    const historial = new HistorialFalso();
    const nav = new Navegacion(historial, { pantalla: 'hoy' });
    nav.ir({ pantalla: 'misMedidas' });
    nav.abrirHoja({ hoja: 'menu' });
    nav.cambiarPestana('outfits');
    expect(nav.estado()).toEqual({ pila: [{ pantalla: 'outfits' }], hojas: [] });
    expect(historial.entradas).toHaveLength(3);
  });

  it('las hojas se cierran antes que las pantallas', async () => {
    const historial = new HistorialFalso();
    const nav = new Navegacion(historial, { pantalla: 'hoy' });
    nav.ir({ pantalla: 'ajustes' });
    nav.abrirHoja({ hoja: 'menu' });
    expect(nav.estado().hojas).toEqual([{ hoja: 'menu' }]);

    nav.volver();
    await esperarPopstate();
    expect(nav.estado()).toEqual({ pila: [{ pantalla: 'hoy' }, { pantalla: 'ajustes' }], hojas: [] });

    nav.abrirHoja({ hoja: 'menu' });
    nav.cerrarHoja();
    await esperarPopstate();
    expect(nav.estado().hojas).toEqual([]);
    expect(nombres(nav)).toEqual(['hoy', 'ajustes']);
  });

  it('cerrarHoja sin hojas no hace nada', async () => {
    const historial = new HistorialFalso();
    const nav = new Navegacion(historial, { pantalla: 'hoy' });
    nav.ir({ pantalla: 'ajustes' });
    nav.cerrarHoja();
    await esperarPopstate();
    expect(nombres(nav)).toEqual(['hoy', 'ajustes']);
  });

  it('el gesto de atrás del navegador también restaura la pantalla anterior', async () => {
    const historial = new HistorialFalso();
    const nav = new Navegacion(historial, { pantalla: 'closet' });
    nav.ir({ pantalla: 'detallePrenda', params: { prendaId: 'p1' } });
    historial.atrasDelNavegador();
    await esperarPopstate();
    expect(nombres(nav)).toEqual(['closet']);
  });

  it('una navegación pedida mientras se espera el popstate se aplica después, en orden', async () => {
    const historial = new HistorialFalso();
    const nav = new Navegacion(historial, { pantalla: 'closet' });
    nav.ir({ pantalla: 'detallePrenda', params: { prendaId: 'p1' } });
    nav.volver();
    nav.ir({ pantalla: 'agregarPrenda' });
    await esperarPopstate();
    expect(nombres(nav)).toEqual(['closet', 'agregarPrenda']);
    expect(historial.entradas).toHaveLength(2);
    expect(historial.indice).toBe(1);
  });

  it('si el popstate no llega, aplica el volver a mano', () => {
    vi.useFakeTimers();
    const historial = new HistorialFalso();
    const nav = new Navegacion(historial, { pantalla: 'hoy' });
    nav.ir({ pantalla: 'ajustes' });
    historial.back = () => {}; // el navegador no tiene a dónde volver
    nav.volver();
    expect(nombres(nav)).toEqual(['hoy', 'ajustes']);
    vi.advanceTimersByTime(ESPERA_POPSTATE_MS);
    expect(nombres(nav)).toEqual(['hoy']);
  });

  it('avisa a los suscriptores en cada cambio', () => {
    const nav = new Navegacion(new HistorialFalso(), { pantalla: 'hoy' });
    const oyente = vi.fn();
    const dejar = nav.suscribir(oyente);
    nav.ir({ pantalla: 'ajustes' });
    nav.abrirHoja({ hoja: 'menu' });
    expect(oyente).toHaveBeenCalledTimes(2);
    dejar();
    nav.cambiarPestana('closet');
    expect(oyente).toHaveBeenCalledTimes(2);
  });
});

describe('restaurar al volver de segundo plano', () => {
  it('usa history.state si sobrevivió a la recarga', () => {
    const historial = new HistorialFalso();
    const antes = new Navegacion(historial, { pantalla: 'hoy' });
    antes.ir({ pantalla: 'calendario' });
    antes.desmontar();

    const despues = new Navegacion(historial, { pantalla: 'hoy' });
    expect(nombres(despues)).toEqual(['hoy', 'calendario']);
  });

  it('si se perdió el historial, usa sessionStorage y reconstruye una entrada por nivel', async () => {
    const almacen = almacenFalso();
    const antes = new Navegacion(new HistorialFalso(), { pantalla: 'closet' }, almacen);
    antes.ir({ pantalla: 'detallePrenda', params: { prendaId: 'p1' } });
    antes.abrirHoja({ hoja: 'menu' });
    antes.desmontar();

    const nuevo = new HistorialFalso();
    const despues = new Navegacion(nuevo, { pantalla: 'hoy' }, almacen);
    expect(despues.estado()).toEqual({
      pila: [{ pantalla: 'closet' }, { pantalla: 'detallePrenda', params: { prendaId: 'p1' } }],
      hojas: [{ hoja: 'menu' }],
    });
    expect(nuevo.entradas).toHaveLength(3);

    despues.volver();
    await esperarPopstate();
    expect(despues.estado().hojas).toEqual([]);
    despues.volver();
    await esperarPopstate();
    expect(nombres(despues)).toEqual(['closet']);
  });

  it('ignora un estado guardado inválido o de una pantalla que ya no existe', () => {
    for (const guardado of ['{no es json', JSON.stringify({ percha: 1, pila: [{ pantalla: 'borrada' }], hojas: [] })]) {
      const nav = new Navegacion(new HistorialFalso(), { pantalla: 'hoy' }, almacenFalso(guardado));
      expect(nav.estado()).toEqual({ pila: [{ pantalla: 'hoy' }], hojas: [] });
    }
  });

  it('si sessionStorage falla, la navegación sigue funcionando', () => {
    const almacen: AlmacenSesion = {
      leer: () => {
        throw new Error('SecurityError');
      },
      guardar: () => {
        throw new Error('QuotaExceededError');
      },
    };
    const nav = new Navegacion(new HistorialFalso(), { pantalla: 'hoy' }, almacen);
    nav.ir({ pantalla: 'ajustes' });
    expect(nombres(nav)).toEqual(['hoy', 'ajustes']);
  });
});
