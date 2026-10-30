// Respaldo automático antes de importar (FR-003, data-model.md, *RespaldoAuto*). "Se guarda solo
// el más reciente": guardar uno nuevo borra el anterior en la misma transacción.

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { RespaldoAuto } from '../tipos';

/**
 * Guarda el ZIP como el respaldo automático y borra los demás. `conservar` deja también uno
 * anterior: al restaurar, el que se está leyendo no se borra hasta terminar.
 */
export async function guardar(blob: Blob, opciones: { conservar?: string } = {}): Promise<RespaldoAuto> {
  const nuevo: RespaldoAuto = {
    id: crypto.randomUUID(),
    creado: Date.now(),
    motivo: 'antes_de_importar',
    blob,
    bytes: blob.size,
  };
  await db.transaction('rw', db.respaldosAuto, async () => {
    const anteriores = await db.respaldosAuto.toCollection().primaryKeys();
    await db.respaldosAuto.bulkDelete(anteriores.filter((id) => id !== opciones.conservar));
    await db.respaldosAuto.add(nuevo);
  });
  return nuevo;
}

export async function obtenerUltimo(): Promise<RespaldoAuto | undefined> {
  return db.respaldosAuto.orderBy('creado').last();
}

/** Sin `id`, borra todos. */
export async function borrar(id?: string): Promise<void> {
  if (id === undefined) await db.respaldosAuto.clear();
  else await db.respaldosAuto.delete(id);
}

/** Datos del respaldo automático para Ajustes, sin el blob; `null` si no hay, `undefined` mientras carga. */
export function useRespaldoAuto(): Pick<RespaldoAuto, 'id' | 'creado' | 'bytes'> | null | undefined {
  return useLiveQuery(async () => {
    const ultimo = await obtenerUltimo();
    return ultimo ? { id: ultimo.id, creado: ultimo.creado, bytes: ultimo.bytes } : null;
  }, []);
}
