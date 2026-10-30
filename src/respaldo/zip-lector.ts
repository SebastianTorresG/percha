// Lector de ZIP sin copias (research R-10, contracts/respaldo.md): ubica el directorio central al
// final del archivo y entrega cada entrada como `archivo.slice(inicio, fin)`. Si la entrada viene
// comprimida (método 8, porque se volvió a comprimir en otra app), se descomprime con
// `DecompressionStream('deflate-raw')` de la plataforma. Usa los tamaños y el CRC del directorio
// central, así que también lee los ZIP con data descriptor (bit 3).

import { ErrorRespaldo } from './errores';

export interface EntradaLeida {
  nombre: string;
  /** 0 = sin compresión, 8 = deflate. */
  metodo: number;
  crc32: number;
  bytesComprimidos: number;
  /** Tamaño sin comprimir. */
  bytes: number;
  /** Los datos sin comprimir; `tipo` es el MIME del `Blob` resultante. */
  obtener(tipo?: string): Promise<Blob>;
}

const FIRMA_LOCAL = 0x04034b50;
const FIRMA_CENTRAL = 0x02014b50;
const FIRMA_FIN = 0x06054b50;
const FIRMA_FIN_64 = 0x06064b50;
const FIRMA_LOCALIZADOR_64 = 0x07064b50;
const MAX_32 = 0xffffffff;
const LARGO_FIN = 22;
const MAX_COMENTARIO = 0xffff;
const LARGO_LOCALIZADOR = 20;

const decodificador = new TextDecoder('utf-8');

function vista(bytes: Uint8Array) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    u16: (pos: number) => v.getUint16(pos, true),
    u32: (pos: number) => v.getUint32(pos, true),
    u64: (pos: number) => Number(v.getBigUint64(pos, true)),
  };
}

async function leer(archivo: Blob, inicio: number, largo: number): Promise<Uint8Array> {
  return new Uint8Array(await archivo.slice(inicio, inicio + largo).arrayBuffer());
}

const danado = (detalle: string, causa?: unknown) => new ErrorRespaldo('danado', detalle, { cause: causa });

interface Fin {
  cantidad: number;
  tamanoCentral: number;
  inicioCentral: number;
}

async function leerFin(archivo: Blob): Promise<Fin> {
  const largoCola = Math.min(archivo.size, LARGO_FIN + MAX_COMENTARIO + LARGO_LOCALIZADOR);
  const inicioCola = archivo.size - largoCola;
  const cola = await leer(archivo, inicioCola, largoCola);
  const c = vista(cola);

  // El registro de fin está al final, seguido como mucho por un comentario de hasta 64 KB.
  let fin = -1;
  for (let i = cola.length - LARGO_FIN; i >= 0; i--) {
    if (c.u32(i) === FIRMA_FIN) {
      fin = i;
      break;
    }
  }
  if (fin < 0) throw new ErrorRespaldo('no_es_percha', 'Sin registro de fin de ZIP');

  const localizador = fin - LARGO_LOCALIZADOR;
  if (localizador >= 0 && c.u32(localizador) === FIRMA_LOCALIZADOR_64) {
    const fin64 = await leer(archivo, c.u64(localizador + 8), 56);
    const f = vista(fin64);
    if (fin64.length < 56 || f.u32(0) !== FIRMA_FIN_64) throw danado('Registro de fin ZIP64 inválido');
    return { cantidad: f.u64(32), tamanoCentral: f.u64(40), inicioCentral: f.u64(48) };
  }
  return { cantidad: c.u16(fin + 10), tamanoCentral: c.u32(fin + 12), inicioCentral: c.u32(fin + 16) };
}

/** Lee el campo extra ZIP64 (0x0001) para los campos que en el directorio central valen 0xFFFFFFFF. */
function aplicarZip64(extra: Uint8Array, campos: { bytes: number; bytesComprimidos: number; local: number }) {
  const e = vista(extra);
  for (let pos = 0; pos + 4 <= extra.length; pos += 4 + e.u16(pos + 2)) {
    if (e.u16(pos) !== 0x0001) continue;
    let p = pos + 4;
    const siguiente = () => {
      if (p + 8 > pos + 4 + e.u16(pos + 2)) throw danado('Campo extra ZIP64 corto');
      const valor = e.u64(p);
      p += 8;
      return valor;
    };
    if (campos.bytes === MAX_32) campos.bytes = siguiente();
    if (campos.bytesComprimidos === MAX_32) campos.bytesComprimidos = siguiente();
    if (campos.local === MAX_32) campos.local = siguiente();
    return;
  }
  throw danado('Falta el campo extra ZIP64');
}

export async function leerZip(archivo: Blob): Promise<EntradaLeida[]> {
  const { cantidad, tamanoCentral, inicioCentral } = await leerFin(archivo);
  if (inicioCentral + tamanoCentral > archivo.size) throw danado('El directorio central queda fuera del archivo');

  const central = await leer(archivo, inicioCentral, tamanoCentral);
  const c = vista(central);
  const entradas: EntradaLeida[] = [];
  let pos = 0;

  for (let i = 0; i < cantidad; i++) {
    if (pos + 46 > central.length || c.u32(pos) !== FIRMA_CENTRAL) throw danado(`Entrada ${i} del directorio central inválida`);
    const banderas = c.u16(pos + 8);
    const metodo = c.u16(pos + 10);
    const crc32 = c.u32(pos + 16);
    const largoNombre = c.u16(pos + 28);
    const largoExtra = c.u16(pos + 30);
    const largoComentario = c.u16(pos + 32);
    if (pos + 46 + largoNombre + largoExtra > central.length) throw danado(`Entrada ${i} cortada`);
    const nombre = decodificador.decode(central.subarray(pos + 46, pos + 46 + largoNombre));
    const campos = { bytes: c.u32(pos + 24), bytesComprimidos: c.u32(pos + 20), local: c.u32(pos + 42) };
    if (campos.bytes === MAX_32 || campos.bytesComprimidos === MAX_32 || campos.local === MAX_32) {
      aplicarZip64(central.subarray(pos + 46 + largoNombre, pos + 46 + largoNombre + largoExtra), campos);
    }
    pos += 46 + largoNombre + largoExtra + largoComentario;

    entradas.push({
      nombre,
      metodo,
      crc32,
      bytes: campos.bytes,
      bytesComprimidos: campos.bytesComprimidos,
      async obtener(tipo = '') {
        if (banderas & 0x0001) throw danado(`${nombre} está cifrado`);
        if (metodo !== 0 && metodo !== 8) throw danado(`${nombre} usa el método ${metodo}`);
        const local = await leer(archivo, campos.local, 30);
        const l = vista(local);
        if (local.length < 30 || l.u32(0) !== FIRMA_LOCAL) throw danado(`Encabezado local de ${nombre} inválido`);
        // El encabezado local puede tener otro campo extra que el directorio central.
        const inicio = campos.local + 30 + l.u16(26) + l.u16(28);
        const fin = inicio + campos.bytesComprimidos;
        if (fin > archivo.size) throw danado(`${nombre} queda fuera del archivo`);
        if (metodo === 0) return archivo.slice(inicio, fin, tipo);
        try {
          const flujo = archivo.slice(inicio, fin).stream().pipeThrough(new DecompressionStream('deflate-raw'));
          const blob = await new Response(flujo).blob();
          return tipo ? blob.slice(0, blob.size, tipo) : blob;
        } catch (error) {
          throw danado(`No se pudo descomprimir ${nombre}`, error);
        }
      },
    });
  }
  return entradas;
}
