// Cuota y persistencia del almacenamiento (research R-4). Nada de esto puede fallar: si la API no
// existe o se niega, la app sigue igual y el respaldo es la garantía real (principio IV).

export interface Estimacion {
  usado: number;
  cuota: number;
}

/** Margen que se deja libre al comprobar si cabe algo (10 %). */
export const MARGEN_ESPACIO = 0.1;

function storage(): StorageManager | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator.storage;
}

/**
 * Pide almacenamiento persistente (WebKit lo concede con heurísticas, por ejemplo al abrir desde la
 * pantalla de inicio) y devuelve si quedó persistente; `null` si el navegador no lo informa.
 */
export async function pedirPersistencia(): Promise<boolean | null> {
  const s = storage();
  try {
    if (s?.persist) await s.persist();
    return s?.persisted ? await s.persisted() : null;
  } catch {
    return null;
  }
}

/** Si el almacenamiento es persistente, sin pedirlo; `null` si no se sabe. */
export async function estaPersistido(): Promise<boolean | null> {
  try {
    const s = storage();
    return s?.persisted ? await s.persisted() : null;
  } catch {
    return null;
  }
}

/** Uso y cuota del origen; `null` si no se pueden saber. */
export async function estimar(): Promise<Estimacion | null> {
  try {
    const s = storage();
    if (!s?.estimate) return null;
    const { usage, quota } = await s.estimate();
    if (usage === undefined || quota === undefined) return null;
    return { usado: usage, cuota: quota };
  } catch {
    return null;
  }
}

/**
 * Si caben `bytes` más dejando libre el 10 % de la cuota. Si no se puede estimar, devuelve `true`
 * y la escritura decide (un error de cuota revierte la transacción sin dejar nada a medias).
 */
export async function hayEspacioPara(bytes: number): Promise<boolean> {
  const estimacion = await estimar();
  if (!estimacion) return true;
  return estimacion.usado + bytes <= estimacion.cuota * (1 - MARGEN_ESPACIO);
}
