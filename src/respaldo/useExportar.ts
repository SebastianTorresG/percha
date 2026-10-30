// Estado del botón "Exportar" de Ajustes y de "Respaldar" del aviso de Hoy. Armar el archivo puede
// tardar unos segundos; si en ese tiempo iOS da por vencido el toque, no abre la hoja de compartir
// y hay que pedir un segundo toque con el archivo ya listo ("Guardar el respaldo").

import { useCallback, useState } from 'react';
import { registrarError } from '../diagnostico/registro';
import { entregar, prepararArchivo, type ResultadoEntrega } from './exportar';

export type EstadoExportar =
  | { fase: 'inactivo' }
  | { fase: 'preparando' }
  | { fase: 'listo'; archivo: File }
  | { fase: 'error'; mensaje: string };

export const MENSAJE_ERROR_EXPORTAR = 'No se pudo preparar el respaldo. Vuelve a intentarlo.';

export function useExportar() {
  const [estado, setEstado] = useState<EstadoExportar>({ fase: 'inactivo' });

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
