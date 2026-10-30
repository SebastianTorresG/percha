// Motivos por los que no se puede usar o importar un respaldo, con el mensaje que ve la usuaria
// (contracts/respaldo.md, tabla de rechazo). Los dos últimos no están diseñados
// (desviaciones-diseno.md).

import { MENSAJE_ESQUEMA_MAS_NUEVO } from '../datos/migraciones';

export type MotivoRespaldo = 'no_es_percha' | 'version_nueva' | 'danado' | 'sin_espacio' | 'escritura';

export const MENSAJES_RESPALDO: Readonly<Record<MotivoRespaldo, string>> = {
  no_es_percha: 'Este archivo no es un respaldo de Percha.',
  version_nueva: MENSAJE_ESQUEMA_MAS_NUEVO,
  danado: 'El respaldo está dañado y no se puede usar. Tus datos no cambiaron.',
  sin_espacio:
    'No hay espacio en el teléfono para guardar una copia de lo actual y el respaldo. Primero exporta tu respaldo a Archivos y libera espacio. Tus datos no cambiaron.',
  escritura: 'No se pudo terminar de importar el respaldo. Tus datos no cambiaron.',
};

export class ErrorRespaldo extends Error {
  /** `detalle` es para el panel de diagnóstico, no para la usuaria. */
  constructor(
    readonly motivo: MotivoRespaldo,
    readonly detalle?: string,
    opciones?: { cause?: unknown },
  ) {
    super(MENSAJES_RESPALDO[motivo], opciones);
    this.name = 'ErrorRespaldo';
  }
}
