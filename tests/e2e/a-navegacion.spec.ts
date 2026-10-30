// docs/pruebas-intensivas.md, Parte A: temas, navegación, menú, Ajustes, diagnóstico y
// accesibilidad básica, en WebKit con perfiles de iPhone. Los IDs de cada prueba son los del plan.

import { abrir, abrirDiagnostico, abrirMenu, datoDiagnostico, expect, hoja, irAAjustes, pantalla, test, tocarVersion } from './apoyo';

const PESTANAS = [
  ['Clóset', '02 Clóset'],
  ['Taller', '11 Taller'],
  ['Outfits', '06 Mis outfits'],
  ['Hoy', '01 Hoy'],
] as const;

for (const [esquema, tema, serif] of [
  ['light', 'claro', 'Cormorant Garamond'],
  ['dark', 'oscuro', 'Bodoni Moda'],
] as const) {
  test.describe(`modo ${tema} del iPhone`, () => {
    test.use({ colorScheme: esquema });

    test(`A1.3/A1.4/A2.4 el tema ${tema} ya está antes del primer pintado`, async ({ page }) => {
      // El JS puede llegar antes que el CSS (el build pone el <script> primero) y entonces
      // DOMContentLoaded ocurre sin estilos. Lo que importa es el primer cuadro, que WebKit no
      // dibuja hasta tener el CSS del <head>. Con el CSS siempre lento, ese caso se prueba en
      // cada corrida y no depende de la red.
      await page.route('**/*.css', async (ruta) => {
        await new Promise((listo) => setTimeout(listo, 1000));
        await ruta.continue();
      });
      await page.addInitScript(() => {
        document.addEventListener('DOMContentLoaded', () => {
          const w = window as unknown as { __primerCuadro: unknown };
          const tema = document.documentElement.dataset.theme;
          requestAnimationFrame(() => {
            w.__primerCuadro = { tema, fondo: getComputedStyle(document.body).backgroundColor };
          });
        });
      });
      await abrir(page);
      const primerCuadro = await page.evaluate(() => (window as unknown as { __primerCuadro: { tema: string; fondo: string } }).__primerCuadro);
      expect(primerCuadro.tema).toBe(tema);
      expect(primerCuadro.fondo).toBe(tema === 'claro' ? 'rgb(244, 235, 230)' : 'rgb(15, 14, 13)');
      // Una sola meta, la que actualiza el script del tema (T008).
      await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1);
      await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', tema === 'claro' ? '#f4ebe6' : '#0f0e0d');
    });

    test(`A2.2/A2.3 tipografía y etiquetas del tema ${tema}`, async ({ page }) => {
      await abrir(page);
      await irAAjustes(page);
      const titulo = pantalla(page).locator('h1');
      expect(await titulo.evaluate((h) => getComputedStyle(h).fontFamily)).toContain(serif);
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate((f) => document.fonts.check(`42px "${f}"`), serif)).toBe(true);
      const etiqueta = pantalla(page).locator('.ajustes-etiqueta').first();
      expect(await etiqueta.evaluate((e) => getComputedStyle(e).textTransform)).toBe(tema === 'claro' ? 'none' : 'uppercase');
    });
  });
}

test('A2.1 cambiar el modo del iPhone cambia el tema al instante, sin recargar', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await abrir(page);
  await page.evaluate(() => ((window as unknown as { __sinRecargar: boolean }).__sinRecargar = true));
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'oscuro');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'claro');
  expect(await page.evaluate(() => (window as unknown as { __sinRecargar?: boolean }).__sinRecargar)).toBe(true);
});

