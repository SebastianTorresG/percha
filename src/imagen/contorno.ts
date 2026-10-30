// Contorno opaco de una imagen con alfa (data-model.md, *ImagenesPrenda* y *Maniquí*): el recorte
// se guarda recortado a su contorno, y el rectángulo opaco del maniquí es su `cuerpo`.

import type { Rect } from '../datos/tipos';
import { contexto2D, crearLienzo, type Lienzo } from './lienzo';

/** Lo mínimo de un ImageData; permite probar con datos sintéticos fuera del navegador. */
export type PixelesRGBA = Pick<ImageData, 'data' | 'width' | 'height'>;

/** Umbral de alfa a partir del cual un píxel cuenta como opaco (128 = más de la mitad). */
export const UMBRAL_ALFA = 128;

/** Rectángulo de los píxeles con alfa ≥ `umbralAlfa`, o `null` si no hay ninguno. */
export function rectOpaco(imagen: PixelesRGBA, umbralAlfa: number = UMBRAL_ALFA): Rect | null {
  const { data, width, height } = imagen;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    const fila = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (data[fila + x * 4 + 3]! >= umbralAlfa) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, ancho: maxX - minX + 1, alto: maxY - minY + 1 };
}

/** Fracción de píxeles con alfa ≥ `umbralAlfa` (0 a 1). */
export function cobertura(imagen: PixelesRGBA, umbralAlfa: number = UMBRAL_ALFA): number {
  const { data, width, height } = imagen;
  const total = width * height;
  if (total === 0) return 0;
  let opacos = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i]! >= umbralAlfa) opacos++;
  }
  return opacos / total;
}

/**
 * Canvas nuevo con solo el rectángulo opaco del original, o `null` si no hay píxeles opacos. El
 * borde semitransparente (alfa < umbral) que quede fuera del rectángulo se descarta.
 */
export function recortarAlContorno(lienzo: Lienzo, umbralAlfa: number = UMBRAL_ALFA): { lienzo: Lienzo; rect: Rect } | null {
  const ctx = contexto2D(lienzo, { willReadFrequently: true });
  const rect = rectOpaco(ctx.getImageData(0, 0, lienzo.width, lienzo.height), umbralAlfa);
  if (!rect) return null;
  const salida = crearLienzo(rect.ancho, rect.alto);
  contexto2D(salida).drawImage(lienzo, rect.x, rect.y, rect.ancho, rect.alto, 0, 0, rect.ancho, rect.alto);
  return { lienzo: salida, rect };
}
