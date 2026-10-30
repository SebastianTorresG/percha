// Importar un respaldo (FR-003, FR-004, contracts/respaldo.md, *Importar*). Primero se lee y se
// valida todo sin escribir nada; después, con la confirmación de la usuaria, se guarda un respaldo
// automático de lo actual y se reemplaza todo en una sola transacción. Restaurar el respaldo
// automático usa el mismo camino.

import { hayEspacioPara } from '../datos/almacenamiento';
import { db } from '../datos/db';
import { MIGRACIONES, migrarDatos, type Migracion, type Registros } from '../datos/migraciones';
import { AJUSTES_POR_DEFECTO, espejarApariencia } from '../datos/repos/ajustes';
import * as respaldosAuto from '../datos/repos/respaldos-auto';
import { ID_AJUSTES, type Ajustes, type Apariencia, type Imagen } from '../datos/tipos';
import { registrar, registrarTiempo } from '../diagnostico/registro';
import { aplicarTema } from '../tema/apariencia';
import { formatearDiaMesAnio } from '../util/fechas';
import { crc32, crcHex } from './crc32';
import { ErrorRespaldo, type MotivoRespaldo } from './errores';
import { generarRespaldoBlob } from './exportar';
import { RUTA_DATOS, RUTA_MANIFEST, type Conteos, type Manifest } from './formato';
import { validarDatos, validarManifest, type DatosValidados } from './validar';
import { leerZip, type EntradaLeida } from './zip-lector';

export type DatosImportados = Omit<DatosValidados, 'imagenes'> & { imagenes: Imagen[] };

/** Un respaldo leído y validado entero, todavía sin escribir. */
export interface RespaldoLeido {
  manifest: Manifest;
  /** Fecha del archivo, en milisegundos. */
  creado: number;
  datos: DatosImportados;
  /** Lo que se va a escribir: imágenes más datos.json. */
  bytes: number;
}

const danado = (detalle: string, causa?: unknown) => new ErrorRespaldo('danado', detalle, { cause: causa });

/**
 * La raíz del respaldo dentro del ZIP: la del archivo, o una sola carpeta si la usuaria lo
 * descomprimió y lo volvió a comprimir (Archivos mete todo en una carpeta; macOS agrega `__MACOSX/`).
 */
function ubicarRaiz(entradas: readonly EntradaLeida[]): string {
  if (entradas.some((e) => e.nombre === RUTA_MANIFEST)) return '';
  const enCarpeta = entradas.filter((e) => !e.nombre.startsWith('__MACOSX/') && /^[^/]+\/manifest\.json$/.test(e.nombre));
  if (enCarpeta.length === 1) return enCarpeta[0]!.nombre.slice(0, -RUTA_MANIFEST.length);
  throw new ErrorRespaldo('no_es_percha', 'Falta manifest.json');
}

async function leerJson(entrada: EntradaLeida, motivo: MotivoRespaldo): Promise<unknown> {
  const bytes = new Uint8Array(await (await entrada.obtener()).arrayBuffer());
  if (bytes.length !== entrada.bytes || crc32(bytes) !== entrada.crc32) throw danado(`${entrada.nombre}: tamaño o CRC distintos`);
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (error) {
    throw new ErrorRespaldo(motivo, `${entrada.nombre} no es JSON`, { cause: error });
  }
}

const TABLAS_LISTA = ['prendas', 'siluetas', 'maniquies', 'outfits', 'calendario', 'usosDia'] as const satisfies readonly (keyof Conteos)[];

/**
 * datos.json en forma de tablas, como las ve una migración en Dexie: `medidas` y `ajustes` pasan
 * a tablas de cero o un registro, e `imagenes` sale del manifest, sin blobs.
 */
function aTablas(datos: unknown, manifest: Manifest): Registros {
  if (datos === null || typeof datos !== 'object' || Array.isArray(datos)) throw danado('datos.json no es un objeto');
  const d = datos as Record<string, unknown>;
  const registros: Registros = {};
  for (const tabla of TABLAS_LISTA) {
    const filas = d[tabla];
    if (!Array.isArray(filas)) throw danado(`datos.${tabla} no es una lista`);
    if (filas.length !== manifest.conteos[tabla]) throw danado(`datos.${tabla} no coincide con manifest.conteos`);
    registros[tabla] = filas;
  }
  for (const unico of ['medidas', 'ajustes']) {
    if (!(unico in d)) throw danado(`Falta datos.${unico}`);
    registros[unico] = d[unico] === null ? [] : [d[unico]];
  }
  registros.imagenes = manifest.imagenes.map(({ id, tipo, ancho, alto, bytes, creada }) => ({ id, tipo, ancho, alto, bytes, creada }));
  return registros;
}

