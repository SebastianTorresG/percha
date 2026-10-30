// Archivos que la usuaria eligiría en el selector de Archivos para las pruebas A8 y A15: una foto,
// un PDF, un ZIP de otra app y respaldos descomprimidos y vueltos a comprimir (con o sin partes).

import { leerZip } from '../../src/respaldo/zip-lector';
import { fotoJpeg, prendaPng } from '../fixtures/imagenes/imagenes';
import { zipAjeno, type EntradaAjena } from '../fixtures/zip-ajeno';
import type { ArchivoPrueba } from './apoyo';

const ZIP = 'application/zip';

async function aBuffer(blob: Blob): Promise<Buffer> {
  return Buffer.from(await blob.arrayBuffer());
}

export function foto(): ArchivoPrueba {
  return { name: 'IMG_0001.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(fotoJpeg.base64, 'base64') };
}

export function pdf(): ArchivoPrueba {
  const texto = '%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [] /Count 0 >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n';
  return { name: 'factura.pdf', mimeType: 'application/pdf', buffer: Buffer.from(texto) };
}

/** Dos fotos comprimidas en Archivos ("mantener presionado → Comprimir"). */
export async function zipDeFotos(): Promise<ArchivoPrueba> {
  const blob = await zipAjeno([
    { nombre: 'Fotos/IMG_0001.jpg', datos: Buffer.from(fotoJpeg.base64, 'base64') },
    { nombre: 'Fotos/IMG_0002.png', datos: Buffer.from(prendaPng.base64, 'base64') },
  ]);
  return { name: 'Fotos.zip', mimeType: ZIP, buffer: await aBuffer(blob) };
}

/**
 * Un respaldo descomprimido en Archivos (que lo deja en una carpeta con su nombre) y vuelto a
 * comprimir, con deflate. `quitar` decide qué entradas se borraron de la carpeta antes de comprimir.
 */
export async function recomprimido(
  respaldo: Buffer,
  opciones: { nombre?: string; quitar?: (ruta: string) => boolean } = {},
): Promise<ArchivoPrueba> {
  const carpeta = 'Percha-respaldo-2026-10-01/';
  const entradas: EntradaAjena[] = [];
  for (const entrada of await leerZip(new Blob([new Uint8Array(respaldo)]))) {
    if (opciones.quitar?.(entrada.nombre)) continue;
    entradas.push({ nombre: carpeta + entrada.nombre, datos: new Uint8Array(await (await entrada.obtener()).arrayBuffer()) });
  }
  const blob = await zipAjeno(entradas);
  return { name: opciones.nombre ?? 'Percha-respaldo-2026-10-01.zip', mimeType: ZIP, buffer: await aBuffer(blob) };
}

/** El mismo archivo con otro nombre (A8.7, A15.6). */
export function renombrado(respaldo: Buffer, nombre: string): ArchivoPrueba {
  return { name: nombre, mimeType: ZIP, buffer: respaldo };
}
