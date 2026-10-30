// Bugs visuales (docs/pruebas-intensivas.md: A1, A2, A6.9, A12.1, A12.2, A16.11–A16.14). Cada
// estado de la app, en claro y oscuro y en los tres perfiles de iPhone, pasa por los detectores de
// visual/revisar.ts con las áreas seguras del perfil simuladas, y se compara con su captura de
// referencia (tests/e2e/visual.spec.ts-snapshots/, regenerar con --update-snapshots solo después de
// revisar a ojo que el cambio es el esperado).

import type { Page, TestInfo } from '@playwright/test';
import {
  abrir,
  abrirDiagnostico,
  abrirMenu,
  conteos,
  expect,
  fijarCompartir,
  hoja,
  HOY,
  importar,
  irAAjustes,
  mensajeRespaldo,
  pantalla,
  RESPALDOS,
  test,
} from './apoyo';
import { foto } from './archivos';
import { revisarPantalla, type OpcionesRevision, type Problema } from './visual/revisar';

/** env(safe-area-inset-*) de cada perfil, que el WebKit de Playwright deja en 0. */
const AREAS: Record<string, { arriba: number; abajo: number }> = {
  'iphone-15': { arriba: 59, abajo: 34 },
  'iphone-se': { arriba: 20, abajo: 0 },
  'pro-max': { arriba: 62, abajo: 34 },
};

function areasDe(info: TestInfo) {
  return AREAS[info.project.name] ?? { arriba: 0, abajo: 0 };
}

test.beforeEach(async ({ page, context }, info) => {
  const { arriba, abajo } = areasDe(info);
  await context.addInitScript(
    ({ arriba, abajo }) => {
      document.addEventListener('DOMContentLoaded', () => {
        document.documentElement.style.setProperty('--seguro-arriba', `${arriba}px`);
        document.documentElement.style.setProperty('--seguro-abajo', `${abajo}px`);
      });
    },
    { arriba, abajo },
  );
  await page.clock.setFixedTime(HOY);
});

interface Estado {
  nombre: string;
  /** Deja la app en el estado que se revisa. */
  preparar: (page: Page) => Promise<void>;
  /** Sin captura de referencia (lo que muestra cambia en cada corrida). */
  sinCaptura?: boolean;
}

/** Lo que cambia entre corridas se oculta en la captura (ver el comentario del CSS). */
const CAPTURA = { stylePath: 'tests/e2e/visual/ocultar-en-captura.css' };

async function conCompleto(page: Page) {
  await abrir(page);
  await irAAjustes(page);
  await importar(page, RESPALDOS.completo);
  await expect(conteos(page)).toHaveText('20 prendas · 4 outfits · 2 maniquíes');
}

async function conCopiaAutomatica(page: Page) {
  await conCompleto(page);
  await importar(page, RESPALDOS.chico);
  await page.getByRole('button', { name: 'Reemplazar todo' }).click();
  await expect(conteos(page)).toHaveText('3 prendas · 1 outfit · 1 maniquí');
  await expect(pantalla(page).getByRole('button', { name: 'Exportarlo' })).toBeVisible();
}

async function pestana(page: Page, nombre: string, etiqueta: string) {
  await abrir(page);
  await page.getByRole('button', { name: nombre, exact: true }).click();
  await expect(pantalla(page)).toHaveAttribute('data-pantalla', etiqueta);
}

async function apilada(page: Page, fila: string, etiqueta: string) {
  await abrir(page);
  await irAAjustes(page);
  await page.getByRole('button', { name: fila }).click();
  await expect(pantalla(page)).toHaveAttribute('data-pantalla', etiqueta);
}

