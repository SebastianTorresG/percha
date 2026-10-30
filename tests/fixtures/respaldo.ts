// Ayudas para las pruebas del respaldo (T041–T044): leer la base completa para comparar, vaciarla
// como una instalación limpia y armar respaldos alterados a partir de uno válido.

import Dexie from 'dexie';
import { vi } from 'vitest';
import { db, NOMBRE_DB } from '../../src/datos/db';
import { crc32 } from '../../src/respaldo/crc32';
import { escribirZip, type EntradaZip } from '../../src/respaldo/zip-escritor';
import { leerZip } from '../../src/respaldo/zip-lector';
import { normalizar, ordenarPorClave } from './comparar';

/** Las 9 tablas que van en el respaldo (todas menos `respaldosAuto`). */
export const TABLAS_EXPORTADAS = [
  'prendas',
  'imagenes',
  'siluetas',
  'maniquies',
  'outfits',
  'calendario',
  'usosDia',
  'medidas',
  'ajustes',
] as const;

export async function leerTablas(tablas: readonly string[] = TABLAS_EXPORTADAS): Promise<Record<string, unknown[]>> {
  const salida: Record<string, unknown[]> = {};
  for (const tabla of tablas) salida[tabla] = await db.table(tabla).toArray();
  return salida;
}

/** Toda la base, incluido `respaldosAuto`, normalizada (Blob → bytes) y ordenada para `toEqual`. */
export async function instantanea(): Promise<unknown> {
  return normalizar(ordenarPorClave(await leerTablas([...TABLAS_EXPORTADAS, 'respaldosAuto'])));
}

/** Como borrar la app y reinstalarla: la base `percha` deja de existir. */
export async function vaciarBase(): Promise<void> {
  db.close({ disableAutoOpen: false });
  await Dexie.delete(NOMBRE_DB);
}

/** `navigator.storage.estimate()` con el uso y la cuota dados. */
export function simularEspacio(usado: number, cuota: number): void {
  vi.stubGlobal('navigator', { ...globalThis.navigator, storage: { estimate: async () => ({ usage: usado, quota: cuota }) } });
}

const texto = (s: string) => new TextEncoder().encode(s);

export interface CambiosRespaldo {
  manifest?: (manifest: Record<string, unknown>) => unknown;
  /** Recibe el texto de `datos.json`; devolver un objeto lo vuelve a serializar. */
  datos?: (datos: Record<string, unknown>) => unknown;
  /** Texto crudo de `datos.json`, para probar un JSON inválido. */
  datosCrudos?: string;
  quitar?: readonly string[];
  /** Reemplaza el contenido de una entrada (por ruta), por ejemplo para cambiar los bytes de una imagen. */
  reemplazar?: Readonly<Record<string, Uint8Array<ArrayBuffer>>>;
}

const TABLAS_CONTADAS = ['prendas', 'siluetas', 'maniquies', 'outfits', 'calendario', 'usosDia'];

/**
 * Lee un respaldo válido, le aplica los cambios y lo vuelve a escribir como ZIP. Si cambia
 * datos.json, también actualiza `manifest.conteos`, para que cada prueba llegue a la regla que
 * quiere probar y no la frene antes el conteo.
 */
export async function alterarRespaldo(archivo: Blob, cambios: CambiosRespaldo): Promise<Blob> {
  const leidas: { nombre: string; datos: Uint8Array<ArrayBuffer> }[] = [];
  for (const entrada of await leerZip(archivo)) {
    if (cambios.quitar?.includes(entrada.nombre)) continue;
    leidas.push({ nombre: entrada.nombre, datos: new Uint8Array(await (await entrada.obtener()).arrayBuffer()) });
  }
  const json = (datos: Uint8Array) => JSON.parse(new TextDecoder().decode(datos)) as Record<string, unknown>;

  let datosNuevos: Record<string, unknown> | undefined;
  for (const leida of leidas) {
    if (leida.nombre !== 'datos.json') continue;
    if (cambios.datos) {
      datosNuevos = cambios.datos(json(leida.datos)) as Record<string, unknown>;
      leida.datos = texto(JSON.stringify(datosNuevos));
    }
    if (cambios.datosCrudos !== undefined) leida.datos = texto(cambios.datosCrudos);
  }
  for (const leida of leidas) {
    if (leida.nombre !== 'manifest.json' || !(cambios.manifest || datosNuevos)) continue;
    let manifest = json(leida.datos);
    if (datosNuevos) {
      const conteos = { ...(manifest.conteos as Record<string, number>) };
      for (const tabla of TABLAS_CONTADAS) {
        const filas = datosNuevos[tabla];
        if (Array.isArray(filas)) conteos[tabla] = filas.length;
      }
      manifest = { ...manifest, conteos };
    }
    if (cambios.manifest) manifest = cambios.manifest(manifest) as Record<string, unknown>;
    leida.datos = texto(JSON.stringify(manifest));
  }

  const entradas: EntradaZip[] = leidas.map(({ nombre, datos: original }) => {
    const datos = cambios.reemplazar?.[nombre] ?? original;
    return { nombre, datos, crc32: crc32(datos), bytes: datos.length };
  });
  return escribirZip(entradas);
}
