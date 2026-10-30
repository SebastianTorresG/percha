// Componentes base del diseño en WebKit (T029–T033): medidas y estilos de los dos temas, tomados
// de tokens.json y del README de diseño, y el comportamiento de la HojaInferior.

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import '../../src/tema/tokens.css';
import '../../src/tema/base.css';
import { BarraInferior } from '../../src/componentes/BarraInferior';
import { BotonPrincipal } from '../../src/componentes/BotonPrincipal';
import { BotonSecundario } from '../../src/componentes/BotonSecundario';
import { ChipFiltro } from '../../src/componentes/ChipFiltro';
import { HojaInferior, SALIDA_MS, useHoja } from '../../src/componentes/HojaInferior';
import { TarjetaPrenda } from '../../src/componentes/TarjetaPrenda';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

let raiz: Root | null = null;
let contenedor: HTMLDivElement | null = null;

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  act(() => raiz?.unmount());
  contenedor?.remove();
  raiz = null;
  contenedor = null;
  vi.useRealTimers();
});

function montar(tema: 'claro' | 'oscuro', nodo: ReactNode) {
  document.documentElement.dataset.theme = tema;
  contenedor = document.createElement('div');
  document.body.append(contenedor);
  raiz = createRoot(contenedor);
  act(() => raiz!.render(nodo));
  return contenedor;
}

const estilo = (selector: string) => getComputedStyle(document.querySelector(selector)!);

describe('BotonPrincipal y BotonSecundario', () => {
  it('claro: 52 px, radio 26, 15 px, principal en 500 con acento, sin mayúsculas', () => {
    montar('claro', <><BotonPrincipal>Guardar en el clóset</BotonPrincipal><BotonSecundario>Elegir de la galería</BotonSecundario></>);
    const p = estilo('.boton-principal');
    expect([p.height, p.borderTopLeftRadius, p.fontSize, p.fontWeight, p.textTransform]).toEqual(['52px', '26px', '15px', '500', 'none']);
    expect(p.backgroundColor).toBe('rgb(185, 119, 106)');
    expect(p.color).toBe('rgb(255, 255, 255)');
    const s = estilo('.boton-secundario');
    expect([s.backgroundColor, s.fontWeight]).toEqual(['rgb(234, 217, 209)', '400']);
  });

  it('oscuro: radio 2, MAYÚSCULAS con tracking 0.1em, Archivo', () => {
    montar('oscuro', <BotonPrincipal>Guardar</BotonPrincipal>);
    const p = estilo('.boton-principal');
    expect([p.borderTopLeftRadius, p.textTransform, p.letterSpacing]).toEqual(['2px', 'uppercase', '1.5px']);
    expect(p.fontFamily).toContain('Archivo');
    expect(p.backgroundColor).toBe('rgb(242, 239, 233)');
  });
});

describe('ChipFiltro', () => {
  it('claro: 34 px, 13 px, activo con acento; el área táctil llega a 44 px', () => {
    montar('claro', <><ChipFiltro activo>Todo</ChipFiltro><ChipFiltro>Vestidos</ChipFiltro></>);
    const [activo, inactivo] = [...document.querySelectorAll<HTMLElement>('.chip-filtro')];
    expect(activo!.getAttribute('aria-pressed')).toBe('true');
    const a = getComputedStyle(activo!);
    expect([a.height, a.fontSize, a.borderTopLeftRadius, a.backgroundColor]).toEqual(['34px', '13px', '17px', 'rgb(185, 119, 106)']);
    expect(getComputedStyle(inactivo!).backgroundColor).toBe('rgb(234, 217, 209)');
    expect(getComputedStyle(activo!, '::after').top).toBe('-5px');
  });

  it('oscuro: 11 px en MAYÚSCULAS; variante agregar con borde punteado', () => {
    montar('oscuro', <ChipFiltro variante="agregar">+ Etiqueta</ChipFiltro>);
    const c = estilo('.chip-filtro');
    expect([c.fontSize, c.textTransform, c.borderTopStyle]).toEqual(['11px', 'uppercase', 'dashed']);
  });
});

