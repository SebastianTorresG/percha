/**
 * Contrato del recorte de fondos — Percha
 *
 * Fuente: research.md R-0 y R-1. Toda la app depende de esta interfaz, nunca de
 * @imgly/background-removal directamente. Si el spike en iPhone falla, se cambia la
 * implementación (A1 ONNX Runtime directo, A2 MediaPipe InteractiveSegmenter, A3 menor
 * resolución) sin tocar Agregar prenda, Maniquíes ni el Taller.
 *
 * La implementación corre en un Web Worker; la interfaz vive en el hilo principal.
 */

export type EstadoRecortador =
  | { tipo: 'sin_preparar' }
  | { tipo: 'descargando'; bytes: number; total: number }
  | { tipo: 'listo' }
  | { tipo: 'error'; mensaje: string };

export interface OpcionesRecorte {
  /** Lado mayor máximo con el que se procesa (por defecto 1500; ⏳ spike). */
  ladoMaximo?: number;
  /** Para cancelar si la app pasa a segundo plano o la usuaria toca "Otra foto". */
  senal?: AbortSignal;
}

export interface ResultadoRecorte {
  /** Foto de entrada ya redimensionada y con la orientación EXIF aplicada (JPEG). Es la "original". */
  original: Blob;
  /** Máscara en escala de grises del mismo tamaño que `original` (PNG; blanco = prenda). */
  mascara: Blob;
  anchoPx: number;
  altoPx: number;
  /** Fracción de píxeles opacos; si es < 0,02 la interfaz ofrece "Otra foto" o el Pincel. */
  cobertura: number;
  /** Milisegundos del recorte, sin la descarga; se muestra en el panel de diagnóstico (SC-002). */
  duracionMs: number;
}

export interface Recortador {
  readonly id: string; // p. ej. 'imgly-1.7.0-isnet_quint8-cpu'
  estado(): EstadoRecortador;
  /** Descarga y deja en caché el modelo (research R-7). Idempotente. */
  preparar(progreso?: (bytes: number, total: number) => void): Promise<void>;
  /**
   * Quita el fondo. No guarda nada: quien llama decide cuándo persistir, así una interrupción
   * nunca deja una prenda a medio guardar (Edge Cases).
   */
  recortar(foto: Blob, opciones?: OpcionesRecorte): Promise<ResultadoRecorte>;
}

/**
 * Composición final (hilo principal o worker, Canvas 2D), común a todos los recortadores:
 * aplica la máscara (después del Pincel y el Borrador) a la original, recorta al contorno
 * opaco y genera el recorte (≤ 1200 px) y la miniatura (≤ 360 px). Ver data-model.md, ImagenesPrenda.
 */
export type ComponerRecorte = (
  original: Blob,
  mascara: Blob,
) => Promise<{
  recorte: Blob;
  miniatura: Blob;
  anchoPx: number;
  altoPx: number;
  /** Color promedio de los píxeles con alfa > 0,5 (FR-014). */
  colorPromedio: string;
}>;
