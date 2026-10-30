// docs/pruebas-intensivas.md, Parte A: exportar (A7), importar (A8), copia automática (A9), aviso
// de respaldo (A10) e integridad (A11), en WebKit con perfiles de iPhone. La hoja de compartir de
// iOS está simulada (apoyo.ts); el selector de Archivos es el de Playwright.

import {
  abrir,
  abrirDiagnostico,
  abrirMenu,
  abrirZip,
  cantidadCompartidos,
  contarTabla,
  conteos,
  datoDiagnostico,
  expect,
  fijarCompartir,
  hoja,
  HOY,
  importar,
  irAAjustes,
  leerRespaldoDePrueba,
  mensajeRespaldo,
  pantalla,
  RESPALDOS,
  reinstalar,
  test,
  ultimoCompartido,
} from './apoyo';
import { foto, pdf, recomprimido, renombrado, zipDeFotos } from './archivos';

const LISTO_COMPLETO = 'Listo: se restauró el respaldo del 1 de octubre.';
const NO_ES_PERCHA = 'Este archivo no es un respaldo de Percha.';
const DANADO = 'El respaldo está dañado y no se puede usar. Tus datos no cambiaron.';
const COMPLETO = '20 prendas · 4 outfits · 2 maniquíes';
const CHICO = '3 prendas · 1 outfit · 1 maniquí';
const VACIA = '0 prendas · 0 outfits · 0 maniquíes';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(HOY);
});

const exportar = (page: import('@playwright/test').Page) => page.getByRole('button', { name: 'Exportar', exact: true }).click();

async function cargarCompleto(page: import('@playwright/test').Page) {
  await importar(page, RESPALDOS.completo);
  await expect(mensajeRespaldo(page)).toHaveText(LISTO_COMPLETO);
  await expect(conteos(page)).toHaveText(COMPLETO);
}

