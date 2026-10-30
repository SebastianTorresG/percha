// Apoyo de las pruebas de punta a punta (docs/pruebas-intensivas.md, Parte A, en WebKit con
// perfiles de iPhone). Cada prueba abre su propio perfil persistente: un contexto efímero de WebKit
// (como la navegación privada de Safari) no puede guardar Blob en IndexedDB, y la PWA instalada no
// es efímera (tasks.md, *Convenciones*).

import { readFileSync } from 'node:fs';
import { test as base, expect, webkit, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { leerZip } from '../../src/respaldo/zip-lector';

export { expect };

/**
 * Cómo responde la hoja de compartir de iOS, simulada:
 * - `guardar`: la usuaria elige "Guardar en Archivos" y guarda.
 * - `cancelar`: toca la X (AbortError).
 * - `vencido`: iOS no abre la hoja porque se venció el toque (NotAllowedError), solo la primera vez.
 * - `sin_hoja`: no hay hoja de compartir para archivos (escritorio): la app descarga el archivo.
 */
export type ModoCompartir = 'guardar' | 'cancelar' | 'vencido' | 'sin_hoja';

interface OpcionesPercha {
  compartir: ModoCompartir;
  /** Errores de la página que una prueba espera (por ejemplo, al recargar a mitad de una escritura). */
  erroresEsperados: RegExp[];
}

export const test = base.extend<OpcionesPercha & { context: BrowserContext; page: Page }>({
  compartir: ['guardar', { option: true }],
  erroresEsperados: [[], { option: true }],

  context: async (
    { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch, locale, colorScheme, reducedMotion, timezoneId, baseURL, compartir },
    use,
    testInfo,
  ) => {
    const contexto = await webkit.launchPersistentContext(testInfo.outputPath('perfil'), {
      headless: true,
      viewport,
      userAgent,
      deviceScaleFactor,
      isMobile,
      hasTouch,
      locale,
      colorScheme,
      reducedMotion,
      timezoneId,
      baseURL,
      acceptDownloads: true,
    });
    await contexto.addInitScript(simularHojaCompartir, compartir);
    await use(contexto);
    await contexto.close();
  },

  page: async ({ context, erroresEsperados }, use) => {
    const pagina = context.pages()[0] ?? (await context.newPage());
    const errores: string[] = [];
    pagina.on('pageerror', (error) => {
      if (!erroresEsperados.some((patron) => patron.test(String(error)))) errores.push(String(error));
    });
    await use(pagina);
    // Ninguna prueba debe dejar errores sin capturar en la página.
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  },
});

function simularHojaCompartir(modo: ModoCompartir) {
  const estado = { modo, compartidos: [] as File[], vencido: false };
  (window as unknown as { __compartir: typeof estado }).__compartir = estado;
  if (modo === 'sin_hoja') {
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
    return;
  }
  Object.defineProperty(navigator, 'canShare', {
    configurable: true,
    value: (datos?: { files?: File[] }) => (datos?.files?.length ?? 0) > 0,
  });
  Object.defineProperty(navigator, 'share', {
    configurable: true,
    value: async (datos: { files: File[] }) => {
      if (estado.modo === 'cancelar') throw new DOMException('Cancelado', 'AbortError');
      if (estado.modo === 'vencido' && !estado.vencido) {
        estado.vencido = true;
        throw new DOMException('Sin activación', 'NotAllowedError');
      }
      estado.compartidos.push(datos.files[0]!);
    },
  });
}

/** Cambia la respuesta de la hoja de compartir simulada sin recargar. */
export async function fijarCompartir(page: Page, modo: ModoCompartir): Promise<void> {
  await page.evaluate((m) => {
    (window as unknown as { __compartir: { modo: string } }).__compartir.modo = m;
  }, modo);
}

/** El último archivo que la app entregó a la hoja de compartir. */
export async function ultimoCompartido(page: Page): Promise<{ nombre: string; bytes: Buffer } | null> {
  const datos = await page.evaluate(async () => {
    const archivo = (window as unknown as { __compartir: { compartidos: File[] } }).__compartir.compartidos.at(-1);
    if (!archivo) return null;
    const url = await new Promise<string>((listo) => {
      const lector = new FileReader();
      lector.onload = () => listo(lector.result as string);
      lector.readAsDataURL(archivo);
    });
    return { nombre: archivo.name, base64: url.slice(url.indexOf(',') + 1) };
  });
  return datos && { nombre: datos.nombre, bytes: Buffer.from(datos.base64, 'base64') };
}

export async function cantidadCompartidos(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __compartir: { compartidos: File[] } }).__compartir.compartidos.length);
}

