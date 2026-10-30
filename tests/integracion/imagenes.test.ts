import { afterEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/datos/db';
import {
  borrar,
  bytesTotales,
  guardar,
  obtener,
  obtenerBlob,
  soltarUrl,
  urlDe,
  urlsVivas,
} from '../../src/datos/repos/imagenes';
import { blobDe, fotoJpeg, prendaPng } from '../fixtures/imagenes/imagenes';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('repositorio de imágenes', () => {
  it('guarda con tipo, tamaño, bytes y fecha, y devuelve los mismos bytes', async () => {
    const blob = blobDe(prendaPng);
    const id = await guardar(blob, 'recorte', prendaPng.ancho, prendaPng.alto);
    const imagen = await obtener(id);
    expect(imagen).toMatchObject({ id, tipo: 'recorte', ancho: 24, alto: 32, bytes: blob.size });
    expect(imagen!.creada).toBeGreaterThan(0);
    const leido = await obtenerBlob(id);
    expect(leido!.type).toBe('image/png');
    expect(new Uint8Array(await leido!.arrayBuffer())).toEqual(new Uint8Array(await blob.arrayBuffer()));
  });

  it('rechaza formatos que no sean PNG o JPEG y tamaños inválidos', async () => {
    await expect(guardar(new Blob(['x'], { type: 'image/webp' }), 'recorte', 1, 1)).rejects.toThrow();
    await expect(guardar(blobDe(prendaPng), 'recorte', 0, 10)).rejects.toThrow();
    expect(await db.imagenes.count()).toBe(0);
  });

  it('suma los bytes de todas las imágenes', async () => {
    const png = blobDe(prendaPng);
    const jpeg = blobDe(fotoJpeg);
    await guardar(png, 'miniatura', 24, 32);
    await guardar(jpeg, 'original', 48, 64);
    expect(await bytesTotales()).toBe(png.size + jpeg.size);
  });

  it('solo borra dentro de una transacción, y si la transacción falla no borra nada', async () => {
    const id = await guardar(blobDe(prendaPng), 'recorte', 24, 32);
    await expect(borrar([id])).rejects.toThrow();
    expect(await db.imagenes.count()).toBe(1);

    await expect(
      db.transaction('rw', db.imagenes, async () => {
        await borrar([id]);
        throw new Error('la entidad no se pudo borrar');
      }),
    ).rejects.toThrow();
    expect(await db.imagenes.count()).toBe(1);

    await db.transaction('rw', db.imagenes, () => borrar([id]));
    expect(await db.imagenes.count()).toBe(0);
  });

  it('guardar dentro de una transacción que falla no deja la imagen', async () => {
    await expect(
      db.transaction('rw', db.imagenes, db.prendas, async () => {
        await guardar(blobDe(prendaPng), 'recorte', 24, 32);
        throw new Error('la prenda no se pudo guardar');
      }),
    ).rejects.toThrow();
    expect(await db.imagenes.count()).toBe(0);
  });

  it('comparte un object URL por imagen y lo libera con la última referencia', async () => {
    const revocar = vi.spyOn(URL, 'revokeObjectURL');
    const id = await guardar(blobDe(prendaPng), 'miniatura', 24, 32);

    const [a, b] = await Promise.all([urlDe(id), urlDe(id)]);
    expect(a).toMatch(/^blob:/);
    expect(b).toBe(a);
    expect(urlsVivas()).toBe(1);

    soltarUrl(id);
    await Promise.resolve();
    expect(revocar).not.toHaveBeenCalled();

    soltarUrl(id);
    await vi.waitFor(() => expect(revocar).toHaveBeenCalledWith(a));
    expect(urlsVivas()).toBe(0);

    const c = await urlDe(id);
    expect(c).not.toBe(a);
    soltarUrl(id);
  });

  it('devuelve undefined para una imagen que no existe', async () => {
    expect(await urlDe('no-existe')).toBeUndefined();
    soltarUrl('no-existe');
    expect(urlsVivas()).toBe(0);
  });
});
