// FR-003 y US1 escenario 5: importar sobre datos existentes guarda antes un respaldo automático
// restaurable y luego reemplaza todo en una sola transacción. Si algo falla, nada cambia.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/datos/db';
import * as respaldosAuto from '../../src/datos/repos/respaldos-auto';
import { entregar, generarRespaldoBlob, prepararArchivo } from '../../src/respaldo/exportar';
import { importar, leerRespaldo, mensajeConfirmacion, restaurarRespaldoAuto } from '../../src/respaldo/importar';
import { normalizar, ordenarPorClave } from '../fixtures/comparar';
import { conjuntoCompleto, crearAjustes, crearPrenda, sembrar } from '../fixtures/datos';
import { instantanea, leerTablas, simularEspacio, vaciarBase } from '../fixtures/respaldo';

const FECHA_B = new Date(2026, 9, 20, 21, 5);

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/** Un respaldo "B" distinto de lo que hay en la base: dos prendas y otros ajustes. */
async function respaldoB(): Promise<{ archivo: Blob; tablas: Record<string, unknown[]> }> {
  const una = crearPrenda({ nombre: 'Saco de pana', categoria: 'abrigo' });
  const otra = crearPrenda({ nombre: 'Falda midi', categoria: 'bottom' });
  await sembrar({
    prendas: [una.entidad, otra.entidad],
    imagenes: [...una.imagenes, ...otra.imagenes],
    ajustes: [crearAjustes({ apariencia: 'claro', ultimoRespaldo: undefined })],
  });
  const tablas = await leerTablas();
  const { blob } = await generarRespaldoBlob(FECHA_B);
  await vaciarBase();
  return { archivo: blob, tablas };
}

const comparable = async (tablas: Record<string, unknown[]>) => normalizar(ordenarPorClave(tablas));

describe('respaldo: reemplazo seguro', () => {
  it('con datos, guarda primero un respaldo automático restaurable y luego reemplaza todo', async () => {
    const b = await respaldoB();
    const conjunto = conjuntoCompleto();
    await sembrar(conjunto);
    const tablasA = await leerTablas();
    const autoViejo = conjunto.respaldosAuto[0]!;

    const leido = await leerRespaldo(b.archivo);
    expect(mensajeConfirmacion(leido, new Date(2026, 9, 26))).toBe(
      'Se reemplazará todo lo que hay en Percha por el contenido del respaldo del 20 de octubre. Antes guardaremos una copia de lo actual en el teléfono.',
    );
    // De otro año, la fecha lo dice.
    expect(mensajeConfirmacion(leido, new Date(2027, 0, 5))).toContain('del 20 de octubre de 2026.');
    await importar(leido);

    const ajustesB = (b.tablas.ajustes as object[]).map((a) => ({ ...a, ultimoRespaldo: FECHA_B.getTime() }));
    expect(await comparable(await leerTablas())).toEqual(await comparable({ ...b.tablas, ajustes: ajustesB }));

    // "Se guarda solo el más reciente": el automático anterior se reemplazó.
    const autos = await db.respaldosAuto.toArray();
    expect(autos).toHaveLength(1);
    expect(autos[0]!.id).not.toBe(autoViejo.id);
    expect(autos[0]).toMatchObject({ motivo: 'antes_de_importar', bytes: autos[0]!.blob.size });

    // Restaurarlo devuelve A tal como estaba, incluido su `ultimoRespaldo`.
    await restaurarRespaldoAuto();
    expect(await comparable(await leerTablas())).toEqual(await comparable(tablasA));

    // Y el automático pasa a ser lo que había justo antes de restaurar (B): se puede deshacer.
    const [intercambiado] = await db.respaldosAuto.toArray();
    expect(intercambiado!.id).not.toBe(autos[0]!.id);
    const deshacer = await leerRespaldo(intercambiado!.blob);
    expect(deshacer.datos.prendas.map((p) => p.nombre).sort()).toEqual(['Falda midi', 'Saco de pana']);
  });

  it('en una base sin datos no pide confirmación ni guarda un respaldo automático', async () => {
    const b = await respaldoB();
    const leido = await leerRespaldo(b.archivo);
    await importar(leido);
    expect(await db.respaldosAuto.count()).toBe(0);
  });

  it('una falla en la escritura deja intactos los datos anteriores y el respaldo automático', async () => {
    const b = await respaldoB();
    await sembrar(conjuntoCompleto());
    const tablasA = await leerTablas();
    const leido = await leerRespaldo(b.archivo);

    vi.spyOn(db.outfits, 'bulkAdd').mockRejectedValueOnce(new Error('falla simulada'));
    await expect(importar(leido)).rejects.toMatchObject({ motivo: 'escritura' });

    expect(await comparable(await leerTablas())).toEqual(await comparable(tablasA));
    const [auto] = await db.respaldosAuto.toArray();
    const copia = await leerRespaldo(auto!.blob);
    expect(copia.datos.prendas).toHaveLength(7);

    // Si lo que falla es la cuota a mitad de camino, el mensaje es el de falta de espacio.
    vi.spyOn(db.usosDia, 'bulkAdd').mockRejectedValueOnce(new DOMException('Sin espacio', 'QuotaExceededError'));
    await expect(importar(leido)).rejects.toMatchObject({ motivo: 'sin_espacio' });
    expect(await comparable(await leerTablas())).toEqual(await comparable(tablasA));
  });

  it('sin espacio para el respaldo automático y lo importado, se detiene antes y no cambia nada', async () => {
    const b = await respaldoB();
    await sembrar(conjuntoCompleto());
    const antes = await instantanea();
    const leido = await leerRespaldo(b.archivo);

    simularEspacio(95_000_000, 100_000_000);
    const intento = importar(leido);
    await expect(intento).rejects.toMatchObject({ motivo: 'sin_espacio' });
    await expect(intento).rejects.toThrow(/Primero exporta tu respaldo a Archivos/);
    expect(await instantanea()).toEqual(antes);
  });

  it('restaurar el automático usa la misma validación: uno dañado no toca nada', async () => {
    await sembrar(conjuntoCompleto());
    const antes = await instantanea();
    // El automático del conjunto es un PNG, no un ZIP.
    await expect(restaurarRespaldoAuto()).rejects.toMatchObject({ motivo: 'no_es_percha' });
    expect(await instantanea()).toEqual(antes);
  });

  it('respaldosAuto.guardar deja solo el más reciente', async () => {
    await sembrar(conjuntoCompleto());
    const nuevo = await respaldosAuto.guardar(new Blob(['zip'], { type: 'application/zip' }));
    expect((await db.respaldosAuto.toArray()).map((r) => r.id)).toEqual([nuevo.id]);
    expect((await respaldosAuto.obtenerUltimo())?.id).toBe(nuevo.id);
    await respaldosAuto.borrar();
    expect(await respaldosAuto.obtenerUltimo()).toBeUndefined();
  });
});