test.describe('A7 exportar', () => {
  test('A7.1–A7.3, A7.8, A5.3, D2 exportar arma el ZIP, lo entrega y marca el último respaldo', async ({ page }) => {
    await abrir(page);
    await irAAjustes(page);
    await exportar(page);
    await expect.poll(() => cantidadCompartidos(page)).toBe(1);
    const archivo = (await ultimoCompartido(page))!;
    expect(archivo.nombre).toBe('Percha-respaldo-2026-10-30.zip');
    const zip = await abrirZip(archivo.bytes);
    expect(zip.nombres.slice(0, 2)).toEqual(['manifest.json', 'datos.json']);
    expect(Object.keys(await zip.json('datos.json')).sort()).toEqual(
      ['ajustes', 'calendario', 'maniquies', 'medidas', 'outfits', 'prendas', 'siluetas', 'usosDia'].sort(),
    );
    await expect(pantalla(page).getByText(/^Último respaldo: 30 de octubre\./)).toBeVisible();
    await page.getByRole('button', { name: 'Volver' }).click();
    await abrirMenu(page);
    await expect(hoja(page).getByRole('button', { name: /Último respaldo: 30 de octubre/ })).toBeVisible();
  });

  test.describe('cancelar la hoja de compartir', () => {
    test.use({ compartir: 'cancelar' });

    test('A7.4 tocar la X no cambia la fecha del último respaldo', async ({ page }) => {
      await abrir(page);
      await irAAjustes(page);
      await exportar(page);
      await expect(page.getByRole('button', { name: 'Exportar', exact: true })).toBeEnabled();
      await expect(pantalla(page).getByText(/^Todavía no hay respaldo\./)).toBeVisible();
      await expect(mensajeRespaldo(page)).toHaveCount(0);
    });
  });

  test.describe('iOS no abre la hoja porque armar el archivo tardó', () => {
    test.use({ compartir: 'vencido' });

    test('A7.6 aparece "Guardar respaldo" y al tocarlo entrega el archivo ya listo', async ({ page }) => {
      await abrir(page);
      await irAAjustes(page);
      await exportar(page);
      await expect(page.getByRole('button', { name: 'Guardar respaldo' })).toBeVisible();
      await expect(mensajeRespaldo(page)).toHaveText('Tu respaldo está listo. Tócalo para guardarlo en Archivos o iCloud.');
      await page.getByRole('button', { name: 'Guardar respaldo' }).click();
      await expect.poll(() => cantidadCompartidos(page)).toBe(1);
      await expect(page.getByRole('button', { name: 'Exportar', exact: true })).toBeVisible();
      await expect(pantalla(page).getByText(/^Último respaldo: 30 de octubre\./)).toBeVisible();
    });

    test('A7.13 el archivo listo se descarta si se importa otro respaldo; cancelar el reemplazo lo conserva', async ({ page }) => {
      await abrir(page);
      await irAAjustes(page);
      await cargarCompleto(page);
      await exportar(page);
      await expect(page.getByRole('button', { name: 'Guardar respaldo' })).toBeVisible();

      // Cancelar el reemplazo no cambia nada: el archivo listo sigue sirviendo.
      await importar(page, RESPALDOS.chico);
      await hoja(page).getByRole('button', { name: 'Cancelar' }).click();
      await expect(hoja(page)).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Guardar respaldo' })).toBeVisible();

      await importar(page, RESPALDOS.chico);
      await hoja(page).getByRole('button', { name: 'Reemplazar todo' }).click();
      await expect(mensajeRespaldo(page)).toHaveText('Listo: se restauró el respaldo del 28 de octubre.');
      await expect(conteos(page)).toHaveText(CHICO);
      await expect(page.getByRole('button', { name: 'Guardar respaldo' })).toHaveCount(0);
      await expect(pantalla(page).getByText(/^Último respaldo: 28 de octubre\./)).toBeVisible();
      expect(await cantidadCompartidos(page)).toBe(0);

      // Exportar otra vez arma el archivo con lo que hay ahora.
      await exportar(page);
      await expect.poll(() => cantidadCompartidos(page)).toBe(1);
      const zip = await abrirZip((await ultimoCompartido(page))!.bytes);
      expect((await zip.json('manifest.json')).conteos).toMatchObject({ prendas: 3, outfits: 1, maniquies: 1 });
    });
  });

  test.describe('sin hoja de compartir (escritorio)', () => {
    test.use({ compartir: 'sin_hoja' });

    test('A7.1 se descarga el archivo con su nombre', async ({ page }) => {
      await abrir(page);
      await irAAjustes(page);
      const descarga = page.waitForEvent('download');
      await exportar(page);
      expect((await descarga).suggestedFilename()).toBe('Percha-respaldo-2026-10-30.zip');
      await expect(pantalla(page).getByText(/^Último respaldo: 30 de octubre\./)).toBeVisible();
    });
  });

  test('A7.10 dos toques muy rápidos arman un solo archivo', async ({ page }) => {
    await abrir(page);
    await irAAjustes(page);
    const caja = (await page.getByRole('button', { name: 'Exportar', exact: true }).boundingBox())!;
    await page.mouse.click(caja.x + caja.width / 2, caja.y + caja.height / 2);
    await page.mouse.click(caja.x + caja.width / 2, caja.y + caja.height / 2);
    await expect(page.getByRole('button', { name: 'Exportar', exact: true })).toBeEnabled();
    await page.waitForTimeout(500);
    expect(await cantidadCompartidos(page)).toBe(1);
  });
});

