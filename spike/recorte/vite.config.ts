import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Dos variantes del spike (research R-0): con y sin aislamiento de origen (COOP/COEP),
// que habilita SharedArrayBuffer y los hilos de WASM de ONNX Runtime.
const COI = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

const HEADERS_SIN_COI = `/
  Cache-Control: no-cache
/index.html
  Cache-Control: no-cache
/sw.js
  Cache-Control: no-cache
/modelos/*
  Cache-Control: public, max-age=31536000, immutable
`;

export default defineConfig(({ mode }) => {
  const sinCoi = mode === 'sin-coi';
  return {
    define: { __VARIANTE__: JSON.stringify(sinCoi ? 'sin-coi' : 'con-coi') },
    server: { headers: sinCoi ? {} : COI },
    preview: { headers: sinCoi ? {} : COI },
    worker: { format: 'es' },
    build: { target: 'es2022' },
    plugins: [
      {
        name: 'headers-sin-coi',
        apply: 'build',
        closeBundle() {
          // public/_headers trae COOP/COEP; la variante sin-coi lo reemplaza.
          if (sinCoi) writeFileSync(resolve('dist', '_headers'), HEADERS_SIN_COI);
        },
      },
    ],
  };
});
