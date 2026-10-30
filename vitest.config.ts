import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

// Tres proyectos de prueba (research R-14):
// - unidad: lógica pura en Node.
// - integracion: repositorios, migraciones y respaldo sobre IndexedDB simulado (fake-indexeddb).
// - navegador: canvas, máscaras y composición en WebKit real, el motor de Safari.
export default defineConfig({
  define: { __PERCHA_VERSION__: JSON.stringify('pruebas') },
  plugins: [react()],
  // En el navegador, si Vite descubre una dependencia a mitad de la corrida vuelve a optimizar y
  // quedan dos copias de React ("resolveDispatcher() is null"). Se declaran todas de entrada.
  optimizeDeps: {
    include: ['react', 'react/jsx-dev-runtime', 'react-dom/client', 'dexie', 'dexie-react-hooks'],
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unidad',
          include: ['tests/unidad/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'integracion',
          include: ['tests/integracion/**/*.test.ts'],
          environment: 'node',
          setupFiles: ['tests/setup/indexeddb.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'navegador',
          include: ['tests/navegador/**/*.test.{ts,tsx}'],
          // Un contexto efímero de WebKit (como la navegación privada de Safari) no puede guardar
          // Blob en IndexedDB ("Error preparing Blob/File data"). La PWA instalada no es efímera,
          // así que las pruebas usan un contexto persistente, que exige correr los archivos en serie.
          fileParallelism: false,
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({ persistentContext: 'node_modules/.cache/percha-webkit' }),
            instances: [{ browser: 'webkit' }],
          },
        },
      },
    ],
  },
});