/**
 * Lee y valida el respaldo entero sin escribir nada: estructura del ZIP, manifest, datos.json
 * (migrado en memoria si es de un esquema anterior), referencias, y el tamaño y el CRC-32 de cada
 * imagen. Si algo falla, lanza `ErrorRespaldo` con el mensaje para la usuaria.
 */
export async function leerRespaldo(
  archivo: Blob,
  opciones: { migraciones?: readonly Migracion[] } = {},
): Promise<RespaldoLeido> {
  const migraciones = opciones.migraciones ?? MIGRACIONES;
  const inicio = performance.now();
  try {
    const entradas = await leerZip(archivo);
    const raiz = ubicarRaiz(entradas);
    const porNombre = new Map(entradas.map((e) => [e.nombre, e]));

    const resultadoManifest = validarManifest(await leerJson(porNombre.get(raiz + RUTA_MANIFEST)!, 'no_es_percha'), migraciones.length);
    if (!resultadoManifest.ok) throw new ErrorRespaldo(resultadoManifest.motivo, resultadoManifest.detalle);
    const manifest = resultadoManifest.datos;

    const entradaDatos = porNombre.get(raiz + RUTA_DATOS);
    if (!entradaDatos) throw danado('Falta datos.json');
    const registros = aTablas(await leerJson(entradaDatos, 'danado'), manifest);

    let migrados: Registros;
    try {
      migrados = migrarDatos(registros, manifest.esquema, migraciones.length, migraciones);
    } catch (error) {
      throw danado(`La migración desde el esquema ${manifest.esquema} falló: ${String(error)}`, error);
    }
    const resultadoDatos = validarDatos(migrados);
    if (!resultadoDatos.ok) throw new ErrorRespaldo(resultadoDatos.motivo, resultadoDatos.detalle);

    const metaPorId = new Map(manifest.imagenes.map((i) => [i.id, i]));
    const imagenes: Imagen[] = [];
    let bytes = entradaDatos.bytes;
    for (const registro of resultadoDatos.datos.imagenes) {
      const meta = metaPorId.get(registro.id);
      if (!meta) throw danado(`La imagen ${registro.id} no está en el manifest`);
      const entrada = porNombre.get(raiz + meta.ruta);
      if (!entrada) throw danado(`Falta ${meta.ruta}`);
      if (entrada.bytes !== meta.bytes) throw danado(`${meta.ruta}: ${entrada.bytes} bytes en vez de ${meta.bytes}`);
      // Una copia propia de los bytes, no el `slice` del archivo: WebKit guarda en IndexedDB el
      // archivo entero detrás de un `slice` y, al recargar, lo devuelve completo en vez del trozo
      // (research R-14). Se lee una sola vez para el CRC y para la copia.
      const contenido = new Uint8Array(await (await entrada.obtener()).arrayBuffer());
      if (contenido.length !== meta.bytes || crcHex(crc32(contenido)) !== meta.crc32) throw danado(`${meta.ruta}: CRC-32 distinto`);
      imagenes.push({ ...registro, blob: new Blob([contenido], { type: meta.mime }) });
      bytes += contenido.length;
    }

    registrarTiempo(`respaldo: leer y validar ${imagenes.length} imágenes`, performance.now() - inicio);
    return { manifest, creado: Date.parse(manifest.creado), datos: { ...resultadoDatos.datos, imagenes }, bytes };
  } catch (error) {
    if (error instanceof ErrorRespaldo) registrar('aviso', `Respaldo rechazado (${error.motivo}): ${error.detalle ?? ''}`);
    throw error;
  }
}

/** Si hay algo que perder: cualquier registro fuera de Ajustes. */
export async function hayDatos(): Promise<boolean> {
  for (const tabla of [db.prendas, db.imagenes, db.siluetas, db.maniquies, db.outfits, db.calendario, db.usosDia, db.medidas]) {
    if ((await tabla.count()) > 0) return true;
  }
  return false;
}

export function mensajeConfirmacion(leido: RespaldoLeido, hoy: Date = new Date()): string {
  return (
    `Se reemplazará todo lo que hay en Percha por el contenido del respaldo del ${formatearDiaMesAnio(leido.creado, hoy)}. ` +
    'Antes guardaremos una copia de lo actual en el teléfono.'
  );
}

/** No está diseñado (desviaciones-diseno.md). */
export function mensajeRestaurar(creado: number, hoy: Date = new Date()): string {
  return (
    `Se reemplazará todo lo que hay en Percha por la copia automática del ${formatearDiaMesAnio(creado, hoy)}. ` +
    'Lo que hay ahora queda guardado como la nueva copia automática, por si quieres volver atrás.'
  );
}

