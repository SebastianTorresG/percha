// Esquema v1 (data-model.md, *Esquema Dexie v1*). Publicado: no se modifica. Un cambio de esquema
// va en un módulo v2.ts nuevo, con su `migrar` y su fixture en tests/fixtures/esquemas/v2/.

import type { Registros } from './tipos';

export const version = 1;

export const stores = {
  prendas: 'id, categoria, enCloset, estadoTaller, origen, *etiquetas, ultimoUso, creada',
  imagenes: 'id, tipo',
  siluetas: 'id, origen',
  maniquies: 'id, principal',
  outfits: 'id, maniquiId, *etiquetas, *prendaIds, actualizado',
  calendario: 'fecha, outfitId',
  usosDia: 'fecha',
  medidas: 'id',
  ajustes: 'id',
  respaldosAuto: 'id, creado',
} as const;

/** v1 es la primera versión: no hay nada que transformar. */
export function migrar(registros: Registros): Registros {
  return registros;
}
