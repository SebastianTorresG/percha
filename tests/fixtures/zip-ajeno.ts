// ZIP "de otra app" para las pruebas del lector y de la importación: entradas con deflate, data
// descriptor (bit 3, con tamaños en cero en el encabezado local) y un campo extra en el encabezado
// local que no está en el directorio central. Así quedan los respaldos que la usuaria descomprime y
// vuelve a comprimir en Archivos o en una Mac (contracts/respaldo.md).

import { crc32 } from '../../src/respaldo/crc32';
import { leerZip } from '../../src/respaldo/zip-lector';

export interface EntradaAjena {
  nombre: string;
  datos: Uint8Array;
  /** 8 = deflate (por defecto), 0 = sin compresión, otro = método no admitido. */
  metodo?: number;
}

export async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
  const flujo = new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(flujo).arrayBuffer());
}

function escritor(largo: number) {
  const bytes = new Uint8Array(largo);
  const vista = new DataView(bytes.buffer);
  let pos = 0;
  return {
    bytes,
    u16(v: number) {
      vista.setUint16(pos, v, true);
      pos += 2;
    },
    u32(v: number) {
      vista.setUint32(pos, v >>> 0, true);
      pos += 4;
    },
    copiar(b: Uint8Array) {
      bytes.set(b, pos);
      pos += b.length;
    },
  };
}

/** Escribe un ZIP con data descriptor y versión "Unix", como los de las herramientas de compresión comunes. */
export async function zipAjeno(entradas: readonly EntradaAjena[]): Promise<Blob> {
  const codificador = new TextEncoder();
  const partes: Uint8Array<ArrayBuffer>[] = [];
  const centrales: Uint8Array<ArrayBuffer>[] = [];
  let desplazamiento = 0;
  // Extended timestamp (0x5455) solo en el encabezado local.
  const extraLocal = new Uint8Array([0x55, 0x54, 5, 0, 1, 0, 0, 0, 0]);

  for (const entrada of entradas) {
    const metodo = entrada.metodo ?? 8;
    const nombre = codificador.encode(entrada.nombre);
    const crc = crc32(entrada.datos);
    const datos = metodo === 8 ? await deflateRaw(entrada.datos) : new Uint8Array(entrada.datos);

    const local = escritor(30 + nombre.length + extraLocal.length);
    local.u32(0x04034b50);
    local.u16(20);
    local.u16(0x0808);
    local.u16(metodo);
    local.u16(0);
    local.u16(0x5b5a);
    local.u32(0);
    local.u32(0);
    local.u32(0);
    local.u16(nombre.length);
    local.u16(extraLocal.length);
    local.copiar(nombre);
    local.copiar(extraLocal);

    const descriptor = escritor(16);
    descriptor.u32(0x08074b50);
    descriptor.u32(crc);
    descriptor.u32(datos.length);
    descriptor.u32(entrada.datos.length);

    const central = escritor(46 + nombre.length);
    central.u32(0x02014b50);
    central.u16(0x031e);
    central.u16(20);
    central.u16(0x0808);
    central.u16(metodo);
    central.u16(0);
    central.u16(0x5b5a);
    central.u32(crc);
    central.u32(datos.length);
    central.u32(entrada.datos.length);
    central.u16(nombre.length);
    central.u16(0);
    central.u16(0);
    central.u16(0);
    central.u16(0);
    central.u32(0o100644 << 16);
    central.u32(desplazamiento);
    central.copiar(nombre);

    partes.push(local.bytes, datos, descriptor.bytes);
    centrales.push(central.bytes);
    desplazamiento += local.bytes.length + datos.length + descriptor.bytes.length;
  }

  const tamanoCentral = centrales.reduce((suma, c) => suma + c.length, 0);
  const fin = escritor(22);
  fin.u32(0x06054b50);
  fin.u16(0);
  fin.u16(0);
  fin.u16(entradas.length);
  fin.u16(entradas.length);
  fin.u32(tamanoCentral);
  fin.u32(desplazamiento);
  fin.u16(0);
  return new Blob([...partes, ...centrales, fin.bytes], { type: 'application/zip' });
}

/**
 * Lee un ZIP y lo vuelve a escribir con deflate, como si la usuaria lo hubiera descomprimido y
 * comprimido otra vez. Con `carpeta`, todas las entradas quedan dentro de esa carpeta (lo que hace
 * Archivos al comprimir la carpeta descomprimida). `agregar` suma entradas al final, por ejemplo
 * la basura `__MACOSX/` de una Mac.
 */
export async function rehacerZip(
  archivo: Blob,
  opciones: { carpeta?: string; agregar?: readonly EntradaAjena[] } = {},
): Promise<Blob> {
  const entradas: EntradaAjena[] = [];
  for (const entrada of await leerZip(archivo)) {
    const datos = new Uint8Array(await (await entrada.obtener()).arrayBuffer());
    entradas.push({ nombre: `${opciones.carpeta ?? ''}${entrada.nombre}`, datos });
  }
  return zipAjeno([...entradas, ...(opciones.agregar ?? [])]);
}
