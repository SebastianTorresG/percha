/** Registros de cada tabla, por nombre de tabla. Es lo que reciben y devuelven las migraciones. */
export type Registros = Record<string, unknown[]>;

/**
 * Una versión del esquema (data-model.md, *Migraciones*):
 * - `stores`: el esquema Dexie de esa versión (`null` borra una tabla).
 * - `migrar`: función **pura** que transforma los registros de la versión N−1 a la N. No muta su
 *   entrada. Se usa igual en el `upgrade` de Dexie y al importar un respaldo de una versión anterior.
 */
export interface Migracion {
  version: number;
  stores: Readonly<Record<string, string | null>>;
  migrar: (registros: Registros) => Registros;
}
