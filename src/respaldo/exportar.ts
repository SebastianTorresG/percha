// Exportar el respaldo (FR-002, contracts/respaldo.md, *Exportar*): lee todo en una transacción de
// solo lectura, arma el ZIP referenciando los `Blob` de la base y lo entrega con la hoja de
// compartir de iOS (Archivos, iCloud) o, si no se puede, con una descarga.

import { db } from '../datos/db';
import { actualizar } from '../datos/repos/ajustes';
import { ESQUEMA_ACTUAL, FORMATOS_IMAGEN, ID_AJUSTES, ID_MEDIDAS, esSiluetaIncluida, type FormatoImagen } from '../datos/tipos';
import { registrar, registrarTiempo } from '../diagnostico/registro';
import { crc32, crc32DeBlob, crcHex } from './crc32';
import {
  APP_RESPALDO,
  FORMATO_RESPALDO,
  RUTA_DATOS,
  RUTA_MANIFEST,
  isoLocal,
  nombreArchivo,
  rutaImagen,
  type DatosRespaldo,
  type ImagenManifest,
  type Manifest,
} from './formato';
import { escribirZip, type EntradaZip } from './zip-escritor';

export { nombreArchivo } from './formato';

export interface RespaldoGenerado {
  blob: Blob;
  manifest: Manifest;
  nombre: string;
}

const codificador = new TextEncoder();

function entradaJson(nombre: string, valor: unknown): EntradaZip {
  const datos = codificador.encode(JSON.stringify(valor));
  return { nombre, datos, crc32: crc32(datos), bytes: datos.length };
}

/**
 * Arma el ZIP del respaldo con todo lo que hay en la base. No escribe nada; también lo usa la
 * importación para el respaldo automático.
 */
export async function generarRespaldoBlob(fecha: Date = new Date()): Promise<RespaldoGenerado> {
  const inicio = performance.now();
  const t = await db.transaction(
    'r',
    [db.prendas, db.imagenes, db.siluetas, db.maniquies, db.outfits, db.calendario, db.usosDia, db.medidas, db.ajustes],
    async () => ({
      prendas: await db.prendas.toArray(),
      imagenes: await db.imagenes.toArray(),
      siluetas: await db.siluetas.toArray(),
      maniquies: await db.maniquies.toArray(),
      outfits: await db.outfits.toArray(),
      calendario: await db.calendario.toArray(),
      usosDia: await db.usosDia.toArray(),
      medidas: (await db.medidas.get(ID_MEDIDAS)) ?? null,
      ajustes: (await db.ajustes.get(ID_AJUSTES)) ?? null,
    }),
  );

  // Fuera de la transacción: leer los blobs no es una operación de IndexedDB y la cerraría.
  const imagenes: ImagenManifest[] = [];
  const entradasImagenes: EntradaZip[] = [];
  for (const imagen of t.imagenes) {
    const mime = imagen.blob.type as FormatoImagen;
    if (!FORMATOS_IMAGEN.includes(mime)) throw new Error(`La imagen ${imagen.id} tiene un formato inesperado: ${mime}`);
    const crc = await crc32DeBlob(imagen.blob);
    const ruta = rutaImagen(imagen.id, mime);
    imagenes.push({
      id: imagen.id,
      ruta,
      tipo: imagen.tipo,
      mime,
      bytes: imagen.blob.size,
      crc32: crcHex(crc),
      ancho: imagen.ancho,
      alto: imagen.alto,
      creada: imagen.creada,
    });
    entradasImagenes.push({ nombre: ruta, datos: imagen.blob, crc32: crc, bytes: imagen.blob.size });
  }

  const datos: DatosRespaldo = {
    prendas: t.prendas,
    siluetas: t.siluetas.filter((s) => !esSiluetaIncluida(s.id)),
    maniquies: t.maniquies,
    outfits: t.outfits,
    calendario: t.calendario,
    usosDia: t.usosDia,
    medidas: t.medidas,
    ajustes: t.ajustes,
  };
  const manifest: Manifest = {
    app: APP_RESPALDO,
    formato: FORMATO_RESPALDO,
    esquema: ESQUEMA_ACTUAL,
    creado: isoLocal(fecha),
    versionApp: __PERCHA_VERSION__,
    conteos: {
      prendas: datos.prendas.length,
      imagenes: imagenes.length,
      siluetas: datos.siluetas.length,
      maniquies: datos.maniquies.length,
      outfits: datos.outfits.length,
      calendario: datos.calendario.length,
      usosDia: datos.usosDia.length,
    },
    imagenes,
  };

  const blob = escribirZip([entradaJson(RUTA_MANIFEST, manifest), entradaJson(RUTA_DATOS, datos), ...entradasImagenes], fecha);
  registrarTiempo(`respaldo: armar ${imagenes.length} imágenes, ${blob.size} bytes`, performance.now() - inicio);
  return { blob, manifest, nombre: nombreArchivo(fecha) };
}

/** El respaldo como `File`, listo para la hoja de compartir. */
export async function prepararArchivo(fecha: Date = new Date()): Promise<File> {
  const { blob, nombre } = await generarRespaldoBlob(fecha);
  return new File([blob], nombre, { type: 'application/zip' });
}

/**
 * - `compartido`: la hoja de compartir terminó.
 * - `descargado`: no hay hoja de compartir para archivos; se disparó la descarga.
 * - `cancelado`: la usuaria cerró la hoja de compartir.
 * - `necesita_toque`: iOS no abrió la hoja porque armar el archivo tardó y se venció la activación
 *   del toque; hay que pedir otro toque y volver a llamar a `entregar` con el mismo archivo.
 */
export type ResultadoEntrega = 'compartido' | 'descargado' | 'cancelado' | 'necesita_toque';

function descargar(archivo: File): void {
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = archivo.name;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  // Revocar enseguida puede cortar la descarga en Safari.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Entrega el archivo y, solo si la entrega se completa, fija `ultimoRespaldo = ahora`. Con
 * `marcar: false` no lo fija: exportar la copia automática no respalda lo que hay ahora.
 */
export async function entregar(archivo: File, opciones: { marcar?: boolean } = {}): Promise<ResultadoEntrega> {
  let resultado: ResultadoEntrega;
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo] });
      resultado = 'compartido';
    } catch (error) {
      const nombre = error instanceof DOMException ? error.name : '';
      if (nombre === 'AbortError') resultado = 'cancelado';
      else if (nombre === 'NotAllowedError') resultado = 'necesita_toque';
      else throw error;
    }
  } else {
    descargar(archivo);
    resultado = 'descargado';
  }
  registrar('info', `Respaldo ${archivo.name} (${archivo.size} bytes): ${resultado}`);
  const completado = resultado === 'compartido' || resultado === 'descargado';
  if (completado && opciones.marcar !== false) await actualizar({ ultimoRespaldo: Date.now() });
  return resultado;
}

/** El respaldo automático como archivo, con la fecha en que se guardó. */
export function archivoRespaldoAuto(auto: { blob: Blob; creado: number }): File {
  const nombre = nombreArchivo(new Date(auto.creado)).replace('Percha-respaldo-', 'Percha-copia-automatica-');
  return new File([auto.blob], nombre, { type: 'application/zip' });
}
