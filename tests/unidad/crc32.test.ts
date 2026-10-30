import { describe, expect, it } from 'vitest';
import { crc32, crc32DeBlob, crcHex } from '../../src/respaldo/crc32';

const texto = (s: string) => new TextEncoder().encode(s);

describe('crc32', () => {
  it('da los vectores conocidos', () => {
    expect(crcHex(crc32(texto('123456789')))).toBe('cbf43926');
    expect(crcHex(crc32(new Uint8Array(0)))).toBe('00000000');
    expect(crcHex(crc32(texto('The quick brown fox jumps over the lazy dog')))).toBe('414fa339');
  });

  it('se puede encadenar por partes', () => {
    const entero = crc32(texto('123456789'));
    expect(crc32(texto('6789'), crc32(texto('12345')))).toBe(entero);
  });

  it('un blob leído por trozos da lo mismo que leído entero', async () => {
    // 300 KB: más grande que un trozo de stream, para que la lectura llegue en varias partes.
    const bytes = new Uint8Array(300_000).map((_, i) => (i * 31 + 7) & 0xff);
    const blob = new Blob([bytes.subarray(0, 100_000), bytes.subarray(100_000)]);
    expect(await crc32DeBlob(blob)).toBe(crc32(bytes));
  });
});
