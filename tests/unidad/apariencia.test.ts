import { afterEach, describe, expect, it, vi } from 'vitest';
import html from '../../index.html?raw';
import type { Apariencia } from '../../src/datos/tipos';
import { COLOR_BARRA, aplicarTema, escucharSistema, resolverTema } from '../../src/tema/apariencia';

/** DOM mínimo: lo único que tocan el script de index.html y aplicarTema. */
function domFalso() {
  const meta = { content: '#f4ebe6', setAttribute(_: string, valor: string) { this.content = valor; } };
  const document = {
    documentElement: { dataset: {} as Record<string, string> },
    querySelector: (selector: string) => (selector === 'meta[name="theme-color"]' ? meta : null),
  };
  return { document, meta };
}

function matchMediaFalso(oscuro: { valor: boolean }) {
  const oyentes = new Set<() => void>();
  const consulta = {
    get matches() {
      return oscuro.valor;
    },
    addEventListener: (_: string, f: () => void) => oyentes.add(f),
    removeEventListener: (_: string, f: () => void) => oyentes.delete(f),
  };
  return {
    matchMedia: (q: string) => {
      expect(q).toBe('(prefers-color-scheme: dark)');
      return consulta;
    },
    cambiar(valor: boolean) {
      oscuro.valor = valor;
      for (const f of oyentes) f();
    },
    oyentes,
  };
}

/** El script inline y síncrono del <head> de index.html. */
function scriptDeTema(): string {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]!);
  const script = scripts.find((s) => s.includes('percha.apariencia'));
  if (!script) throw new Error('No se encontró el script de tema en index.html');
  return script;
}

function correrScript(guardada: string | null | 'lanza', oscuro: boolean) {
  const { document, meta } = domFalso();
  const localStorage = {
    getItem: () => {
      if (guardada === 'lanza') throw new Error('SecurityError');
      return guardada;
    },
  };
  const window = { matchMedia: matchMediaFalso({ valor: oscuro }).matchMedia };
  new Function('window', 'document', 'localStorage', scriptDeTema())(window, document, localStorage);
  return { tema: document.documentElement.dataset.theme, barra: meta.content };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('resolverTema', () => {
  it('la preferencia manual gana sobre el sistema', () => {
    expect(resolverTema('claro', true)).toBe('claro');
    expect(resolverTema('oscuro', false)).toBe('oscuro');
  });

  it('"sistema" sigue a prefers-color-scheme', () => {
    expect(resolverTema('sistema', true)).toBe('oscuro');
    expect(resolverTema('sistema', false)).toBe('claro');
  });
});

describe('script de tema de index.html (FR-062, sin parpadeo)', () => {
  const preferencias: Apariencia[] = ['sistema', 'claro', 'oscuro'];
  for (const preferencia of preferencias) {
    for (const oscuro of [false, true]) {
      it(`con "${preferencia}" y el sistema ${oscuro ? 'oscuro' : 'claro'} resuelve igual que resolverTema`, () => {
        const esperado = resolverTema(preferencia, oscuro);
        expect(correrScript(preferencia, oscuro)).toEqual({ tema: esperado, barra: COLOR_BARRA[esperado] });
      });
    }
  }

  it('sin valor guardado, con uno inválido o si localStorage falla, usa "sistema"', () => {
    for (const guardada of [null, 'azul', 'lanza'] as const) {
      expect(correrScript(guardada, true).tema).toBe('oscuro');
      expect(correrScript(guardada, false).tema).toBe('claro');
    }
  });
});

describe('aplicarTema y escucharSistema', () => {
  function instalar(oscuro: boolean) {
    const dom = domFalso();
    const media = matchMediaFalso({ valor: oscuro });
    vi.stubGlobal('document', dom.document);
    vi.stubGlobal('matchMedia', media.matchMedia);
    return { ...dom, media };
  }

  it('fija data-theme y theme-color', () => {
    const { document, meta } = instalar(false);
    expect(aplicarTema('oscuro')).toBe('oscuro');
    expect(document.documentElement.dataset.theme).toBe('oscuro');
    expect(meta.content).toBe('#0f0e0d');
  });

  it('con "sistema" cambia en vivo cuando cambia el modo del iPhone', () => {
    const { document, media } = instalar(false);
    aplicarTema('sistema');
    const dejar = escucharSistema();
    media.cambiar(true);
    expect(document.documentElement.dataset.theme).toBe('oscuro');
    media.cambiar(false);
    expect(document.documentElement.dataset.theme).toBe('claro');
    dejar();
    expect(media.oyentes.size).toBe(0);
  });

  it('con una preferencia manual no cambia aunque cambie el sistema', () => {
    const { document, media } = instalar(false);
    aplicarTema('claro');
    const dejar = escucharSistema();
    media.cambiar(true);
    expect(document.documentElement.dataset.theme).toBe('claro');
    dejar();
  });
});
