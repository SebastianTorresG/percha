// Lo que solo se ve en la app publicada (docs/pruebas-intensivas.md, A1 y A3.7): headers de
// Cloudflare, cada archivo del precache, el manifest, el ícono de la pantalla de inicio y las
// pantallas de inicio (splash) de iOS. Las que dependen de los headers de public/_headers solo
// corren con PERCHA_URL (scripts/probar-despliegue.ts); el resto también contra `vite preview`.

import { existsSync, readFileSync } from 'node:fs';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const desplegada = process.env.PERCHA_URL;
const BG = { claro: [0xf4, 0xeb, 0xe6], oscuro: [0x0f, 0x0e, 0x0d] } as const;

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== 'iphone-15', 'No depende del perfil: corre una vez');
});

async function traer(request: APIRequestContext, ruta: string) {
  const respuesta = await request.get(ruta);
  expect(respuesta.status(), `${ruta} responde`).toBe(200);
  return respuesta;
}

function dimensionesPng(bytes: Buffer): { ancho: number; alto: number } {
  expect(bytes.subarray(0, 8).toString('hex'), 'firma PNG').toBe('89504e470d0a1a0a');
  return { ancho: bytes.readUInt32BE(16), alto: bytes.readUInt32BE(20) };
}

/** Decodifica la imagen en WebKit y devuelve el alfa mínimo y el color promedio de cada esquina. */
async function pixeles(page: Page, bytes: Buffer, tipo = 'image/png') {
  return page.evaluate(
    async ({ base64, tipo }) => {
      const blob = await (await fetch(`data:${tipo};base64,${base64}`)).blob();
      const imagen = await createImageBitmap(blob);
      const lienzo = document.createElement('canvas');
      lienzo.width = imagen.width;
      lienzo.height = imagen.height;
      const ctx = lienzo.getContext('2d')!;
      ctx.drawImage(imagen, 0, 0);
      const { data } = ctx.getImageData(0, 0, imagen.width, imagen.height);
      let alfaMinimo = 255;
      for (let i = 3; i < data.length; i += 4) alfaMinimo = Math.min(alfaMinimo, data[i]!);
      const esquina = (x0: number, y0: number) => {
        const d = ctx.getImageData(x0, y0, 8, 8).data;
        const suma = [0, 0, 0];
        for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) suma[c]! += d[i + c]!;
        return suma.map((s) => Math.round(s / (d.length / 4)));
      };
      return {
        alfaMinimo,
        esquinas: [esquina(0, 0), esquina(imagen.width - 8, 0), esquina(0, imagen.height - 8), esquina(imagen.width - 8, imagen.height - 8)],
      };
    },
    { base64: bytes.toString('base64'), tipo },
  );
}

const parecido = (a: readonly number[], b: readonly number[], tolerancia = 6) => a.every((v, i) => Math.abs(v - b[i]!) <= tolerancia);

test.describe('servidor publicado', () => {
  test.skip(!desplegada, 'Solo contra la app publicada (PERCHA_URL)');

  test('A1/A3.7 la página llega por HTTPS con COOP/COEP y sin caché', async ({ request }) => {
    expect(desplegada).toMatch(/^https:\/\//);
    for (const ruta of ['/', '/index.html']) {
      const respuesta = await traer(request, ruta);
      const h = respuesta.headers();
      expect(h['cross-origin-opener-policy'], ruta).toBe('same-origin');
      expect(h['cross-origin-embedder-policy'], ruta).toBe('require-corp');
      expect(h['cache-control'], ruta).toBe('no-cache');
      expect(h['content-type'], ruta).toContain('text/html');
    }
    for (const ruta of ['/sw.js', '/manifest.webmanifest']) {
      expect((await traer(request, ruta)).headers()['cache-control'], ruta).toBe('no-cache');
    }
  });

  test('la versión publicada es la del build local', async ({ request }) => {
    test.skip(!existsSync('dist/index.html'), 'Sin build local con qué comparar');
    const publicada = (await (await traer(request, '/')).text()).replace(/\r\n/g, '\n');
    expect(publicada).toBe(readFileSync('dist/index.html', 'utf8').replace(/\r\n/g, '\n'));
  });

  test('lo que no existe responde 404, no la app (wrangler.jsonc sin modo SPA)', async ({ request }) => {
    for (const ruta of ['/modelos/imgly/1.7.0/no-existe.bin', '/assets/no-existe.js', '/no-existe']) {
      const respuesta = await request.get(ruta);
      expect(respuesta.status(), ruta).toBe(404);
      expect(await respuesta.text(), ruta).not.toContain('<div id="raiz">');
    }
  });
});

test('cada archivo del precache responde con su tipo y su caché', async ({ request }) => {
  const sw = await (await traer(request, '/sw.js')).text();
  const rutas = [...sw.matchAll(/url:"([^"]+)"/g)].map((m) => `/${m[1]!.replace(/^\//, '')}`);
  expect(rutas.length, 'entradas del precache').toBeGreaterThan(20);
  expect(rutas).toEqual(expect.arrayContaining(['/index.html', '/manifest.webmanifest']));
  const tipos: Record<string, RegExp> = {
    js: /javascript/,
    css: /text\/css/,
    html: /text\/html/,
    woff2: /font\/woff2/,
    svg: /image\/svg\+xml/,
    png: /image\/png/,
    ico: /image\/(x-icon|vnd\.microsoft\.icon)/,
    webmanifest: /application\/manifest\+json/,
  };
  for (const ruta of [...new Set(rutas)]) {
    const respuesta = await traer(request, ruta);
    const extension = ruta.split('.').at(-1)!;
    if (tipos[extension]) expect(respuesta.headers()['content-type'], ruta).toMatch(tipos[extension]);
    if (desplegada && /^\/(assets\/|workbox-)/.test(ruta)) {
      expect(respuesta.headers()['cache-control'], ruta).toBe('public, max-age=31536000, immutable');
    }
  }
});

test('A1.1 manifest: Percha, standalone, en español y con sus íconos', async ({ request }) => {
  const manifest = (await (await traer(request, '/manifest.webmanifest')).json()) as {
    name: string;
    short_name: string;
    display: string;
    start_url: string;
    lang: string;
    orientation: string;
    background_color: string;
    theme_color: string;
    icons: { src: string; sizes: string; type: string; purpose?: string }[];
  };
  expect(manifest).toMatchObject({
    name: 'Percha',
    short_name: 'Percha',
    display: 'standalone',
    start_url: '/',
    lang: 'es',
    orientation: 'portrait',
    background_color: '#f4ebe6',
    theme_color: '#f4ebe6',
  });
  expect(manifest.icons.some((i) => i.purpose?.includes('maskable'))).toBe(true);
  for (const icono of manifest.icons) {
    const bytes = await (await traer(request, `/${icono.src.replace(/^\//, '')}`)).body();
    const { ancho, alto } = dimensionesPng(bytes);
    expect(`${ancho}x${alto}`, icono.src).toBe(icono.sizes);
  }
});

test('A1.1 ícono de la pantalla de inicio: 180 × 180 y sin transparencia', async ({ request, page }) => {
  const html = await (await traer(request, '/')).text();
  const ruta = html.match(/<link rel="apple-touch-icon" href="([^"]+)"/)?.[1];
  expect(ruta, 'link apple-touch-icon').toBeTruthy();
  const bytes = await (await traer(request, ruta!)).body();
  expect(dimensionesPng(bytes)).toEqual({ ancho: 180, alto: 180 });
  // iOS rellena con negro lo transparente del ícono.
  expect((await pixeles(page, bytes)).alfaMinimo, 'alfa mínimo del ícono').toBe(255);
  const maskable = await (await traer(request, '/maskable-icon-512x512.png')).body();
  expect((await pixeles(page, maskable)).alfaMinimo, 'alfa mínimo del ícono maskable').toBe(255);
});

