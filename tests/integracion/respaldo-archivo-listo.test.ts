// Un respaldo ya armado que espera el segundo toque (useExportar, fase "listo") se descarta si
// cambian los datos: guardarlo marcaría como respaldado lo que no está en él. Aquí se comprueba con
// escrituras reales de Dexie qué cambios cuentan.

import Dexie, { type ObservabilitySet } from 'dexie';
import { describe, expect, it } from 'vitest';
import { db } from '../../src/datos/db';
import { actualizar } from '../../src/datos/repos/ajustes';
import * as respaldosAuto from '../../src/datos/repos/respaldos-auto';
import { generarRespaldoBlob } from '../../src/respaldo/exportar';
import { importar, leerRespaldo } from '../../src/respaldo/importar';
import { cambiaronLosDatos } from '../../src/respaldo/useExportar';
import { conjuntoCompleto, sembrar } from '../fixtures/datos';

/** Si alguna de las escrituras de `escribir` cambió algo que va en el respaldo. */
async function cambiaron(escribir: () => Promise<unknown>): Promise<boolean> {
  // Abierta antes, como en la app: al crear la base, Dexie anuncia que cambió todo.
  await db.open();
  const vistas: ObservabilitySet[] = [];
  const oyente = (partes: ObservabilitySet) => vistas.push(partes);
  Dexie.on.storagemutated.subscribe(oyente);
  try {
    await escribir();
  } finally {
    Dexie.on.storagemutated.unsubscribe(oyente);
  }
  expect(vistas.length).toBeGreaterThan(0);
  return vistas.some(cambiaronLosDatos);
}

describe('respaldo: archivo listo para el segundo toque', () => {
  it('importar otro respaldo cambia los datos', async () => {
    await sembrar(conjuntoCompleto());
    const leido = await leerRespaldo((await generarRespaldoBlob()).blob);
    expect(await cambiaron(() => importar(leido))).toBe(true);
  });

  it('marcar el último respaldo cambia los datos: los ajustes van en el respaldo', async () => {
    expect(await cambiaron(() => actualizar({ ultimoRespaldo: Date.now() }))).toBe(true);
  });

  it('guardar solo la copia automática no cambia los datos', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'application/zip' });
    expect(await cambiaron(() => respaldosAuto.guardar(blob))).toBe(false);
  });
});
