// Color sugerido de una prenda (FR-014): promedio de los píxeles con alfa > 0,5 (data-model.md, *Prenda*).

import type { PixelesRGBA } from './contorno';

/** `#rrggbb`, o `null` si no hay píxeles con alfa > 0,5. */
export function colorPromedio(imagen: PixelesRGBA): string | null {
  const { data } = imagen;
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    // alfa > 0,5 en 0–255 es alfa ≥ 128.
    if (data[i + 3]! > 127) {
      r += data[i]!;
      g += data[i + 1]!;
      b += data[i + 2]!;
      n++;
    }
  }
  if (n === 0) return null;
  const hex = (suma: number) => Math.round(suma / n).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}
