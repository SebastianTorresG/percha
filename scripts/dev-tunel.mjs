// Servidor de desarrollo + túnel temporal de Cloudflare (sin cuenta) para abrir la app en Safari
// del iPhone por HTTPS (research R-14). La URL cambia en cada ejecución, así que el service worker
// y la instalación en la pantalla de inicio se prueban mejor con `npm run deploy:preview`.
//
// Uso: npm run dev:tunel

import { spawn, spawnSync } from 'node:child_process';

const PUERTO = 5173;
const enWindows = process.platform === 'win32';

if (spawnSync('cloudflared', ['--version'], { shell: enWindows }).status !== 0) {
  console.error(
    'Falta cloudflared. Instálalo con:\n  winget install --id Cloudflare.cloudflared\n' +
      'y abre una terminal nueva para que quede en el PATH.',
  );
  process.exit(1);
}

const procesos = [
  spawn('npx', ['vite', '--port', String(PUERTO), '--strictPort'], { stdio: 'inherit', shell: enWindows }),
  spawn('cloudflared', ['tunnel', '--url', `http://localhost:${PUERTO}`], { shell: enWindows }),
];

// cloudflared escribe su URL en stderr junto con otros mensajes: solo se muestra la URL.
let urlMostrada = false;
procesos[1].stderr.on('data', (trozo) => {
  const url = String(trozo).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)?.[0];
  if (url && !urlMostrada) {
    urlMostrada = true;
    console.log(`\n  Abre en Safari del iPhone: ${url}\n`);
  }
});

const terminar = () => {
  for (const proceso of procesos) proceso.kill();
  process.exit(0);
};
process.on('SIGINT', terminar);
process.on('SIGTERM', terminar);
for (const proceso of procesos) proceso.on('exit', terminar);
