// Genera los respaldos de prueba de docs/respaldos-de-prueba/ para correr a mano las pruebas
// "[con datos]" de docs/pruebas-intensivas.md mientras la app todavía no deja agregar prendas.
// No es una prueba de la app: se corre con `npm run respaldos:prueba`. Al final comprueba que
// cada archivo se importa (o se rechaza) como dice el README de esa carpeta.

import { expect, it } from 'vitest';
import type { Categoria, Prenda } from '../../src/datos/tipos';
import { generarRespaldoBlob } from '../../src/respaldo/exportar';
import { leerRespaldo } from '../../src/respaldo/importar';
import { conjuntoCompleto, crearAjustes, crearManiqui, crearOutfit, crearPrenda, sembrar, type ConImagenes } from '../fixtures/datos';
import { alterarRespaldo, vaciarBase } from '../fixtures/respaldo';

const DESTINO = 'docs/respaldos-de-prueba';

interface SistemaArchivos {
  mkdir(ruta: string, opciones: { recursive: boolean }): Promise<unknown>;
  writeFile(ruta: string, datos: Uint8Array): Promise<void>;
}

async function guardar(nombre: string, archivo: Blob): Promise<void> {
  // Las pruebas se tipan sin los tipos de Node; este es el único archivo que escribe en disco.
  const fs = (await import(/* @vite-ignore */ 'node:fs/promises' as string)) as SistemaArchivos;
  await fs.mkdir(DESTINO, { recursive: true });
  await fs.writeFile(`${DESTINO}/${nombre}`, new Uint8Array(await archivo.arrayBuffer()));
}

const EXTRA: [string, Categoria, string, Partial<Prenda>][] = [
  ['Camiseta blanca', 'top', '#f4f1ea', { usos: 12, ultimoUso: '2026-10-22', temporadas: ['verano'] }],
  ['Camiseta negra', 'top', '#1d1b1a', { usos: 9, ultimoUso: '2026-10-18' }],
  ['Suéter de lana', 'top', '#8a6f5c', { temporadas: ['invierno'], etiquetas: ['lana'] }],
  ['Camisa a rayas', 'top', '#5b6f8f', { ocasiones: ['oficina'] }],
  ['Jean recto', 'bottom', '#3d4a63', { usos: 20, ultimoUso: '2026-10-24' }],
  ['Falda midi plisada', 'bottom', '#b9776a', { ocasiones: ['fiesta'] }],
  ['Short de lino', 'bottom', '#d8c8b0', { temporadas: ['verano'], usos: 1, ultimoUso: '2026-08-10' }],
  ['Vestido negro', 'vestido', '#141312', { ocasiones: ['fiesta', 'cena'] }],
  ['Vestido floreado', 'vestido', '#c98f8f', { temporadas: ['primavera'] }],
  ['Botas café', 'calzado', '#5a3b2a', { temporadas: ['invierno'], usos: 4, ultimoUso: '2026-09-02' }],
  ['Sandalias', 'calzado', '#c9a27a', { temporadas: ['verano'] }],
  ['Gabardina', 'abrigo', '#b59b78', { temporadas: ['otoño'] }],
  ['Pañuelo de seda', 'accesorio', '#7a4b6b', { etiquetas: ['regalo'] }],
];

