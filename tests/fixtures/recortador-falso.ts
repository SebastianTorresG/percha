// Recortador falso para las pruebas (T037): implementa el contrato `Recortador` sin modelo. Devuelve
// siempre la misma foto de 48 × 64 con una máscara elíptica fija, simula la descarga del modelo con
// progreso y permite forzar un error o una cobertura vacía. Cuando exista src/recorte/recortador.ts
// (T062), los tipos se importan de ahí.

import type {
  EstadoRecortador,
  OpcionesRecorte,
  Recortador,
  ResultadoRecorte,
} from '../../specs/001-percha-closet-taller/contracts/recortador';
import { blobDe, fotoJpeg, mascaraPng, mascaraVaciaPng } from './imagenes/imagenes';

export interface ConfiguracionRecortadorFalso {
  /** Si se define, `preparar` falla con este mensaje (y el estado queda en `error`). */
  errorAlPreparar?: string;
  /** Si se define, `recortar` falla con este mensaje. */
  errorAlRecortar?: string;
  /** Devuelve una máscara toda negra (cobertura 0): "no se encontró la prenda". */
  coberturaVacia?: boolean;
  /** Pasos de progreso de la descarga simulada. */
  pasosDescarga?: number;
  /** Bytes totales de la descarga simulada (por defecto, los ~56 MB del modelo de R-9). */
  bytesModelo?: number;
  duracionMs?: number;
}

/** Fracción de la elipse de 18 × 26 de radio en 48 × 64 (π · 18 · 26 / 3072). */
export const COBERTURA_ELIPSE = (Math.PI * 18 * 26) / (48 * 64);

const esperarTurno = () => new Promise<void>((r) => setTimeout(r, 0));

export class RecortadorFalso implements Recortador {
  readonly id = 'falso-elipse';
  readonly llamadas = { preparar: 0, recortar: 0 };
  private estadoActual: EstadoRecortador = { tipo: 'sin_preparar' };
  private preparando: Promise<void> | null = null;

  constructor(private configuracion: ConfiguracionRecortadorFalso = {}) {}

  configurar(cambios: ConfiguracionRecortadorFalso): void {
    this.configuracion = { ...this.configuracion, ...cambios };
  }

  estado(): EstadoRecortador {
    return this.estadoActual;
  }

  preparar(progreso?: (bytes: number, total: number) => void): Promise<void> {
    this.llamadas.preparar++;
    if (this.estadoActual.tipo === 'listo') return Promise.resolve();
    // Idempotente: dos llamadas seguidas comparten la misma descarga.
    this.preparando ??= this.descargar(progreso).finally(() => {
      this.preparando = null;
    });
    return this.preparando;
  }

  async recortar(_foto: Blob, opciones: OpcionesRecorte = {}): Promise<ResultadoRecorte> {
    this.llamadas.recortar++;
    opciones.senal?.throwIfAborted();
    await this.preparar();
    await esperarTurno();
    opciones.senal?.throwIfAborted();
    const { errorAlRecortar, coberturaVacia, duracionMs = 1200 } = this.configuracion;
    if (errorAlRecortar) throw new Error(errorAlRecortar);
    return {
      original: blobDe(fotoJpeg),
      mascara: blobDe(coberturaVacia ? mascaraVaciaPng : mascaraPng),
      anchoPx: fotoJpeg.ancho,
      altoPx: fotoJpeg.alto,
      cobertura: coberturaVacia ? 0 : COBERTURA_ELIPSE,
      duracionMs,
    };
  }

  private async descargar(progreso?: (bytes: number, total: number) => void): Promise<void> {
    const { errorAlPreparar, pasosDescarga = 4, bytesModelo = 56 * 1024 * 1024 } = this.configuracion;
    for (let paso = 1; paso <= pasosDescarga; paso++) {
      await esperarTurno();
      const bytes = Math.round((bytesModelo * paso) / pasosDescarga);
      this.estadoActual = { tipo: 'descargando', bytes, total: bytesModelo };
      progreso?.(bytes, bytesModelo);
      if (errorAlPreparar && paso === Math.ceil(pasosDescarga / 2)) {
        this.estadoActual = { tipo: 'error', mensaje: errorAlPreparar };
        throw new Error(errorAlPreparar);
      }
    }
    this.estadoActual = { tipo: 'listo' };
  }
}