test('A1.3/A1.4 splash de iOS: cada tamaño en claro y oscuro, con el fondo del tema', async ({ request, page }) => {
  test.setTimeout(180_000);
  const html = await (await traer(request, '/')).text();
  const splash = [...html.matchAll(/<link rel="apple-touch-startup-image" media="([^"]+)" href="([^"]+)">/g)].map((m) => ({ media: m[1]!, ruta: m[2]! }));
  expect(splash.length).toBeGreaterThanOrEqual(20);

  const cubiertos = new Set<string>();
  for (const { media, ruta } of splash) {
    const ancho = Number(media.match(/device-width: (\d+)px/)?.[1]);
    const alto = Number(media.match(/device-height: (\d+)px/)?.[1]);
    const escala = Number(media.match(/-webkit-device-pixel-ratio: (\d+)/)?.[1]);
    const horizontal = media.includes('orientation: landscape');
    const tema = media.includes('prefers-color-scheme: dark') ? 'oscuro' : 'claro';
    cubiertos.add(`${ancho}x${alto}@${escala} ${horizontal ? 'horizontal' : 'vertical'} ${tema}`);

    const bytes = await (await traer(request, ruta)).body();
    const esperado = horizontal ? { ancho: alto * escala, alto: ancho * escala } : { ancho: ancho * escala, alto: alto * escala };
    expect(dimensionesPng(bytes), `${ruta} para ${media}`).toEqual(esperado);
    // Sin destello: el fondo del splash es el bg del tema que abre la app.
    const { esquinas } = await pixeles(page, bytes);
    for (const esquina of esquinas) expect(parecido(esquina, BG[tema]), `${ruta}: esquina ${esquina} vs bg ${tema} ${BG[tema]}`).toBe(true);
  }
  // Los tres perfiles de las pruebas, en vertical y en los dos temas.
  for (const perfil of ['393x852@3', '375x667@2', '440x956@3']) {
    for (const tema of ['claro', 'oscuro']) expect([...cubiertos], perfil).toContain(`${perfil} vertical ${tema}`);
  }
});

test('las fuentes del CSS responden como woff2', async ({ request }) => {
  const html = await (await traer(request, '/')).text();
  const hojas = [...html.matchAll(/<link rel="stylesheet"[^>]* href="([^"]+)"/g)].map((m) => m[1]!);
  expect(hojas.length).toBeGreaterThan(0);
  const fuentes = new Set<string>();
  for (const hoja of hojas) {
    const css = await (await traer(request, hoja)).text();
    for (const m of css.matchAll(/url\(([^)]+\.woff2)\)/g)) fuentes.add(m[1]!.replace(/^["']|["']$/g, ''));
  }
  // Cormorant 500 y 500 cursiva, Jost 300/400/500, Bodoni 400 y 400 cursiva, Archivo 300/400/500.
  expect(fuentes.size).toBe(10);
  for (const fuente of fuentes) {
    const respuesta = await traer(request, fuente.startsWith('/') ? fuente : `/assets/${fuente.replace(/^\.\//, '')}`);
    expect(respuesta.headers()['content-type'], fuente).toMatch(/font\/woff2/);
  }
});

test('favicon e íconos SVG', async ({ request }) => {
  expect((await traer(request, '/favicon.ico')).headers()['content-type']).toMatch(/image\//);
  for (const ruta of ['/icono-fuente.svg', '/icono-fuente-oscuro.svg']) {
    expect((await traer(request, ruta)).headers()['content-type'], ruta).toMatch(/image\/svg\+xml/);
  }
});
