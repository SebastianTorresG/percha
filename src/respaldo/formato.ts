// Formato 1 del archivo de respaldo (contracts/respaldo.md): nombres, rutas y tipos de
// manifest.json y datos.json.

import type {
  Ajustes,
  Calendario,
  FormatoImagen,
  Maniqui,
  Medidas,
  Outfit,
  Prenda,
  Silueta,
  TipoImagen,
  UsosDia,
} from '../datos/tipos';
import { fechaLocal } from '../util/fechas';

export const APP_RESPALDO = 'percha';
/** Versión del formato del archivo que escribe y entiende esta versión de la app. */
export const FORMATO_RESPALDO = 1;
export const RUTA_MANIFEST = 'manifest.json';
export const RUTA_DATOS = 'datos.json';

export interface ImagenManifest {
  id: string;
  ruta: string;
  tipo: TipoImagen;
  mime: FormatoImagen;
  bytes: number;
  /** 8 dígitos hexadecimales en minúscula. */
  crc32: string;
  ancho: number;
  alto: number;
  /** No está en el ejemplo del contrato: se agregó para que la ida y vuelta sea exacta (SC-001). */
  creada: number;
}

export interface Conteos {
  prendas: number;
  imagenes: number;
  siluetas: number;
  maniquies: number;
  outfits: number;
  calendario: number;
  usosDia: number;
}

export interface Manifest {
  app: typeof APP_RESPALDO;
  formato: number;
  esquema: number;
  /** ISO 8601 en hora local con su desfase, por ejemplo `2026-10-22T08:15:00-05:00`. */
  creado: string;
  versionApp: string;
  conteos: Conteos;
  imagenes: ImagenManifest[];
}

/** datos.json: los registros tal como están en la base, sin blobs (las imágenes van por ID). */
export interface DatosRespaldo {
  prendas: Prenda[];
  siluetas: Silueta[];
  maniquies: Maniqui[];
  outfits: Outfit[];
  calendario: Calendario[];
  usosDia: UsosDia[];
  medidas: Medidas | null;
  ajustes: Ajustes | null;
}

export function rutaImagen(id: string, mime: FormatoImagen): string {
  return `imagenes/${id}.${mime === 'image/jpeg' ? 'jpg' : 'png'}`;
}

/** `Percha-respaldo-AAAA-MM-DD.zip`, con la fecha local. */
export function nombreArchivo(fecha: Date): string {
  return `Percha-respaldo-${fechaLocal(fecha)}.zip`;
}

const dos = (n: number) => String(n).padStart(2, '0');

/** ISO 8601 en hora local con desfase, sin milisegundos. */
export function isoLocal(fecha: Date): string {
  const desfase = -fecha.getTimezoneOffset();
  const signo = desfase >= 0 ? '+' : '-';
  const abs = Math.abs(desfase);
  return (
    `${fechaLocal(fecha)}T${dos(fecha.getHours())}:${dos(fecha.getMinutes())}:${dos(fecha.getSeconds())}` +
    `${signo}${dos(Math.floor(abs / 60))}:${dos(abs % 60)}`
  );
}