it('genera los respaldos de prueba', async () => {
  // A: el clóset completo de las pruebas (20 prendas, Taller en los tres estados, silueta
  // importada, 2 maniquíes, 4 outfits, calendario, medidas) con fecha de hace más de 14 días.
  const conjunto = conjuntoCompleto();
  const extra: ConImagenes<Prenda>[] = EXTRA.map(([nombre, categoria, hex, parcial]) =>
    crearPrenda({ nombre, categoria, color: { hex }, ...parcial }),
  );
  const [blanca, , , , jean, , , , , botas, , gabardina] = extra;
  const maniqui = conjunto.maniquies[0]!.id;
  const otono = crearOutfit([jean!.entidad, blanca!.entidad, botas!.entidad, gabardina!.entidad], maniqui, {
    nombre: 'Otoño en la ciudad',
    etiquetas: ['diario'],
  });
  const fiesta = crearOutfit([extra[7]!.entidad, extra[12]!.entidad, extra[10]!.entidad], maniqui, {
    nombre: 'Cena del sábado',
    etiquetas: ['fiesta'],
  });
  await sembrar({
    ...conjunto,
    prendas: [...conjunto.prendas, ...extra.map((p) => p.entidad)],
    imagenes: [...conjunto.imagenes, ...extra.flatMap((p) => p.imagenes), ...otono.imagenes, ...fiesta.imagenes],
    outfits: [...conjunto.outfits, otono.entidad, fiesta.entidad],
    calendario: [...conjunto.calendario, { fecha: '2026-10-29', outfitId: otono.entidad.id }, { fecha: '2026-10-31', outfitId: fiesta.entidad.id }],
    respaldosAuto: [],
  });
  const completo = await generarRespaldoBlob(new Date(2026, 9, 1, 10, 0));
  await guardar('Percha-respaldo-2026-10-01.zip', completo.blob);

  // B: un clóset chico y reciente (3 prendas, 1 maniquí, 1 outfit), para ver que reemplazar y
  // restaurar cambian los conteos de Ajustes.
  await vaciarBase();
  const prendasB = [
    crearPrenda({ nombre: 'Saco de pana', categoria: 'abrigo', color: { hex: '#6b4f3a' } }),
    crearPrenda({ nombre: 'Pantalón negro', categoria: 'bottom', color: { hex: '#1f1e1d' } }),
    crearPrenda({ nombre: 'Mocasines', categoria: 'calzado', color: { hex: '#4a3528' } }),
  ];
  const maniquiB = crearManiqui({ nombre: 'Frente' });
  const outfitB = crearOutfit(prendasB.map((p) => p.entidad), maniquiB.entidad.id, { nombre: 'Reunión' });
  await sembrar({
    prendas: prendasB.map((p) => p.entidad),
    imagenes: [...prendasB.flatMap((p) => p.imagenes), ...maniquiB.imagenes, ...outfitB.imagenes],
    maniquies: [maniquiB.entidad],
    outfits: [outfitB.entidad],
    ajustes: [crearAjustes({ dedicatoria: undefined })],
  });
  const chico = await generarRespaldoBlob(new Date(2026, 9, 28, 19, 30));
  await guardar('Percha-respaldo-2026-10-28.zip', chico.blob);

  // C: un respaldo "de una versión más nueva" y D: uno con una foto alterada (CRC distinto).
  await guardar('Percha-respaldo-version-nueva.zip', await alterarRespaldo(chico.blob, { manifest: (m) => ({ ...m, esquema: 99 }) }));
  const imagen = completo.manifest.imagenes[0]!;
  const bytes = new Uint8Array(await (await leerRespaldo(completo.blob)).datos.imagenes[0]!.blob.arrayBuffer());
  bytes[bytes.length - 1] = bytes.at(-1)! ^ 0xff;
  const danado = await alterarRespaldo(completo.blob, { reemplazar: { [imagen.ruta]: bytes } });
  await guardar('Percha-respaldo-danado.zip', danado);
  await expect(leerRespaldo(danado)).rejects.toMatchObject({ motivo: 'danado' });

  // Cada archivo hace lo que dice el README.
  expect((await leerRespaldo(completo.blob)).datos.prendas).toHaveLength(20);
  expect((await leerRespaldo(chico.blob)).datos.prendas).toHaveLength(3);
  await expect(leerRespaldo(await alterarRespaldo(chico.blob, { manifest: (m) => ({ ...m, esquema: 99 }) }))).rejects.toMatchObject({
    motivo: 'version_nueva',
  });
});
