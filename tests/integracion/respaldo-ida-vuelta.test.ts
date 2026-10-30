// SC-001: un respaldo exportado se importa en una instalación limpia y restaura todo, con los
// mismos registros y los mismos bytes de cada imagen (contracts/respaldo.md, *Pruebas de contrato*).

import { afterEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/datos/db';
import { CLAVE_APARIENCIA } from '../../src/datos/repos/ajustes';
import { idSiluetaIncluida, type Silueta } from '../../src/datos/tipos';
import { generarRespaldoBlob, nombreArchivo } from '../../src/respaldo/exportar';
import { importar, leerRespaldo } from '../../src/respaldo/importar';
import { leerZip } from '../../src/respaldo/zip-lector';
import { normalizar, ordenarPorClave } from '../fixtures/comparar';
import { conjuntoCompleto, crearAjustes, sembrar } from '../fixtures/datos';
import { leerTablas, vaciarBase } from '../fixtures/respaldo';
import { rehacerZip } from '../fixtures/zip-ajeno';

const FECHA = new Date(2026, 9, 26, 8, 15);

afterEach(() => {
  vi.unstubAllGlobals();
});

async function json(archivo: Blob, nombre: string): Promise<Record<string, unknown>> {
  const entrada = (await leerZip(archivo)).find((e) => e.nombre === nombre)!;
  return JSON.parse(await (await entrada.obtener()).text());
}

/** Lo que debería quedar después de importar: lo mismo, con `ultimoRespaldo` = fecha del archivo. */
function esperado(antes: Record<string, unknown[]>) {
  const ajustes = antes.ajustes!.map((a) => ({ ...(a as object), ultimoRespaldo: FECHA.getTime() }));
  return normalizar(ordenarPorClave({ ...antes, ajustes }));
}

describe('respaldo: ida y vuelta', () => {
  it('exportar → instalación limpia → importar deja las 9 tablas y los bytes de cada imagen iguales', async () => {
    const conjunto = conjuntoCompleto();
    await sembrar(conjunto);
    const antes = await leerTablas();

    const { blob, manifest } = await generarRespaldoBlob(FECHA);
    await vaciarBase();
    await importar(await leerRespaldo(blob));

    expect(await normalizar(ordenarPorClave(await leerTablas()))).toEqual(await esperado(antes));
    // En una instalación limpia no había nada que guardar antes.
    expect(await db.respaldosAuto.count()).toBe(0);
    expect(manifest.conteos).toEqual({
      prendas: 7,
      imagenes: conjunto.imagenes.length,
      siluetas: 1,
      maniquies: 2,
      outfits: 2,
      calendario: 2,
      usosDia: 1,
    });
  });

  it('el archivo: manifest primero, una entrada por imagen, sin respaldosAuto ni siluetas incluidas', async () => {
    const conjunto = conjuntoCompleto();
    const incluida: Silueta = { ...conjunto.siluetas[0]!, id: idSiluetaIncluida('blusa'), origen: 'incluida' };
    await sembrar({ ...conjunto, siluetas: [...conjunto.siluetas, incluida] });

    const { blob } = await generarRespaldoBlob(FECHA);
    const entradas = await leerZip(blob);
    expect(entradas[0]!.nombre).toBe('manifest.json');
    expect(entradas[1]!.nombre).toBe('datos.json');
    expect(entradas.map((e) => e.metodo).every((m) => m === 0)).toBe(true);
    expect(entradas.slice(2).map((e) => e.nombre).sort()).toEqual(
      conjunto.imagenes.map((i) => `imagenes/${i.id}.${i.blob.type === 'image/png' ? 'png' : 'jpg'}`).sort(),
    );

    const manifest = await json(blob, 'manifest.json');
    expect(manifest).toMatchObject({ app: 'percha', formato: 1, esquema: 1, versionApp: 'pruebas' });
    expect(Date.parse(manifest.creado as string)).toBe(FECHA.getTime());

    const datos = await json(blob, 'datos.json');
    expect(Object.keys(datos).sort()).toEqual(
      ['ajustes', 'calendario', 'maniquies', 'medidas', 'outfits', 'prendas', 'siluetas', 'usosDia'].sort(),
    );
    expect((datos.siluetas as Silueta[]).map((s) => s.id)).toEqual([conjunto.siluetas[0]!.id]);
  });

  it('el nombre del archivo lleva la fecha local', () => {
    expect(nombreArchivo(FECHA)).toBe('Percha-respaldo-2026-10-26.zip');
  });

  it('un respaldo re-comprimido con deflate, dentro de una carpeta y con basura de Mac, se importa igual', async () => {
    await sembrar(conjuntoCompleto());
    const antes = await leerTablas();
    const { blob } = await generarRespaldoBlob(FECHA);
    const rehecho = await rehacerZip(blob, {
      carpeta: 'Percha-respaldo-2026-10-26/',
      agregar: [{ nombre: '__MACOSX/Percha-respaldo-2026-10-26/._manifest.json', datos: new Uint8Array([0, 5, 22, 7]) }],
    });

    await vaciarBase();
    await importar(await leerRespaldo(rehecho));
    expect(await normalizar(ordenarPorClave(await leerTablas()))).toEqual(await esperado(antes));
  });

  it('sin medidas ni ajustes guardados, importa y deja solo los ajustes con la fecha del respaldo', async () => {
    const { blob } = await generarRespaldoBlob(FECHA);
    await importar(await leerRespaldo(blob));
    expect(await db.medidas.count()).toBe(0);
    expect(await db.ajustes.toArray()).toEqual([
      { id: 'ajustes', apariencia: 'sistema', onboarding: 'pendiente', chipArmadorVisto: 0, ultimoRespaldo: FECHA.getTime() },
    ]);
  });

  it('vuelve a copiar la apariencia del respaldo a localStorage', async () => {
    const guardado = new Map<string, string>();
    vi.stubGlobal('localStorage', { setItem: (k: string, v: string) => guardado.set(k, v), getItem: (k: string) => guardado.get(k) ?? null });
    await sembrar({ ajustes: [crearAjustes({ apariencia: 'oscuro' })] });
    const { blob } = await generarRespaldoBlob(FECHA);
    await vaciarBase();
    await importar(await leerRespaldo(blob));
    expect(guardado.get(CLAVE_APARIENCIA)).toBe('oscuro');
  });
});
