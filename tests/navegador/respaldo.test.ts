// El respaldo en WebKit real (el motor de Safari), con IndexedDB de verdad: los Blob guardados se
// referencian en el ZIP sin copiarlos, los `slice` del archivo se pueden guardar en IndexedDB y
// `DecompressionStream('deflate-raw')` lee un respaldo re-comprimido.

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/datos/db';
import { generarRespaldoBlob, prepararArchivo } from '../../src/respaldo/exportar';
import { importar, leerRespaldo } from '../../src/respaldo/importar';
import { normalizar, ordenarPorClave } from '../fixtures/comparar';
import { conjuntoCompleto, sembrar } from '../fixtures/datos';
import { leerTablas, vaciarBase } from '../fixtures/respaldo';
import { rehacerZip } from '../fixtures/zip-ajeno';

const FECHA = new Date(2026, 9, 26, 8, 15);

beforeEach(vaciarBase);
afterAll(vaciarBase);

async function esperado(antes: Record<string, unknown[]>) {
  const ajustes = antes.ajustes!.map((a) => ({ ...(a as object), ultimoRespaldo: FECHA.getTime() }));
  return normalizar(ordenarPorClave({ ...antes, ajustes }));
}

describe('respaldo en WebKit', () => {
  it('ida y vuelta con IndexedDB real: registros y bytes iguales', async () => {
    await sembrar(conjuntoCompleto());
    const antes = await leerTablas();
    const { blob } = await generarRespaldoBlob(FECHA);
    await vaciarBase();
    await importar(await leerRespaldo(blob));
    expect(await normalizar(ordenarPorClave(await leerTablas()))).toEqual(await esperado(antes));
    // Las imágenes importadas conservan su tipo MIME (vienen de `slice` con tipo).
    expect(new Set((await db.imagenes.toArray()).map((i) => i.blob.type))).toEqual(new Set(['image/png', 'image/jpeg']));
  });

  it('un respaldo re-comprimido con deflate dentro de una carpeta se importa igual', async () => {
    await sembrar(conjuntoCompleto());
    const antes = await leerTablas();
    const { blob } = await generarRespaldoBlob(FECHA);
    const rehecho = await rehacerZip(blob, { carpeta: 'Percha-respaldo-2026-10-26/' });
    await vaciarBase();
    await importar(await leerRespaldo(rehecho));
    expect(await normalizar(ordenarPorClave(await leerTablas()))).toEqual(await esperado(antes));
  });

  it('el archivo para compartir es un File .zip que navigator.canShare puede evaluar', async () => {
    await sembrar(conjuntoCompleto());
    const archivo = await prepararArchivo(FECHA);
    expect(archivo).toBeInstanceOf(File);
    expect([archivo.name, archivo.type]).toEqual(['Percha-respaldo-2026-10-26.zip', 'application/zip']);
    // En el WebKit de escritorio puede no existir; en el iPhone se anota en quickstart (T056).
    if (typeof navigator.canShare === 'function') expect(typeof navigator.canShare({ files: [archivo] })).toBe('boolean');
  });
});
