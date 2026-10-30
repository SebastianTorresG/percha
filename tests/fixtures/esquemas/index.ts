// Fixtures de datos por versión de esquema (data-model.md, *Migraciones*: "Pruebas obligatorias por
// versión"). Cada carpeta `vN/` tiene un `datos.ts` congelado con los registros tal como los guarda
// la versión N. Para agregar la versión N:
//
// 1. Crear `src/datos/migraciones/vN.ts` y sumarlo a MIGRACIONES.
// 2. Crear `tests/fixtures/esquemas/vN/datos.ts` con lo que debe quedar al migrar `v(N−1)/datos.ts`.
//
// tests/unidad/migraciones.test.ts y tests/integracion/db.test.ts recorren todos los pares
// N−1 → N por el camino del respaldo (`migrarDatos`) y por el de Dexie (`upgrade`).

import type { Registros } from '../../../src/datos/migraciones';

interface ModuloFixture {
  version: number;
  datos: () => Registros;
}

const modulos = import.meta.glob<ModuloFixture>('./v*/datos.ts', { eager: true });

/** Fixtures ordenados por versión. */
export const FIXTURES_ESQUEMA: readonly ModuloFixture[] = Object.values(modulos).sort((a, b) => a.version - b.version);

/** Pares consecutivos (N−1 → N) para probar cada migración. */
export const PARES_MIGRACION: readonly { anterior: ModuloFixture; siguiente: ModuloFixture }[] = FIXTURES_ESQUEMA.slice(1).map(
  (siguiente, i) => ({ anterior: FIXTURES_ESQUEMA[i]!, siguiente }),
);
