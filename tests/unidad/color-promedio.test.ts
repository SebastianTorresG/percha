import { describe, expect, it } from 'vitest';
import { colorPromedio } from '../../src/imagen/color-promedio';

type RGBA = [number, number, number, number];

function imagen(pixeles: RGBA[], width = pixeles.length) {
  return { data: new Uint8ClampedArray(pixeles.flat()), width, height: pixeles.length / width };
}

const TRANSPARENTE: RGBA = [255, 0, 0, 0];

describe('colorPromedio', () => {
  it('prenda negra sobre fondo transparente', () => {
    expect(colorPromedio(imagen([[0, 0, 0, 255], [0, 0, 0, 255], TRANSPARENTE, TRANSPARENTE]))).toBe('#000000');
  });

  it('prenda blanca', () => {
    expect(colorPromedio(imagen([[255, 255, 255, 255], TRANSPARENTE]))).toBe('#ffffff');
  });

  it('prenda de dos colores da el promedio', () => {
    // (184 + 58) / 2 = 121 = 0x79; (119 + 42) / 2 = 80,5 → 81 = 0x51; (106 + 37) / 2 = 71,5 → 72 = 0x48.
    expect(colorPromedio(imagen([[184, 119, 106, 255], [58, 42, 37, 255]]))).toBe('#795148');
  });

  it('solo cuenta los píxeles con alfa > 0,5', () => {
    expect(
      colorPromedio(imagen([[0, 0, 255, 128], [255, 0, 0, 127], [255, 0, 0, 10]])),
    ).toBe('#0000ff');
  });

  it('sin píxeles opacos devuelve null', () => {
    expect(colorPromedio(imagen([TRANSPARENTE, [10, 10, 10, 127]]))).toBeNull();
  });
});