const ESTADOS: Estado[] = [
  { nombre: 'hoy-vacia', preparar: abrir },
  {
    nombre: 'hoy-aviso-respaldo',
    preparar: async (page) => {
      await conCompleto(page);
      await page.getByRole('button', { name: 'Volver' }).click();
      await expect(pantalla(page).getByRole('status')).toContainText('Tu último respaldo fue hace 4 semanas.');
    },
  },
  {
    nombre: 'menu-vacio',
    preparar: async (page) => {
      await abrir(page);
      await abrirMenu(page);
      await expect(hoja(page)).toContainText('Todavía no hay respaldo');
    },
  },
  {
    nombre: 'menu-con-datos',
    preparar: async (page) => {
      await conCompleto(page);
      await page.getByRole('button', { name: 'Volver' }).click();
      await abrirMenu(page);
      await expect(hoja(page)).toContainText('principal: Con tenis');
      await expect(hoja(page)).toContainText('Actualizadas el 3 de octubre');
    },
  },
  { nombre: 'closet', preparar: (page) => pestana(page, 'Clóset', '02 Clóset') },
  { nombre: 'taller', preparar: (page) => pestana(page, 'Taller', '11 Taller') },
  { nombre: 'outfits', preparar: (page) => pestana(page, 'Outfits', '06 Mis outfits') },
  {
    nombre: 'agregar-prenda',
    preparar: async (page) => {
      await abrir(page);
      await page.getByRole('button', { name: 'Agregar prenda' }).click();
      await expect(pantalla(page)).toHaveAttribute('data-pantalla', '04 Agregar 1 Foto');
    },
  },
  { nombre: 'mis-maniquies', preparar: (page) => apilada(page, 'Mis maniquíes', '08 Mis maniquíes') },
  { nombre: 'mis-medidas', preparar: (page) => apilada(page, 'Mis medidas', '12 Mis medidas') },
  {
    nombre: 'ajustes-vacia',
    preparar: async (page) => {
      await abrir(page);
      await irAAjustes(page);
      await expect(conteos(page)).toHaveText('0 prendas · 0 outfits · 0 maniquíes');
    },
  },
  { nombre: 'ajustes-copia-automatica', preparar: conCopiaAutomatica },
  {
    nombre: 'ajustes-rechazo',
    preparar: async (page) => {
      await abrir(page);
      await irAAjustes(page);
      await importar(page, foto());
      await expect(mensajeRespaldo(page)).toHaveText('Este archivo no es un respaldo de Percha.');
    },
  },
  {
    nombre: 'ajustes-guardar-respaldo',
    preparar: async (page) => {
      await abrir(page);
      await irAAjustes(page);
      await fijarCompartir(page, 'vencido');
      await page.getByRole('button', { name: 'Exportar', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Guardar respaldo' })).toBeVisible();
    },
  },
  {
    nombre: 'hoja-reemplazar',
    preparar: async (page) => {
      await conCompleto(page);
      await importar(page, RESPALDOS.chico);
      await expect(hoja(page).getByRole('heading', { name: '¿Reemplazar todo con este respaldo?' })).toBeVisible();
    },
  },
  {
    nombre: 'hoja-restaurar',
    preparar: async (page) => {
      await conCopiaAutomatica(page);
      await page.getByRole('button', { name: /^Restaurar el respaldo automático/ }).click();
      await expect(hoja(page).getByRole('heading', { name: '¿Restaurar la copia automática?' })).toBeVisible();
    },
  },
  {
    nombre: 'diagnostico',
    preparar: async (page) => {
      await abrir(page);
      await irAAjustes(page);
      await abrirDiagnostico(page);
      await expect(pantalla(page).locator('dd').first()).not.toHaveText('…');
    },
    sinCaptura: true,
  },
  {
    nombre: 'error-al-abrir',
    preparar: async (page) => {
      await page.addInitScript(() => {
        IDBFactory.prototype.open = () => {
          throw new DOMException('Base simulada que no abre', 'UnknownError');
        };
      });
      await page.goto('/');
      await expect(pantalla(page)).toHaveAttribute('data-pantalla', 'Error al abrir');
    },
  },
];

/** Deja todo quieto (sin animaciones ni cursor) y con las fuentes cargadas antes de revisar. */
async function quieta(page: Page) {
  await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition: none !important; caret-color: transparent !important; }' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
}

async function revisar(page: Page, info: TestInfo, opciones: Partial<OpcionesRevision> = {}): Promise<Problema[]> {
  const { arriba, abajo } = areasDe(info);
  const problemas = await page.evaluate(revisarPantalla, {
    seguroArriba: arriba,
    zonaIndicador: abajo > 0 ? 21 : 0,
    tactilMinimo: 44,
    ...opciones,
  });
  for (const p of problemas) info.annotations.push({ type: p.nivel === 'error' ? 'error-visual' : 'aviso-visual', description: `${p.tipo}: ${p.detalle}` });
  await info.attach('revision-visual.json', { body: JSON.stringify(problemas, null, 2), contentType: 'application/json' });
  return problemas;
}

const errores = (problemas: Problema[]) => problemas.filter((p) => p.nivel === 'error').map((p) => `${p.tipo}: ${p.detalle}`);

for (const [esquema, tema] of [
  ['light', 'claro'],
  ['dark', 'oscuro'],
] as const) {
  test.describe(`tema ${tema}`, () => {
    test.use({ colorScheme: esquema });

    for (const estado of ESTADOS) {
      test(`visual ${estado.nombre} (${tema})`, async ({ page }, info) => {
        await estado.preparar(page);
        await quieta(page);
        expect(errores(await revisar(page, info)), 'bugs visuales').toEqual([]);
        if (estado.sinCaptura) return;

        await expect(page).toHaveScreenshot(`${estado.nombre}-${tema}.png`, CAPTURA);
        // Lo que no entra en la pantalla también se revisa y se compara, bajado hasta el final.
        const visible = pantalla(page);
        const conScroll = (await visible.count()) === 1 && (await visible.evaluate((m) => m.scrollHeight > m.clientHeight + 1));
        if (conScroll && (await hoja(page).count()) === 0) {
          await visible.evaluate((m) => (m.scrollTop = m.scrollHeight));
          await page.waitForTimeout(100);
          await expect(page).toHaveScreenshot(`${estado.nombre}-${tema}-final.png`, CAPTURA);
        }
      });
    }
  });
}

// Pantallas que no son las de los perfiles: el Zoom de pantalla de iOS en un SE (320 de ancho,
// A16.14) y el iPhone en horizontal (A12.2). Solo detectores, una vez (en el perfil iphone-se).
for (const [variante, viewport] of [
  ['zoom de pantalla 320', { width: 320, height: 568 }],
  ['horizontal', { width: 852, height: 393 }],
] as const) {
  test.describe(variante, () => {
    test.use({ viewport });

    for (const estado of ESTADOS.filter((e) => ['hoy-aviso-respaldo', 'menu-con-datos', 'ajustes-copia-automatica', 'hoja-reemplazar', 'hoja-restaurar', 'error-al-abrir'].includes(e.nombre))) {
      test(`visual ${estado.nombre} (${variante})`, async ({ page }, info) => {
        test.skip(info.project.name !== 'iphone-se', 'Una vez basta: el ancho lo fija la variante');
        await estado.preparar(page);
        await quieta(page);
        // En horizontal la isla queda a un costado: arriba no hay zona segura.
        const opciones = variante === 'horizontal' ? { seguroArriba: 0, zonaIndicador: 21 } : {};
        expect(errores(await revisar(page, info, opciones)), 'bugs visuales').toEqual([]);
      });
    }
  });
}
