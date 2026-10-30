// Repositorio de Ajustes: un solo registro `id = 'ajustes'` (data-model.md, *Ajustes*).
// La apariencia también se copia a localStorage, que lee el script de tema de index.html antes del
// primer pintado (research R-12). La fuente de verdad es esta tabla.

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ID_AJUSTES, type Ajustes, type Apariencia } from '../tipos';

export const CLAVE_APARIENCIA = 'percha.apariencia';

export const AJUSTES_POR_DEFECTO: Readonly<Ajustes> = {
  id: ID_AJUSTES,
  apariencia: 'sistema',
  onboarding: 'pendiente',
  chipArmadorVisto: 0,
};

/** Los ajustes guardados, o los valores por defecto si todavía no hay registro. No escribe. */
export async function obtener(): Promise<Ajustes> {
  return (await db.ajustes.get(ID_AJUSTES)) ?? { ...AJUSTES_POR_DEFECTO };
}

/** Mezcla `parcial` con lo guardado y devuelve el resultado. */
export async function actualizar(parcial: Partial<Omit<Ajustes, 'id'>>): Promise<Ajustes> {
  const nuevos = await db.transaction('rw', db.ajustes, async () => {
    const actuales = await obtener();
    const mezclados: Ajustes = { ...actuales, ...parcial, id: ID_AJUSTES };
    await db.ajustes.put(mezclados);
    return mezclados;
  });
  if (parcial.apariencia !== undefined) espejarApariencia(nuevos.apariencia);
  return nuevos;
}

/** Copia la apariencia a localStorage; si no se puede (modo privado, cuota), el tema sigue igual en esta sesión. */
export function espejarApariencia(apariencia: Apariencia): void {
  try {
    localStorage.setItem(CLAVE_APARIENCIA, apariencia);
  } catch {
    // Sin espejo, el siguiente arranque usa "sistema" hasta que main.tsx vuelva a espejar.
  }
}

/** Ajustes en vivo para los componentes; `undefined` mientras carga. */
export function useAjustes(): Ajustes | undefined {
  return useLiveQuery(obtener, []);
}
