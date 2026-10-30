// docs/pruebas-intensivas.md, A14: el recorrido con los respaldos de docs/respaldos-de-prueba/, más
// A11.3, A15.8 y D1. Lo que ya cubre a-respaldo.spec.ts no se repite.

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

const COMPLETO = '20 prendas · 4 outfits · 2 maniquíes';
const CHICO = '3 prendas · 1 outfit · 1 maniquí';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(HOY);
  await abrir(page);
  await irAAjustes(page);
});

async function revisarMenu(page: import('@playwright/test').Page, esperadas: string[]) {
  await page.getByRole('button', { name: 'Volver' }).click();
  await abrirMenu(page);
  // Los subtítulos llegan de la base un instante después de abrir la hoja.
  await expect
    .poll(async () => (await hoja(page).getByRole('button').allInnerTexts()).map((f) => f.replace(/\s*›\s*$/, '').replace(/\s+/g, ' ').trim()))
    .toEqual(esperadas);
  await page.keyboard.press('Escape');
  await expect(hoja(page)).toHaveCount(0);
}

test('A14.5, A14.9 subtítulos del menú con el completo y con el chico', async ({ page }) => {
  await importar(page, RESPALDOS.completo);
  await expect(conteos(page)).toHaveText(COMPLETO);
  await revisarMenu(page, [
    'Mis maniquíes 2 fotos · principal: Con tenis',
    'Mis medidas Actualizadas el 3 de octubre',
    'Ajustes y respaldo Último respaldo: 1 de octubre',
  ]);
  await irAAjustes(page);
  await importar(page, RESPALDOS.chico);
  await page.getByRole('button', { name: 'Reemplazar todo' }).click();
  await expect(conteos(page)).toHaveText(CHICO);
  await revisarMenu(page, [
    'Mis maniquíes 1 foto · principal: Frente',
    'Mis medidas Todavía sin medidas',
    'Ajustes y respaldo Último respaldo: 28 de octubre',
  ]);
});

test('A14.6, A11.3 integridad después de importar el completo', async ({ page }) => {
  await importar(page, RESPALDOS.completo);
  await expect(conteos(page)).toHaveText(COMPLETO);
  await abrirDiagnostico(page);
  await page.getByRole('button', { name: 'Verificar otra vez' }).click();
  // "Unas 70 imágenes".
  await expect(datoDiagnostico(page, 'Imágenes').last()).toHaveText(/^[67]\d$/);
  await expect(datoDiagnostico(page, 'Sin referencia')).toHaveText('0');
  await expect(datoDiagnostico(page, 'Referencias rotas')).toHaveText('0');
});

test('A14.10/A14.11 restaurar vuelve al completo con su aviso, y restaurar otra vez al chico', async ({ page }) => {
  await importar(page, RESPALDOS.completo);
  await expect(conteos(page)).toHaveText(COMPLETO);
  await importar(page, RESPALDOS.chico);
  await page.getByRole('button', { name: 'Reemplazar todo' }).click();
  await expect(conteos(page)).toHaveText(CHICO);
  await page.getByRole('button', { name: 'Volver' }).click();
  await expect(pantalla(page).getByRole('status')).toHaveCount(0);
  await irAAjustes(page);

  await page.getByRole('button', { name: /^Restaurar el respaldo automático/ }).click();
  await page.getByRole('button', { name: 'Restaurar', exact: true }).click();
  await expect(conteos(page)).toHaveText(COMPLETO);
  await expect(pantalla(page).getByText(/^Último respaldo: 1 de octubre\./)).toBeVisible();
  await page.getByRole('button', { name: 'Volver' }).click();
  await expect(pantalla(page).getByRole('status')).toContainText('Tu último respaldo fue hace 4 semanas.');

  await irAAjustes(page);
  await page.getByRole('button', { name: /^Restaurar el respaldo automático/ }).click();
  await page.getByRole('button', { name: 'Restaurar', exact: true }).click();
  await expect(conteos(page)).toHaveText(CHICO);
});

