import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { db, PerchaDB } from '../../src/datos/db';
import { MIGRACIONES, type Migracion, type Registros } from '../../src/datos/migraciones';
import * as v1 from '../../src/datos/migraciones/v1';
import { ESQUEMA_ACTUAL } from '../../src/datos/tipos';
import { normalizar, ordenarPorClave } from '../fixtures/comparar';
import { FIXTURES_ESQUEMA, PARES_MIGRACION } from '../fixtures/esquemas';

/** Estructura real de IndexedDB: clave primaria e índices (con multiEntry) de cada almacén. */
function estructura(idb: IDBDatabase) {
  const nombres = [...idb.objectStoreNames];
  const tx = idb.transaction(nombres, 'readonly');
  return Object.fromEntries(
    nombres.map((nombre) => {
      const almacen = tx.objectStore(nombre);
      const indices = [...almacen.indexNames].map((i) => {
        const indice = almacen.index(i);
        return `${indice.multiEntry ? '*' : ''}${String(indice.keyPath)}`;
      });
      return [nombre, [String(almacen.keyPath), ...indices.sort()]];
    }),
  );
}

async function escribir(base: PerchaDB, registros: Registros) {
  await base.transaction('rw', base.tables, async () => {
    for (const [tabla, filas] of Object.entries(registros)) await base.table(tabla).bulkPut(filas);
  });
}

async function leer(base: PerchaDB): Promise<Registros> {
  const salida: Registros = {};
  for (const tabla of base.tables) salida[tabla.name] = await tabla.toArray();
  return salida;
}

const abiertas: PerchaDB[] = [];
function base(nombre: string, migraciones: readonly Migracion[]) {
  const nueva = new PerchaDB(nombre, migraciones);
  abiertas.push(nueva);
  return nueva;
}

afterEach(async () => {
  for (const b of abiertas.splice(0)) {
    b.close();
    await Dexie.delete(b.name);
  }
});

describe('PerchaDB', () => {
  it('abre en la versión actual con las 10 tablas e índices del esquema v1', async () => {
    await db.open();
    expect(db.verno).toBe(ESQUEMA_ACTUAL);
    expect(estructura(db.backendDB())).toEqual({
      ajustes: ['id'],
      calendario: ['fecha', 'outfitId'],
      imagenes: ['id', 'tipo'],
      maniquies: ['id', 'principal'],
      medidas: ['id'],
      outfits: ['id', '*etiquetas', '*prendaIds', 'actualizado', 'maniquiId'],
      prendas: ['id', '*etiquetas', 'categoria', 'creada', 'enCloset', 'estadoTaller', 'origen', 'ultimoUso'],
      respaldosAuto: ['id', 'creado'],
      siluetas: ['id', 'origen'],
      usosDia: ['fecha'],
    });
  });

  it('una transacción que falla a la mitad no deja escrituras', async () => {
    const [imagen] = FIXTURES_ESQUEMA[0]!.datos().imagenes!;
    const [prenda] = FIXTURES_ESQUEMA[0]!.datos().prendas!;
    await expect(
      db.transaction('rw', db.imagenes, db.prendas, async () => {
        await db.imagenes.add(imagen as never);
        await db.prendas.add(prenda as never);
        throw new Error('falla a la mitad');
      }),
    ).rejects.toThrow('falla a la mitad');
    expect(await db.imagenes.count()).toBe(0);
    expect(await db.prendas.count()).toBe(0);
  });

  it('guarda y lee el fixture de la versión actual sin perder datos ni bytes de imágenes', async () => {
    const fixture = FIXTURES_ESQUEMA.at(-1)!;
    await escribir(db, fixture.datos());
    expect(await normalizar(ordenarPorClave(await leer(db)))).toEqual(
      await normalizar(ordenarPorClave(fixture.datos())),
    );
  });
});

describe('upgrade de Dexie', () => {
  // Una v2 solo para probar el mecanismo: agrega un campo a las prendas y no toca el resto.
  const v2Prueba: Migracion = {
    version: 2,
    stores: { prendas: `${v1.stores.prendas}, favorita` },
    migrar: (registros) => ({
      ...registros,
      prendas: (registros.prendas ?? []).map((p) => ({ ...(p as object), favorita: 0 })),
    }),
  };

  it('aplica `migrar` a los datos del teléfono y conserva las tablas que no cambian', async () => {
    const datos = FIXTURES_ESQUEMA[0]!.datos();
    const antes = base('percha-upgrade', [v1]);
    await escribir(antes, datos);
    antes.close();

    const despues = base('percha-upgrade', [v1, v2Prueba]);
    await despues.open();
    expect(despues.verno).toBe(2);
    const leidos = await leer(despues);
    expect(leidos.prendas!.every((p) => (p as { favorita?: number }).favorita === 0)).toBe(true);
    expect(await normalizar(ordenarPorClave({ imagenes: leidos.imagenes! }))).toEqual(
      await normalizar(ordenarPorClave({ imagenes: datos.imagenes! })),
    );
  });

  it('si `migrar` falla, la base queda en la versión anterior con sus datos intactos', async () => {
    const datos = FIXTURES_ESQUEMA[0]!.datos();
    const antes = base('percha-upgrade-falla', [v1]);
    await escribir(antes, datos);
    antes.close();

    const rota: Migracion = {
      ...v2Prueba,
      migrar: () => {
        throw new Error('migración rota');
      },
    };
    const fallida = base('percha-upgrade-falla', [v1, rota]);
    await expect(fallida.open()).rejects.toThrow();
    fallida.close();

    const otraVez = base('percha-upgrade-falla', [v1]);
    await otraVez.open();
    expect(otraVez.verno).toBe(1);
    expect(await normalizar(ordenarPorClave(await leer(otraVez)))).toEqual(
      await normalizar(ordenarPorClave(datos)),
    );
  });

  for (const { anterior, siguiente } of PARES_MIGRACION) {
    it(`v${anterior.version} → v${siguiente.version} por Dexie da el fixture de la v${siguiente.version}`, async () => {
      const nombre = `percha-par-${siguiente.version}`;
      const antes = base(nombre, MIGRACIONES.slice(0, anterior.version));
      await escribir(antes, anterior.datos());
      antes.close();

      const despues = base(nombre, MIGRACIONES.slice(0, siguiente.version));
      expect(await normalizar(ordenarPorClave(await leer(despues)))).toEqual(
        await normalizar(ordenarPorClave(siguiente.datos())),
      );
    });
  }
});
