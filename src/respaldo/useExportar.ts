// Estado del botón "Exportar" de Ajustes y de "Respaldar" del aviso de Hoy. Armar el archivo puede
// tardar unos segundos; si en ese tiempo iOS da por vencido el toque, no abre la hoja de compartir
// y hay que pedir un segundo toque con el archivo ya listo ("Guardar el respaldo").

import Dexie, { type ObservabilitySet } from 'dexie';
import { useCallback, useEffect, useState } from 'react';
import { NOMBRE_DB } from '../datos/db';
import { registrarError } from '../diagnostico/registro';
import { entregar, prepararArchivo, type ResultadoEntrega } from './exportar';

const PREFIJO_DB = `idb://${NOMBRE_DB}/`;

/** Si una escritura tocó algo que va en el respaldo (todo menos la copia automática). */
export function cambiaronLosDatos(partes: ObservabilitySet): boolean {
  return Object.keys(partes).some((parte) => parte.startsWith(PREFIJO_DB) && !parte.startsWith(`${PREFIJO_DB}respaldosAuto/`));
}

export type EstadoExportar =
  | { fase: 'inactivo' }
  | { fase: 'preparando' }
  | { fase: 'listo'; archivo: File }
  | { fase: 'error'; mensaje: string };

export const MENSAJE_ERROR_EXPORTAR = 'No se pudo preparar el respaldo. Vuelve a intentarlo.';

export function useExportar() {
  const [estado, setEstado] = useState<EstadoExportar>({ fase: 'inactivo' });

  // El archivo listo es una foto de los datos al armarlo. Si cambian mientras espera el segundo
  // toque (por ejemplo, se importó otro respaldo), se descarta: guardarlo marcaría como respaldado
  // lo que no está en él.
  useEffect(() => {
    if (estado.fase !== 'listo') return;
    const alCambiar = (partes: ObservabilitySet) => {
      if (cambiaronLosDatos(partes)) setEstado({ fase: 'inactivo' });
    };
    Dexie.on.storagemutated.subscribe(alCambiar);
    return () => Dexie.on.storagemutated.unsubscribe(alCambiar);
  }, [estado.fase]);

  const tras = useCallback((archivo: File, resultado: ResultadoEntrega) => {
    setEstado(resultado === 'necesita_toque' ? { fase: 'listo', archivo } : { fase: 'inactivo' });
  }, []);

  const exportar = useCallback(async () => {
    setEstado({ fase: 'preparando' });
    try {
      const archivo = await prepararArchivo();
      tras(archivo, await entregar(archivo));
    } catch (error) {
      registrarError(error, 'Exportar respaldo');
      setEstado({ fase: 'error', mensaje: MENSAJE_ERROR_EXPORTAR });
    }
  }, [tras]);

  /** Segundo toque, con el archivo ya armado: la hoja de compartir se abre enseguida. */
  const guardar = useCallback(async () => {
    if (estado.fase !== 'listo') return;
    const { archivo } = estado;
    try {
      tras(archivo, await entregar(archivo));
    } catch (error) {
      registrarError(error, 'Guardar respaldo');
      setEstado({ fase: 'error', mensaje: MENSAJE_ERROR_EXPORTAR });
    }
  }, [estado, tras]);

  return { estado, exportar, guardar };
}
