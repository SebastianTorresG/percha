// docs/pruebas-intensivas.md: sin conexión (A3.1–A3.5) y toques al azar (A12.10), en WebKit con
// perfiles de iPhone.

import {
  abrir,
  abrirDiagnostico,
  cantidadCompartidos,
  conteos,
  datoDiagnostico,
  expect,
  hoja,
  importar,
  irAAjustes,
  mensajeRespaldo,
  pantalla,
  RESPALDOS,
  test,
} from './apoyo';

test('A3.1–A3.5 en modo avión abre con sus fuentes, se recorre entera y respalda', async ({ page, context }) => {
  await abrir(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(pantalla(page)).toHaveAttribute('data-pantalla', '01 Hoy');

  // A3.1: las fuentes del tema vienen de la caché, no del sistema.
  const fuentes = await page.evaluate(async () => {
    const caras = [...(await document.fonts.load('500 42px "Cormorant Garamond"')), ...(await document.fonts.load('15px Jost'))];
    return caras.map((c) => `${c.family} ${c.status}`);
  });
  expect(fuentes.length).toBeGreaterThan(0);
  expect(fuentes.every((f) => f.endsWith('loaded'))).toBe(true);

  // A3.2: cada pantalla abre.
  for (const [pestana, etiqueta] of [
    ['Clóset', '02 Clóset'],
    ['Taller', '11 Taller'],
    ['Outfits', '06 Mis outfits'],
    ['Hoy', '01 Hoy'],
  ] as const) {
    await page.getByRole('button', { name: pestana, exact: true }).click();
    await expect(pantalla(page)).toHaveAttribute('data-pantalla', etiqueta);
  }
  await irAAjustes(page);
  for (const [fila, etiqueta] of [
    ['Mis maniquíes', '08 Mis maniquíes'],
    ['Mis medidas', '12 Mis medidas'],
  ] as const) {
    await page.getByRole('button', { name: fila }).click();
    await expect(pantalla(page)).toHaveAttribute('data-pantalla', etiqueta);
    await page.getByRole('button', { name: 'Volver' }).click();
  }

  // A3.5 y A3.4: importar y exportar sin red.
  await importar(page, RESPALDOS.chico);
  await expect(mensajeRespaldo(page)).toHaveText('Listo: se restauró el respaldo del 28 de octubre.');
  await expect(conteos(page)).toHaveText('3 prendas · 1 outfit · 1 maniquí');
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  await expect.poll(() => cantidadCompartidos(page)).toBe(1);

  // A3.3 y A3.7: nada salió a la red y el aislamiento sigue sin conexión.
  await abrirDiagnostico(page);
  await expect(datoDiagnostico(page, 'Desde la red')).toHaveText('página 0 · workers 0');
  await expect(datoDiagnostico(page, 'crossOriginIsolated')).toHaveText('sí');
});

test('A12.10 tocar muchos botones muy rápido no deja errores ni pantallas rotas', async ({ page }) => {
  test.setTimeout(120_000);
  await abrir(page);
  // Al azar, pero repetible.
  let semilla = 20261030;
  const azar = () => ((semilla = (semilla * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const { width, height } = page.viewportSize()!;

  for (let i = 0; i < 250; i++) {
    const botones = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('button:not(:disabled), .hoja-scrim')]
        .filter((b) => !b.closest('[hidden]'))
        .map((b) => b.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.height > 0)
        .map((r) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 })),
    );
    // De vez en cuando, un toque en cualquier lado.
    const punto = botones.length > 0 && azar() < 0.85 ? botones[Math.floor(azar() * botones.length)]! : { x: azar() * width, y: azar() * height };
    if (punto.x < 0 || punto.y < 0 || punto.x > width || punto.y > height) continue;
    await page.mouse.click(punto.x, punto.y);
    if (azar() < 0.3) await page.waitForTimeout(Math.floor(azar() * 250));
  }

  await page.waitForTimeout(1000);
  await expect(pantalla(page)).toHaveCount(1);
  // Nunca un fondo oscurecido sin hoja.
  expect(await page.locator('.hoja-scrim').count()).toBe(await hoja(page).count());
  // Y la app sigue respondiendo: se puede volver a Hoy y abrir Ajustes.
  for (let i = 0; i < 5 && (await hoja(page).count()) > 0; i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }
  await expect(hoja(page), 'Escape cierra la hoja que quedó abierta').toHaveCount(0);
  for (let i = 0; i < 6 && (await page.getByRole('button', { name: 'Volver' }).count()) > 0; i++) {
    await page.getByRole('button', { name: 'Volver' }).click();
  }
  await page.getByRole('button', { name: 'Hoy', exact: true }).click();
  await irAAjustes(page);
});
