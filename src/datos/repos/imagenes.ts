// Repositorio de la tabla `imagenes` (data-model.md, *Imagen*). Las entidades guardan solo IDs;
// los blobs viven aquí para que las grillas no los carguen y el respaldo pueda enumerarlos.

import Dexie from 'dexie';
import { db } from '../db';
import { FORMATOS_IMAGEN, type Imagen, type TipoImagen } from '../tipos';

const FORMATOS: readonly string[] = FORMATOS_IMAGEN;

/**
 * Guarda una imagen y devuelve su id. Si quien llama está dentro de una transacción de Dexie que
 * incluye `imagenes`, la escritura entra en esa transacción.
 */
export async function guardar(blob: Blob, tipo: TipoImagen, ancho: number, alto: number): Promise<string> {
  if (!FORMATOS.includes(blob.type)) {
    throw new Error(`Formato de imagen no admitido: ${blob.type || 'desconocido'}`);
  }
  if (!(ancho > 0 && alto > 0)) {
    throw new Error(`Tamaño de imagen inválido: ${ancho} × ${alto}`);
  }
  const imagen: Imagen = {
    id: crypto.randomUUID(),
    tipo,
    blob,
    ancho,
    alto,
    bytes: blob.size,
    creada: Date.now(),
  };
  await db.imagenes.add(imagen);
  return imagen.id;
}

export async function obtener(id: string): Promise<Imagen | undefined> {
  return db.imagenes.get(id);
}

export async function obtenerBlob(id: string): Promise<Blob | undefined> {
  return (await db.imagenes.get(id))?.blob;
}

/**
 * Borra imágenes. Debe llamarse dentro de la transacción de quien borra la entidad dueña, para que
 * nunca quede una imagen huérfana ni una referencia rota (data-model.md, *Imagen*).
 */
export async function borrar(ids: readonly string[]): Promise<void> {
  if (!Dexie.currentTransaction) {
    throw new Error('imagenes.borrar se llama dentro de la transacción que borra la entidad dueña');
  }
  if (ids.length === 0) return;
  await db.imagenes.bulkDelete([...ids]);
}

/** Suma de los bytes de todas las imágenes, para "espacio usado" en Ajustes (FR-006). */
export async function bytesTotales(): Promise<number> {
  let total = 0;
  await db.imagenes.each((imagen) => {
    total += imagen.bytes;
  });
  return total;
}

// ---------------------------------------------------------------------------------------------
// Object URLs con conteo de referencias (research R-9: se liberan al desmontar).
// ---------------------------------------------------------------------------------------------

interface UrlCompartida {
  url: Promise<string | undefined>;
  referencias: number;
}

const urls = new Map<string, UrlCompartida>();

/**
 * Devuelve un object URL de la imagen y suma una referencia. Cada llamada se equilibra con
 * `soltarUrl(id)`; con la última, el URL se libera con `URL.revokeObjectURL`.
 */
export function urlDe(id: string): Promise<string | undefined> {
  let compartida = urls.get(id);
  if (!compartida) {
    compartida = {
      url: obtenerBlob(id).then((blob) => (blob ? URL.createObjectURL(blob) : undefined)),
      referencias: 0,
    };
    urls.set(id, compartida);
  }
  compartida.referencias++;
  return compartida.url;
}

export function soltarUrl(id: string): void {
  const compartida = urls.get(id);
  if (!compartida) return;
  compartida.referencias--;
  if (compartida.referencias > 0) return;
  urls.delete(id);
  void compartida.url.then((url) => {
    if (url) URL.revokeObjectURL(url);
  });
}

/** Cantidad de object URLs vivos; para el panel de diagnóstico y las pruebas. */
export function urlsVivas(): number {
  return urls.size;
}