test('A4.1/A4.2 cada pestaña cambia la pantalla y se marca; tocarla dos veces no hace nada raro', async ({ page }) => {
  await abrir(page);
  for (const [nombre, etiqueta] of PESTANAS) {
    const pestana = page.getByRole('navigation', { name: 'Secciones' }).getByRole('button', { name: nombre, exact: true });
    await pestana.click();
    await pestana.click();
    await expect(pantalla(page)).toHaveAttribute('data-pantalla', etiqueta);
    await expect(pantalla(page)).toHaveCount(1);
    await expect(pestana).toHaveAttribute('aria-current', 'page');
  }
});

test('A4.3 "+" abre Agregar prenda con ‹ para volver', async ({ page }) => {
  await abrir(page);
  await page.getByRole('button', { name: 'Agregar prenda' }).click();
  await expect(pantalla(page)).toHaveAttribute('data-pantalla', '04 Agregar 1 Foto');
  await expect(page.getByRole('navigation', { name: 'Secciones' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Volver' }).click();
  await expect(pantalla(page)).toHaveAttribute('data-pantalla', '01 Hoy');
});

test('A4.4 Hoy → ⋯ → Ajustes → Mis maniquíes → ‹ → ‹ vuelve paso a paso', async ({ page }) => {
  await abrir(page);
  await irAAjustes(page);
  await page.getByRole('button', { name: 'Mis maniquíes' }).click();
  await expect(pantalla(page)).toHaveAttribute('data-pantalla', '08 Mis maniquíes');
  await page.getByRole('button', { name: 'Volver' }).click();
  await expect(pantalla(page)).toHaveAttribute('data-pantalla', '09 Ajustes');
  await page.getByRole('button', { name: 'Volver' }).click();
  await expect(pantalla(page)).toHaveAttribute('data-pantalla', '01 Hoy');
});

test('A4.5 ‹ muy rápido vuelve una pantalla por toque, sin quedar en blanco', async ({ page }) => {
  await abrir(page);
  await irAAjustes(page);
  await page.getByRole('button', { name: 'Mis medidas' }).click();
  await expect(pantalla(page)).toHaveAttribute('data-pantalla', '12 Mis medidas');
  // Dos toques en el mismo instante sobre el ‹ visible: el segundo espera al primero.
  await page.evaluate(() => {
    const volver = () => document.querySelector<HTMLButtonElement>('main[data-pantalla]:not([hidden]) [aria-label="Volver"]')!;
    volver().click();
    volver().click();
  });
  await expect(pantalla(page)).toHaveAttribute('data-pantalla', '01 Hoy');
  await expect(pantalla(page)).toHaveCount(1);
  // La pila y el historial siguen alineados.
  await irAAjustes(page);
  await page.getByRole('button', { name: 'Volver' }).click();
  await expect(pantalla(page)).toHaveAttribute('data-pantalla', '01 Hoy');
});

test('A4.7 tras cerrar y abrir la app en Ajustes, ‹ funciona', async ({ page }) => {
  await abrir(page);
  await irAAjustes(page);
  await page.reload();
  await expect(pantalla(page)).toHaveAttribute('data-pantalla', /^(09 Ajustes|01 Hoy)$/);
  if ((await pantalla(page).getAttribute('data-pantalla')) === '09 Ajustes') {
    await page.getByRole('button', { name: 'Volver' }).click();
    await expect(pantalla(page)).toHaveAttribute('data-pantalla', '01 Hoy');
  }
});

test('A4.9 Ajustes conserva el scroll al volver de otra pantalla', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 420 });
  await abrir(page);
  await irAAjustes(page);
  const ajustes = pantalla(page);
  await ajustes.evaluate((m) => m.scrollTo(0, m.scrollHeight));
  const antes = await ajustes.evaluate((m) => m.scrollTop);
  expect(antes).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Mis medidas' }).click();
  await expect(pantalla(page)).toHaveAttribute('data-pantalla', '12 Mis medidas');
  await page.getByRole('button', { name: 'Volver' }).click();
  await expect(pantalla(page)).toHaveAttribute('data-pantalla', '09 Ajustes');
  expect(await pantalla(page).evaluate((m) => m.scrollTop)).toBe(antes);
});

