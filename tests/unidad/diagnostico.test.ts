import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_EVENTOS,
  contarRed,
  esMensajeRedWorker,
  esSolicitudDeRed,
  fijarComponente,
  obtenerEstado,
  registrar,
  registrarError,
  registrarTiempo,
  reiniciar,
  suscribir,
} from '../../src/diagnostico/registro';

beforeEach(() => {
  reiniciar();
  vi.stubGlobal('location', new URL('https://percha.example/'));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('registro de diagnóstico', () => {
  it('guarda solo los últimos 50 eventos', () => {
    for (let i = 0; i < MAX_EVENTOS + 7; i++) registrar('info', `evento ${i}`);
    const { eventos } = obtenerEstado();
    expect(eventos).toHaveLength(MAX_EVENTOS);
    expect(eventos[0]!.mensaje).toBe('evento 7');
    expect(eventos.at(-1)!.mensaje).toBe(`evento ${MAX_EVENTOS + 6}`);
  });

  it('registra errores con contexto y tiempos redondeados', () => {
    registrarError(new TypeError('falló'), 'Recorte');
    registrarTiempo('recorte', 3012.4);
    expect(obtenerEstado().eventos).toMatchObject([
      { tipo: 'error', mensaje: 'Recorte: TypeError: falló' },
      { tipo: 'tiempo', mensaje: 'recorte', ms: 3012 },
    ]);
  });

  it('avisa a los suscriptores', () => {
    const oyente = vi.fn();
    const dejar = suscribir(oyente);
    fijarComponente('recortador', 'imgly-1.7.0-isnet_quint8-cpu');
    expect(oyente).toHaveBeenCalledOnce();
    expect(obtenerEstado().componentes).toEqual({ recortador: 'imgly-1.7.0-isnet_quint8-cpu' });
    dejar();
  });
});

describe('contador de red', () => {
  it('no cuenta blob:, data: ni lo servido desde caché', () => {
    expect(esSolicitudDeRed({ name: 'blob:https://percha.example/1' })).toBe(false);
    expect(esSolicitudDeRed({ name: 'data:image/png;base64,AAAA' })).toBe(false);
    expect(esSolicitudDeRed({ name: 'https://percha.example/assets/a.js', transferSize: 0 })).toBe(false);
    expect(esSolicitudDeRed({ name: 'https://percha.example/assets/a.js', transferSize: 812 })).toBe(true);
  });

  it('si el navegador no informa transferSize, cuenta la solicitud', () => {
    expect(esSolicitudDeRed({ name: 'https://percha.example/modelos/x' })).toBe(true);
  });

  it('separa página, workers y otros orígenes', () => {
    contarRed('pagina', ['https://percha.example/a.js', 'https://fonts.googleapis.com/css']);
    contarRed('workers', ['https://staticimgly.com/modelo']);
    expect(obtenerEstado().red).toMatchObject({ pagina: 2, workers: 1, otrosOrigenes: 2 });
  });

  it('reconoce los mensajes de los workers', () => {
    expect(esMensajeRedWorker({ tipo: 'percha-diagnostico-red', urls: ['x'] })).toBe(true);
    expect(esMensajeRedWorker({ tipo: 'otro', urls: [] })).toBe(false);
    expect(esMensajeRedWorker(null)).toBe(false);
  });
});
