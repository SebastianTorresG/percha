// Descarga el subconjunto del modelo de imgly que usa el spike y lo deja en
// public/modelos/imgly/1.7.0/, verificando el tamaño y el SHA-256 de cada trozo.
// Es la única descarga de terceros del spike y ocurre en el computador, no en el teléfono.
//
// Uso: node scripts/descargar-modelo.mjs [--modelos isnet_quint8,isnet_fp16]

import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const VERSION = '1.7.0';
const BASE = `https://staticimgly.com/@imgly/background-removal-data/${VERSION}/dist/`;
const DESTINO = join('public', 'modelos', 'imgly', VERSION);

const argModelos = process.argv.indexOf('--modelos');
const modelos =
  argModelos > -1 ? process.argv[argModelos + 1].split(',') : ['isnet_quint8', 'isnet_fp16'];

// CPU usa ort-wasm-simd-threaded; WebGPU usa la variante .jsep (research R-0).
const claves = [
  ...modelos.map((m) => `/models/${m}`),
  '/onnxruntime-web/ort-wasm-simd-threaded.wasm',
  '/onnxruntime-web/ort-wasm-simd-threaded.mjs',
  '/onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm',
  '/onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs',
];

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

async function yaDescargado(ruta, tamano, hash) {
  try {
    if ((await stat(ruta)).size !== tamano) return false;
    return sha256(await readFile(ruta)) === hash;
  } catch {
    return false;
  }
}

const respuesta = await fetch(`${BASE}resources.json`);
if (!respuesta.ok) throw new Error(`No se pudo leer resources.json: HTTP ${respuesta.status}`);
const recursos = await respuesta.json();

const faltantes = claves.filter((clave) => !recursos[clave]);
if (faltantes.length) throw new Error(`resources.json no tiene: ${faltantes.join(', ')}`);

await mkdir(DESTINO, { recursive: true });

let bytesTotales = 0;
for (const clave of claves) {
  const entrada = recursos[clave];
  let bytesClave = 0;
  for (const trozo of entrada.chunks) {
    const tamano = trozo.offsets[1] - trozo.offsets[0];
    const ruta = join(DESTINO, trozo.name);
    if (!(await yaDescargado(ruta, tamano, trozo.hash))) {
      const r = await fetch(`${BASE}${trozo.name}`);
      if (!r.ok) throw new Error(`HTTP ${r.status} al bajar ${clave} (${trozo.name})`);
      const datos = Buffer.from(await r.arrayBuffer());
      if (datos.length !== tamano) {
        throw new Error(`${clave}: el trozo ${trozo.name} mide ${datos.length} y debía medir ${tamano}`);
      }
      if (sha256(datos) !== trozo.hash) throw new Error(`${clave}: el SHA-256 de ${trozo.name} no coincide`);
      await writeFile(ruta, datos);
    }
    bytesClave += tamano;
  }
  if (bytesClave !== entrada.size) {
    throw new Error(`${clave}: los trozos suman ${bytesClave} y el recurso mide ${entrada.size}`);
  }
  bytesTotales += bytesClave;
  console.log(`✓ ${clave} (${(bytesClave / 1e6).toFixed(1)} MB, ${entrada.chunks.length} trozos)`);
}

// Solo se publican las entradas descargadas: si imgly pide otra, falla con un mensaje claro.
const filtrado = Object.fromEntries(claves.map((clave) => [clave, recursos[clave]]));
await writeFile(join(DESTINO, 'resources.json'), JSON.stringify(filtrado, null, 2));

console.log(`Listo: ${(bytesTotales / 1e6).toFixed(1)} MB en ${DESTINO}`);