describe('TarjetaPrenda', () => {
  it('marca "hecho por mí": surface, borde 1 px punteado del color stitch, radio 3, 10 px', () => {
    montar('claro', <TarjetaPrenda miniaturaId="sin-imagen" nombre="Falda plisada" usos={2} variante="hecha" />);
    const m = estilo('.tarjeta-prenda-marca');
    expect(document.querySelector('.tarjeta-prenda-marca')!.textContent).toBe('hecho por mí');
    expect([m.borderTopStyle, m.borderTopWidth, m.borderTopColor, m.borderTopLeftRadius, m.fontSize]).toEqual([
      'dashed',
      '1px',
      'rgb(185, 119, 106)',
      '3px',
      '10px',
    ]);
    expect(m.backgroundColor).toBe('rgb(251, 246, 243)');
    expect(document.querySelector('.tarjeta-prenda-detalle')!.textContent).toBe('Usada 2×');
  });

  it('marca "planeada": fondo ink y texto bg; tile cuadrado con tileBg', () => {
    montar('oscuro', <TarjetaPrenda miniaturaId="sin-imagen" usos={0} variante="planeada" />);
    const m = estilo('.tarjeta-prenda-marca');
    expect([m.backgroundColor, m.color]).toEqual(['rgb(242, 239, 233)', 'rgb(15, 14, 13)']);
    const tile = document.querySelector('.tarjeta-prenda-tile')!.getBoundingClientRect();
    expect(Math.round(tile.width)).toBe(Math.round(tile.height));
    expect(estilo('.tarjeta-prenda-tile').backgroundImage).toContain('radial-gradient');
  });
});

describe('BarraInferior', () => {
  it('68 px, a 16 px de los lados y 26 px del borde, "+" de 52 px y la pestaña activa marcada', () => {
    const elegir = vi.fn();
    montar('claro', <BarraInferior activa="closet" alElegir={elegir} alAgregar={() => {}} />);
    const barra = document.querySelector('.barra-inferior')!.getBoundingClientRect();
    expect([barra.height, barra.left, innerWidth - barra.right, innerHeight - barra.bottom]).toEqual([68, 16, 16, 26]);
    const mas = document.querySelector('.barra-inferior-mas')!.getBoundingClientRect();
    expect([mas.width, mas.height]).toEqual([52, 52]);
    const pestanas = [...document.querySelectorAll<HTMLButtonElement>('.barra-inferior-pestana')];
    expect(pestanas.map((p) => p.textContent)).toEqual(['Hoy', 'Clóset', 'Taller', 'Outfits']);
    expect(pestanas[1]!.getAttribute('aria-current')).toBe('page');
    act(() => pestanas[2]!.click());
    expect(elegir).toHaveBeenCalledWith('taller');
  });
});

describe('HojaInferior', () => {
  function Contenido() {
    const { cerrar } = useHoja();
    return (
      <>
        <button type="button">Primero</button>
        <button type="button" onClick={() => cerrar()}>
          Conservarla
        </button>
      </>
    );
  }

  it('a 8 px de los lados y del borde, esquinas lg arriba y 40 px abajo, tirador de 36 × 5', () => {
    montar('claro', <HojaInferior etiqueta="Prueba" alCerrar={() => {}}><Contenido /></HojaInferior>);
    const hoja = document.querySelector('.hoja')!;
    // Se mide donde queda, no a mitad de la subida de 280 ms.
    for (const animacion of hoja.getAnimations()) animacion.finish();
    const r = hoja.getBoundingClientRect();
    expect([r.left, innerWidth - r.right, innerHeight - r.bottom]).toEqual([8, 8, 8]);
    const e = getComputedStyle(hoja);
    expect([e.borderTopLeftRadius, e.borderBottomLeftRadius]).toEqual(['28px', '40px']);
    const tirador = document.querySelector('.hoja-tirador')!.getBoundingClientRect();
    expect([tirador.width, tirador.height]).toEqual([36, 5]);
    expect(hoja.getAttribute('role')).toBe('dialog');
    expect(document.activeElement).toBe(hoja);
  });

  it('se cierra con Escape, con el scrim o desde un botón, después de la animación de salida', () => {
    vi.useFakeTimers();
    for (const accion of ['escape', 'scrim', 'boton'] as const) {
      const alCerrar = vi.fn();
      montar('claro', <HojaInferior etiqueta="Prueba" alCerrar={alCerrar}><Contenido /></HojaInferior>);
      act(() => {
        if (accion === 'escape') {
          document.querySelector('.hoja')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        } else if (accion === 'scrim') {
          document.querySelector<HTMLElement>('.hoja-scrim')!.click();
        } else {
          [...document.querySelectorAll<HTMLButtonElement>('.hoja button')].at(-1)!.click();
        }
      });
      expect(document.querySelector('.hoja')!.hasAttribute('data-saliendo')).toBe(true);
      expect(alCerrar).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(SALIDA_MS));
      expect(alCerrar).toHaveBeenCalledOnce();
      act(() => raiz?.unmount());
      contenedor?.remove();
    }
    raiz = null;
  });

  it('atrapa el foco: Tab desde el último vuelve al primero', () => {
    montar('claro', <HojaInferior etiqueta="Prueba" alCerrar={() => {}}><Contenido /></HojaInferior>);
    const [primero, ultimo] = [...document.querySelectorAll<HTMLButtonElement>('.hoja button')];
    ultimo!.focus();
    act(() => {
      document.querySelector('.hoja')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    });
    expect(document.activeElement).toBe(primero);
  });
});
