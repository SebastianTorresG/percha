// FR-004 y US1 escenario 4: cada fila de la tabla de rechazo de contracts/respaldo.md, con su
// mensaje exacto, y la base sin cambios.

import { beforeEach, describe, expect, it } from 'vitest';
import type { Outfit, Prenda } from '../../src/datos/tipos';
import { crc32 } from '../../src/respaldo/crc32';
import { generarRespaldoBlob } from '../../src/respaldo/exportar';
import { leerRespaldo } from '../../src/respaldo/importar';
import { escribirZip } from '../../src/respaldo/zip-escritor';
import { conjuntoCompleto, sembrar } from '../fixtures/datos';
import { alterarRespaldo, instantanea } from '../fixtures/respaldo';

const NO_ES_PERCHA = 'Este archivo no es un respaldo de Percha.';
const VERSION_NUEVA = 'Este respaldo es de una versión más nueva de Percha. Actualiza la app y vuelve a intentarlo.';
const DANADO = 'El respaldo está dañado y no se puede usar. Tus datos no cambiaron.';

let valido: Blob;
let antes: unknown;
let conjunto: ReturnType<typeof conjuntoCompleto>;

beforeEach(async () => {
  conjunto = conjuntoCompleto();
  await sembrar(conjunto);
  valido = (await generarRespaldoBlob(new Date(2026, 9, 26, 8, 15))).blob;
  antes = await instantanea();
});

async function rechaza(archivo: Blob, mensaje: string) {
  await expect(leerRespaldo(archivo)).rejects.toThrow(mensaje);
  expect(await instantanea()).toEqual(antes);
}

type Datos = Record<string, unknown> & { prendas: Prenda[]; outfits: Outfit[] };
type Manifest = Record<string, unknown> & { imagenes: { id: string; ruta: string; bytes: number }[] };

