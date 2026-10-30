// data-model.md, *Migraciones*: un respaldo de un esquema anterior pasa por las mismas funciones
// puras que usa Dexie antes de escribir nada; uno de un esquema más nuevo se rechaza.

import { describe, expect, it, vi } from 'vitest';
import { db } from '../../src/datos/db';
import type { Migracion, Registros } from '../../src/datos/migraciones';
import * as v1 from '../../src/datos/migraciones/v1';
import { ESQUEMA_ACTUAL, type Prenda } from '../../src/datos/tipos';
import { generarRespaldoBlob } from '../../src/respaldo/exportar';
import { importar, leerRespaldo } from '../../src/respaldo/importar';
import { conjuntoCompleto, sembrar } from '../fixtures/datos';
import { alterarRespaldo, instantanea, vaciarBase } from '../fixtures/respaldo';

/** Migración que solo existe en esta prueba: v2 marca cada prenda con la etiqueta "migrada". */
const v2Prueba: Migracion = {
  version: 2,
  stores: {},
  migrar: vi.fn((registros: Registros): Registros => ({
    ...registros,
    prendas: (registros.prendas as Prenda[]).map((p) => ({ ...p, etiquetas: [...p.etiquetas, 'migrada'] })),
  })),
};

describe('respaldo: migración del esquema', () => {
  it('un respaldo del esquema anterior se migra en memoria antes de escribir', async () => {
    await sembrar(conjuntoCompleto());
    const { blob, manifest } = await generarRespaldoBlob(new Date(2026, 9, 26, 8, 15));
    expect(manifest.esquema).toBe(1);
    await vaciarBase();

    // Como si la app ya estuviera en el esquema 2.
    const leido = await leerRespaldo(blob, { migraciones: [v1, v2Prueba] });
    expect(v2Prueba.migrar).toHaveBeenCalledOnce();
    expect(await db.prendas.count()).toBe(0);
    expect(leido.datos.prendas.every((p) => p.etiquetas.includes('migrada'))).toBe(true);

    await importar(leido);
    const prendas = await db.prendas.toArray();
    expect(prendas).toHaveLength(7);
    expect(prendas.every((p) => p.etiquetas.at(-1) === 'migrada')).toBe(true);
  });

  it('del mismo esquema, no migra nada', async () => {
    const { blob } = await generarRespaldoBlob();
    vi.mocked(v2Prueba.migrar).mockClear();
    await leerRespaldo(blob);
    expect(v2Prueba.migrar).not.toHaveBeenCalled();
  });

  it('un respaldo de un esquema más nuevo se rechaza sin tocar nada', async () => {
    await sembrar(conjuntoCompleto());
    const antes = await instantanea();
    const { blob } = await generarRespaldoBlob();
    const nuevo = await alterarRespaldo(blob, { manifest: (m) => ({ ...m, esquema: ESQUEMA_ACTUAL + 1 }) });
    await expect(leerRespaldo(nuevo)).rejects.toThrow(
      'Este respaldo es de una versión más nueva de Percha. Actualiza la app y vuelve a intentarlo.',
    );
    expect(await instantanea()).toEqual(antes);
  });

  it('si la migración falla con datos inesperados, el respaldo se trata como dañado', async () => {
    const { blob } = await generarRespaldoBlob();
    const rota: Migracion = { version: 2, stores: {}, migrar: () => { throw new TypeError('prendas.map is not a function'); } };
    await expect(leerRespaldo(blob, { migraciones: [v1, rota] })).rejects.toMatchObject({ motivo: 'danado' });
  });
});