describe('exportar: ultimoRespaldo solo si la entrega se completa', () => {
  const AHORA = new Date(2026, 9, 26, 10, 0);

  async function ultimoRespaldo() {
    return (await db.ajustes.get('ajustes'))?.ultimoRespaldo;
  }

  async function preparar() {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(AHORA);
    await sembrar({ ajustes: [crearAjustes({ ultimoRespaldo: 5 })] });
    return prepararArchivo();
  }

  it('con la hoja de compartir completada, lo fija a ahora', async () => {
    const archivo = await preparar();
    expect(archivo.name).toBe('Percha-respaldo-2026-10-26.zip');
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, canShare: () => true, share });
    expect(await entregar(archivo)).toBe('compartido');
    expect(share).toHaveBeenCalledWith({ files: [archivo] });
    expect(await ultimoRespaldo()).toBe(AHORA.getTime());
  });

  it('si la usuaria cancela la hoja de compartir, no cambia', async () => {
    const archivo = await preparar();
    vi.stubGlobal('navigator', { ...navigator, canShare: () => true, share: () => Promise.reject(new DOMException('', 'AbortError')) });
    expect(await entregar(archivo)).toBe('cancelado');
    expect(await ultimoRespaldo()).toBe(5);
  });

  it('si iOS pide otro toque (se venció la activación del usuario), no cambia y lo avisa', async () => {
    const archivo = await preparar();
    vi.stubGlobal('navigator', { ...navigator, canShare: () => true, share: () => Promise.reject(new DOMException('', 'NotAllowedError')) });
    expect(await entregar(archivo)).toBe('necesita_toque');
    expect(await ultimoRespaldo()).toBe(5);
  });

  it('sin hoja de compartir para archivos, descarga con <a download> y lo fija', async () => {
    const archivo = await preparar();
    const enlace = { href: '', download: '', click: vi.fn(), remove: vi.fn() };
    vi.stubGlobal('navigator', { ...navigator, canShare: () => false });
    vi.stubGlobal('document', { createElement: () => enlace, body: { append: vi.fn() } });
    expect(await entregar(archivo)).toBe('descargado');
    expect(enlace.download).toBe('Percha-respaldo-2026-10-26.zip');
    expect(enlace.href).toMatch(/^blob:/);
    expect(enlace.click).toHaveBeenCalledOnce();
    expect(await ultimoRespaldo()).toBe(AHORA.getTime());
  });
});
