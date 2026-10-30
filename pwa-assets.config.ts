// Íconos y pantallas de inicio (splash) de iOS, generados al compilar por vite-plugin-pwa
// (`pwaAssets` en vite.config.ts). T012; T155 verifica en el iPhone el splash oscuro (research R-12).

import { readFile } from 'node:fs/promises';
import { createAppleSplashScreens, defineConfig } from '@vite-pwa/assets-generator/config';

const FONDO_CLARO = '#f4ebe6';
const FONDO_OSCURO = '#0f0e0d';

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    transparent: { sizes: [64, 192, 512], favicons: [[48, 'favicon.ico']] },
    maskable: { sizes: [512], padding: 0.3, resizeOptions: { background: FONDO_CLARO } },
    apple: { sizes: [180], padding: 0.2, resizeOptions: { background: FONDO_CLARO } },
    appleSplashScreens: createAppleSplashScreens(
      {
        padding: 0.35,
        resizeOptions: { background: FONDO_CLARO, fit: 'contain' },
        // Splash oscuro con la percha clara. Está por verificar en el iPhone si iOS respeta el
        // media (prefers-color-scheme: dark) de estos <link> (research R-12).
        darkResizeOptions: { background: FONDO_OSCURO, fit: 'contain' },
        darkImageResolver: () => readFile('public/icono-fuente-oscuro.svg'),
        linkMediaOptions: { log: false, addMediaScreen: true, basePath: '/', xhtml: false },
      },
      // De SE (375 × 667) a Pro Max (440 × 956), los tamaños que pide el spec (SC-008).
      [
        'iPhone SE 4.7"',
        'iPhone 13 mini',
        'iPhone 13',
        'iPhone 14 Plus',
        'iPhone 15',
        'iPhone 15 Pro Max',
        'iPhone 16 Pro',
        'iPhone 16 Pro Max',
        'iPhone Air',
        'iPhone 17 Pro Max',
      ],
    ),
  },
  images: ['public/icono-fuente.svg'],
});