test('A14.12/A14.13 versión nueva y dañado: el mensaje, y los conteos y la copia no cambian', async ({ page }) => {
  await importar(page, RESPALDOS.chico);
  await importar(page, RESPALDOS.completo);
  await page.getByRole('button', { name: 'Reemplazar todo' }).click();
  await expect(conteos(page)).toHaveText(COMPLETO);
  const copia = await pantalla(page).locator('.ajustes-auto').innerText();

  await importar(page, RESPALDOS.versionNueva);
  await expect(mensajeRespaldo(page)).toHaveText('Este respaldo es de una versión más nueva de Percha. Actualiza la app y vuelve a intentarlo.');
  await importar(page, RESPALDOS.danado);
  await expect(mensajeRespaldo(page)).toHaveText('El respaldo está dañado y no se puede usar. Tus datos no cambiaron.');
  await expect(hoja(page)).toHaveCount(0);
  await expect(conteos(page)).toHaveText(COMPLETO);
  expect(await pantalla(page).locator('.ajustes-auto').innerText()).toBe(copia);
  expect(await contarTabla(page, 'respaldosAuto')).toBe(1);
});

test('A14.14–A14.17, A15.8 exportar el completo, reinstalar e importarlo; cerrar y abrir', async ({ page }) => {
  await importar(page, RESPALDOS.completo);
  await expect(conteos(page)).toHaveText(COMPLETO);
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  await expect.poll(() => cantidadCompartidos(page)).toBe(1);
  await expect(pantalla(page).getByText(/^Último respaldo: 30 de octubre\./)).toBeVisible();
  const exportado = (await ultimoCompartido(page))!;

  // A15.8: el archivo trae lo importado. A14.15: tamaño parecido al original.
  const manifest = await (await abrirZip(exportado.bytes)).json('manifest.json');
  expect(manifest.conteos).toMatchObject({ prendas: 20, outfits: 4, maniquies: 2 });
  const original = leerRespaldoDePrueba('completo').length;
  expect(Math.abs(exportado.bytes.length - original) / original).toBeLessThan(0.05);

  // A14.17: cerrar y abrir.
  await page.reload();
  if ((await pantalla(page).getAttribute('data-pantalla')) !== '09 Ajustes') await irAAjustes(page);
  await expect(conteos(page)).toHaveText(COMPLETO);

  // A14.16: borrar la app, reinstalar e importar lo exportado.
  await reinstalar(page);
  await irAAjustes(page);
  await expect(conteos(page)).toHaveText('0 prendas · 0 outfits · 0 maniquíes');
  await importar(page, { name: exportado.nombre, mimeType: 'application/zip', buffer: exportado.bytes });
  await expect(mensajeRespaldo(page)).toHaveText('Listo: se restauró el respaldo del 30 de octubre.');
  await expect(conteos(page)).toHaveText(COMPLETO);
  await expect(pantalla(page).getByText(/^Último respaldo: 30 de octubre\./)).toBeVisible();
});

