import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// Aislamiento de origen para los hilos de WASM del recorte (research R-0, R-8).
// ⏳ T002: quitar si el spike muestra que no aportan.
const AISLAMIENTO = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

export default defineConfig({
  define: { __PERCHA_VERSION__: JSON.stringify(version) },
  plugins: [
    react(),
    VitePWA({
      // Nunca se recarga sola: src/pwa/registro.ts avisa "Hay una versión nueva" (research R-7).
      registerType: 'prompt',
      injectRegister: false,
      // Íconos y splash desde pwa-assets.config.ts (T012); se generan e inyectan al compilar.
      // Sin `injectThemeColor`: index.html tiene una sola meta theme-color, la que actualiza el
      // script del tema; una segunda quedaría con el color claro en el tema oscuro.
      pwaAssets: { config: true, overrideManifestIcons: true, injectThemeColor: false },
      manifest: {
        id: '/',
        name: 'Percha',
        short_name: 'Percha',
        description: 'Ver qué ponerme —y qué coser— antes de hacerlo.',
        lang: 'es',
        dir: 'ltr',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        background_color: '#f4ebe6',
        theme_color: '#f4ebe6',
      },
      workbox: {
        // Sin "webmanifest": el plugin ya lo agrega, y con dos revisiones distintas Workbox falla
        // al instalar el service worker (add-to-cache-list-conflicting-entries).
        globPatterns: ['**/*.{js,css,html,woff2,svg,png,ico}'],
        // El modelo va en su propia caché (abajo). Los splash de iOS solo se leen al instalar.
        globIgnores: ['modelos/**', 'apple-splash-*.png'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /\/modelos\/imgly\/1\.7\.0\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'percha-modelo-1.7.0',
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    headers: AISLAMIENTO,
    // Para abrir el servidor de desarrollo en el iPhone por el túnel de `npm run dev:tunel`.
    allowedHosts: ['.trycloudflare.com'],
  },
  preview: { headers: AISLAMIENTO },
  worker: { format: 'es' },
  build: { target: 'es2022' },
});
