// Escritor de ZIP propio (research R-10, contracts/respaldo.md): entradas sin compresión (STORE),
// CRC-32 calculado por quien llama, nombres UTF-8 (bit 11) y ZIP64 cuando hace falta. El ZIP se
// arma como `new Blob([encabezado, datos, …])`: los `Blob` de las imágenes se referencian, no se
// copian a la memoria de JavaScript, para que un respaldo de cientos de megas no cierre la app.

export interface EntradaZip {
  nombre: string;
  datos: Blob | Uint8Array<ArrayBuffer>;
  crc32: number;
  /** Tamaño de `datos`; se declara aparte para poder planificar los encabezados sin leerlos. */
  bytes: number;
}

export type ParteZip = Blob | Uint8Array<ArrayBuffer>;

const MAX_16 = 0xffff;
const MAX_32 = 0xffffffff;
const BIT_UTF8 = 0x0800;
const VERSION = 20;
const VERSION_ZIP64 = 45;
const ID_EXTRA_ZIP64 = 0x0001;

const codificador = new TextEncoder();

/** Hora y fecha en el formato de MS-DOS, en hora local, como las muestran Archivos y otras apps. */
function fechaDos(fecha: Date): [hora: number, dia: number] {
  const anio = Math.min(Math.max(fecha.getFullYear(), 1980), 2107);
  return [
    (fecha.getHours() << 11) | (fecha.getMinutes() << 5) | (fecha.getSeconds() >> 1),
    ((anio - 1980) << 9) | ((fecha.getMonth() + 1) << 5) | fecha.getDate(),
  ];
}

function bloque(largo: number) {
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
      vista.setUint32(pos, v, true);
      pos += 4;
    },
    u64(v: number) {
      vista.setBigUint64(pos, BigInt(v), true);
      pos += 8;
    },
    copiar(b: Uint8Array) {
      bytes.set(b, pos);
      pos += b.length;
    },
  };
}

/** Extra ZIP64 (0x0001) con los campos que no entran en 32 bits, en el orden de la especificación. */
function extraZip64(campos: readonly number[]): Uint8Array<ArrayBuffer> {
  if (campos.length === 0) return new Uint8Array(0);
  const extra = bloque(4 + 8 * campos.length);
  extra.u16(ID_EXTRA_ZIP64);
  extra.u16(8 * campos.length);
  for (const campo of campos) extra.u64(campo);
  return extra.bytes;
}

/**
 * Las partes del ZIP en orden: encabezado local y datos de cada entrada, directorio central,
 * registros ZIP64 si hacen falta y registro de fin. Usa `bytes` tal como se declara, sin mirar
 * `datos`, para poder probar los encabezados ZIP64 sin escribir 4 GB.
 */
export function partesZip(entradas: readonly EntradaZip[], fecha: Date = new Date()): ParteZip[] {
  const [hora, dia] = fechaDos(fecha);
  const partes: ParteZip[] = [];
  const centrales: Uint8Array<ArrayBuffer>[] = [];
  let desplazamiento = 0;

  for (const entrada of entradas) {
    const nombre = codificador.encode(entrada.nombre);
    const tamano64 = entrada.bytes >= MAX_32;
    const desplazamiento64 = desplazamiento >= MAX_32;
    const tamano32 = tamano64 ? MAX_32 : entrada.bytes;

    // En el encabezado local, ZIP64 lleva siempre los dos tamaños.
    const extraLocal = extraZip64(tamano64 ? [entrada.bytes, entrada.bytes] : []);
    const local = bloque(30 + nombre.length + extraLocal.length);
    local.u32(0x04034b50);
    local.u16(tamano64 ? VERSION_ZIP64 : VERSION);
    local.u16(BIT_UTF8);
    local.u16(0); // STORE
    local.u16(hora);
    local.u16(dia);
    local.u32(entrada.crc32);
    local.u32(tamano32);
    local.u32(tamano32);
    local.u16(nombre.length);
    local.u16(extraLocal.length);
    local.copiar(nombre);
    local.copiar(extraLocal);
    partes.push(local.bytes, entrada.datos);

    // En el directorio central, solo los campos que no entran.
    const extraCentral = extraZip64([
      ...(tamano64 ? [entrada.bytes, entrada.bytes] : []),
      ...(desplazamiento64 ? [desplazamiento] : []),
    ]);
    const version = extraCentral.length > 0 ? VERSION_ZIP64 : VERSION;
    const central = bloque(46 + nombre.length + extraCentral.length);
    central.u32(0x02014b50);
    central.u16(version); // hecha por: MS-DOS, sin permisos de Unix que restaurar
    central.u16(version);
    central.u16(BIT_UTF8);
    central.u16(0);
    central.u16(hora);
    central.u16(dia);
    central.u32(entrada.crc32);
    central.u32(tamano32);
    central.u32(tamano32);
    central.u16(nombre.length);
    central.u16(extraCentral.length);
    central.u16(0); // comentario
    central.u16(0); // disco
    central.u16(0); // atributos internos
    central.u32(0); // atributos externos
    central.u32(desplazamiento64 ? MAX_32 : desplazamiento);
    central.copiar(nombre);
    central.copiar(extraCentral);
    centrales.push(central.bytes);

    desplazamiento += local.bytes.length + entrada.bytes;
  }

  const inicioCentral = desplazamiento;
  const tamanoCentral = centrales.reduce((suma, c) => suma + c.length, 0);
  const cantidad = entradas.length;
  partes.push(...centrales);

  // Los valores centinela (0xFFFF, 0xFFFFFFFF) ya obligan a leer ZIP64, así que cuentan como "no entra".
  if (cantidad >= MAX_16 || inicioCentral >= MAX_32 || tamanoCentral >= MAX_32) {
    const fin64 = bloque(56);
    fin64.u32(0x06064b50);
    fin64.u64(56 - 12);
    fin64.u16(VERSION_ZIP64);
    fin64.u16(VERSION_ZIP64);
    fin64.u32(0);
    fin64.u32(0);
    fin64.u64(cantidad);
    fin64.u64(cantidad);
    fin64.u64(tamanoCentral);
    fin64.u64(inicioCentral);
    const localizador = bloque(20);
    localizador.u32(0x07064b50);
    localizador.u32(0);
    localizador.u64(inicioCentral + tamanoCentral);
    localizador.u32(1);
    partes.push(fin64.bytes, localizador.bytes);
  }

  const fin = bloque(22);
  fin.u32(0x06054b50);
  fin.u16(0);
  fin.u16(0);
  fin.u16(Math.min(cantidad, MAX_16));
  fin.u16(Math.min(cantidad, MAX_16));
  fin.u32(Math.min(tamanoCentral, MAX_32));
  fin.u32(Math.min(inicioCentral, MAX_32));
  fin.u16(0);
  partes.push(fin.bytes);
  return partes;
}

export function escribirZip(entradas: readonly EntradaZip[], fecha?: Date): Blob {
  for (const entrada of entradas) {
    const tamano = entrada.datos instanceof Blob ? entrada.datos.size : entrada.datos.byteLength;
    if (tamano !== entrada.bytes) {
      throw new Error(`La entrada ${entrada.nombre} declara ${entrada.bytes} bytes y tiene ${tamano}`);
    }
  }
  return new Blob(partesZip(entradas, fecha), { type: 'application/zip' });
}
