// Redimensiona una foto antes del recorte y al guardar (research R-9): respeta la orientación EXIF,
// nunca agranda y codifica en JPEG 0,85 por defecto.

import { aBlob, contexto2D, crearLienzo } from './lienzo';

export interface OpcionesRedimensionar {
  /** Lado mayor máximo en píxeles. */
  ladoMaximo: number;
  tipo?: 'image/jpeg' | 'image/png';
  /** Solo para JPEG; 0,85 por defecto. */
  calidad?: number;
}

export interface Redimensionada {
  blob: Blob;
  ancho: number;
  alto: number;
}

export const CALIDAD_JPEG = 0.85;

/** Tamaño que entra en `ladoMaximo` conservando la proporción; nunca agranda. */
export function tamanoAjustado(ancho: number, alto: number, ladoMaximo: number): { ancho: number; alto: number } {
  const escala = Math.min(1, ladoMaximo / Math.max(ancho, alto));
  return {
    ancho: Math.max(1, Math.round(ancho * escala)),
    alto: Math.max(1, Math.round(alto * escala)),
  };
}

export async function redimensionar(blob: Blob, opciones: OpcionesRedimensionar): Promise<Redimensionada> {
  const tipo = opciones.tipo ?? 'image/jpeg';
  const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  try {
    const { ancho, alto } = tamanoAjustado(bitmap.width, bitmap.height, opciones.ladoMaximo);
    const lienzo = crearLienzo(ancho, alto);
    const ctx = contexto2D(lienzo);
    if (tipo === 'image/jpeg') {
      // JPEG no tiene alfa: lo transparente queda blanco en vez de negro.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, ancho, alto);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, ancho, alto);
    const salida = await aBlob(lienzo, tipo, tipo === 'image/jpeg' ? (opciones.calidad ?? CALIDAD_JPEG) : undefined);
    return { blob: salida, ancho, alto };
  } finally {
    bitmap.close();
  }
}