describe('respaldo: rechazos sin tocar los datos', () => {
  it('el respaldo válido sí se lee (control)', async () => {
    await expect(leerRespaldo(valido)).resolves.toBeDefined();
  });

  it('no es un ZIP', async () => {
    await rechaza(new Blob(['hola, no soy un respaldo'], { type: 'text/plain' }), NO_ES_PERCHA);
    await rechaza(new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10])], { type: 'image/jpeg' }), NO_ES_PERCHA);
  });

  it('falta el directorio central (archivo cortado)', async () => {
    await rechaza(valido.slice(0, Math.floor(valido.size / 2)), NO_ES_PERCHA);
  });

  it('falta manifest.json', async () => {
    await rechaza(await alterarRespaldo(valido, { quitar: ['manifest.json'] }), NO_ES_PERCHA);
    const otroZip = escribirZip([{ nombre: 'foto.txt', datos: new Uint8Array([1]), crc32: 0xa505df1b, bytes: 1 }]);
    await rechaza(otroZip, NO_ES_PERCHA);
  });

  it('app distinta de "percha"', async () => {
    await rechaza(await alterarRespaldo(valido, { manifest: (m) => ({ ...m, app: 'otra-app' }) }), NO_ES_PERCHA);
  });

  it('manifest.json que no es JSON', async () => {
    const datos = new TextEncoder().encode('{app: percha');
    await rechaza(escribirZip([{ nombre: 'manifest.json', datos, crc32: crc32(datos), bytes: datos.length }]), NO_ES_PERCHA);
  });

  it('formato mayor que el soportado', async () => {
    await rechaza(await alterarRespaldo(valido, { manifest: (m) => ({ ...m, formato: 2 }) }), VERSION_NUEVA);
  });

  it('esquema mayor que el de la app', async () => {
    await rechaza(await alterarRespaldo(valido, { manifest: (m) => ({ ...m, esquema: 2 }) }), VERSION_NUEVA);
  });

  it('datos.json no es JSON válido', async () => {
    await rechaza(await alterarRespaldo(valido, { datosCrudos: '{"prendas": [' }), DANADO);
  });

  it('datos.json no cumple el esquema: tipos, enums o IDs repetidos', async () => {
    const casos: ((d: Datos) => unknown)[] = [
      (d) => ({ ...d, prendas: 'muchas' }),
      (d) => ({ ...d, prendas: [{ ...d.prendas[0], categoria: 'sombrero' }, ...d.prendas.slice(1)] }),
      (d) => ({ ...d, prendas: [{ ...d.prendas[0], usos: -1 }, ...d.prendas.slice(1)] }),
      (d) => ({ ...d, prendas: [{ ...d.prendas[0], id: undefined }, ...d.prendas.slice(1)] }),
      (d) => ({ ...d, prendas: [...d.prendas, d.prendas[0]] }),
      (d) => ({ ...d, ajustes: { ...(d.ajustes as object), apariencia: 'rosa' } }),
      (d) => ({ ...d, calendario: [{ fecha: '26/10/2026', outfitId: d.outfits[0]!.id }] }),
      (d) => {
        const { maniquies: _, ...sin } = d;
        return sin;
      },
    ];
    for (const caso of casos) {
      await rechaza(await alterarRespaldo(valido, { datos: (d) => caso(d as Datos) }), DANADO);
    }
  });

  it('los conteos del manifest no coinciden con datos.json', async () => {
    await rechaza(
      await alterarRespaldo(valido, {
        manifest: (m) => ({ ...m, conteos: { ...(m.conteos as object), prendas: conjunto.prendas.length + 1 } }),
      }),
      DANADO,
    );
  });

  it('una imagen del manifest falta en el archivo', async () => {
    const ruta = `imagenes/${conjunto.imagenes[0]!.id}.${conjunto.imagenes[0]!.blob.type === 'image/png' ? 'png' : 'jpg'}`;
    await rechaza(await alterarRespaldo(valido, { quitar: [ruta] }), DANADO);
  });

  it('el tamaño de una imagen no coincide con el manifest', async () => {
    await rechaza(
      await alterarRespaldo(valido, {
        manifest: (m) => {
          const [primera, ...resto] = (m as Manifest).imagenes;
          return { ...m, imagenes: [{ ...primera, bytes: primera!.bytes + 1 }, ...resto] };
        },
      }),
      DANADO,
    );
  });

  it('el CRC-32 de una imagen no coincide (mismos bytes de largo, otro contenido)', async () => {
    const imagen = conjunto.imagenes[0]!;
    const ruta = `imagenes/${imagen.id}.${imagen.blob.type === 'image/png' ? 'png' : 'jpg'}`;
    const bytes = new Uint8Array(await imagen.blob.arrayBuffer());
    bytes[bytes.length - 1] = bytes.at(-1)! ^ 0xff;
    await rechaza(await alterarRespaldo(valido, { reemplazar: { [ruta]: bytes } }), DANADO);
  });

  it('una referencia apunta a una imagen, prenda, maniquí, silueta u outfit que no existe', async () => {
    const casos: ((d: Datos) => unknown)[] = [
      (d) => ({ ...d, prendas: [{ ...d.prendas[0], imagen: { ...d.prendas[0]!.imagen, recorteId: 'no-existe' } }, ...d.prendas.slice(1)] }),
      (d) => ({
        ...d,
        outfits: [
          { ...d.outfits[0], capas: [{ ...d.outfits[0]!.capas[0], prendaId: 'no-existe' }], prendaIds: ['no-existe'] },
          ...d.outfits.slice(1),
        ],
      }),
      (d) => ({ ...d, outfits: [{ ...d.outfits[0], maniquiId: 'no-existe' }, ...d.outfits.slice(1)] }),
      (d) => ({ ...d, siluetas: [] }),
      (d) => ({ ...d, calendario: [{ fecha: '2026-10-30', outfitId: 'no-existe' }] }),
    ];
    for (const caso of casos) {
      await rechaza(await alterarRespaldo(valido, { datos: (d) => caso(d as Datos) }), DANADO);
    }
  });
});
