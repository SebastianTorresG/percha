// IndexedDB simulado para el proyecto `integracion` (T006). Cada prueba empieza con la base vacía.
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { beforeEach } from 'vitest';
import { db, NOMBRE_DB } from '../../src/datos/db';

beforeEach(async () => {
  // Se cierra sin desactivar la reapertura automática: la siguiente consulta la vuelve a abrir.
  db.close({ disableAutoOpen: false });
  await Dexie.delete(NOMBRE_DB);
});
