import { describe, expect, it } from 'vitest';
import { redimensionar, tamanoAjustado } from '../../src/imagen/redimensionar';
import { blobDe, giradaExif6Jpeg, prendaPng } from '../fixtures/imagenes/imagenes';

async function fotoGrande(ancho: number, alto: number): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#c9a99a';
  ctx.fillRect(0, 0, ancho, alto);
  ctx.fillStyle = '#3a2a25';
  ctx.fillRect(ancho / 4, alto / 4, ancho / 2, alto / 2);
  return new Promise((r) => canvas.toBlob((b) => r(b!), 'image/jpeg', 0.9));
}

async function pixel(blob: Blob, x: number, y: number): Promise<[number, number, number, number]> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  const d = ctx.getImageData(x, y, 1, 1).data;
  return [d[0]!, d[1]!, d[2]!, d[3]!];
}

describe('tamanoAjustado', () => {
  it('ajusta el lado mayor y conserva la proporción', () => {
    expect(tamanoAjustado(4032, 3024, 1500)).toEqual({ ancho: 1500, alto: 1125 });
    expect(tamanoAjustado(3024, 4032, 1500)).toEqual({ ancho: 1125, alto: 1500 });
  });

  it('nunca agranda', () => {
    expect(tamanoAjustado(800, 600, 1500)).toEqual({ ancho: 800, alto: 600 });
  });
});

describe('redimensionar', () => {
  it('lleva una foto de 4032 × 3024 a 1500 de lado mayor, en JPEG', async () => {
    const r = await redimensionar(await fotoGrande(4032, 3024), { ladoMaximo: 1500 });
    expect(r).toMatchObject({ ancho: 1500, alto: 1125 });
    expect(r.blob.type).toBe('image/jpeg');
    const bitmap = await createImageBitmap(r.blob);
    expect([bitmap.width, bitmap.height]).toEqual([1500, 1125]);
  });

  it('no agranda una imagen chica', async () => {
    const r = await redimensionar(blobDe(prendaPng), { ladoMaximo: 1500, tipo: 'image/png' });
    expect(r).toMatchObject({ ancho: prendaPng.ancho, alto: prendaPng.alto });
  });

  it('respeta la orientación EXIF: 40 × 20 guardada con orientación 6 sale de 20 × 40, roja arriba', async () => {
    const r = await redimensionar(blobDe(giradaExif6Jpeg), { ladoMaximo: 1500 });
    expect(r).toMatchObject({ ancho: 20, alto: 40 });
    const [ra, , ba] = await pixel(r.blob, 10, 8);
    const [rb, , bb] = await pixel(r.blob, 10, 32);
    expect(ra).toBeGreaterThan(200);
    expect(ba).toBeLessThan(60);
    expect(bb).toBeGreaterThan(200);
    expect(rb).toBeLessThan(60);
  });

  it('en PNG conserva la transparencia', async () => {
    const r = await redimensionar(blobDe(prendaPng), { ladoMaximo: 16, tipo: 'image/png' });
    expect(r.blob.type).toBe('image/png');
    expect((await pixel(r.blob, 0, 0))[3]).toBe(0);
  });

  it('en JPEG lo transparente queda blanco', async () => {
    const r = await redimensionar(blobDe(prendaPng), { ladoMaximo: 1500 });
    const [rr, g, b] = await pixel(r.blob, 0, 0);
    expect(Math.min(rr, g, b)).toBeGreaterThan(240);
  });
});
