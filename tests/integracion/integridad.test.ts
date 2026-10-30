import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/datos/db';
import { verificar } from '../../src/datos/integridad';
import { obtenerEstado, reiniciar } from '../../src/diagnostico/registro';
import { conjuntoCompleto, crearImagen, sembrar } from '../fixtures/datos';

beforeEach(() => {
  reiniciar();
});

describe('verificar', () => {
  it('una base vacía está íntegra', async () => {
    expect(await verificar()).toMatchObject({ imagenes: 0, huerfanas: [], rotas: [] });
  });

  it('el conjunto completo no tiene imágenes huérfanas ni referencias rotas', async () => {
    const conjunto = conjuntoCompleto();
    await sembrar(conjunto);
    const resultado = await verificar();
    expect(resultado.imagenes).toBe(conjunto.imagenes.length);
    expect(resultado.huerfanas).toEqual([]);
    expect(resultado.rotas).toEqual([]);
  });

  it('cuenta las imágenes sin referencia y no las borra', async () => {
    const conjunto = conjuntoCompleto();
    const suelta = crearImagen('recorte');
    await sembrar({ ...conjunto, imagenes: [...conjunto.imagenes, suelta] });
    const resultado = await verificar();
    expect(resultado.huerfanas).toEqual([suelta.id]);
    expect(await db.imagenes.get(suelta.id)).toBeDefined();
  });

  it('encuentra referencias rotas de prendas, maniquíes, outfits, siluetas y calendario', async () => {
    const conjunto = conjuntoCompleto();
    const [blusa] = conjunto.prendas;
    const enProceso = conjunto.prendas.find((p) => p.estadoTaller === 'en_proceso')!;
    const [maniqui] = conjunto.maniquies;
    const [look] = conjunto.outfits;
    const borradas = new Set([blusa!.imagen.recorteId, maniqui!.miniaturaId]);
    await sembrar({
      ...conjunto,
      imagenes: conjunto.imagenes.filter((i) => !borradas.has(i.id)),
      siluetas: [],
      outfits: conjunto.outfits.map((o) =>
        o.id === look!.id ? { ...o, maniquiId: 'maniqui-borrado', capas: [...o.capas, { ...o.capas[0]!, prendaId: 'prenda-borrada' }] } : o,
      ),
      calendario: [...conjunto.calendario, { fecha: '2026-11-01', outfitId: 'outfit-borrado' }],
    });

    const { rotas } = await verificar();
    expect(rotas).toEqual(
      expect.arrayContaining([
        { tabla: 'prendas', id: blusa!.id, campo: 'imagen.recorteId', ref: blusa!.imagen.recorteId },
        { tabla: 'prendas', id: blusa!.id, campo: 'historialImagenes[0].recorteId', ref: blusa!.imagen.recorteId },
        { tabla: 'prendas', id: enProceso.id, campo: 'planeada.siluetaId', ref: enProceso.planeada!.siluetaId },
        { tabla: 'maniquies', id: maniqui!.id, campo: 'miniaturaId', ref: maniqui!.miniaturaId },
        { tabla: 'outfits', id: look!.id, campo: 'maniquiId', ref: 'maniqui-borrado' },
        { tabla: 'outfits', id: look!.id, campo: `capas[${look!.capas.length}].prendaId`, ref: 'prenda-borrada' },
        { tabla: 'calendario', id: '2026-11-01', campo: 'outfitId', ref: 'outfit-borrado' },
      ]),
    );
    expect(rotas).toHaveLength(7);
  });

  it('las siluetas incluidas no cuentan como referencias rotas', async () => {
    const conjunto = conjuntoCompleto();
    await sembrar(conjunto);
    const planeadas = conjunto.prendas.filter((p) => p.planeada?.siluetaId.startsWith('incluida:'));
    expect(planeadas.length).toBeGreaterThan(0);
    expect((await verificar()).rotas).toEqual([]);
  });

  it('reporta el resultado al panel de diagnóstico, con un aviso si hay problemas', async () => {
    const suelta = crearImagen('miniatura');
    await sembrar({ imagenes: [suelta] });
    const resultado = await verificar();
    const estado = obtenerEstado();
    expect(estado.integridad).toEqual(resultado);
    expect(estado.eventos.at(-1)).toMatchObject({ tipo: 'aviso' });
  });
});
