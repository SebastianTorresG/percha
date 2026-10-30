// Comparación profunda de registros que contienen Blob: dos Blob distintos no tienen propiedades
// propias, así que `toEqual` los daría por iguales aunque tengan otros bytes. Se reemplaza cada
// Blob por su tipo y sus bytes antes de comparar.

export interface BlobNormalizado {
  blob: string;
  bytes: number[];
}

export async function normalizar(valor: unknown): Promise<unknown> {
  if (valor instanceof Blob) {
    return { blob: valor.type, bytes: [...new Uint8Array(await valor.arrayBuffer())] } satisfies BlobNormalizado;
  }
  if (Array.isArray(valor)) {
    return Promise.all(valor.map(normalizar));
  }
  if (valor !== null && typeof valor === 'object') {
    const salida: Record<string, unknown> = {};
    for (const [clave, v] of Object.entries(valor)) salida[clave] = await normalizar(v);
    return salida;
  }
  return valor;
}

/** Ordena los registros de cada tabla por su clave para comparar sin depender del orden de lectura. */
export function ordenarPorClave<T extends Record<string, unknown[]>>(registros: T): T {
  const salida: Record<string, unknown[]> = {};
  for (const [tabla, filas] of Object.entries(registros)) {
    salida[tabla] = [...filas].sort((a, b) => clave(a).localeCompare(clave(b)));
  }
  return salida as T;
}

function clave(fila: unknown): string {
  const f = fila as { id?: unknown; fecha?: unknown };
  return String(f.id ?? f.fecha ?? '');
}
