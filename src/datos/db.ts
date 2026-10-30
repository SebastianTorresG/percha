// Base IndexedDB `percha` con Dexie 4 (research R-4, data-model.md).
// Cada versión de MIGRACIONES se registra con su `stores` y, desde la v2, con un `upgrade` que
// aplica la misma función pura `migrar` que usa la importación de respaldos. Si un `upgrade` falla,
// Dexie revierte la transacción y la base queda en la versión anterior.

import Dexie, { type EntityTable, type Transaction } from 'dexie';
import { MIGRACIONES, type Migracion, type Registros } from './migraciones';
import type {
  Ajustes,
  Calendario,
  Imagen,
  Maniqui,
  Medidas,
  Outfit,
  Prenda,
  RespaldoAuto,
  Silueta,
  UsosDia,
} from './tipos';

export const NOMBRE_DB = 'percha';

export class PerchaDB extends Dexie {
  // `declare` para que los campos de clase no pisen las tablas que crea Dexie.
  declare prendas: EntityTable<Prenda, 'id'>;
  declare imagenes: EntityTable<Imagen, 'id'>;
  declare siluetas: EntityTable<Silueta, 'id'>;
  declare maniquies: EntityTable<Maniqui, 'id'>;
  declare outfits: EntityTable<Outfit, 'id'>;
  declare calendario: EntityTable<Calendario, 'fecha'>;
  declare usosDia: EntityTable<UsosDia, 'fecha'>;
  declare medidas: EntityTable<Medidas, 'id'>;
  declare ajustes: EntityTable<Ajustes, 'id'>;
  declare respaldosAuto: EntityTable<RespaldoAuto, 'id'>;

  /** `migraciones` solo cambia en las pruebas del mecanismo de upgrade. */
  constructor(nombre: string = NOMBRE_DB, migraciones: readonly Migracion[] = MIGRACIONES) {
    super(nombre);
    let tablas: string[] = [];
    for (const migracion of migraciones) {
      const version = this.version(migracion.version).stores({ ...migracion.stores });
      if (migracion.version > 1) {
        const tablasAnteriores = tablas;
        version.upgrade((tx) => aplicarMigracion(tx, migracion, tablasAnteriores));
      }
      tablas = tablasDe(tablas, migracion);
    }
  }
}

function tablasDe(anteriores: string[], migracion: Migracion): string[] {
  const tablas = new Set(anteriores);
  for (const [tabla, esquema] of Object.entries(migracion.stores)) {
    if (esquema === null) tablas.delete(tabla);
    else tablas.add(tabla);
  }
  return [...tablas];
}

/**
 * Lee todas las tablas de la versión anterior, aplica `migrar` y reescribe solo las tablas cuyo
 * arreglo cambió: una migración que no toca una tabla devuelve el mismo arreglo, y así no se
 * reescriben, por ejemplo, cientos de megas de imágenes.
 */
async function aplicarMigracion(tx: Transaction, migracion: Migracion, tablasAnteriores: string[]): Promise<void> {
  const registros: Registros = {};
  for (const tabla of tablasAnteriores) {
    registros[tabla] = await tx.table(tabla).toArray();
  }
  const migrados = migracion.migrar(registros);
  for (const [tabla, filas] of Object.entries(migrados)) {
    if (migracion.stores[tabla] === null || filas === registros[tabla]) continue;
    await tx.table(tabla).clear();
    await tx.table(tabla).bulkPut(filas);
  }
}

/** Instancia única de la app. */
export const db = new PerchaDB();
