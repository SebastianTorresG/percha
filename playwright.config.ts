import { defineConfig, devices } from '@playwright/test';

// Recorridos de punta a punta en WebKit con perfiles de iPhone (research R-14). Los altos son los
// de la app instalada en la pantalla de inicio (standalone), sin la barra de Safari.
//
// Con `PERCHA_URL` las pruebas corren contra esa URL ya desplegada (scripts/probar-despliegue.ts)
// en vez de compilar y servir `dist/` en el puerto 4173.
const desplegada = process.env.PERCHA_URL;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  // Importar y restaurar respaldos con varias instancias de WebKit a la vez tarda más de 5 s en
  // Windows; en el iPhone se mide aparte (docs/pruebas-intensivas.md).
  expect: {
    timeout: 20_000,
    // Las capturas se comparan con las de tests/e2e/visual.spec.ts-snapshots/ (mismo WebKit).
    toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: 'disabled', caret: 'hide' },
  },
  timeout: 90_000,
  use: {
    baseURL: desplegada ?? 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'iphone-15', use: { ...devices['iPhone 15'], viewport: { width: 393, height: 852 } } },
    { name: 'iphone-se', use: { ...devices['iPhone SE (3rd gen)'], viewport: { width: 375, height: 667 } } },
    { name: 'pro-max', use: { ...devices['iPhone 15 Pro Max'], viewport: { width: 440, height: 956 } } },
  ],
  webServer: desplegada
    ? undefined
    : {
        command: 'npm run build && npm run preview -- --port 4173 --strictPort',
        url: 'http://localhost:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