test('A4.10 dos botones casi a la vez terminan en una sola pantalla coherente', async ({ page }) => {
  await abrir(page);
  await page.evaluate(() => {
    document.querySelector<HTMLButtonElement>('[aria-label="Menú"]')!.click();
    [...document.querySelectorAll<HTMLButtonElement>('.barra-inferior-pestana')].find((b) => b.textContent === 'Clóset')!.click();
  });
  await expect(pantalla(page)).toHaveCount(1);
  // O quedó el menú sobre Hoy, o el Clóset sin hoja; nunca el menú sobre el Clóset.
  const etiqueta = await pantalla(page).getAttribute('data-pantalla');
  if (etiqueta === '02 Clóset') await expect(hoja(page)).toHaveCount(0);
  else expect(etiqueta).toBe('01 Hoy');
  await page.keyboard.press('Escape');
  await expect(hoja(page)).toHaveCount(0);
});

test('A5.1/A5.2 el menú ⋯ tiene sus tres filas con los subtítulos sin datos', async ({ page }) => {
  await abrir(page);
  await abrirMenu(page);
  const menu = hoja(page);
  await expect(menu.getByRole('button', { name: /Mis maniquíes\s*Todavía no hay fotos/ })).toBeVisible();
  await expect(menu.getByRole('button', { name: /Mis medidas\s*Todavía sin medidas/ })).toBeVisible();
  await expect(menu.getByRole('button', { name: /Ajustes y respaldo\s*Todavía no hay respaldo/ })).toBeVisible();
});

async function arrastrar(page: import('@playwright/test').Page, dy: number) {
  const caja = (await hoja(page).boundingBox())!;
  const x = caja.x + caja.width / 2;
  const y = caja.y + 12;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(x, y + (dy * i) / 10);
  await page.waitForTimeout(150);
  await page.mouse.up();
}

test('A5.4/A5.5 arrastrar poco vuelve a su lugar; arrastrar hacia abajo cierra', async ({ page }) => {
  await abrir(page);
  await abrirMenu(page);
  await arrastrar(page, 40);
  await page.waitForTimeout(400);
  await expect(hoja(page)).toBeVisible();
  await expect(hoja(page)).not.toHaveAttribute('style', /translateY/);
  await arrastrar(page, 200);
  await expect(hoja(page)).toHaveCount(0);
  await expect(pantalla(page)).toHaveAttribute('data-pantalla', '01 Hoy');
});

test('A5.6 tocar la zona oscura de arriba cierra la hoja', async ({ page }) => {
  await abrir(page);
  await abrirMenu(page);
  await page.mouse.click(20, 20);
  await expect(hoja(page)).toHaveCount(0);
  await expect(page.locator('.hoja-scrim')).toHaveCount(0);
});

test('A5.7 tocar una fila baja la hoja y después abre la pantalla', async ({ page }) => {
  await abrir(page);
  await abrirMenu(page);
  // Cada cambio del DOM anota si hay hoja y qué pantalla se ve, para ver el orden.
  await page.evaluate(() => {
    const w = window as unknown as { __estados: string[] };
    w.__estados = [];
    new MutationObserver(() => {
      const hoja = document.querySelector('[role="dialog"]');
      const visible = document.querySelector('main[data-pantalla]:not([hidden])')?.getAttribute('data-pantalla');
      const estado = `${hoja ? (hoja.hasAttribute('data-saliendo') ? 'bajando' : 'hoja') : 'sin hoja'} · ${visible}`;
      if (w.__estados.at(-1) !== estado) w.__estados.push(estado);
    }).observe(document.body, { subtree: true, childList: true, attributes: true });
  });
  await page.getByRole('button', { name: /Mis medidas/ }).click();
  await expect(pantalla(page)).toHaveAttribute('data-pantalla', '12 Mis medidas');
  await expect(hoja(page)).toHaveCount(0);
  // Primero baja la hoja sobre Hoy; la pantalla nueva aparece cuando ya no hay hoja.
  const estados = await page.evaluate(() => (window as unknown as { __estados: string[] }).__estados);
  expect(estados[0]).toBe('bajando · 01 Hoy');
  expect(estados.at(-1)).toBe('sin hoja · 12 Mis medidas');
  expect(estados.filter((e) => e.endsWith('12 Mis medidas') && !e.startsWith('sin hoja'))).toEqual([]);
});

