import { describe, expect, it } from 'vitest';
import { crc32 } from '../../src/respaldo/crc32';
import { ErrorRespaldo } from '../../src/respaldo/errores';
import { escribirZip, partesZip, type EntradaZip } from '../../src/respaldo/zip-escritor';
import { leerZip } from '../../src/respaldo/zip-lector';
import { zipAjeno } from '../fixtures/zip-ajeno';

const texto = (s: string) => new TextEncoder().encode(s);

function entrada(nombre: string, datos: Uint8Array<ArrayBuffer> | Blob, bytes?: Uint8Array): EntradaZip {
  const contenido = bytes ?? (datos as Uint8Array);
  return { nombre, datos, crc32: crc32(contenido), bytes: contenido.length };
}

async function bytesDe(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

const u16 = (b: Uint8Array, pos: number) => new DataView(b.buffer, b.byteOffset).getUint16(pos, true);
const u32 = (b: Uint8Array, pos: number) => new DataView(b.buffer, b.byteOffset).getUint32(pos, true);
const u64 = (b: Uint8Array, pos: number) => Number(new DataView(b.buffer, b.byteOffset).getBigUint64(pos, true));

/** Posición de la última aparición de una firma de 4 bytes. */
function ultimaFirma(b: Uint8Array, firma: number): number {
  for (let i = b.length - 4; i >= 0; i--) if (u32(b, i) === firma) return i;
  return -1;
}

const FIRMA_FIN = 0x06054b50;
const FIRMA_FIN_64 = 0x06064b50;
const FIRMA_LOCALIZADOR_64 = 0x07064b50;

describe('escribirZip', () => {
  it('escribe entradas STORE con CRC-32 y nombres UTF-8 (bit 11), en el orden dado', async () => {
    const manifest = texto('{"app":"percha"}');
    const imagen = new Blob([new Uint8Array([137, 80, 78, 71, 1, 2, 3])], { type: 'image/png' });
    const zip = escribirZip([
      entrada('manifest.json', manifest),
      entrada('imágenes/ñandú.png', imagen, new Uint8Array([137, 80, 78, 71, 1, 2, 3])),
    ]);
    const b = await bytesDe(zip);
    expect(zip.type).toBe('application/zip');

    // Encabezado local de la primera entrada.
    expect(u32(b, 0)).toBe(0x04034b50);
    expect(u16(b, 4)).toBe(20);
    expect(u16(b, 6) & 0x0800).toBe(0x0800);
    expect(u16(b, 6) & 0x0008).toBe(0);
    expect(u16(b, 8)).toBe(0);
    expect(u32(b, 14)).toBe(crc32(manifest));
    expect([u32(b, 18), u32(b, 22)]).toEqual([manifest.length, manifest.length]);
    expect(new TextDecoder().decode(b.subarray(30, 30 + u16(b, 26)))).toBe('manifest.json');

    // Sin ZIP64 en un archivo chico.
    expect(ultimaFirma(b, FIRMA_FIN_64)).toBe(-1);

    const leidas = await leerZip(zip);
    expect(leidas.map((e) => e.nombre)).toEqual(['manifest.json', 'imágenes/ñandú.png']);
    expect(leidas.map((e) => e.metodo)).toEqual([0, 0]);
    expect(await bytesDe(await leidas[0]!.obtener())).toEqual(manifest);
    const png = await leidas[1]!.obtener('image/png');
    expect(png.type).toBe('image/png');
    expect(await bytesDe(png)).toEqual(new Uint8Array([137, 80, 78, 71, 1, 2, 3]));
  });

  it('rechaza una entrada cuyo tamaño no coincide con sus datos', () => {
    expect(() => escribirZip([{ nombre: 'a', datos: texto('abc'), crc32: 0, bytes: 2 }])).toThrow();
  });

  it('activa ZIP64 al pasar de 4 GB, con tamaños simulados', async () => {
    const grande = 5_000_000_000;
    const partes = partesZip([
      { nombre: 'grande.bin', datos: new Uint8Array(0), crc32: 0x12345678, bytes: grande },
      { nombre: 'b.txt', datos: new Uint8Array(0), crc32: 0, bytes: 0 },
    ]);
    // Los datos están vacíos: el blob solo tiene los encabezados, que declaran los tamaños reales.
    const b = await bytesDe(new Blob(partes));

    // Encabezado local con 0xFFFFFFFF y el campo extra ZIP64 (0x0001) con los dos tamaños.
    expect(u16(b, 4)).toBe(45);
    expect([u32(b, 18), u32(b, 22)]).toEqual([0xffffffff, 0xffffffff]);
    const largoNombre = u16(b, 26);
    const extra = 30 + largoNombre;
    expect(u16(b, extra)).toBe(0x0001);
    expect(u16(b, extra + 2)).toBe(16);
    expect([u64(b, extra + 4), u64(b, extra + 12)]).toEqual([grande, grande]);

    // La segunda entrada empieza después de 5 GB: su desplazamiento va en el extra del directorio central.
    const segundoLocal = extra + 4 + 16;
    expect(u32(b, segundoLocal)).toBe(0x04034b50);
    const centrales: number[] = [];
    for (let i = 0; i < b.length - 4; i++) if (u32(b, i) === 0x02014b50) centrales.push(i);
    expect(centrales).toHaveLength(2);
    const segundo = centrales[1]!;
    expect(u32(b, segundo + 42)).toBe(0xffffffff);
    const extraCentral = segundo + 46 + u16(b, segundo + 28);
    expect(u16(b, extraCentral)).toBe(0x0001);
    expect(u16(b, extraCentral + 2)).toBe(8);
    expect(u64(b, extraCentral + 4)).toBe(segundoLocal + grande);

    // Registro de fin ZIP64 y su localizador antes del registro de fin.
    const fin = ultimaFirma(b, FIRMA_FIN);
    const localizador = fin - 20;
    expect(u32(b, localizador)).toBe(FIRMA_LOCALIZADOR_64);
    const fin64 = ultimaFirma(b, FIRMA_FIN_64);
    expect(fin64).toBeGreaterThan(0);
    expect(u64(b, localizador + 8)).toBe(fin64 + grande);
    expect(u32(b, fin + 16)).toBe(0xffffffff);
  });

  it('activa ZIP64 con 65 535 entradas o más, y el lector las lee todas', async () => {
    const pocas = partesZip(
      Array.from({ length: 65_534 }, (_, i) => ({ nombre: `e/${i}`, datos: new Uint8Array(0), crc32: 0, bytes: 0 })),
    );
    const cola = await bytesDe(new Blob(pocas.slice(-3)));
    expect(ultimaFirma(cola, FIRMA_FIN_64)).toBe(-1);
    expect(u16(cola, cola.length - 22 + 10)).toBe(65_534);

    const uno = new Uint8Array([7]);
    const crcUno = crc32(uno);
    const muchas = escribirZip(
      Array.from({ length: 65_535 }, (_, i) => ({ nombre: `e/${i}`, datos: uno, crc32: crcUno, bytes: 1 })),
    );
    const b = await bytesDe(muchas);
    const fin = ultimaFirma(b, FIRMA_FIN);
    expect([u16(b, fin + 8), u16(b, fin + 10)]).toEqual([0xffff, 0xffff]);
    expect(u32(b, fin - 20)).toBe(FIRMA_LOCALIZADOR_64);

    const leidas = await leerZip(muchas);
    expect(leidas).toHaveLength(65_535);
    expect(leidas.at(-1)!.nombre).toBe('e/65534');
    expect(await bytesDe(await leidas.at(-1)!.obtener())).toEqual(uno);
  });
});

describe('leerZip', () => {
  it('lee un ZIP re-comprimido con deflate y data descriptor', async () => {
    const datos = texto('{"app":"percha","formato":1}'.repeat(20));
    const crudo = new Uint8Array([1, 2, 3, 4, 5]);
    const zip = await zipAjeno([
      { nombre: 'manifest.json', datos },
      { nombre: 'imagenes/a.png', datos: crudo, metodo: 0 },
    ]);
    const leidas = await leerZip(zip);
    expect(leidas.map((e) => [e.nombre, e.metodo, e.bytes])).toEqual([
      ['manifest.json', 8, datos.length],
      ['imagenes/a.png', 0, 5],
    ]);
    expect(leidas[0]!.bytesComprimidos).toBeLessThan(datos.length);
    expect(leidas[0]!.crc32).toBe(crc32(datos));
    expect(await bytesDe(await leidas[0]!.obtener())).toEqual(datos);
    const png = await leidas[1]!.obtener('image/png');
    expect([png.type, png.size]).toEqual(['image/png', 5]);
  });

  it('encuentra el directorio central aunque el archivo tenga un comentario al final', async () => {
    const zip = escribirZip([entrada('a.txt', texto('hola'))]);
    const b = await bytesDe(zip);
    const comentario = texto('Comprimido con otra app');
    const conComentario = new Uint8Array(b.length + comentario.length);
    conComentario.set(b);
    conComentario.set(comentario, b.length);
    new DataView(conComentario.buffer).setUint16(b.length - 2, comentario.length, true);
    const leidas = await leerZip(new Blob([conComentario]));
    expect(await bytesDe(await leidas[0]!.obtener())).toEqual(texto('hola'));
  });

  it('si no es un ZIP, lo dice como "no es un respaldo de Percha"', async () => {
    for (const archivo of [new Blob([]), new Blob([texto('no soy un zip, soy un texto cualquiera')]), new Blob([new Uint8Array(4000)])]) {
      await expect(leerZip(archivo)).rejects.toMatchObject({ motivo: 'no_es_percha' });
    }
  });

  it('una estructura dañada o un método no admitido dan "dañado"', async () => {
    const b = await bytesDe(escribirZip([entrada('a.txt', texto('hola')), entrada('b.txt', texto('chau'))]));
    // El registro de fin apunta a un directorio central fuera del archivo.
    const fueraDeRango = new Uint8Array(b);
    new DataView(fueraDeRango.buffer).setUint32(fueraDeRango.length - 6, b.length + 100, true);
    await expect(leerZip(new Blob([fueraDeRango]))).rejects.toBeInstanceOf(ErrorRespaldo);
    await expect(leerZip(new Blob([fueraDeRango]))).rejects.toMatchObject({ motivo: 'danado' });

    // Firma del directorio central rota.
    const firmaRota = new Uint8Array(b);
    const central = ultimaFirma(firmaRota, 0x02014b50);
    firmaRota[central] = 0;
    await expect(leerZip(new Blob([firmaRota]))).rejects.toMatchObject({ motivo: 'danado' });

    // Método 12 (bzip2): se lista, pero no se puede obtener.
    const [bzip] = await leerZip(await zipAjeno([{ nombre: 'a.txt', datos: texto('hola'), metodo: 12 }]));
    await expect(bzip!.obtener()).rejects.toMatchObject({ motivo: 'danado' });
  });
});
