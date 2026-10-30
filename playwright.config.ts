import { defineConfig, devices } from '@playwright/test';

// Recorridos de punta a punta en WebKit con perfiles de iPhone (research R-14). Los altos son los
// de la app instalada en la pantalla de inicio (standalone), sin la barra de Safari.
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'iphone-15', use: { ...devices['iPhone 15'], viewport: { width: 393, height: 852 } } },
    { name: 'iphone-se', use: { ...devices['iPhone SE (3rd gen)'], viewport: { width: 375, height: 667 } } },
    { name: 'pro-max', use: { ...devices['iPhone 15 Pro Max'], viewport: { width: 440, height: 956 } } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