test('A14.17 tras importar y volver a abrir la app, las fotos siguen siendo fotos y el respaldo sale igual', async ({ page }) => {
  // Regresión (research R-14): si la importación guardaba en IndexedDB el `slice` del ZIP, al
  // recargar WebKit devolvía el ZIP entero en vez de cada foto.
  await importar(page, RESPALDOS.chico);
  await expect(conteos(page)).toHaveText(CHICO);
  await page.reload();
  const imagenes = await page.evaluate(
    () =>
      new Promise<string[]>((listo) => {
        const pedido = indexedDB.open('percha');
        pedido.onsuccess = () => {
          const todas = pedido.result.transaction('imagenes').objectStore('imagenes').getAll();
          todas.onsuccess = async () => {
            const salida: string[] = [];
            for (const imagen of todas.result as { bytes: number; blob: Blob }[]) {
              const bytes = new Uint8Array(await imagen.blob.arrayBuffer());
              const firma = bytes[0] === 0xff && bytes[1] === 0xd8 ? 'jpeg' : bytes[0] === 0x89 && bytes[1] === 0x50 ? 'png' : 'otra';
              salida.push(`${imagen.blob.type} ${firma} ${bytes.length === imagen.bytes ? 'tamaño ok' : `${bytes.length} ≠ ${imagen.bytes}`}`);
            }
            pedido.result.close();
            listo(salida);
          };
        };
      }),
  );
  expect(imagenes).toHaveLength(12);
  for (const imagen of imagenes) expect(imagen).toMatch(/^image\/(png png|jpeg jpeg) tamaño ok$/);

  if ((await pantalla(page).getAttribute('data-pantalla')) !== '09 Ajustes') await irAAjustes(page);
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  await expect.poll(() => cantidadCompartidos(page)).toBe(1);
  const exportado = (await ultimoCompartido(page))!;
  expect(Math.abs(exportado.bytes.length - leerRespaldoDePrueba('chico').length)).toBeLessThan(100);
  await reinstalar(page);
  await irAAjustes(page);
  await importar(page, { name: exportado.nombre, mimeType: 'application/zip', buffer: exportado.bytes });
  await expect(conteos(page)).toHaveText(CHICO);
});

test('A14.22 importar el chico, luego el completo y restaurar deja el chico', async ({ page }) => {
  await importar(page, RESPALDOS.chico);
  await expect(conteos(page)).toHaveText(CHICO);
  await importar(page, RESPALDOS.completo);
  await page.getByRole('button', { name: 'Reemplazar todo' }).click();
  await expect(conteos(page)).toHaveText(COMPLETO);
  await page.getByRole('button', { name: /^Restaurar el respaldo automático/ }).click();
  await page.getByRole('button', { name: 'Restaurar', exact: true }).click();
  await expect(conteos(page)).toHaveText(CHICO);
});

test('A14.23 mientras revisa el respaldo, Importar y Exportar están deshabilitados', async ({ page }) => {
  await page.evaluate(() => {
    const w = window as unknown as { __revisando: boolean[][] };
    w.__revisando = [];
    new MutationObserver(() => {
      const mensaje = document.querySelector('main[data-pantalla]:not([hidden]) .ajustes-mensaje')?.textContent;
      if (mensaje !== 'Revisando el respaldo…' && mensaje !== 'Importando… No cierres Percha.') return;
      const botones = [...document.querySelectorAll<HTMLButtonElement>('main[data-pantalla]:not([hidden]) .ajustes-botones button')];
      w.__revisando.push(botones.map((b) => b.disabled));
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
  });
  await importar(page, RESPALDOS.completo);
  await expect(conteos(page)).toHaveText(COMPLETO);
  const estados = await page.evaluate(() => (window as unknown as { __revisando: boolean[][] }).__revisando);
  expect(estados.length).toBeGreaterThan(0);
  expect(estados.every((botones) => botones.length === 2 && botones.every(Boolean))).toBe(true);
});

test('D1 después de usar la app, ninguna solicitud a otros orígenes', async ({ page }) => {
  await importar(page, RESPALDOS.completo);
  await expect(conteos(page)).toHaveText(COMPLETO);
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  await expect.poll(() => cantidadCompartidos(page)).toBe(1);
  for (const pestana of ['Hoy', 'Clóset', 'Taller', 'Outfits']) {
    if ((await pantalla(page).getAttribute('data-pantalla')) === '09 Ajustes') await page.getByRole('button', { name: 'Volver' }).click();
    await page.getByRole('button', { name: pestana, exact: true }).click();
  }
  await page.getByRole('button', { name: 'Hoy', exact: true }).click();
  await irAAjustes(page);
  await abrirDiagnostico(page);
  await expect(datoDiagnostico(page, 'Otros orígenes')).toHaveText('0');
});