function aplicarApariencia(apariencia: Apariencia): void {
  espejarApariencia(apariencia);
  if (typeof document !== 'undefined') aplicarTema(apariencia);
}

/**
 * Vacía y escribe las 9 tablas en **una** transacción: si algo falla (por ejemplo, la cuota), se
 * revierte y los datos anteriores quedan intactos. `respaldosAuto` no se toca.
 */
async function escribirTodo(datos: DatosImportados, ultimoRespaldo: number | undefined): Promise<Ajustes> {
  const ajustes: Ajustes = { ...AJUSTES_POR_DEFECTO, ...datos.ajustes[0], id: ID_AJUSTES };
  if (ultimoRespaldo !== undefined) ajustes.ultimoRespaldo = ultimoRespaldo;
  const tablas = [db.prendas, db.imagenes, db.siluetas, db.maniquies, db.outfits, db.calendario, db.usosDia, db.medidas, db.ajustes];
  const inicio = performance.now();
  try {
    await db.transaction('rw', tablas, async () => {
      await Promise.all(tablas.map((t) => t.clear()));
      await db.imagenes.bulkAdd(datos.imagenes);
      await db.prendas.bulkAdd(datos.prendas);
      await db.siluetas.bulkAdd(datos.siluetas);
      await db.maniquies.bulkAdd(datos.maniquies);
      await db.outfits.bulkAdd(datos.outfits);
      await db.calendario.bulkAdd(datos.calendario);
      await db.usosDia.bulkAdd(datos.usosDia);
      await db.medidas.bulkAdd(datos.medidas);
      await db.ajustes.put(ajustes);
    });
  } catch (error) {
    const nombre = error instanceof Error ? error.name : '';
    const interno = (error as { inner?: { name?: string } } | null)?.inner?.name;
    const cuota = nombre === 'QuotaExceededError' || interno === 'QuotaExceededError';
    throw new ErrorRespaldo(cuota ? 'sin_espacio' : 'escritura', String(error), { cause: error });
  }
  registrarTiempo('respaldo: escribir', performance.now() - inicio);
  return ajustes;
}

/**
 * Reemplaza todo por el respaldo leído. Si hay datos, antes guarda un respaldo automático; si no
 * hay espacio para ese respaldo más lo importado, se detiene sin tocar nada. Al terminar,
 * `ultimoRespaldo` queda con la fecha del archivo y se aplica su apariencia.
 */
export async function importar(leido: RespaldoLeido): Promise<void> {
  const actual = (await hayDatos()) ? await generarRespaldoBlob() : null;
  if (!(await hayEspacioPara((actual?.blob.size ?? 0) + leido.bytes))) {
    throw new ErrorRespaldo('sin_espacio', `Hacen falta ${(actual?.blob.size ?? 0) + leido.bytes} bytes`);
  }
  if (actual) await respaldosAuto.guardar(actual.blob);
  const ajustes = await escribirTodo(leido.datos, leido.creado);
  aplicarApariencia(ajustes.apariencia);
}

/**
 * Restaura el respaldo automático con la misma validación y la misma escritura. Lo actual queda
 * como el nuevo respaldo automático, así que restaurar se puede deshacer. El anterior se borra
 * solo cuando la escritura terminó; si falla, se borra el nuevo y todo queda como estaba.
 * `ultimoRespaldo` queda como estaba en esa copia: no es un respaldo guardado fuera del teléfono.
 */
export async function restaurarRespaldoAuto(): Promise<void> {
  const anterior = await respaldosAuto.obtenerUltimo();
  if (!anterior) throw new Error('No hay un respaldo automático para restaurar');
  const leido = await leerRespaldo(anterior.blob);
  const actual = (await hayDatos()) ? await generarRespaldoBlob() : null;
  if (!(await hayEspacioPara((actual?.blob.size ?? 0) + leido.bytes))) {
    throw new ErrorRespaldo('sin_espacio', `Hacen falta ${(actual?.blob.size ?? 0) + leido.bytes} bytes`);
  }
  const nuevo = actual ? await respaldosAuto.guardar(actual.blob, { conservar: anterior.id }) : null;
  let ajustes: Ajustes;
  try {
    ajustes = await escribirTodo(leido.datos, undefined);
  } catch (error) {
    if (nuevo) await respaldosAuto.borrar(nuevo.id);
    throw error;
  }
  if (nuevo) await respaldosAuto.borrar(anterior.id);
  aplicarApariencia(ajustes.apariencia);
}
