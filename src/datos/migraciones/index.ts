// Cadena de migraciones del esquema (data-model.md, *Migraciones*, principio IV).
// Una versión con migración publicada no se modifica: se agrega la siguiente al final.

import { ESQUEMA_ACTUAL } from '../tipos';
import type { Migracion, Registros } from './tipos';
import * as v1 from './v1';

export type { Migracion, Registros } from './tipos';

/** Ordenadas por versión, sin huecos, de 1 a ESQUEMA_ACTUAL. */
export const MIGRACIONES: readonly Migracion[] = [v1];

/** Mensaje de Edge Cases para un respaldo de una versión más nueva. */
export const MENSAJE_ESQUEMA_MAS_NUEVO =
  'Este respaldo es de una versión más nueva de Percha. Actualiza la app y vuelve a intentarlo.';

export class ErrorEsquemaMasNuevo extends Error {
  constructor(readonly esquema: number) {
    super(MENSAJE_ESQUEMA_MAS_NUEVO);
    this.name = 'ErrorEsquemaMasNuevo';
  }
}

/**
 * Aplica en cadena las funciones `migrar` de `desde + 1` a `hasta`. Con `desde = hasta` devuelve
 * los mismos registros. No escribe nada: quien llama decide qué hacer con el resultado.
 * `migraciones` solo cambia en las pruebas, para simular una app con un esquema más nuevo.
 */
export function migrarDatos(
  datos: Registros,
  desde: number,
  hasta: number = ESQUEMA_ACTUAL,
  migraciones: readonly Migracion[] = MIGRACIONES,
): Registros {
  const maximo = migraciones.length;
  if (!Number.isInteger(desde) || desde < 1) {
    throw new Error(`Versión de esquema inválida: ${String(desde)}`);
  }
  if (desde > maximo) {
    throw new ErrorEsquemaMasNuevo(desde);
  }
  if (!Number.isInteger(hasta) || hasta > maximo || hasta < desde) {
    throw new Error(`No se puede migrar del esquema ${desde} al ${String(hasta)}`);
  }
  let resultado = datos;
  for (let version = desde + 1; version <= hasta; version++) {
    const migracion = migraciones[version - 1];
    if (!migracion || migracion.version !== version) {
      throw new Error(`Falta la migración del esquema ${version}`);
    }
    resultado = migracion.migrar(resultado);
  }
  return resultado;
}