/** Nombres de las entradas de un ZIP y el contenido de sus JSON. */
export async function abrirZip(bytes: Buffer): Promise<{ nombres: string[]; json: (nombre: string) => Promise<Record<string, unknown>> }> {
  const entradas = await leerZip(new Blob([new Uint8Array(bytes)]));
  return {
    nombres: entradas.map((e) => e.nombre),
    json: async (nombre) => JSON.parse(await (await entradas.find((e) => e.nombre === nombre)!.obtener()).text()) as Record<string, unknown>,
  };
}

/** La pantalla visible (la cima de la pila). */
export function pantalla(page: Page): Locator {
  return page.locator('main[data-pantalla]:not([hidden])');
}

export async function abrir(page: Page): Promise<void> {
  await page.goto('/');
  await expect(pantalla(page)).toHaveAttribute('data-pantalla', '01 Hoy');
}

export function hoja(page: Page): Locator {
  return page.getByRole('dialog');
}

export async function abrirMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Menú' }).click();
  await expect(page.locator('[data-pantalla="01c Menú"]')).toBeVisible();
}

export async function irAAjustes(page: Page): Promise<void> {
  await abrirMenu(page);
  await page.getByRole('button', { name: /Ajustes y respaldo/ }).click();
  await expect(pantalla(page)).toHaveAttribute('data-pantalla', '09 Ajustes');
  await expect(hoja(page)).toHaveCount(0);
}

export async function abrirDiagnostico(page: Page): Promise<void> {
  // Cinco toques reales dentro de la ventana de 2 s (con la traza, `locator.click` puede tardar más).
  await tocarVersion(page, 5);
  await expect(pantalla(page)).toHaveAttribute('data-pantalla', 'Diagnóstico');
}

export async function tocarVersion(page: Page, veces: number): Promise<void> {
  const version = page.getByRole('button', { name: /^Percha / });
  await version.scrollIntoViewIfNeeded();
  const caja = (await version.boundingBox())!;
  for (let i = 0; i < veces; i++) await page.mouse.click(caja.x + caja.width / 2, caja.y + caja.height / 2);
}

/** El valor de una fila `<dt>`/`<dd>` del panel de diagnóstico. */
export function datoDiagnostico(page: Page, nombre: string): Locator {
  return pantalla(page).locator(`dt:text-is("${nombre}") + dd`);
}

export type ArchivoPrueba = string | { name: string; mimeType: string; buffer: Buffer };

/** Ajustes → Importar → elegir el archivo en el selector. */
export async function importar(page: Page, archivo: ArchivoPrueba): Promise<void> {
  const selector = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Importar', exact: true }).click();
  await (await selector).setFiles(archivo);
}

export function mensajeRespaldo(page: Page): Locator {
  return pantalla(page).locator('.ajustes-mensaje');
}

export function conteos(page: Page): Locator {
  return pantalla(page).locator('.ajustes-espacio .t-meta').first();
}

const CARPETA_RESPALDOS = 'docs/respaldos-de-prueba';

export const RESPALDOS = {
  completo: `${CARPETA_RESPALDOS}/Percha-respaldo-2026-10-01.zip`,
  chico: `${CARPETA_RESPALDOS}/Percha-respaldo-2026-10-28.zip`,
  versionNueva: `${CARPETA_RESPALDOS}/Percha-respaldo-version-nueva.zip`,
  danado: `${CARPETA_RESPALDOS}/Percha-respaldo-danado.zip`,
} as const;

export function leerRespaldoDePrueba(nombre: keyof typeof RESPALDOS): Buffer {
  return readFileSync(RESPALDOS[nombre]);
}

/** Fecha y hora fijas para las pruebas que dependen del día (el plan usa el 30 de octubre). */
export const HOY = new Date(2026, 9, 30, 10, 0);

/** Cuántos registros tiene una tabla de la base `percha`, leída directo de IndexedDB. */
export async function contarTabla(page: Page, tabla: string): Promise<number> {
  return page.evaluate(
    (nombre) =>
      new Promise<number>((listo, falla) => {
        const pedido = indexedDB.open('percha');
        pedido.onerror = () => falla(pedido.error);
        pedido.onsuccess = () => {
          const base = pedido.result;
          const conteo = base.transaction(nombre).objectStore(nombre).count();
          conteo.onsuccess = () => {
            base.close();
            listo(conteo.result);
          };
        };
      }),
    tabla,
  );
}

/**
 * Como borrar la app y reinstalarla: sin base, sin localStorage ni sessionStorage. Se hace desde
 * otra página del mismo origen para que la app no tenga la base abierta.
 */
export async function reinstalar(page: Page): Promise<void> {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    () =>
      new Promise<void>((listo, falla) => {
        localStorage.clear();
        sessionStorage.clear();
        const pedido = indexedDB.deleteDatabase('percha');
        pedido.onsuccess = () => listo();
        pedido.onerror = () => falla(pedido.error);
        pedido.onblocked = () => falla(new Error('La base sigue abierta'));
      }),
  );
  await abrir(page);
}
