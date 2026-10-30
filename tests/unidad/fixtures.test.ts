// Las fixtures son la base de las pruebas de las historias: si se rompen, todo lo demás miente.

import { describe, expect, it } from 'vitest';
import { conjuntoCompleto } from '../fixtures/datos';
import { blobDe, fotoJpeg, mascaraPng, prendaPng } from '../fixtures/imagenes/imagenes';
import { COBERTURA_ELIPSE, RecortadorFalso } from '../fixtures/recortador-falso';

async function cabecera(blob: Blob, n: number) {
  return [...new Uint8Array(await blob.slice(0, n).arrayBuffer())];
}

describe('imágenes de prueba', () => {
  it('son PNG y JPEG reales', async () => {
    expect(await cabecera(blobDe(prendaPng), 8)).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(await cabecera(blobDe(mascaraPng), 4)).toEqual([0x89, 0x50, 0x4e, 0x47]);
    expect(await cabecera(blobDe(fotoJpeg), 3)).toEqual([0xff, 0xd8, 0xff]);
    expect(blobDe(fotoJpeg).type).toBe('image/jpeg');
  });
});

describe('conjuntoCompleto', () => {
  it('trae todas las tablas, el Taller en sus tres estados y una silueta importada', () => {
    const c = conjuntoCompleto();
    for (const tabla of Object.values(c)) expect(tabla.length).toBeGreaterThan(0);
    expect(new Set(c.prendas.map((p) => p.estadoTaller))).toEqual(new Set([undefined, 'planeada', 'en_proceso', 'terminada']));
    expect(c.prendas.some((p) => p.origen === 'hecha' && !p.estadoTaller)).toBe(true);
    expect(c.siluetas.every((s) => s.origen === 'importada')).toBe(true);
    expect(c.maniquies.filter((m) => m.principal === 1)).toHaveLength(1);
  });

  it('enCloset sigue la regla del modelo y prendaIds se deriva de las capas', () => {
    const c = conjuntoCompleto();
    for (const p of c.prendas) {
      expect(p.enCloset).toBe(p.estadoTaller === undefined || p.estadoTaller === 'terminada' ? 1 : 0);
    }
    for (const o of c.outfits) expect(o.prendaIds).toEqual(o.capas.map((capa) => capa.prendaId));
  });

  it('cada llamada crea ids nuevos', () => {
    const a = conjuntoCompleto();
    const b = conjuntoCompleto();
    expect(a.prendas[0]!.id).not.toBe(b.prendas[0]!.id);
  });
});

describe('RecortadorFalso', () => {
  it('simula la descarga con progreso y queda listo', async () => {
    const r = new RecortadorFalso({ pasosDescarga: 3, bytesModelo: 300 });
    const progreso: number[] = [];
    expect(r.estado()).toEqual({ tipo: 'sin_preparar' });
    await Promise.all([r.preparar((b) => progreso.push(b)), r.preparar()]);
    expect(progreso).toEqual([100, 200, 300]);
    expect(r.estado()).toEqual({ tipo: 'listo' });
  });

  it('devuelve la máscara elíptica fija', async () => {
    const r = await new RecortadorFalso().recortar(new Blob());
    expect(r).toMatchObject({ anchoPx: 48, altoPx: 64, cobertura: COBERTURA_ELIPSE });
    expect(r.original.type).toBe('image/jpeg');
    expect(r.mascara.type).toBe('image/png');
  });

  it('puede forzar cobertura vacía, errores y cancelación', async () => {
    const r = new RecortadorFalso({ coberturaVacia: true });
    expect((await r.recortar(new Blob())).cobertura).toBe(0);

    r.configurar({ errorAlRecortar: 'sin memoria' });
    await expect(r.recortar(new Blob())).rejects.toThrow('sin memoria');

    const falla = new RecortadorFalso({ errorAlPreparar: 'sin conexión' });
    await expect(falla.preparar()).rejects.toThrow('sin conexión');
    expect(falla.estado()).toEqual({ tipo: 'error', mensaje: 'sin conexión' });

    const control = new AbortController();
    control.abort();
    await expect(new RecortadorFalso().recortar(new Blob(), { senal: control.signal })).rejects.toThrow();
  });
});