test.describe('A8 importar', () => {
  test('A8.1, A14.1–A14.3 con la app vacía se importa sin confirmar', async ({ page }) => {
    await abrir(page);
    await irAAjustes(page);
    await importar(page, RESPALDOS.completo);
    await expect(hoja(page)).toHaveCount(0);
    await expect(mensajeRespaldo(page)).toHaveText(LISTO_COMPLETO);
    await expect(conteos(page)).toHaveText(COMPLETO);
    await expect(pantalla(page).getByText(/^Último respaldo: 1 de octubre\./)).toBeVisible();
    // Importar sobre la app vacía no deja copia automática.
    await expect(pantalla(page).getByText(/copia automática/)).toHaveCount(0);
  });

  test('A8.3–A8.5, A11.5 una foto, un PDF y un ZIP de otra app se rechazan', async ({ page }) => {
    await abrir(page);
    await irAAjustes(page);
    for (const archivo of [foto(), pdf(), await zipDeFotos()]) {
      await importar(page, archivo);
      await expect(mensajeRespaldo(page)).toHaveText(NO_ES_PERCHA);
    }
    await expect(conteos(page)).toHaveText(VACIA);
    await abrirDiagnostico(page);
    await expect(pantalla(page).locator('.diagnostico-eventos li', { hasText: 'Respaldo rechazado (no_es_percha)' })).toHaveCount(3);
  });

  test('A8.6, A8.7, A15.6 recomprimido en una carpeta o con otro nombre se importa igual', async ({ page }) => {
    const completo = leerRespaldoDePrueba('completo');
    await abrir(page);
    await irAAjustes(page);
    await importar(page, await recomprimido(completo));
    await expect(mensajeRespaldo(page)).toHaveText(LISTO_COMPLETO);
    for (const nombre of ['mi-closet.zip', 'Mi clóset de Sofía 🧵 (copia).zip']) {
      await importar(page, renombrado(completo, nombre));
      await expect(hoja(page)).toBeVisible();
      await page.getByRole('button', { name: 'Reemplazar todo' }).click();
      await expect(mensajeRespaldo(page)).toHaveText(LISTO_COMPLETO);
    }
    await expect(conteos(page)).toHaveText(COMPLETO);
  });

  test('A8.8/A8.9 sin una foto o sin datos.json: dañado, y los datos no cambian', async ({ page }) => {
    const completo = leerRespaldoDePrueba('completo');
    await abrir(page);
    await irAAjustes(page);
    await importar(page, RESPALDOS.chico);
    await expect(conteos(page)).toHaveText(CHICO);
    let fotoBorrada = false;
    const sinFoto = await recomprimido(completo, {
      quitar: (ruta) => ruta.startsWith('imagenes/') && !fotoBorrada && (fotoBorrada = true),
    });
    for (const archivo of [sinFoto, await recomprimido(completo, { quitar: (ruta) => ruta === 'datos.json' })]) {
      await importar(page, archivo);
      await expect(mensajeRespaldo(page)).toHaveText(DANADO);
      await expect(hoja(page)).toHaveCount(0);
      await expect(conteos(page)).toHaveText(CHICO);
    }
    expect(await contarTabla(page, 'respaldosAuto')).toBe(0);
  });

  test('A8.10–A8.14, A14.7–A14.8 con datos pide confirmar; cancelar o arrastrar no cambia nada', async ({ page }) => {
    await abrir(page);
    await irAAjustes(page);
    await cargarCompleto(page);

    // A8.10: el mismo respaldo otra vez pide confirmar.
    await importar(page, RESPALDOS.completo);
    await expect(hoja(page).getByRole('heading', { name: '¿Reemplazar todo con este respaldo?' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(hoja(page)).toHaveCount(0);

    // A8.11/A8.12: el texto de la hoja; Cancelar no cambia nada ni crea copia.
    await importar(page, RESPALDOS.chico);
    await expect(hoja(page)).toContainText(
      'Se reemplazará todo lo que hay en Percha por el contenido del respaldo del 28 de octubre. Antes guardaremos una copia de lo actual en el teléfono.',
    );
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(hoja(page)).toHaveCount(0);
    await expect(conteos(page)).toHaveText(COMPLETO);
    expect(await contarTabla(page, 'respaldosAuto')).toBe(0);

    // A8.13: arrastrarla hacia abajo es como cancelar.
    await importar(page, RESPALDOS.chico);
    await expect(hoja(page)).toBeVisible();
    const caja = (await hoja(page).boundingBox())!;
    await page.mouse.move(caja.x + caja.width / 2, caja.y + 10);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(caja.x + caja.width / 2, caja.y + 10 + i * 25);
    await page.mouse.up();
    await expect(hoja(page)).toHaveCount(0);
    await expect(conteos(page)).toHaveText(COMPLETO);
    expect(await contarTabla(page, 'respaldosAuto')).toBe(0);

    // A8.14: confirmar reemplaza todo.
    await importar(page, RESPALDOS.chico);
    await page.getByRole('button', { name: 'Reemplazar todo' }).click();
    await expect(mensajeRespaldo(page)).toHaveText('Listo: se restauró el respaldo del 28 de octubre.');
    await expect(conteos(page)).toHaveText(CHICO);
    expect(await contarTabla(page, 'respaldosAuto')).toBe(1);
  });

  test.describe('recargar a mitad de la escritura', () => {
    // WebKit avisa que ya no puede leer los Blob de la página anterior que la transacción
    // cortada estaba guardando. No es un error de la app: lo que importa es que los datos quedan enteros.
    test.use({ erroresEsperados: [/^Cannot load blob: .* due to access control checks\.$/] });

    test('A8.15 cerrar la app durante "Importando…" deja lo de antes o lo del respaldo, nunca una mezcla', async ({ page }) => {
      await abrir(page);
      await irAAjustes(page);
      await importar(page, RESPALDOS.chico);
      await expect(conteos(page)).toHaveText(CHICO);
      await importar(page, RESPALDOS.completo);
      await page.getByRole('button', { name: 'Reemplazar todo' }).click();
      await expect(mensajeRespaldo(page)).toHaveText('Importando… No cierres Percha.');
      await page.reload();
      await expect(pantalla(page)).toHaveAttribute('data-pantalla', /^(09 Ajustes|01 Hoy)$/);
      if ((await pantalla(page).getAttribute('data-pantalla')) === '01 Hoy') await irAAjustes(page);
      await expect(conteos(page)).toHaveText(new RegExp(`^(${CHICO}|${COMPLETO})$`));
      await abrirDiagnostico(page);
      await page.getByRole('button', { name: 'Verificar otra vez' }).click();
      await expect(datoDiagnostico(page, 'Sin referencia')).toHaveText('0');
      await expect(datoDiagnostico(page, 'Referencias rotas')).toHaveText('0');
    });
  });
});

test.describe('A9 copia automática', () => {
  test('A9.1–A9.4, A9.8 restaurar la copia se puede cancelar y se deshace', async ({ page }) => {
    await abrir(page);
    await irAAjustes(page);
    await importar(page, RESPALDOS.chico);
    await importar(page, RESPALDOS.completo);
    await page.getByRole('button', { name: 'Reemplazar todo' }).click();
    await expect(conteos(page)).toHaveText(COMPLETO);

    const tarjeta = pantalla(page);
    await expect(tarjeta.getByText(/^Antes de importar se guardó una copia automática de lo que había \(\d+(,\d)? MB\)\.$/)).toBeVisible();
    await expect(tarjeta.getByRole('button', { name: 'Exportarlo' })).toBeVisible();
    const restaurar = tarjeta.getByRole('button', { name: 'Restaurar el respaldo automático del 30 de octubre' });
    // A9.8: la barra de Espacio tiene la franja de la copia.
    expect(await tarjeta.locator('.ajustes-barra-copia').evaluate((e) => e.getBoundingClientRect().width)).toBeGreaterThan(0);

    await restaurar.click();
    await expect(hoja(page).getByRole('heading', { name: '¿Restaurar la copia automática?' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(conteos(page)).toHaveText(COMPLETO);

    await restaurar.click();
    await page.getByRole('button', { name: 'Restaurar', exact: true }).click();
    await expect(mensajeRespaldo(page)).toHaveText('Listo: se restauró la copia automática del 30 de octubre.');
    await expect(conteos(page)).toHaveText(CHICO);
    expect(await contarTabla(page, 'respaldosAuto')).toBe(1);

    await restaurar.click();
    await page.getByRole('button', { name: 'Restaurar', exact: true }).click();
    await expect(conteos(page)).toHaveText(COMPLETO);
    expect(await contarTabla(page, 'respaldosAuto')).toBe(1);
  });

  test('A9.5/A9.6, A14.20/A14.21 "Exportarlo" entrega la copia sin marcar el último respaldo, y se importa', async ({ page }) => {
    await abrir(page);
    await irAAjustes(page);
    await importar(page, RESPALDOS.chico);
    await importar(page, RESPALDOS.completo);
    await page.getByRole('button', { name: 'Reemplazar todo' }).click();
    await expect(conteos(page)).toHaveText(COMPLETO);
    await page.getByRole('button', { name: 'Exportarlo' }).click();
    await expect.poll(() => cantidadCompartidos(page)).toBe(1);
    const copia = (await ultimoCompartido(page))!;
    expect(copia.nombre).toBe('Percha-copia-automatica-2026-10-30.zip');
    await expect(pantalla(page).getByText(/^Último respaldo: 1 de octubre\./)).toBeVisible();

    await reinstalar(page);
    await irAAjustes(page);
    await importar(page, { name: copia.nombre, mimeType: 'application/zip', buffer: copia.bytes });
    await expect(mensajeRespaldo(page)).toHaveText(/^Listo: se restauró el respaldo del 30 de octubre\.$/);
    await expect(conteos(page)).toHaveText(CHICO);
  });

  test('A9.7, A14.19 importar varias veces seguidas deja una sola copia automática', async ({ page }) => {
    await abrir(page);
    await irAAjustes(page);
    await cargarCompleto(page);
    for (let i = 0; i < 5; i++) {
      await importar(page, RESPALDOS.completo);
      await page.getByRole('button', { name: 'Reemplazar todo' }).click();
      await expect(mensajeRespaldo(page)).toHaveText(LISTO_COMPLETO);
      await expect(conteos(page)).toHaveText(COMPLETO);
      expect(await contarTabla(page, 'respaldosAuto')).toBe(1);
    }
  });
});

test.describe('A10 aviso de respaldo en Hoy', () => {
  const aviso = (page: import('@playwright/test').Page) => pantalla(page).getByRole('status');

  test('A10.1 con la app vacía no hay aviso', async ({ page }) => {
    await abrir(page);
    await expect(aviso(page)).toHaveCount(0);
  });

  test('A10.2–A10.4, A14.4, A14.14 aviso con un respaldo viejo; cancelar lo deja, guardar lo quita', async ({ page }) => {
    await abrir(page);
    await irAAjustes(page);
    await cargarCompleto(page);
    await page.getByRole('button', { name: 'Volver' }).click();
    await expect(aviso(page)).toContainText('Tu último respaldo fue hace 4 semanas.');

    await fijarCompartir(page, 'cancelar');
    await aviso(page).getByRole('button', { name: 'Respaldar' }).click();
    await expect(aviso(page).getByRole('button', { name: 'Respaldar' })).toBeEnabled();
    await expect(aviso(page)).toContainText('Tu último respaldo fue hace 4 semanas.');

    await fijarCompartir(page, 'guardar');
    await aviso(page).getByRole('button', { name: 'Respaldar' }).click();
    await expect(aviso(page)).toHaveCount(0);
    const archivo = (await ultimoCompartido(page))!;
    expect((await (await abrirZip(archivo.bytes)).json('manifest.json')).conteos).toMatchObject({ prendas: 20, outfits: 4, maniquies: 2 });
  });

  test.describe('iOS no abre la hoja porque armar el archivo tardó', () => {
    test.use({ compartir: 'vencido' });

    test('A10.7 el archivo listo del aviso se descarta si después se importa otro respaldo', async ({ page }) => {
      await abrir(page);
      await irAAjustes(page);
      await cargarCompleto(page);
      await page.getByRole('button', { name: 'Volver' }).click();
      await aviso(page).getByRole('button', { name: 'Respaldar' }).click();
      await expect(aviso(page)).toContainText('Tu respaldo está listo.');
      await expect(aviso(page).getByRole('button', { name: 'Guardarlo' })).toBeVisible();

      // Hoy queda montada debajo de Ajustes mientras se importa.
      await irAAjustes(page);
      await importar(page, RESPALDOS.completo);
      await page.getByRole('button', { name: 'Reemplazar todo' }).click();
      await expect(mensajeRespaldo(page)).toHaveText(LISTO_COMPLETO);
      await page.getByRole('button', { name: 'Volver' }).click();
      await expect(aviso(page)).toContainText('Tu último respaldo fue hace 4 semanas.');
      await expect(aviso(page).getByRole('button', { name: 'Respaldar' })).toBeVisible();
      expect(await cantidadCompartidos(page)).toBe(0);
    });
  });

  for (const [dia, texto] of [
    [new Date(2026, 9, 10, 9), null],
    [new Date(2026, 10, 11, 9), null],
    [new Date(2026, 10, 12, 9), 'Tu último respaldo fue hace 2 semanas.'],
    [new Date(2026, 10, 13, 9), 'Tu último respaldo fue hace 2 semanas.'],
  ] as const) {
    test(`A10.6, A14.26/A14.27 respaldo del 28 de octubre visto el ${dia.toLocaleDateString('es')}`, async ({ page }) => {
      await abrir(page);
      await irAAjustes(page);
      await importar(page, RESPALDOS.chico);
      await expect(conteos(page)).toHaveText(CHICO);
      await page.clock.setFixedTime(dia);
      await page.reload();
      if ((await pantalla(page).getAttribute('data-pantalla')) !== '01 Hoy') await page.getByRole('button', { name: 'Volver' }).click();
      await expect(pantalla(page)).toHaveAttribute('data-pantalla', '01 Hoy');
      if (texto) await expect(aviso(page)).toContainText(texto);
      else await expect(aviso(page)).toHaveCount(0);
    });
  }
});