test('A5.9 un toque que empieza en la zona oscura y termina en la hoja no le quita el foco', async ({ page }) => {
  await abrir(page);
  await abrirMenu(page);
  // Como un toque mientras la hoja sube: el mousedown cae en la zona oscura y el mouseup en la
  // hoja, así que el click va al contenedor de los dos y no cierra nada (A12.10 lo encontró así).
  // Se mide con la hoja ya quieta.
  await expect.poll(() => hoja(page).evaluate((h) => h.getAnimations().length)).toBe(0);
  const caja = (await hoja(page).boundingBox())!;
  await page.mouse.move(caja.x + 40, caja.y - 20);
  await page.mouse.down();
  await page.mouse.move(caja.x + 40, caja.y + 10);
  await page.mouse.up();
  await expect(hoja(page)).toBeVisible();
  await expect(hoja(page)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(hoja(page)).toHaveCount(0);
});

test('A5.8 abrir y cerrar la hoja 15 veces seguidas nunca la deja trabada', async ({ page }) => {
  await abrir(page);
  for (let i = 0; i < 15; i++) {
    await page.getByRole('button', { name: 'Menú' }).click();
    await page.mouse.click(20, 20);
  }
  await expect(hoja(page)).toHaveCount(0);
  await expect(page.locator('.hoja-scrim')).toHaveCount(0);
  await abrirMenu(page);
  await page.keyboard.press('Escape');
  await expect(hoja(page)).toHaveCount(0);
});

test('A6.1–A6.3, A6.5 Ajustes sin datos: Respaldo, Espacio, la lista y la versión', async ({ page }) => {
  await abrir(page);
  await irAAjustes(page);
  const ajustes = pantalla(page);
  await expect(ajustes.getByText('Todavía no hay respaldo. Guárdalo en Archivos o iCloud para no perder tu clóset.')).toBeVisible();
  await expect(ajustes.getByText('0 prendas · 0 outfits · 0 maniquíes')).toBeVisible();
  await expect(ajustes.locator('.ajustes-espacio-fila')).toContainText(/\d+(,\d)? MB/);
  await expect(ajustes.getByRole('button', { name: /^Percha \d+\.\d+\.\d+$/ })).toBeVisible();
  await page.getByRole('button', { name: 'Mis maniquíes' }).click();
  await expect(pantalla(page)).toHaveAttribute('data-pantalla', '08 Mis maniquíes');
  await page.getByRole('button', { name: 'Volver' }).click();
  await page.getByRole('button', { name: 'Mis medidas' }).click();
  await expect(pantalla(page)).toHaveAttribute('data-pantalla', '12 Mis medidas');
});

test('A6.6/A6.7 5 toques seguidos abren el diagnóstico; 4, una pausa y 1 más no', async ({ page }) => {
  await abrir(page);
  await irAAjustes(page);
  await tocarVersion(page, 4);
  await page.waitForTimeout(3000);
  await tocarVersion(page, 1);
  await page.waitForTimeout(300);
  await expect(pantalla(page)).toHaveAttribute('data-pantalla', '09 Ajustes');
  await abrirDiagnostico(page);
});

test('A11.1/A11.2/A11.4 panel de diagnóstico con la app vacía', async ({ page }) => {
  await abrir(page);
  await irAAjustes(page);
  await abrirDiagnostico(page);
  for (const seccion of ['Almacenamiento', 'Red y aislamiento', 'Componentes', 'Integridad']) {
    await expect(pantalla(page).getByRole('heading', { name: seccion })).toBeVisible();
  }
  await expect(pantalla(page).getByRole('heading', { name: /^Eventos \(\d+\)$/ })).toBeVisible();
  await expect(pantalla(page).locator('dd')).not.toContainText(['…']);
  await expect(datoDiagnostico(page, 'Imágenes').last()).toHaveText('0');
  await expect(datoDiagnostico(page, 'Sin referencia')).toHaveText('0');
  await expect(datoDiagnostico(page, 'Referencias rotas')).toHaveText('0');
  const revisado = await datoDiagnostico(page, 'Revisado').textContent();
  await page.waitForTimeout(1100);
  await page.getByRole('button', { name: 'Verificar otra vez' }).click();
  await expect(datoDiagnostico(page, 'Revisado')).not.toHaveText(revisado!);
});

test('A3.7 aislamiento de origen y service worker activo que controla la página', async ({ page }) => {
  await abrir(page);
  await page.evaluate(async () => {
    const { active } = await navigator.serviceWorker.ready;
    if (active && active.state !== 'activated') {
      await new Promise<void>((listo) => active.addEventListener('statechange', () => active.state === 'activated' && listo()));
    }
  });
  await page.reload();
  await irAAjustes(page);
  await abrirDiagnostico(page);
  await expect(datoDiagnostico(page, 'crossOriginIsolated')).toHaveText('sí');
  await expect(datoDiagnostico(page, 'Service worker')).toContainText('activo (activated)');
  await expect(datoDiagnostico(page, 'Service worker')).toContainText('controla la página');
});

test.describe('movimiento reducido', () => {
  test.use({ reducedMotion: 'reduce' });

  test('A12.3 las hojas aparecen con un fundido, sin deslizarse', async ({ page }) => {
    await abrir(page);
    await abrirMenu(page);
    expect(await hoja(page).evaluate((h) => getComputedStyle(h).animationName)).toBe('hoja-scrim-aparece');
  });
});

test('A12.4 (parcial) cada botón tiene un nombre en español', async ({ page }) => {
  await abrir(page);
  for (const nombre of ['Menú', 'Agregar prenda', 'Hoy', 'Clóset', 'Taller', 'Outfits']) {
    await expect(page.getByRole('button', { name: nombre, exact: true })).toBeVisible();
  }
  await irAAjustes(page);
  await expect(page.getByRole('button', { name: 'Volver' })).toBeVisible();
  const sinNombre = await page.evaluate(() =>
    [...document.querySelectorAll('main[data-pantalla]:not([hidden]) button')].filter(
      (b) => !(b.getAttribute('aria-label') ?? b.textContent ?? '').trim(),
    ).length,
  );
  expect(sinNombre).toBe(0);
});

test.describe('iPhone en inglés y con región de Estados Unidos', () => {
  test.use({ locale: 'en-US', timezoneId: 'America/New_York' });

  test('A16.9/A16.10 la app sigue en español, con fechas en español', async ({ page }) => {
    await abrir(page);
    await expect(pantalla(page).locator('.encabezado-meta')).toHaveText(
      /^(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo) \d{1,2} de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)$/,
    );
    await irAAjustes(page);
    await expect(pantalla(page).getByText('0 prendas · 0 outfits · 0 maniquíes')).toBeVisible();
  });
});

test('D3 la app no pide cuenta, correo ni contraseña en ningún lado', async ({ page }) => {
  await abrir(page);
  for (const [nombre] of PESTANAS) {
    await page.getByRole('button', { name: nombre, exact: true }).click();
    await expect(page.locator('input[type="password"], input[type="email"], input[autocomplete*="username"]')).toHaveCount(0);
  }
  await irAAjustes(page);
  await expect(page.locator('input[type="password"], input[type="email"]')).toHaveCount(0);
});
