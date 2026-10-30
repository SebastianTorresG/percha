import { describe, expect, it } from 'vitest';
import {
  ErrorEsquemaMasNuevo,
  MENSAJE_ESQUEMA_MAS_NUEVO,
  MIGRACIONES,
  migrarDatos,
} from '../../src/datos/migraciones';
import { ESQUEMA_ACTUAL } from '../../src/datos/tipos';
import { normalizar } from '../fixtures/comparar';
import { FIXTURES_ESQUEMA, PARES_MIGRACION } from '../fixtures/esquemas';

describe('MIGRACIONES', () => {
  it('va de 1 a ESQUEMA_ACTUAL sin huecos', () => {
    expect(MIGRACIONES.map((m) => m.version)).toEqual(Array.from({ length: ESQUEMA_ACTUAL }, (_, i) => i + 1));
  });

  it('tiene un fixture congelado por cada versión', () => {
    expect(FIXTURES_ESQUEMA.map((f) => f.version)).toEqual(MIGRACIONES.map((m) => m.version));
  });
});

describe('migrarDatos', () => {
  it('con desde = hasta devuelve lo mismo', () => {
    const datos = FIXTURES_ESQUEMA[0]!.datos();
    expect(migrarDatos(datos, ESQUEMA_ACTUAL, ESQUEMA_ACTUAL)).toBe(datos);
  });

  it('sin `hasta` migra hasta ESQUEMA_ACTUAL', () => {
    const datos = FIXTURES_ESQUEMA.at(-1)!.datos();
    expect(migrarDatos(datos, ESQUEMA_ACTUAL)).toBe(datos);
  });

  it('rechaza un esquema más nuevo que el de la app con el mensaje de Edge Cases', () => {
    const intento = () => migrarDatos({}, ESQUEMA_ACTUAL + 1);
    expect(intento).toThrow(ErrorEsquemaMasNuevo);
    expect(intento).toThrow(MENSAJE_ESQUEMA_MAS_NUEVO);
  });

  it('rechaza versiones inválidas o hacia atrás', () => {
    expect(() => migrarDatos({}, 0)).toThrow();
    expect(() => migrarDatos({}, 1.5)).toThrow();
    expect(() => migrarDatos({}, ESQUEMA_ACTUAL, ESQUEMA_ACTUAL - 1)).toThrow();
    expect(() => migrarDatos({}, 1, ESQUEMA_ACTUAL + 1)).toThrow();
  });

  it('hay un par de fixtures por cada migración publicada después de la v1', () => {
    expect(PARES_MIGRACION).toHaveLength(ESQUEMA_ACTUAL - 1);
  });

  for (const { anterior, siguiente } of PARES_MIGRACION) {
    it(`v${anterior.version} → v${siguiente.version} da el fixture de la v${siguiente.version}`, async () => {
      const migrado = migrarDatos(anterior.datos(), anterior.version, siguiente.version);
      expect(await normalizar(migrado)).toEqual(await normalizar(siguiente.datos()));
    });

    it(`v${anterior.version} → v${siguiente.version} no muta su entrada`, async () => {
      const entrada = anterior.datos();
      const copia = await normalizar(entrada);
      migrarDatos(entrada, anterior.version, siguiente.version);
      expect(await normalizar(entrada)).toEqual(copia);
    });
  }
});
