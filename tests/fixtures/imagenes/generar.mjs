// Genera tests/fixtures/imagenes/imagenes.ts: imágenes PNG y JPEG pequeñas y reales, codificadas
// por el canvas de WebKit (el motor de Safari), más una JPEG con orientación EXIF 6 para probar
// `redimensionar` (T024). Se corre a mano solo si hay que cambiar las imágenes:
//
//   node tests/fixtures/imagenes/generar.mjs
//
// Usa el WebKit de Playwright que ya instala el proyecto. El resultado se versiona.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { webkit } from 'playwright';

const navegador = await webkit.launch();
const pagina = await navegador.newPage();

const imagenes = await pagina.evaluate(async () => {
  function lienzo(ancho, alto) {
    const c = document.createElement('canvas');
    c.width = ancho;
    c.height = alto;
    return c;
  }
  async function base64(canvas, tipo, calidad) {
    const blob = await new Promise((r) => canvas.toBlob(r, tipo, calidad));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
  }

  // Prenda recortada: fondo transparente y una blusa trapezoidal de color liso.
  const prenda = lienzo(24, 32);
  {
    const ctx = prenda.getContext('2d');
    ctx.fillStyle = '#b9776a';
    ctx.beginPath();
    ctx.moveTo(6, 2);
    ctx.lineTo(18, 2);
    ctx.lineTo(22, 30);
    ctx.lineTo(2, 30);
    ctx.closePath();
    ctx.fill();
  }

  // Foto de una prenda (JPEG opaco), del mismo tamaño que la máscara del recortador falso.
  const foto = lienzo(48, 64);
  {
    const ctx = foto.getContext('2d');
    ctx.fillStyle = '#e9e4dc';
    ctx.fillRect(0, 0, 48, 64);
    ctx.fillStyle = '#3a2a25';
    ctx.beginPath();
    ctx.ellipse(24, 32, 18, 26, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Máscara elíptica fija del recortador falso: blanco = prenda, negro = fondo.
  const mascara = lienzo(48, 64);
  {
    const ctx = mascara.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 48, 64);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(24, 32, 18, 26, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Máscara vacía (cobertura 0) para el caso "no se encontró la prenda".
  const mascaraVacia = lienzo(48, 64);
  {
    const ctx = mascaraVacia.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 48, 64);
  }

  // Para la orientación EXIF: guardada de 40 × 20, mitad izquierda roja y derecha azul. Con la
  // orientación 6 (girar 90° en sentido horario para mostrarla) se ve de 20 × 40, roja arriba.
  const girada = lienzo(40, 20);
  {
    const ctx = girada.getContext('2d');
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 20, 20);
    ctx.fillStyle = '#0000ff';
    ctx.fillRect(20, 0, 20, 20);
  }

  return {
    prendaPng: { base64: await base64(prenda, 'image/png'), ancho: 24, alto: 32 },
    fotoJpeg: { base64: await base64(foto, 'image/jpeg', 0.9), ancho: 48, alto: 64 },
    mascaraPng: { base64: await base64(mascara, 'image/png'), ancho: 48, alto: 64 },
    mascaraVaciaPng: { base64: await base64(mascaraVacia, 'image/png'), ancho: 48, alto: 64 },
    giradaJpeg: { base64: await base64(girada, 'image/jpeg', 0.95), ancho: 40, alto: 20 },
  };
});

await navegador.close();

// Inserta un segmento APP1 Exif con Orientation (0x0112) = 6 justo después del SOI.
function conOrientacion(jpeg, orientacion) {
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) throw new Error('No es un JPEG');
  const tiff = Buffer.from([
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, // "MM", 42, IFD0 en el byte 8
    0x00, 0x01, // una entrada
    0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, orientacion, 0x00, 0x00, // Orientation SHORT
    0x00, 0x00, 0x00, 0x00, // sin IFD siguiente
  ]);
  const carga = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]);
  const largo = carga.length + 2;
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, largo >> 8, largo & 0xff]), carga]);
  return Buffer.concat([jpeg.subarray(0, 2), app1, jpeg.subarray(2)]);
}

const girada = conOrientacion(Buffer.from(imagenes.giradaJpeg.base64, 'base64'), 6);
imagenes.giradaExif6Jpeg = {
  base64: girada.toString('base64'),
  // Tamaño guardado; al mostrarla con la orientación aplicada es de 20 × 40.
  ancho: 40,
  alto: 20,
};
delete imagenes.giradaJpeg;

const tipos = {
  prendaPng: 'image/png',
  fotoJpeg: 'image/jpeg',
  mascaraPng: 'image/png',
  mascaraVaciaPng: 'image/png',
  giradaExif6Jpeg: 'image/jpeg',
};

const lineas = [
  '// Generado por tests/fixtures/imagenes/generar.mjs con el canvas de WebKit. No editar a mano.',
  '',
  'export interface ImagenFixture {',
  '  base64: string;',
  "  tipo: 'image/png' | 'image/jpeg';",
  '  ancho: number;',
  '  alto: number;',
  '}',
  '',
];
for (const [nombre, img] of Object.entries(imagenes)) {
  lineas.push(
    `export const ${nombre}: ImagenFixture = {`,
    `  base64: '${img.base64}',`,
    `  tipo: '${tipos[nombre]}',`,
    `  ancho: ${img.ancho},`,
    `  alto: ${img.alto},`,
    '};',
    '',
  );
}
lineas.push(
  '/** Blob de una imagen de prueba; funciona en Node y en el navegador. */',
  'export function blobDe(imagen: ImagenFixture): Blob {',
  '  const binario = atob(imagen.base64);',
  '  const bytes = new Uint8Array(binario.length);',
  '  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);',
  '  return new Blob([bytes], { type: imagen.tipo });',
  '}',
  '',
);

const destino = fileURLToPath(new URL('./imagenes.ts', import.meta.url));
writeFileSync(destino, lineas.join('\n'));
console.log(`Escrito ${destino}`);
