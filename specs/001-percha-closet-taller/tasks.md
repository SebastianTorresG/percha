---

description: "Lista de tareas de Percha — clóset digital y taller"
---

# Tasks: Percha — clóset digital y taller

**Input**: documentos de diseño en `specs/001-percha-closet-taller/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: obligatorios por la constitución (principio VIII) y por pedido del dueño: repositorios,
migraciones, export/import y motor del Armador con pruebas automatizadas, y cada historia validada a
mano en un iPhone real antes de cerrarse. Las pruebas de cada historia se escriben **primero** y
deben fallar antes de implementar.

**Organization**: por historia de usuario, en el orden del brief §4.5 (datos y respaldo → agregar
prenda → clóset → maniquí → Armador → outfits, calendario y Hoy → hecho por mí → Taller → medidas
→ onboarding → pulido). Ese orden coincide con las prioridades del spec (P1 → P2 → P3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (otro archivo, sin depender de tareas pendientes).
- **[Story]**: historia del spec (US1…US10).
- Las rutas son relativas a la raíz del repositorio (`D:\App-Closet-Sofi`), salvo que se indique otra.
- **⏳ T002**: la tarea usa una decisión que sale del spike. Si T002 todavía no está hecha, se usa el
  valor provisional de [plan.md](./plan.md#partes-que-dependen-del-spike) detrás del contrato, y se
  ajusta cuando llegue el resultado.

## Convenciones para todas las tareas

- Interfaz y mensajes en español, con el copy exacto del diseño
  (`Tres direcciones visuales Clóset/handoff_actualizacion/`).
- Nombres de pantallas y componentes como en el diseño; cada pantalla lleva su `data-screen-label`
  como atributo `data-pantalla` en la raíz.
- Todo estado no diseñado (vacío, error, carga) se construye con los tokens y se anota en
  `specs/001-percha-closet-taller/desviaciones-diseno.md`.
- Toda escritura que toque varias tablas va en **una** transacción de Dexie.
- La validación en iPhone se anota en el *Registro de mediciones* de [quickstart.md](./quickstart.md).
- Las pruebas en WebKit que guardan imágenes usan un contexto **persistente**: un contexto efímero (como la navegación privada de Safari) no puede guardar Blob en IndexedDB. Vale para `tests/navegador/` (ya configurado) y para las e2e que agreguen prendas o maniquíes.

---

## Phase 1: Spike de recorte (research R-0)

**Purpose**: confirmar en un iPhone real que el recorte funciona en una PWA standalone, antes de
construir el flujo de Agregar prenda. Solo bloquea las tareas marcadas ⏳ T002; el resto del plan
puede avanzar mientras el dueño hace la prueba.

- [X] T001 Construir la página desechable del spike en `spike/recorte/` como proyecto Vite propio e independiente de la app (`spike/recorte/package.json` con `@imgly/background-removal` **1.7.0** y `onnxruntime-web` **1.21.0-dev.20250206-d981b153d3** en versión exacta, que es la compilación de los WASM de imgly (research R-0, *Página del spike*); `spike/recorte/index.html`, `spike/recorte/src/main.ts`, `spike/recorte/public/manifest.webmanifest` con `"display": "standalone"`, `spike/recorte/public/sw.js` con caché `CacheFirst` para `/modelos/`). (1) Un script `spike/recorte/scripts/descargar-modelo.mjs` baja de `https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/` solo `models/isnet_quint8`, `models/isnet_fp16`, `ort-wasm-simd-threaded.wasm/.mjs` y `ort-wasm-simd-threaded.jsep.wasm/.mjs`, según `resources.json`, y verifica los tamaños. (2) La página tiene tres entradas: `<input type="file" accept="image/*">` sin `capture`, con `capture="environment"`, y cámara en vivo con `getUserMedia({ video: { facingMode: 'environment' } })` con un marco guía superpuesto y un temporizador de 5 s. (3) Tiene selectores de modelo (`isnet_quint8` / `isnet_fp16`), dispositivo (`cpu` / `gpu`) y tamaño (completo / 1500 px lado mayor), con `publicPath` en `/modelos/` del mismo origen. (4) Muestra el PNG sobre un fondo a cuadros. (5) Muestra **en pantalla** una tabla con el tiempo de la primera ejecución (con descarga), de las siguientes, la resolución de entrada, `crossOriginIsolated`, `navigator.gpu` disponible, `navigator.storage.estimate()` y si el permiso de cámara se volvió a pedir. Detecta una recarga por memoria con una marca en `sessionStorage` puesta antes de recortar y quitada al terminar. (6) Tiene un botón "Copiar resultados" que copia la tabla como texto. (7) Agrega `spike/recorte/public/_headers` con COOP `same-origin` y COEP `require-corp`, y un modo de build sin ese archivo. (8) `spike/recorte/README.md` explica cómo desplegar las dos variantes (al publicar resultó que wrangler 4.152 ya no crea proyectos de Pages clásicos, así que cada variante quedó como un Worker con archivos estáticos: `spike/recorte/wrangler.jsonc` y `wrangler deploy --name percha-spike-con-coi` o `--name percha-spike-sin-coi`; research R-8). El dueño hace `npx wrangler login` con su cuenta; Claude no ingresa credenciales.
- [ ] T002 Con el dueño: instalar las dos variantes del spike en la pantalla de inicio del iPhone y probar 3 a 5 fotos reales (una prenda negra, una blanca y una estampada), con y sin conexión la segunda vez (~15 min). Registrar los resultados pegados con "Copiar resultados" en `specs/001-percha-closet-taller/research.md` (sección R-0, nueva subsección "Resultados") y en la tabla de registro de `specs/001-percha-closet-taller/quickstart.md`. Con el criterio de éxito de R-0 ("recorte listo para revisar en ≤ 8 s … sin recargas por memoria en 5 fotos seguidas, y offline la segunda vez"), fijar: el modelo, el dispositivo, si van los headers COOP/COEP, el tope del recorte (provisional 1200 px) y si la cámara en vivo sirve. Actualizar la tabla *Partes que dependen del spike* de `specs/001-percha-closet-taller/plan.md`. **Si no se cumple el criterio**, presentar al dueño las alternativas A1–A3 de R-0 con la evidencia medida y no avanzar con T061 ni T063 hasta que decida.

---

## Phase 2: Setup (infraestructura compartida)

**Purpose**: proyecto, herramientas, tokens, fuentes y despliegue de previsualización.

- [X] T003 Crear `package.json` en la raíz con `"type": "module"`, `"private": true` y las dependencias en **versión exacta** de la tabla *Resumen de dependencias* de `specs/001-percha-closet-taller/research.md`: react, react-dom 19.3.1; dexie 4.4.6; dexie-react-hooks 4.4.0; @imgly/background-removal 1.7.0; onnxruntime-web 1.21.0-dev.20250206-d981b153d3 (con `"overrides": { "onnxruntime-web": "$onnxruntime-web" }` para que la dependencia par de imgly no choque; research R-1); @fontsource/cormorant-garamond, @fontsource/jost, @fontsource/bodoni-moda y @fontsource/archivo 5.3.0. Desarrollo: vite 8.3.5, @vitejs/plugin-react 6.1.2, typescript 7.0.2, vite-plugin-pwa 2.0.0, @vite-pwa/assets-generator 2.0.0, vitest y @vitest/browser-playwright 5.0.5, fake-indexeddb 6.2.6, @playwright/test 1.64.1, wrangler 4.152.0. Scripts con los nombres de `quickstart.md`: `dev`, `dev:tunel`, `build`, `preview`, `typecheck` (`tsc --noEmit`), `test`, `test:navegador`, `test:e2e`, `modelo:descargar`, `tokens`, `deploy:preview`. Crear `.gitignore` con `node_modules/`, `dist/`, `public/modelos/` y `spike/recorte/public/modelos/`.
- [X] T004 Crear `tsconfig.json` (estricto, `target` ES2022, `lib` DOM + DOM.Iterable + WebWorker + ES2022, `jsx: react-jsx`, `moduleResolution: bundler`, `noUncheckedIndexedAccess: true`) y `src/vite-env.d.ts` con los tipos de `vite/client` y `vite-plugin-pwa/client`. Si alguna herramienta no funciona con TypeScript 7.0.2, anotarlo en `specs/001-percha-closet-taller/research.md` R-2 y usar la última 6.x solo para esa herramienta. (Hecho: `lib` sin "WebWorker", porque no se puede combinar con "DOM" en un mismo programa; los workers tendrán su propio tsconfig en T063. Los archivos de Node van en `tsconfig.node.json`.)
- [X] T005 Crear `vite.config.ts` con `@vitejs/plugin-react`, `server.host: true` y `server.headers`/`preview.headers` con `Cross-Origin-Opener-Policy: same-origin` y `Cross-Origin-Embedder-Policy: require-corp` (⏳ T002: quitarlos si el spike muestra que no aportan). Configurar `VitePWA` en modo `generateSW` (research R-7): `registerType: 'prompt'`; `workbox.globPatterns` para `**/*.{js,css,html,woff2,svg,png,ico}`, excluyendo `modelos/**` y `apple-splash-*.png` (sin `webmanifest`: el plugin ya lo agrega, y con dos revisiones distintas Workbox falla al instalar el service worker); `runtimeCaching` con `urlPattern` `/\/modelos\/imgly\/1\.7\.0\//`, `handler: 'CacheFirst'` y `cacheName: 'percha-modelo-1.7.0'`; `navigateFallback: '/index.html'`. Manifest: `name` y `short_name` "Percha", `lang: 'es'`, `display: 'standalone'`, `orientation: 'portrait'`, `start_url: '/'`, `background_color` y `theme_color` `#f4ebe6` (bg claro de `tokens.json`).
- [X] T006 [P] Crear `vitest.config.ts` con tres proyectos: `unidad` (`tests/unidad/**`, entorno node), `integracion` (`tests/integracion/**`, entorno node, `setupFiles: ['tests/setup/indexeddb.ts']` que importa `fake-indexeddb/auto` y borra la base `percha` antes de cada prueba) y `navegador` (`tests/navegador/**`, `browser.enabled: true` con el proveedor `playwright` e instancia `webkit`). Crear `playwright.config.ts` para `tests/e2e/**` con WebKit y los perfiles de dispositivo "iPhone 15", "iPhone SE" y uno de Pro Max (440 × 956), con `webServer` en `npm run preview`.
- [X] T007 [P] Crear `public/_headers` para Cloudflare Workers con archivos estáticos (misma sintaxis que Pages; research R-8): `/*` con COOP `same-origin` y COEP `require-corp` (⏳ T002); `/assets/*`, `/modelos/*` y `/fuentes/*` con `Cache-Control: public, max-age=31536000, immutable`; `/index.html`, `/sw.js`, `/manifest.webmanifest` y `/registerSW.js` con `Cache-Control: no-cache`. (Hecho: sin regla `/fuentes/*`, porque Vite deja las fuentes en `/assets/`; se agregaron `/` y `/workbox-*`.)
- [X] T008 [P] Crear `index.html` con `<html lang="es">`, `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style` `black-translucent`, `apple-mobile-web-app-title` "Percha", dos `<meta name="theme-color">` (claro `#f4ebe6`, oscuro `#0f0e0d`) y, como **primer** elemento del `<head>` después de los metas, el script inline y síncrono de research R-12. Ese script lee `localStorage['percha.apariencia']` (`'sistema' | 'claro' | 'oscuro'`, con `try/catch` y `'sistema'` por defecto), resuelve `sistema` con `matchMedia('(prefers-color-scheme: dark)')` y fija `document.documentElement.dataset.theme` en `'claro'` o `'oscuro'` antes de cargar cualquier CSS. (Hecho: una sola `<meta name="theme-color">` que actualiza el script; con dos metas por media query, la preferencia manual no se respetaría si contradice al sistema.)
- [X] T009 [P] Crear `scripts/generar-tokens.ts` (script `npm run tokens`), que lee `Tres direcciones visuales Clóset/design_handoff_percha/tokens.json` y escribe `src/tema/tokens.css`. Bajo `[data-theme="claro"]` y `[data-theme="oscuro"]` define una variable CSS por cada clave de `color` (`--bg`, `--surface`, `--chip`, `--ink`, `--muted`, `--line`, `--accent`, `--on-accent`, `--nav`, `--nav-muted`, `--nav-ink`, `--frame`, `--select`, `--stitch`, `--scrim`, `--tile-bg`, `--canvas`, `--placeholder1`, `--placeholder2`), más `--cutout-filter`, `--font-serif`, `--font-serif-weight`, `--font-sans`, `--label-case`, `--label-tracking`, `--chip-font-size`, `--radius-lg/md/sm/chip/button/nav` y `--selection-style`. Los valores `compartido` (escala `tipo`, `espacio`, `margenTexto`, `margenTarjetas`, `toqueMinimo`, `alturaBoton`, `alturaChip`, `nav`, `camara`) van bajo `:root`. Crear también `src/tema/base.css`: `body` con `background: var(--bg)`, `color: var(--ink)` y la sans del tema; rellenos con `env(safe-area-inset-*)`; tamaños de la tipografía (hero 72 · título 42/1 · detalle 32 · hoja 28 · tarjeta 22 · cuerpo 15/1.5 · secundario 14 · meta 13 · etiqueta 12 · nav 11 · tag 10); `@media (prefers-reduced-motion: reduce)` que deja solo fundidos.
- [X] T010 [P] Crear `src/tema/fuentes.ts`, que importa solo los CSS del subconjunto `latin` de los pesos de research R-13: `@fontsource/cormorant-garamond` 500 y 500 cursiva, `@fontsource/jost` 400 y 500, `@fontsource/bodoni-moda` 400 y 400 cursiva, `@fontsource/archivo` 400 y 500. Verificar en el build que los `.woff2` quedan en `dist/assets/` y entran en el precache.
- [X] T011 [P] Copiar las 8 siluetas de `Tres direcciones visuales Clóset/design_handoff_percha/siluetas/*.svg` a `public/siluetas/` sin cambios (`falda-recta`, `falda-acampanada`, `blusa`, `camisa`, `vestido-recto`, `vestido-vuelo`, `pantalon-recto`, `pantalon-ancho`).
- [X] T012 [P] Crear `pwa-assets.config.ts` para `@vite-pwa/assets-generator` (íconos 180, 192, 512 y maskable, y `apple-touch-startup-image` para SE, 6.1" y Pro Max, en versión clara y oscura con `media="(prefers-color-scheme: dark)"`). Fuente: el ícono del diseño si existe en `Percha Pantallas v2.dc.html` o `Percha Sistema.dc.html`. Si no existe, `public/icono-fuente.svg` provisional con el wordmark "Percha" en Cormorant Garamond sobre `#f4ebe6`, anotado en `desviaciones-diseno.md`.
- [X] T013 [P] Crear `specs/001-percha-closet-taller/desviaciones-diseno.md` con una tabla (pantalla o estado · qué se hizo · por qué · revisar en Design) y las entradas iniciales de la sección *Pendientes para Claude Design* de `plan.md`.
- [X] T014 Crear `scripts/dev-tunel.mjs` (script `npm run dev:tunel`), que arranca `vite` y `cloudflared tunnel --url http://localhost:5173` e imprime la URL HTTPS. Crear `wrangler.jsonc` con `"name": "percha"`, `compatibility_date` y `"assets": { "directory": "./dist" }` (sin `not_found_handling: "single-page-application"`: con ese modo, un trozo del modelo que falte respondería `index.html` con 200 y el service worker lo guardaría en la caché del modelo; la pila de navegación de T028 cambia solo el `state` del historial, no la ruta), y configurar `deploy:preview` como `npm run build && wrangler deploy --name percha-preview` (un Worker aparte para previsualizar; research R-8). Documentar en `spike/recorte/README.md` o en un `README.md` de la raíz que el dueño crea el proyecto `percha` con `npx wrangler login` y su cuenta.
- [X] T015 Actualizar `CLAUDE.md` con los comandos reales (`npm run dev`, `dev:tunel`, `test`, `test:navegador`, `test:e2e`, `typecheck`, `build`, `deploy:preview`, `modelo:descargar`, `tokens`) y un resumen de la arquitectura de `plan.md`. Quitar la frase "no application code".

---

## Phase 3: Foundational (prerrequisitos que bloquean las historias)

**Purpose**: base de datos versionada, utilidades de imagen, tema, navegación, componentes base del
diseño y panel de diagnóstico.

**⚠️ CRITICAL**: ninguna historia empieza antes de terminar esta fase.

- [X] T016 Crear `src/datos/tipos.ts` con los tipos TypeScript de todas las entidades de `data-model.md`, copiando sus reglas como comentarios: `Prenda` (`categoria: 'top' | 'bottom' | 'vestido' | 'calzado' | 'abrigo' | 'accesorio'`; `origen: 'comprada' | 'hecha'`; `estadoTaller?: 'planeada' | 'en_proceso' | 'terminada'`; `enCloset: 0 | 1`, "`1` si `estadoTaller` es nulo o `'terminada'`; `0` si está planeada o en proceso"), `ImagenesPrenda`, `Anclaje`, `EntradaHistorial`, `DatosCostura`, `ParametrosPlaneada`, `Imagen` (`tipo: 'original' | 'recorte' | 'miniatura' | 'tela' | 'proceso' | 'maniqui' | 'maniquiMiniatura' | 'outfitMiniatura'`), `Silueta` (`origen: 'incluida' | 'importada'`), `Maniqui`, `Outfit`, `Capa` (`zona: 'arriba' | 'abajo' | 'vestido' | 'calzado' | 'abrigo' | 'accesorios'`), `Transformacion` `{ cx, cy, alto, rotacion }`, `Calendario`, `UsosDia`, `Medidas`, `Ajustes` (`apariencia: 'sistema' | 'claro' | 'oscuro'`, `onboarding: 'pendiente' | 'completo'`) y `RespaldoAuto` (`motivo: 'antes_de_importar'`). Agregar las constantes `ZONA_DE_CATEGORIA` (top→arriba, bottom→abajo, vestido→vestido, calzado→calzado, abrigo→abrigo, accesorio→accesorios) y `ESQUEMA_ACTUAL = 1`. (Hecho: también `CATEGORIAS`, `ZONAS`, `SILUETAS_INCLUIDAS` con `idSiluetaIncluida`/`esSiluetaIncluida` para que T023 y T135 usen los mismos IDs, `ID_AJUSTES` e `ID_MEDIDAS`.)
- [X] T017 Crear `src/datos/migraciones/v1.ts` (exporta `stores` del esquema v1 y `migrar` como identidad) y `src/datos/migraciones/index.ts` con `MIGRACIONES` (un arreglo ordenado por versión) y `migrarDatos(datos, desde, hasta)`, que aplica en cadena las funciones **puras** `migrar` de `desde + 1` a `hasta` y lanza un error si `desde > ESQUEMA_ACTUAL` (data-model.md, *Migraciones*: "Una versión con migración publicada **no se modifica**"). (Hecho: `migrarDatos` también rechaza versiones inválidas o hacia atrás; el tipo `Registros` está en `migraciones/tipos.ts`.)
- [X] T018 Crear `src/datos/db.ts`: una clase Dexie `PerchaDB` con nombre `percha`, que registra cada versión de `MIGRACIONES` con `db.version(n).stores(stores).upgrade(tx => …)` aplicando la misma `migrar`. El esquema v1 es exactamente: `prendas: 'id, categoria, enCloset, estadoTaller, origen, *etiquetas, ultimoUso, creada'`, `imagenes: 'id, tipo'`, `siluetas: 'id, origen'`, `maniquies: 'id, principal'`, `outfits: 'id, maniquiId, *etiquetas, *prendaIds, actualizado'`, `calendario: 'fecha, outfitId'`, `usosDia: 'fecha'`, `medidas: 'id'`, `ajustes: 'id'`, `respaldosAuto: 'id, creado'`. Exportar una instancia única `db`. (Hecho: el constructor acepta otro nombre y otra lista de migraciones solo para probar el `upgrade`; el `upgrade` reescribe solo las tablas cuyo arreglo devolvió cambiado `migrar`, para no reescribir las imágenes.)
- [X] T019 [P] Crear `tests/integracion/db.test.ts` (la base abre en v1 con las 10 tablas e índices; una transacción que falla a la mitad no deja escrituras) y `tests/unidad/migraciones.test.ts` (`migrarDatos` con `desde = hasta` devuelve lo mismo; con `desde > ESQUEMA_ACTUAL` lanza un error; y un mecanismo de fixtures en `tests/fixtures/esquemas/v1/` listo para que cada versión futura agregue su fixture de N−1 → N). (Hecho: además, una v2 de prueba verifica que el `upgrade` aplica `migrar` y que si falla la base queda en la v1 con sus datos; los pares N−1 → N se recorren solos desde `tests/fixtures/esquemas/index.ts`. `tests/fixtures/comparar.ts` compara los Blob por bytes.)
- [X] T020 [P] Crear `src/datos/repos/imagenes.ts` (`guardar(blob, tipo, ancho, alto)` → id, con `bytes` y `creada`; `obtenerBlob(id)`; `urlDe(id)`, que devuelve un object URL con conteo de referencias y lo libera con `URL.revokeObjectURL`; `borrar(ids)` dentro de la transacción de quien llama; `bytesTotales()`) y `tests/integracion/imagenes.test.ts`. (Hecho: `borrar` lanza un error si no hay una transacción en curso; hook `useUrlImagen` en `src/datos/repos/useUrlImagen.ts`.)
- [X] T021 [P] Crear `src/datos/repos/ajustes.ts` (registro único `id = 'ajustes'` con valores por defecto `apariencia: 'sistema'`, `onboarding: 'pendiente'`, `chipArmadorVisto: 0`; `obtener()`, `actualizar(parcial)`; al cambiar `apariencia` la copia a `localStorage['percha.apariencia']`) y `tests/integracion/ajustes.test.ts`. (Hecho: también `useAjustes()` y `espejarApariencia`.)
- [X] T022 [P] Crear `src/datos/almacenamiento.ts` (`pedirPersistencia()` llama a `navigator.storage.persist()` si existe y devuelve `persisted()`; `estimar()` devuelve `{ usado, cuota }` o `null`; `hayEspacioPara(bytes)` con un margen del 10 %; nada falla si la API no existe) y `tests/unidad/almacenamiento.test.ts` con `navigator.storage` simulado. (Hecho: también `estaPersistido()`, que no pide persistencia, para el panel.)
- [X] T023 [P] Crear `src/datos/integridad.ts` (`verificar()` cuenta las imágenes sin referencia y las referencias rotas de prendas, outfits, maniquíes y siluetas, **sin borrar nada**; las reporta al panel de diagnóstico) y `tests/integracion/integridad.test.ts`. (Hecho: devuelve `{ imagenes, huerfanas, rotas }` y lo manda al panel con `fijarIntegridad`.)
- [X] T024 [P] Crear `src/imagen/redimensionar.ts` (`redimensionar(blob, { ladoMaximo, tipo: 'image/jpeg' | 'image/png', calidad })` con `createImageBitmap(blob, { imageOrientation: 'from-image' })` y un canvas; nunca agranda; JPEG con calidad 0,85 por defecto) y `tests/navegador/redimensionar.test.ts` (foto de 4032 × 3024 → 1500 de lado mayor; respeta la orientación EXIF con un fixture rotado en `tests/fixtures/imagenes/`). (Hecho: `src/imagen/lienzo.ts` usa `HTMLCanvasElement` en la página y `OffscreenCanvas` en un worker; el fixture rotado es `giradaExif6Jpeg`.)
- [X] T025 [P] Crear `src/imagen/contorno.ts` (`rectOpaco(imageData, umbralAlfa = 128)` → `{ x, y, ancho, alto }` o `null`; `recortarAlContorno(canvas)` → canvas nuevo; `cobertura(imageData)` → fracción de píxeles opacos) y `tests/navegador/contorno.test.ts`. (Hecho: `recortarAlContorno` devuelve el canvas y el rectángulo, o `null`.)
- [X] T026 [P] Crear `src/imagen/color-promedio.ts` (`colorPromedio(imageData)` → `#rrggbb`, promedio de los píxeles con "alfa > 0,5", data-model.md *Prenda*) y `tests/unidad/color-promedio.test.ts` con `ImageData` sintéticos (prenda negra, blanca y de dos colores). (Hecho: devuelve `null` si no hay píxeles con alfa > 0,5.)
- [X] T027 [P] Crear `src/tema/apariencia.ts` (`resolverTema(preferencia, prefiereOscuro)`, `aplicarTema(preferencia)`, que fija `data-theme` y el `<meta name="theme-color">`, y `escucharSistema()` con `matchMedia(...).addEventListener('change')` cuando la preferencia es `sistema`) y `tests/unidad/apariencia.test.ts`. La prueba también extrae el script inline de `index.html`, lo evalúa en un DOM simulado con cada combinación de preferencia y `prefers-color-scheme`, y comprueba que resuelve igual que `resolverTema` (FR-062, sin parpadeo). (Hecho: también `sincronizarApariencia()` al arrancar y `cambiarApariencia()` para Ajustes.)
- [X] T028 [P] Crear `src/navegacion/pila.ts` (research R-3): una pila tipada de `{ pantalla, params }` y hojas inferiores, con `ir`, `volver`, `reemplazar`, `abrirHoja` y `cerrarHoja`, sincronizada con `history.pushState`/`popstate` y que restaura la pantalla al volver de segundo plano. Un hook `useNavegacion()`. Agregar `tests/unidad/pila.test.ts`. (Hecho: tipos en `src/navegacion/rutas.ts` y hook en `src/navegacion/useNavegacion.tsx`; además `cambiarPestana` y `reiniciar`. Un `volver` espera su `popstate` y las navegaciones pedidas mientras tanto se aplican después, en orden.)
- [X] T029 [P] Crear `src/componentes/BotonPrincipal.tsx` y `src/componentes/BotonSecundario.tsx`: 52 px de alto, radio `var(--radius-button)`, 15 px (el principal en peso 500), fondo `--accent`/`--on-accent` o `--chip`, texto con `--label-case` y `--label-tracking`, área táctil ≥ 44 × 44. (Hecho: también `BotonTexto`, la variante "texto" de *Percha Sistema*.)
- [X] T030 [P] Crear `src/componentes/HojaInferior.tsx`: a 8 px de los lados y del borde inferior, esquinas `--radius-lg` arriba y 40 px abajo, tirador de 36 × 5, scrim `--scrim` detrás; sube en 280 ms ease-out y baja en 200 ms; se cierra arrastrando hacia abajo o tocando el scrim; atrapa el foco y respeta `env(safe-area-inset-bottom)`. (Hecho: se arrastra desde cualquier parte salvo el contenido con `data-hoja-desplazable`; `useHoja().cerrar(despues)` cierra con la animación y después navega.)
- [X] T031 [P] Crear `src/componentes/ChipFiltro.tsx`: 34 a 40 px de alto, radio `--radius-chip`, `--chip-font-size`, activo con `--accent`, inactivo con `--chip`, en minúsculas (claro) o MAYÚSCULAS con tracking 0.1em (oscuro) según los tokens. (Hecho: también la variante `agregar` de *Percha Sistema*.)
- [X] T032 [P] Crear `src/componentes/TarjetaPrenda.tsx` con las variantes `normal`, `hecha` y `planeada` del README de diseño: fondo `surface` y tile cuadrado con `--tile-bg`; PNG con `filter: var(--cutout-filter)`; nombre y "Usada N×"; tag "hecho por mí" con fondo `surface`, borde 1 px **punteado** `--stitch`, radio 3 px y texto de 10 px; tag "planeada" con fondo `ink` y texto `bg`. Imagen con `loading="lazy"` y `decoding="async"`. (Hecho: recibe `miniaturaId` y usa `useUrlImagen`.)
- [X] T033 [P] Crear `src/componentes/BarraInferior.tsx`: Hoy · Clóset · (+) · Taller · Outfits; 68 px de alto, a 16 px de los lados y a 26 px del borde inferior más el área segura; radio `--radius-nav`; colores `--nav`, `--nav-muted` y `--nav-ink`; botón "+" circular de 52 px. (Hecho: a 26 px del borde de la pantalla, como el diseño, que ya está dibujado sobre un iPhone con indicador de inicio; sumar el área segura la dejaría a 60 px. Las pantallas con pestañas dejan `--espacio-barra-inferior` al final.)
- [X] T034 Crear `src/main.tsx`, `src/App.tsx` y `src/pwa/registro.ts`. `main.tsx` importa `tokens.css`, `base.css` y `fuentes.ts`, abre `db`, llama a `pedirPersistencia()`, `verificar()` y `escucharSistema()`, y monta `App`. `App.tsx` muestra la pantalla de la cima de la pila con `BarraInferior` en las pestañas, y registra un componente de pantalla vacío por cada pantalla del plan (*Project Structure*), con su `data-pantalla`, para que las historias los completen. `registro.ts` usa `useRegisterSW` de `virtual:pwa-register/react` y expone `hayVersionNueva` y `actualizar()`, sin recargar sola nunca. (Hecho: todas las pantallas de la pila quedan montadas y ocultas con su scroll; las hojas se registran en `rutas.ts` y `App.tsx` cuando su historia las construye. Si la base no abre, se muestra `ErrorBase`. Ajustes ya tiene la versión con los 5 toques del diagnóstico.)
- [X] T035 Crear `src/pantallas/Menu.tsx` (01c): una `HojaInferior` con filas de 64 px y subtítulo para "Mis maniquíes", "Mis medidas" y "Ajustes y respaldo", que navegan a sus pantallas. (Hecho: subtítulos con datos reales; los estados sin datos están en `desviaciones-diseno.md`.)
- [X] T036 [P] Crear `src/diagnostico/registro.ts` y `src/diagnostico/PanelDiagnostico.tsx` (research R-14). `registro.ts` lleva un búfer circular de los últimos 50 eventos y errores (`window.onerror`, `unhandledrejection`), tiempos de recorte y un contador de solicitudes de red con `PerformanceObserver({ type: 'resource' })` en la página y en los workers (por `postMessage`), excluyendo `blob:` y `data:`. El panel muestra eso más `estimar()`, `persisted()`, el estado del service worker, el `id` del recortador y del renderer, y los conteos de `verificar()`. (Hecho: el contador solo cuenta lo que salió a la red, con `transferSize`, y aparte lo de otros orígenes; `src/diagnostico/en-worker.ts` para los workers.)
- [X] T037 [P] Crear `tests/fixtures/datos.ts` (constructores de cada entidad con imágenes PNG y JPEG pequeñas reales, y un conjunto completo con Taller, siluetas importadas, medidas, calendario y usos) y `tests/fixtures/recortador-falso.ts` (implementa `Recortador` de `contracts/recortador.ts`: devuelve una máscara elíptica fija, simula la descarga con progreso y permite forzar un error o una cobertura vacía). (Hecho: imágenes reales generadas con `tests/fixtures/imagenes/generar.mjs`; el recortador falso importa los tipos del contrato hasta que exista `src/recorte/recortador.ts` (T062).)
- [ ] T038 Desplegar con `npm run deploy:preview` e instalar en la pantalla de inicio del iPhone: abre en pantalla completa; el tema claro y el oscuro abren sin parpadeo (cambiando el modo del iPhone); las cuatro fuentes se ven en modo avión; la barra inferior respeta el área segura. Anotar el resultado en `quickstart.md`. (Publicada el 2026-10-26 en https://percha-preview.percha-spike-recorte.workers.dev y verificada en el escritorio; falta la prueba en el iPhone con el dueño.)

**Checkpoint**: base lista; las historias pueden empezar.

---

## Phase 4: User Story 1 - Respaldo y datos seguros (Priority: P1) 🎯 MVP

**Goal**: exportar todo a un ZIP e importarlo con validación previa, reemplazo seguro y respaldo
automático, más el aviso a los 14 días.

**Independent Test**: crear datos de prueba, exportar, borrar la app, reinstalar, importar y
comparar que todo quedó idéntico (spec US1).

### Tests for User Story 1 ⚠️ (escribir primero; deben fallar)

- [X] T039 [P] [US1] Crear `tests/unidad/crc32.test.ts` con vectores conocidos (`"123456789"` → `cbf43926`) y un blob leído por trozos que da lo mismo que leído entero.
- [X] T040 [P] [US1] Crear `tests/unidad/zip.test.ts`: el escritor produce entradas STORE con CRC-32 y nombres UTF-8 (bit 11); `manifest.json` es la primera entrada; el lector ubica el directorio central y devuelve `slice` por entrada; un ZIP re-comprimido con deflate (generado en la prueba con `CompressionStream('deflate-raw')`) se lee igual; los encabezados ZIP64 se activan al pasar 65 535 entradas o 4 GB (verificado con tamaños simulados, sin escribir 4 GB).
- [X] T041 [P] [US1] Crear `tests/integracion/respaldo-ida-vuelta.test.ts`: el conjunto completo de `tests/fixtures/datos.ts` → `exportar` → base vacía → `importar` → igualdad profunda de los registros de las 9 tablas exportadas y de los bytes de cada imagen (SC-001). `respaldosAuto` no se exporta y las siluetas incluidas no van en el archivo.
- [X] T042 [P] [US1] Crear `tests/integracion/respaldo-rechazos.test.ts`: un caso por cada fila de la tabla de rechazo de `contracts/respaldo.md` (no es ZIP, falta el manifest, `app ≠ "percha"`, `formato` mayor, `esquema` mayor, JSON inválido, imagen faltante, tamaño o CRC distintos, referencia rota). Cada uno comprueba el mensaje exacto y que la base no cambió.
- [X] T043 [P] [US1] Crear `tests/integracion/respaldo-reemplazo.test.ts`: con datos existentes, importar primero crea un `RespaldoAuto` restaurable ("Se guarda solo el más reciente") y luego reemplaza todo; una falla simulada en la escritura deja intactos los datos anteriores y el respaldo automático; con `estimar()` sin espacio, se detiene antes de crear el respaldo automático y no cambia nada; `ajustes.ultimoRespaldo` se fija solo si la entrega del archivo se completa.
- [X] T044 [P] [US1] Crear `tests/integracion/respaldo-migracion.test.ts`: un respaldo cuyo `esquema` es anterior pasa por `migrarDatos` antes de escribir (con una migración de prueba registrada solo en la prueba), y uno con `esquema` mayor se rechaza con "Este respaldo es de una versión más nueva de Percha. Actualiza la app y vuelve a intentarlo."
- [X] T045 [P] [US1] Crear `tests/unidad/recordatorio-respaldo.test.ts`: `necesitaRecordatorio(ultimoRespaldo, hayPrendas, hoy)` es verdadero si pasaron **más de 14 días**, o si nunca se respaldó y hay al menos una prenda; es falso a los 14 días exactos y con el clóset vacío.

### Implementation for User Story 1

- [X] T046 [P] [US1] Crear `src/respaldo/crc32.ts` (tabla de 256 entradas; `crc32(bytes, previo?)` y `crc32DeBlob(blob)` leyendo con `blob.stream()` por trozos).
- [X] T047 [US1] Crear `src/respaldo/zip-escritor.ts` (research R-10): `escribirZip(entradas: { nombre, datos: Blob | Uint8Array, crc32, bytes }[])` → `Blob` armado como `new Blob([encabezadoLocal, datos, …, directorioCentral, fin])` **sin copiar los `Blob`**, con método STORE, bit 11 y ZIP64 cuando haga falta.
- [X] T048 [US1] Crear `src/respaldo/zip-lector.ts`: `leerZip(archivo: Blob)` lee el registro de fin (y ZIP64) y el directorio central, y devuelve las entradas con `obtener()`, que da `archivo.slice(inicio, fin)` para STORE y un `Blob` descomprimido con `DecompressionStream('deflate-raw')` para el método 8. Cualquier otro método o una estructura dañada lanza `ErrorRespaldo('danado')`.
- [X] T049 [P] [US1] Crear `src/respaldo/validar.ts`: validadores escritos a mano (sin librerías) para `manifest.json` y `datos.json` según `contracts/respaldo.md` y `data-model.md` (tipos, enums, IDs referenciados, imágenes del manifest presentes, con `bytes` y `crc32` iguales). Devuelve `{ ok: true, datos }` o `{ ok: false, motivo }`, con los mensajes exactos del contrato.
- [X] T050 [P] [US1] Crear `src/datos/repos/respaldos-auto.ts` (`guardar(blob)` borra el anterior en la misma transacción, porque "Se guarda solo el más reciente"; `obtenerUltimo()`; `borrar()`).
- [X] T051 [US1] Crear `src/respaldo/exportar.ts` siguiendo *Exportar* de `contracts/respaldo.md`: lee todo en una transacción de solo lectura; arma `manifest.json` (`app: "percha"`, `formato: 1`, `esquema: ESQUEMA_ACTUAL`, `creado`, `versionApp`, `conteos`, `imagenes[]`) y `datos.json`; genera `Percha-respaldo-AAAA-MM-DD.zip`; lo entrega con `navigator.share({ files })` si `navigator.canShare({ files })` es verdadero, o si no con `<a download>`; fija `ultimoRespaldo` solo si la entrega se completa. También exporta `generarRespaldoBlob()` para el respaldo automático.
- [X] T052 [US1] Crear `src/respaldo/importar.ts` siguiendo *Importar* de `contracts/respaldo.md`: (1) `leerZip` y `validar` sin escribir nada; (2) devuelve un resumen para la confirmación ("Se reemplazará todo lo que hay en Percha por el contenido del respaldo del [fecha]. Antes guardaremos una copia de lo actual en el teléfono."); (3) al confirmar, verifica el espacio con `hayEspacioPara`, guarda el `RespaldoAuto`, migra con `migrarDatos` y escribe todo en **una** transacción sobre todas las tablas; (4) fija `ultimoRespaldo` a la fecha del archivo y vuelve a copiar `apariencia` a `localStorage` y aplicarla. Incluye `restaurarRespaldoAuto()`, que reutiliza el mismo camino.
- [X] T053 [P] [US1] Crear `src/respaldo/recordatorio.ts` (`necesitaRecordatorio`) y `src/componentes/AvisoRespaldo.tsx`: aviso suave con la acción "Respaldar", que llama a `exportar`, con el copy y el estilo de 01b.
- [X] T054 [US1] Construir `src/pantallas/Ajustes.tsx` (09) con: Exportar respaldo; Importar respaldo (`<input type="file" accept=".zip,application/zip">`, confirmación en `HojaInferior` y mensajes de rechazo); fecha del último respaldo; "Restaurar el respaldo automático del [fecha]" y "Exportarlo" cuando exista; espacio usado (FR-006) con `estimar()` y `bytesTotales()`; "Almacenamiento protegido: sí/no"; el aviso "Hay una versión nueva" de `registro.ts`; y la versión de la app, que abre `PanelDiagnostico` al tocarla 5 veces. Los estados de error y la restauración no están diseñados: anotarlos en `desviaciones-diseno.md`.
- [X] T055 [US1] Crear la primera versión de `src/pantallas/Hoy.tsx`: título, botón ⋯ que abre `Menu` y `AvisoRespaldo` cuando `necesitaRecordatorio` es verdadero (FR-005). US6 la completa.
- [ ] T056 [US1] Validar en el iPhone los escenarios 1, 1b y 1c de `quickstart.md`: exportar a Archivos e iCloud desde la hoja de compartir (anotar si `canShare` aceptó el ZIP o se usó la descarga), borrar la app, reinstalar, importar y comparar. Anotar el tamaño del archivo y el tiempo. Incluye A14.29 de `docs/pruebas-intensivas.md` (importar, cerrar la app del todo, abrir y exportar), que confirma T167 en el iPhone.
- [X] T167 [US1] (Agregada el 2026-10-30, hallazgo de las pruebas intensivas.) Corregir `leerRespaldo` en `src/respaldo/importar.ts`: guardar cada imagen como un `Blob` nuevo con sus bytes verificados por CRC-32, nunca como el `slice` del archivo, porque WebKit devuelve el archivo entero detrás de un `slice` guardado en IndexedDB después de recargar (research R-14). Actualizar `contracts/respaldo.md` y research R-10.
- [X] T168 [P] [US1] (Agregada el 2026-10-30.) Automatizar la Parte A de `docs/pruebas-intensivas.md` en `tests/e2e/` (Playwright WebKit con los tres perfiles de iPhone): `apoyo.ts` abre un perfil persistente por prueba y simula la hoja de compartir de iOS; `archivos.ts` arma la foto, el PDF, el ZIP ajeno y los respaldos recomprimidos; `a-navegacion`, `a-respaldo`, `a14-respaldos-de-prueba` y `a-sin-conexion-y-robustez`, más la regresión de T167. Tipos en `tsconfig.e2e.json` (Node y DOM). Quitar la segunda `<meta name="theme-color">` que inyectaba `vite-plugin-pwa` (`injectThemeColor: false`, T008) y fijar el puerto de Vitest en modo navegador (4175), que en Windows podía caer en un rango reservado.
- [X] T169 [P] (Agregada el 2026-10-30.) Pruebas contra la app publicada y de bugs visuales: `scripts/probar-despliegue.ts` (`npm run test:desplegada`) despliega en `percha-preview`, espera la versión nueva, corre todas las e2e con `PERCHA_URL` y escribe `docs/reportes/pruebas-desplegada.md` para pasarle a otra sesión. `tests/e2e/despliegue.spec.ts` (headers, precache, manifest, ícono sin transparencia, splash por tamaño y tema, fuentes, 404) y `tests/e2e/visual.spec.ts` con los detectores de `tests/e2e/visual/revisar.ts` y capturas de referencia por estado, tema y perfil, más 320 px y horizontal.
- [X] T170 (Agregada el 2026-10-30, hallazgos visuales de T169.) Cargar Jost y Archivo 300 para el "+" de la barra inferior (`font-weight:300` en el diseño; se dibujaba en 400) y separar las filas del Menú (01c) con los 14 px de gap que tienen en el diseño.
- [X] T171 [US1] (Agregada el 2026-10-30, hallazgo de la revisión del repositorio.) Descartar el respaldo armado que espera el segundo toque ("Guardar respaldo" en Ajustes, "Guardarlo" en el aviso de Hoy) cuando cambian los datos: si mientras tanto se importaba otro respaldo, guardarlo entregaba el archivo viejo y fijaba `ultimoRespaldo = ahora` sobre datos que no estaban en él (FR-002, FR-005). `useExportar` escucha `Dexie.on.storagemutated` en la fase "listo" (todo menos `respaldosAuto`); en Ajustes, "Revisando…" e "Importando…" se muestran antes que "Tu respaldo está listo" y "Guardar respaldo" se deshabilita mientras tanto. El Menú (01c) muestra el año del último respaldo si no es el actual, como Ajustes. Pruebas: `tests/integracion/respaldo-archivo-listo.test.ts` y A7.13 y A10.7 en `tests/e2e/a-respaldo.spec.ts`.
- [X] T173 (Agregada el 2026-10-30, hallazgo de A12.10 contra la app publicada.) Que tocar la zona oscura de una `HojaInferior` no le quite el foco a la hoja: un toque que empezaba en el scrim y terminaba en la hoja (por ejemplo, mientras sube) no la cerraba, porque el click va al contenedor de los dos, pero el `mousedown` sí movía el foco fuera, y entonces Escape y el ciclo de Tab dejaban de funcionar. El scrim cancela su `mousedown` (el click sigue cerrando). Prueba A5.9 en `tests/e2e/a-navegacion.spec.ts`; A12.10 ya no se queda pulsando Escape para siempre si una hoja no se cierra.
- [X] T174 (Agregada el 2026-10-30, falla de A1.3 contra la app publicada.) Corregir la e2e "A1.3/A1.4/A2.4 el tema … ya está antes del primer pintado": medía el fondo en `DOMContentLoaded`, que en WebKit puede llegar antes que el CSS cuando el JS llega primero. Ahora retrasa siempre el CSS 1 s y mide en el primer `requestAnimationFrame`, que WebKit no corre hasta tener el CSS del `<head>` (research R-14). La app no cambia: no había parpadeo.
- [ ] T172 (Agregada el 2026-10-30, `npm audit` en la revisión del repositorio.) Con el dueño, subir `wrangler` de 4.152.0 a 4.156.0 o posterior (solo desarrollo): la 4.152.0 trae `miniflare` con `undici` 7.x, que tiene avisos altos (por ejemplo GHSA-55wc-3pg8-jfw6, DoS en el interceptor de descompresión). Verificar la versión con su fuente en `research.md` (*Resumen de dependencias* y R-8) y que `npm run deploy:preview` y `npm run test:desplegada` sigan funcionando. El resto de `npm audit` no llega a la app publicada; anotarlo en research: `zod` 3.25.76 dentro de `@imgly/background-removal` 1.7.0 (GHSA-mrhx-c7xc-m3w5) solo valida la configuración que arma Percha, nunca datos de afuera (R-1), y `deepmerge` → `workbox-build` corre solo al compilar (R-7).

**Checkpoint**: US1 funciona sola; los datos ya se pueden respaldar.

---

## Phase 5: User Story 2 - Agregar una prenda con recorte automático (Priority: P1)

**Goal**: foto o galería → recorte en el teléfono → revisar con Pincel y Borrador → datos →
guardar, también sin conexión.

**Independent Test**: agregar una prenda desde la cámara y otra desde la galería, sin conexión
(después de la primera carga), y verlas guardadas en el Clóset.

### Tests for User Story 2 ⚠️

- [ ] T057 [P] [US2] Crear `tests/unidad/mascara.test.ts`: los trazos del Pincel y el Borrador se guardan como listas de puntos con tamaño y modo; "Deshacer" quita el último trazo y redibujar da la misma máscara; el tamaño del trazo es proporcional a la resolución de la máscara, no a la pantalla.
- [ ] T058 [P] [US2] Crear `tests/navegador/componer-recorte.test.ts`: `componerRecorte(original, mascara)` conserva la resolución de la original dentro del contorno (sin reescalar la máscara con pérdida); el recorte queda recortado al contorno opaco y con "≤ 1200 px lado mayor"; la miniatura con "≤ 360 px lado mayor"; `colorPromedio` sale de los píxeles visibles; con el Pincel se recuperan los píxeles reales de la foto.
- [ ] T059 [P] [US2] Crear `tests/integracion/prendas-crear.test.ts`: `crearPrenda` guarda las imágenes `original`, `recorte` y `miniatura` y la `Prenda` (`usos: 0`, `enCloset: 1`, `origen: 'comprada'`, `historialImagenes` con una entrada `{ tipo: 'foto' }`) en **una** transacción; un error simulado (por ejemplo `QuotaExceededError`) no deja imágenes ni prenda (Edge Cases: "nunca deja datos a medio guardar").
- [ ] T060 [P] [US2] Crear `tests/unidad/sugerir.test.ts`: `sugerirCategoria({ ancho, alto }, ultimaCategoria)` (proporción muy horizontal → calzado o accesorio, muy vertical → vestido o bottom, si no la última elegida o `top`) y que el color sugerido es el promedio. Crear también `tests/unidad/asegurar-modelo.test.ts` (research R-7, constitución III), con el recortador falso, la Cache API y `navigator.onLine` simulados: en el primer arranque con conexión, `asegurarModelo()` llama a `preparar()`; si el modelo ya está completo en la caché, no descarga nada; si la descarga se corta, el siguiente arranque o el evento `online` la reintentan; sin conexión y sin modelo, el estado queda `sin_preparar` y no lanza errores; nunca hay dos descargas al mismo tiempo.

### Implementation for User Story 2

- [ ] T061 [P] [US2] Crear `scripts/descargar-modelo.ts` (script `npm run modelo:descargar`), ⏳ T002: descarga de `https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/` solo los recursos del modelo y del WASM elegidos en T002 (provisional: `models/isnet_quint8`, `ort-wasm-simd-threaded.wasm` y `.mjs`, más `resources.json`) a `public/modelos/imgly/1.7.0/`, y verifica el tamaño de cada trozo contra `resources.json`. Es la única descarga de terceros y ocurre en el build. Agregar también `scripts/verificar-modelo.mjs`, que corre al final de `build` y hace fallar `build`, `deploy:preview` y el despliegue de producción si `dist/modelos/imgly/1.7.0/` no tiene todos los trozos de `resources.json`: Cloudflare manda los 404 de `/modelos/*` con `immutable` de un año y el iPhone los guardaría en su caché HTTP (research R-8, hallazgo de T038).
- [ ] T062 [P] [US2] Crear `src/recorte/recortador.ts` con los tipos de `specs/001-percha-closet-taller/contracts/recortador.ts` (`Recortador`, `EstadoRecortador`, `OpcionesRecorte`, `ResultadoRecorte`, `ComponerRecorte`) y un proveedor React `RecortadorProvider` que permite inyectar `tests/fixtures/recortador-falso.ts` en las pruebas.
- [ ] T063 [US2] Crear `src/recorte/imgly.worker.ts` y `src/recorte/imgly-recortador.ts`, ⏳ T002: el worker usa `@imgly/background-removal` con `publicPath` `${location.origin}/modelos/imgly/1.7.0/`, el `model` y el `device` de T002, y obtiene la máscara con `segmentForeground()` (PNG blanco cuyo alfa es la máscara; imgly 1.7.0 no tiene `output.type`, ver research R-0, *Página del spike*). Si el dispositivo cambia, crea un worker nuevo, porque imgly no cambia el módulo de ONNX Runtime ya cargado. Excluye del build el `ort-wasm-simd-threaded.jsep.wasm` que Vite copia de npm y que no se usa. Expone `preparar` (con `preload` y progreso) y `recortar`: redimensiona primero a `ladoMaximo` (1500 por defecto) con `redimensionar`, mide `duracionMs`, calcula `cobertura` y cancela con `AbortSignal`. `id` = `imgly-1.7.0-<modelo>-<dispositivo>`. Los tiempos y errores van a `diagnostico/registro.ts`. Crear también `src/recorte/asegurar-modelo.ts` (research R-7: "La primera carga incluye el modelo"): `asegurarModelo(recortador)` comprueba si los recursos del modelo están completos en la caché `percha-modelo-1.7.0`; si faltan y hay conexión, lanza `preparar()` en segundo plano; reintenta en el siguiente arranque y con el evento `online`; no permite dos descargas a la vez; expone el progreso con un hook `useEstadoModelo()`; y borra las cachés `percha-modelo-*` de versiones anteriores. Llamarlo desde `src/main.tsx` en **cada arranque**, después de que el service worker esté activo (`navigator.serviceWorker.ready`).
- [ ] T064 [P] [US2] Crear `src/recorte/componer.ts` (implementa `ComponerRecorte`: dibuja la original, aplica la máscara con `globalCompositeOperation = 'destination-in'`, recorta con `recortarAlContorno`, limita a 1200 px (⏳ T002) y genera la miniatura de 360 px y el `colorPromedio`).
- [ ] T065 [P] [US2] Crear `src/recorte/mascara.ts` (un canvas de máscara en escala de grises a la resolución de la original; Borrador pinta negro y Pincel pinta blanco; tamaño ajustable; trazos como listas de puntos; `deshacer()` redibuja desde la máscara base del recortador más los trazos restantes).
- [ ] T066 [P] [US2] Crear `src/prendas/sugerir.ts` (`sugerirCategoria` y `sugerirColor`; el color es el `colorPromedio` del recorte).
- [ ] T067 [US2] Crear `src/datos/repos/prendas.ts` con `crearPrenda({ original, recorte, miniatura, datos })` en una transacción, `obtener(id)`, `listarCloset()` (las que tienen `enCloset = 1`, ordenadas por `creada` descendente) y `usePrendasCloset()` con `useLiveQuery`. Al guardar se actualiza `ajustes.ultimaCategoria`.
- [ ] T068 [P] [US2] Crear `src/camara/CamaraEnVivo.tsx` (research R-11, ⏳ T002): `getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 } } })` a pantalla completa con fondo `#0d0c0b` (`compartido.camara.bg`), una ranura para superponer la guía (marco de prenda o silueta de pose), temporizador opcional de 5 s con cuenta regresiva, disparo que captura un frame a JPEG, y liberación de las pistas al salir o al pasar a segundo plano. Si `getUserMedia` falla o se niega, cae a `<input type="file" accept="image/*" capture="environment">` y anota el motivo en `diagnostico`.
- [ ] T069 [US2] Construir `src/pantallas/AgregarPrenda/Foto.tsx` (04): "Tomar foto" con `CamaraEnVivo` y el marco guía, o "Elegir de la galería" con `<input type="file" accept="image/*">`.
- [ ] T070 [US2] Construir `src/pantallas/AgregarPrenda/Recortando.tsx` (04b): la prenda se va "revelando" con una línea de escaneo `--accent` que baja y una máscara en degradado (1,2 s en bucle), con una barra de progreso de 3 px. La primera vez (estado `sin_preparar` o `descargando`) avisa que tardará más porque está preparando el recorte (US2, escenario 2) y muestra el progreso de la descarga con `useEstadoModelo()`. Si no hay conexión y el modelo todavía no está completo, dice con claridad que hace falta conexión una sola vez para preparar el recorte, conserva la foto en memoria y ofrece reintentar cuando vuelva la conexión. Es un estado no diseñado y se anota en `desviaciones-diseno.md`. Con `prefers-reduced-motion`, solo un fundido.
- [ ] T071 [US2] Construir `src/pantallas/AgregarPrenda/Revisar.tsx` (04c): fondo a cuadros; Borrador / Pincel con deslizador de tamaño y "Deshacer"; "Otra foto" vuelve a 04 y "Se ve bien" continúa. Si `cobertura < 0,02`, muestra "Otra foto" o el Pincel (Edge Cases). Los gestos de pintar ignoran los 20 px del borde.
- [ ] T072 [US2] Construir `src/pantallas/AgregarPrenda/Datos.tsx` (04d): categoría (top, bottom, vestido, calzado, abrigo, accesorio) y color preseleccionados con las sugerencias; nombre opcional; temporada, ocasión y etiquetas opcionales; "Guardar en el clóset".
- [ ] T073 [US2] Crear `src/pantallas/AgregarPrenda/index.tsx`, que orquesta 04 → 04b → 04c → 04d en memoria. Cancela el recorte con `AbortSignal` en `visibilitychange` (oculta) o al tocar "Otra foto", y no guarda nada hasta "Guardar en el clóset" (Edge Cases: "al volver no queda una prenda incompleta guardada"). Ante `QuotaExceededError` muestra cuánto espacio se usa y sugiere respaldar (estado no diseñado, anotar en `desviaciones-diseno.md`). Conectar el "+" de `BarraInferior`. Crear una primera versión de `src/pantallas/Closet.tsx` (02) con la grilla de 2 columnas de `TarjetaPrenda` a la que se vuelve al guardar (US3 la completa).
- [ ] T074 [US2] Validar en el iPhone el escenario 2 de `quickstart.md` en modo avión después de la primera carga: cámara en vivo y galería, Pincel, Borrador y Deshacer, y el color sugerido. Anotar el tiempo de recorte del panel de diagnóstico (SC-002) y si la cámara volvió a pedir permiso.

**Checkpoint**: se pueden agregar prendas reales sin conexión.

---

## Phase 6: User Story 3 - Navegar y gestionar el Clóset (Priority: P1)

**Goal**: grilla con buscador, chips y filtros; detalle editable con usos y outfits; eliminar con
aviso; volver a recortar.

**Independent Test**: con 20 prendas cargadas, filtrar, editar una y eliminar otra que esté en
outfits.

### Tests for User Story 3 ⚠️

- [ ] T075 [P] [US3] Crear `tests/integracion/prendas-filtros.test.ts`: búsqueda por nombre y etiquetas sin distinguir mayúsculas ni tildes; filtros combinados de categoría, color, temporada, ocasión, etiquetas y "Solo hecho por mí" (`origen = 'hecha'`); las prendas con `enCloset = 0` no aparecen; el conteo de "Ver N prendas" es correcto.
- [ ] T076 [P] [US3] Crear `tests/integracion/prendas-eliminar.test.ts`: `contarOutfits(prendaId)` usa el índice `*prendaIds`; `eliminarPrenda` borra en **una** transacción la prenda, todas sus imágenes (incluidas las del historial y las fotos del proceso), sus capas en cada outfit (actualizando `prendaIds`) y la miniatura de esos outfits (`miniaturaId` sin valor, para regenerarla). El resto de cada outfit se conserva, y un outfit que queda sin capas no se borra (FR-016, Edge Cases).
- [ ] T077 [P] [US3] Crear `tests/unidad/etiquetas.test.ts`: `normalizarEtiquetas` deja las etiquetas "libres, sin repetidas, recortadas y en minúsculas para comparar" (conserva la primera forma escrita para mostrarla).

### Implementation for User Story 3

- [ ] T078 [P] [US3] Crear `src/prendas/etiquetas.ts` (`normalizarEtiquetas`, `compararSinTildes`).
- [ ] T079 [US3] Ampliar `src/datos/repos/prendas.ts` con `filtrar(criterios)`, `actualizar(id, cambios)` (valida la categoría y las etiquetas; actualiza `actualizada`), `contarOutfits(id)`, `outfitsDePrenda(id)` y `eliminarPrenda(id)` según T076.
- [ ] T080 [US3] Completar `src/pantallas/Closet.tsx` (02 y 02b): buscador, botón "Filtros N", chips de categoría con scroll horizontal, grilla de 2 columnas de `TarjetaPrenda` con imágenes diferidas, y el estado vacío 02b con "Tomar foto" / "Elegir de la galería" que abren AgregarPrenda.
- [ ] T081 [P] [US3] Construir `src/pantallas/Filtros.tsx` (02c): `HojaInferior` con color, temporada, ocasión, etiquetas, el interruptor "Solo hecho por mí" y el botón "Ver N prendas".
- [ ] T082 [US3] Construir `src/pantallas/DetallePrenda.tsx` (03): foto de 260 px, datos editables (nombre, categoría, color, temporadas, ocasiones, etiquetas), "Usada N×", última vez, lista de outfits donde aparece y "Eliminar".
- [ ] T083 [US3] Construir `src/pantallas/ConfirmarEliminar.tsx` (03b): `HojaInferior` con "Está en N outfits guardados…" cuando `contarOutfits > 0`; al confirmar llama a `eliminarPrenda` y vuelve al Clóset.
- [ ] T084 [US3] Agregar "Volver a recortar" en `src/pantallas/DetallePrenda.tsx` (FR-012a): abre `src/pantallas/AgregarPrenda/index.tsx` en modo `recortarDeNuevo` desde la imagen `original`, pasando por 04b y 04c sin 04d. Al guardar reemplaza `imagen.recorteId` y `miniaturaId`, agrega una entrada `{ tipo: 'foto' }` a `historialImagenes` y borra las miniaturas de los outfits que la usan.
- [ ] T085 [US3] Validar en el iPhone los escenarios 3 y 3b de `quickstart.md` con 20 prendas reales, incluidas una negra y una blanca en modo claro y oscuro (SC-007).

**Checkpoint**: Clóset completo; las tres historias P1 funcionan.

---

## Phase 7: User Story 4 - Maniquíes (Priority: P2)

**Goal**: fotos de cuerpo completo sin fondo, con guía de pose y temporizador; una principal.

**Independent Test**: crear dos maniquíes, marcar uno como principal y verlo en el Armador.

### Tests for User Story 4 ⚠️

- [ ] T086 [P] [US4] Crear `tests/integracion/maniquies.test.ts`: el primero queda como principal; "si hay al menos un maniquí, **exactamente uno** es principal" después de cada operación; al borrar el principal pasa a serlo "el más reciente de los que quedan"; al borrar uno usado por N outfits, esos outfits pasan al principal con sus capas intactas en una transacción; al borrar el último, quedan con `maniquiId = null`; `cuerpo` se guarda como el rectángulo opaco.

### Implementation for User Story 4

- [ ] T087 [US4] Crear `src/datos/repos/maniquies.ts` (`crearManiqui` guarda una imagen `maniqui` "PNG con alfa, ≤ 1600 px de alto" y su `maniquiMiniatura`, calcula `cuerpo` con `rectOpaco`; `marcarPrincipal`; `contarOutfits`; `eliminarManiqui` según T086; `useManiquiPrincipal()`).
- [ ] T088 [P] [US4] Crear `src/componentes/GuiaPose.tsx`: la silueta guía de pose del diseño (10b) para superponer en `CamaraEnVivo`, con el contorno en `--ink` al 60 %.
- [ ] T089 [US4] Construir `src/pantallas/NuevoManiqui.tsx`: `CamaraEnVivo` con `GuiaPose` y temporizador de 5 s (o galería) → recorte con el `Recortador` (`ladoMaximo` 1600) → revisión con Pincel y Borrador (reutiliza `Revisar.tsx`) → nombre → guardar.
- [ ] T090 [US4] Construir `src/pantallas/MisManiquies.tsx` (08): grilla de 2 columnas, tag "Principal", "+ Nuevo maniquí", "Marcar como principal" y "Eliminar" con una `HojaInferior` "Lo usan N outfits" cuando corresponda. Conectar la fila de `Menu.tsx`.
- [ ] T091 [US4] Validar en el iPhone el escenario 4 de `quickstart.md` (guía, temporizador, recorte de cuerpo completo; anotar si el permiso de cámara se repite en cada arranque).

**Checkpoint**: hay maniquíes para el Armador.

---

## Phase 8: User Story 5 - Armador de outfits (Priority: P2)

**Goal**: prendas en capas sobre el maniquí con colocación automática por zona, gestos, capas,
deshacer, mezclar y guardar.

**Independent Test**: armar un outfit de 4 prendas, ajustar cada una con gestos, deshacer, mezclar
y guardar.

### Tests for User Story 5 ⚠️ (motor del Armador, principio VIII)

- [ ] T092 [P] [US5] Crear `tests/unidad/renderer-zonas-fijas.test.ts`: `colocacionAutomatica` devuelve la tabla de `data-model.md` con `cx = 0` y `rotacion = 0` (arriba `cy` 0,32 `alto` 0,30; abajo 0,66 / 0,44; vestido 0,50 / 0,58; calzado 0,965 / 0,07; abrigo 0,38 / 0,42; accesorios 0,22 / 0,10); si la imagen trae `anclaje` lo usa tal cual; es determinista; `rangoAlto` da 0,5× a 2,5× del alto automático; `matrizEnLienzo` seguido de `lienzoACuerpo` da el punto original (tolerancia 1e-6); sin maniquí usa el cuerpo por defecto (rectángulo centrado de 90 % del alto del lienzo); el mismo outfit en un maniquí más ancho conserva las proporciones.
- [ ] T093 [P] [US5] Crear `tests/unidad/gestos.test.ts`: un dedo mueve; dos dedos escalan con el límite de `rangoAlto` y giran alrededor de su punto medio; pasar de uno a dos dedos y de vuelta no salta; un puntero que empieza a menos de 20 px de un borde del lienzo se ignora (FR-032).
- [ ] T094 [P] [US5] Crear `tests/unidad/historial-armador.test.ts` para el reducer: tocar una prenda la agrega en su zona con la colocación automática, y tocarla de nuevo la quita; otra prenda de la misma zona reemplaza a la anterior, salvo en `accesorios` (FR-031); subir y bajar capa; "Restablecer posición"; "Deshacer" de al menos 20 pasos (y como máximo 50 guardados); los movimientos continuos de un gesto cuentan como un solo paso.
- [ ] T095 [P] [US5] Crear `tests/unidad/mezclar.test.ts`: con un generador aleatorio con semilla, elige una prenda por zona (o vestido en lugar de arriba + abajo) ponderando inversamente por `usos`; las prendas de poco uso salen más seguido en 1 000 corridas; incluye prendas planeadas y en proceso.
- [ ] T096 [P] [US5] Crear `tests/navegador/miniatura-outfit.test.ts`: `renderizarMiniatura` produce un PNG de 360 × 540 con las capas en orden y la sombra aproximada del tema (sin `ctx.filter`), y es igual para la misma entrada.
- [ ] T097 [P] [US5] Crear `tests/integracion/outfits.test.ts`: `guardarOutfit` deriva `prendaIds` de `capas`; editar un outfit regenera su miniatura; `eliminarOutfit` borra su miniatura y sus días de calendario (Edge Cases: "el día queda sin asignar").

### Implementation for User Story 5

- [ ] T098 [P] [US5] Crear `src/armador/tipos.ts` con los tipos de `specs/001-percha-closet-taller/contracts/try-on-renderer.ts` (`Zona`, `Rect`, `Transformacion`, `ImagenArmable`, `Cuerpo`, `Matriz2D`, `CapaArmada`, `TryOnRenderer`, `ReajustarAlTerminar`, `EstadoGesto`, `AplicarGesto`).
- [ ] T099 [P] [US5] Crear `src/armador/reticula.ts`: el mapeo lineal de la retícula de siluetas al cuerpo, con escala uniforme, donde "el hombro caiga en 0,18 del alto del cuerpo y el tobillo en 0,96". Factor `(0,96 − 0,18) / 350` por unidad, con hombro en y = 40 y tobillo en y = 390. `anclajeDeCaja(caja)` → `{ cx, cy, alto }`. Las constantes se exportan para afinarlas en el iPhone.
- [ ] T100 [US5] Crear `src/armador/renderer-zonas-fijas.ts` (`RendererZonasFijas implements TryOnRenderer`, `id = 'zonas-fijas'`) con la tabla de colocación de `data-model.md`, `rangoAlto`, `matrizEnLienzo`, `lienzoACuerpo` y el cuerpo por defecto.
- [ ] T101 [US5] Crear `src/armador/gestos.ts` (`AplicarGesto`, matemática pura de uno y dos punteros, con el margen de 20 px).
- [ ] T102 [P] [US5] Crear `src/armador/historial.ts` (reducer del Armador con `pasado[]` de hasta 50 estados, acciones `alternarPrenda`, `transformar` (que confirma al soltar el gesto), `subirCapa`, `bajarCapa`, `restablecer`, `mezclar`, `deshacer`, `cargarOutfit`).
- [ ] T103 [P] [US5] Crear `src/armador/mezclar.ts` (selección ponderada por poco uso, con un generador aleatorio inyectable).
- [ ] T104 [US5] Crear `src/armador/miniatura.ts` (`renderizarMiniatura` en Canvas 2D con `--canvas` de fondo, el maniquí **del outfit** (`maniquiId`; si es `null`, solo las capas sobre el cuerpo por defecto) y las capas con `shadowBlur`/`shadowColor` según el tema) y `asegurarMiniatura(outfitId)`, que la regenera si falta `miniaturaId`.
- [ ] T105 [US5] Crear `src/datos/repos/outfits.ts` (`guardarOutfit`, `actualizarOutfit`, `eliminarOutfit` según T097, `useOutfits(filtroEtiqueta?)`) y `src/armador/imagenes-armables.ts`, que convierte una `Prenda` en `ImagenArmable` con `etiqueta` `'planeada'`, `'en_proceso'` o `'hecha'`, `anclaje` y `usos`.
- [ ] T106 [P] [US5] Crear `src/componentes/CarruselZona.tsx`: pestañas Arriba · Abajo · Vestido · Calzado · Abrigo · Accesorios; casillas de 76 × 84; la seleccionada con contorno 2 px `--select`; las planeadas con contorno 1,5 px punteado `--muted` y la marca "planeada"; estado de zona sin prendas (05c).
- [ ] T107 [P] [US5] Crear `src/componentes/ManijasSeleccion.tsx`: contorno 1,5 px `--select` (punteado en claro, sólido en oscuro) con 6 px de separación y 4 manijas circulares de 12 px (fondo `--bg`, borde `--select`), con una transición de 120 ms.
- [ ] T108 [US5] Crear `src/pantallas/Armador/Lienzo.tsx`: el maniquí centrado sobre `--canvas` con 16 px de margen lateral; cada capa es un `<img>` con `transform: matrix(...)` de `matrizEnLienzo` y `filter: var(--cutout-filter)`; Pointer Events con `touch-action: none`; tocar una prenda la selecciona y tocar el fondo la deselecciona; al poner una prenda, escala 0,92 → 1 y opacidad 0 → 1 en 220 ms. El estado del gesto vive en refs y solo se confirma al reducer al soltar, para mantener la fluidez.
- [ ] T109 [US5] Construir `src/pantallas/Armador/Armador.tsx` (05, 05b, 05c): `Lienzo`, `CarruselZona` con todas las prendas armables (las de `enCloset = 1` y las del Taller planeadas o en proceso), y botones Restablecer posición, Mezclar (fundido de 180 ms por zona en cascada de 40 ms), Capas ↑↓, Deshacer y Guardar. 05b: sin maniquí, invitación a tomar la foto que abre `NuevoManiqui`. 05c: outfit vacío. El chip "Vista collage · arrastra, pellizca y gira" aparece mientras `chipArmadorVisto < 3` ("se deja de mostrar en 3"). Un outfit nuevo usa el maniquí principal; uno existente se abre para editarlo sobre su propio `maniquiId` (FR-034), o con el cuerpo por defecto si es `null`.
- [ ] T110 [US5] Construir `src/pantallas/Armador/GuardarOutfit.tsx` (05d): `HojaInferior` con nombre y etiquetas opcionales; guarda con `guardarOutfit` o `actualizarOutfit` y genera la miniatura.
- [ ] T111 [US5] Validar en el iPhone el escenario 5 de `quickstart.md` con 8 capas: fluidez de mover, pellizcar y girar, que nunca se dispare el gesto de volver (SC-004), deshacer 20 pasos, mezclar y guardar. Anotar ajustes de la tabla de colocación con prendas reales.

**Checkpoint**: la pantalla estrella funciona con prendas reales.

---

## Phase 9: User Story 6 - Mis outfits, calendario y Hoy (Priority: P2)

**Goal**: galería de outfits, calendario semana y mes con asignación, y Hoy con el outfit del día o
una sugerencia, más "Lo usé hoy".

**Independent Test**: asignar un outfit a hoy, verlo en Hoy, marcar "Lo usé hoy" y comprobar el
conteo en el detalle de cada prenda.

### Tests for User Story 6 ⚠️

- [ ] T112 [P] [US6] Crear `tests/unidad/fechas.test.ts`: `hoyLocal()` en `YYYY-MM-DD` local (también cerca de la medianoche y con cambio de horario); `semanaDe(fecha)` empieza el **lunes**; `grillaMes(año, mes)` devuelve 5 **o 6** semanas desde el lunes, según el mes (por ejemplo, un mes de 31 días que empieza en sábado o domingo necesita 6).
- [ ] T113 [P] [US6] Crear `tests/integracion/calendario.test.ts`: `asignar(fecha, outfitId)` reemplaza la asignación previa ("un día tiene como máximo un outfit"); `quitar(fecha)`; borrar un outfit deja sus días sin asignar.
- [ ] T114 [P] [US6] Crear `tests/integracion/lo-use-hoy.test.ts`: `marcarUsado(outfitId, hoy)` suma 1 a `usos` y fija `ultimoUso = hoy` solo en las prendas que no estén en `usosDia[hoy].prendaIds`; tocarlo dos veces el mismo día cuenta una vez; una prenda compartida por dos outfits marcados el mismo día cuenta una vez; todo en una transacción.
- [ ] T115 [P] [US6] Crear `tests/unidad/sugerencia-hoy.test.ts`: la sugerencia arma un outfit por zonas (arriba + abajo, o vestido; más calzado y abrigo si hay) priorizando las prendas con `ultimoUso` nulo o anterior a la misma fecha del mes previo ("no usadas en más de un mes"); con pocas prendas usa las que haya; "Otro" no repite la sugerencia anterior si hay alternativas.

### Implementation for User Story 6

- [ ] T116 [P] [US6] Crear `src/fechas.ts` (`hoyLocal`, `semanaDe`, `grillaMes`, `formatoDia` en español, por ejemplo "lun 20").
- [ ] T117 [US6] Crear `src/datos/repos/calendario.ts` (`asignar`, `quitar`, `useSemana(fecha)`, `useMes(año, mes)`) y `src/datos/repos/usos.ts` (`marcarUsado`, `usadoEn(fecha)`).
- [ ] T118 [P] [US6] Crear `src/hoy/sugerencia.ts` (`sugerirOutfit(prendas, hoy, rng, anterior?)`), que devuelve capas con la colocación automática de `RendererZonasFijas`.
- [ ] T119 [P] [US6] Crear `src/componentes/FranjaSemana.tsx`: 7 casillas de 56 px más "›"; hoy resaltado con `--ink`; un punto en los días con plan; tocar abre `Calendario`.
- [ ] T120 [US6] Construir `src/pantallas/MisOutfits.tsx` (06): grilla de 2 columnas de miniaturas (`asegurarMiniatura` para las que falten), chips de etiqueta, abrir en el Armador y eliminar con confirmación.
- [ ] T121 [US6] Construir `src/pantallas/Calendario.tsx` (07 y 07b): control segmentado Semana / Mes. Semana: filas con miniatura, día, nombre y "Cambiar" o "Asignar". Mes: grilla desde el lunes, con miniatura por día (los pasados usados, según `usosDia`, atenuados; los futuros, planeados), el día elegido con contorno y un panel inferior "Asignar". El diseño muestra 5 × 7; cuando el mes necesita 6 semanas se muestra una sexta fila con los mismos tokens, anotada en `desviaciones-diseno.md`.
- [ ] T122 [US6] Construir `src/pantallas/AsignarOutfit.tsx` (07c): `HojaInferior` con una grilla de 3 columnas de outfits guardados, "Asignar al [día]" y "Armar uno nuevo", que abre el Armador y al guardar asigna ese día.
- [ ] T123 [US6] Completar `src/pantallas/Hoy.tsx` (01 y 01b). 01: `FranjaSemana`, el outfit asignado hoy sobre **su propio maniquí** (`outfit.maniquiId`, FR-034) en un lienzo de 430 px (reutiliza `Lienzo` en solo lectura); si `maniquiId` es `null`, con el cuerpo por defecto, igual que en el Armador (data-model.md, *Maniquí*). La sugerencia de 01b usa el maniquí principal y los botones "Lo usé hoy" (principal), "Otro" y "Armar uno". 01b: sin plan, "Una idea para hoy" con la sugerencia, "Otro" y "Armar uno". `AvisoRespaldo` y el menú ⋯ de US1 se conservan. "Lo usé hoy" llama a `marcarUsado` y confirma con un mensaje breve.
- [ ] T124 [US6] Validar en el iPhone el escenario 6 de `quickstart.md`, incluido "Lo usé hoy" dos veces y la vista de mes con 6 semanas.

**Checkpoint**: uso diario completo.

---

## Phase 10: User Story 7 - Prendas "hechas por mí" (Priority: P2)

**Goal**: marcar una prenda como hecha y registrar tela, composición, molde, notas y fotos del
proceso.

**Independent Test**: marcar una prenda como hecha, completar sus datos y filtrar "Solo hecho por
mí".

### Tests for User Story 7 ⚠️

- [ ] T125 [P] [US7] Crear `tests/integracion/costura.test.ts`: `marcarHecha(id)` pone `origen = 'hecha'` y crea `costura` vacío ("obligatorio si `origen = 'hecha'` (puede tener campos vacíos)"); desmarcarla conserva `costura` pero vuelve a `'comprada'`; agregar y quitar fotos del proceso guarda y borra imágenes `proceso` en la misma transacción; el filtro "Solo hecho por mí" la encuentra.

### Implementation for User Story 7

- [ ] T126 [US7] Ampliar `src/datos/repos/prendas.ts` con `marcarHecha`, `desmarcarHecha`, `actualizarCostura(id, { tela, composicion, molde, notas })`, `agregarFotoProceso(id, blob)` (JPEG ≤ 1500 px con `redimensionar`) y `quitarFotoProceso(id, imagenId)`.
- [ ] T127 [US7] Construir la variante 03c en `src/pantallas/DetallePrenda.tsx` y el componente `src/componentes/FotosProceso.tsx`: el interruptor "Hecha por mí", campos de tela, composición, molde y notas, y la galería de fotos del proceso (agregar desde la cámara o la galería, ver y quitar). `TarjetaPrenda` usa la variante `hecha` cuando `origen = 'hecha'`.
- [ ] T128 [US7] Validar en el iPhone el escenario 7 de `quickstart.md`.

**Checkpoint**: prendas hechas por ella con su historia.

---

## Phase 11: User Story 8 - Taller: prenda planeada → terminada (Priority: P3)

**Goal**: crear prendas planeadas (tela + silueta + estampado), usarlas en el Armador, avanzar su
estado y terminarlas con la foto real sin romper los outfits. Importar siluetas propias.

**Independent Test**: crear una prenda planeada, usarla en un outfit con prendas reales, terminarla
con foto real y comprobar que el outfit sigue funcionando.

### Tests for User Story 8 ⚠️

- [ ] T129 [P] [US8] Crear `tests/unidad/validar-silueta-svg.test.ts` con fixtures en `tests/fixtures/siluetas/`: las 8 siluetas de `public/siluetas/` se aceptan (aunque traen `<metadata>` C2PA) y su `caja` queda contenida en el viewBox de miniatura del README (por ejemplo la blusa: caja `28 34 144 138`, miniatura `22 28 156 150`). Un caso por cada fila de rechazo de `contracts/silueta-svg.md`, con su mensaje exacto. `<rect>`, `<polygon>` y `<ellipse>` válidos se normalizan a un path equivalente. Un archivo de más de 200 KB se rechaza.
- [ ] T130 [P] [US8] Crear `tests/navegador/componer-planeada.test.ts`: la tela se repite en mosaico dentro del `Path2D` al tamaño de `estampado.escala` ("0,25–4 (1 = la foto de la tela ocupa el ancho de la retícula)") y se desplaza con `offsetX`/`offsetY`; "Sombreado suave" (`sombreado`, "por defecto `true`") agrega el degradado `rgba(0,0,0,.24) → transparent 26% → rgba(255,255,255,.14) 48% → transparent 70% → rgba(0,0,0,.26)` y apagado no lo agrega; fuera de la silueta todo es transparente; el PNG sale recortado a `caja`.
- [ ] T131 [P] [US8] Crear `tests/unidad/anclaje.test.ts`: `anclajeDeCaja` pone el hombro (y = 40) en 0,18 y el tobillo (y = 390) en 0,96 del cuerpo, con escala uniforme; la caja de la blusa da un `cy` y un `alto` coherentes con la zona "arriba".
- [ ] T132 [P] [US8] Crear `tests/integracion/taller-estados.test.ts`: `crearPlaneada` deja `estadoTaller = 'planeada'`, `enCloset = 0`, `origen = 'hecha'`, `planeada` completo, `imagen.anclaje` y la categoría de la silueta; `planeada ⇄ en_proceso`; `terminar(id, foto)` en una transacción conserva el **mismo `id`**, cambia `imagen` a la foto sin `anclaje`, agrega `{ tipo: 'foto' }` al historial sin borrar la imagen de la silueta, pone `enCloset = 1` y `estadoTaller = 'terminada'`, conserva `costura`, `planeada`, `usos`, `ultimoUso` y etiquetas, borra las miniaturas de sus outfits y deja la prenda en el 100 % de los outfits que la usaban (SC-010); `terminada` es final.
- [ ] T133 [P] [US8] Crear `tests/unidad/reajustar-al-terminar.test.ts` (FR-053a): con una capa de la silueta y una foto de otra proporción, `reajustarAlTerminar` conserva `cx`, `cy`, `alto` y `rotacion`, y el lienzo muestra la foto con el mismo centro y el mismo alto en píxeles (tolerancia de 0,5 px).
- [ ] T134 [P] [US8] Crear `tests/integracion/siluetas.test.ts`: `importarSilueta` guarda `{ origen: 'importada', nombre, categoria, d, caja }` sin el texto SVG; `eliminarSilueta` se niega si la usa alguna prenda y devuelve sus nombres (Edge Cases); las incluidas no se pueden borrar ni se guardan en la base.

### Implementation for User Story 8

- [ ] T135 [P] [US8] Crear `src/taller/siluetas-incluidas.ts` con las 8 siluetas (IDs `incluida:<archivo>`, `nombre` en español, `d` leído de `public/siluetas/*.svg` en el build, `caja` calculada, categoría fija: blusa y camisa → `top`; faldas y pantalones → `bottom`; vestidos → `vestido`) y los viewBox de miniatura del README: falda-recta `50 124 100 164`, falda-acampanada `26 124 148 176`, blusa `22 28 156 150`, camisa `18 22 164 168`, vestido-recto `50 28 100 264`, vestido-vuelo `22 28 156 282`, pantalon-recto `54 124 92 274`, pantalon-ancho `32 124 136 274`.
- [ ] T136 [P] [US8] Crear `src/taller/validar-silueta-svg.ts` según `contracts/silueta-svg.md` (`DOMParser` sin insertar en el DOM, un solo contorno cerrado, viewBox `0 0 200 400`, elementos prohibidos, normalización a `d` absoluto con 2 decimales, cálculo de `caja`).
- [ ] T137 [US8] Crear `src/taller/componer-planeada.ts` (research R-6): `componerPlaneada({ tela, silueta, estampado, sombreado, anchoSalida })` en Canvas 2D con `new Path2D(d)`, `ctx.clip`, `ctx.createPattern(tela, 'repeat')` con `setTransform(new DOMMatrix(...))` y el degradado de sombreado encima. Devuelve el PNG recortado a `caja`, la miniatura y el `anclaje` de `anclajeDeCaja`. Se usa también para las vistas previas en vivo de 11d y 11e (a menor resolución).
- [ ] T138 [US8] Crear `src/taller/terminar.ts` (`terminar(id, foto)` según T132; la foto pasa antes por el mismo flujo de recorte) y `src/armador/reajustar.ts` (`reajustarAlTerminar` de `contracts/try-on-renderer.ts`).
- [ ] T139 [P] [US8] Crear `src/datos/repos/siluetas.ts` (`listar()` une las incluidas y las importadas; `importarSilueta`; `eliminarSilueta` según T134; `usoDeSilueta(id)`).
- [ ] T140 [US8] Ampliar `src/datos/repos/prendas.ts` con `crearPlaneada({ telaFoto, siluetaId, estampado, sombreado, nombre, molde, notas })` (guarda la imagen `tela` como JPEG ≤ 1500 px), `actualizarEstampado` (vuelve a componer y reemplaza la imagen), `cambiarEstado(id, 'planeada' | 'en_proceso')` y `listarTallerPorEstado()`.
- [ ] T141 [P] [US8] Crear `src/componentes/EstadoTaller.tsx`: 3 segmentos (Planeada · En proceso · Terminada); los completados son una línea sólida de 3 px `--ink`, los pendientes una línea punteada de 2 px `--muted`, y la etapa actual va en peso 500.
- [ ] T142 [US8] Construir `src/pantallas/Taller.tsx` (11 y 11b): lista agrupada En proceso / Planeadas / Terminadas, y el estado vacío con el diagrama tela → silueta.
- [ ] T143 [US8] Construir `src/pantallas/CrearPlaneada/` (11c → 11f). `Tela.tsx`: foto cercana, plana y con luz pareja, o galería, con el consejo del diseño. `Silueta.tsx`: grilla de 4 columnas con las siluetas incluidas e importadas ya rellenas con la tela, más "+ Importar silueta". `Ajustar.tsx`: deslizador de escala, arrastrar para mover el estampado, interruptor "Sombreado suave". `Datos.tsx`: nombre, molde (opcional) y notas (opcionales); guarda con `estado: planeada`. Más `index.tsx`, que orquesta el flujo en memoria y no guarda nada hasta el final.
- [ ] T144 [US8] Construir `src/pantallas/ImportarSilueta.tsx` (no diseñada): elegir un `.svg`, validar con `validar-silueta-svg.ts`, mostrar el mensaje de rechazo o una vista previa rellena con una tela de ejemplo sobre el maniquí principal, pedir nombre y categoría, y guardar. Construirla con `HojaInferior`, `BotonPrincipal` y `BotonSecundario`, y anotarla en `desviaciones-diseno.md`.
- [ ] T145 [US8] Construir `src/pantallas/DetalleTaller.tsx` (11g) y `src/pantallas/Terminada.tsx` (11h). 11g: `EstadoTaller`, datos de costura (reutiliza `FotosProceso`), editar el estampado, "En el Armador" (abre el Armador con la prenda puesta) y "Ya la terminé". 11h: `HojaInferior` que ofrece tomar la foto real, la pasa por 04 → 04b → 04c y llama a `terminar`. Al terminar, la prenda aparece en el Clóset como "hecho por mí".
- [ ] T146 [US8] Validar en el iPhone el escenario 8 de `quickstart.md` con una tela y una prenda real. Afinar las constantes de `src/armador/reticula.ts` mirando la silueta sobre un maniquí real, y anotar los valores finales en `quickstart.md` y en `data-model.md` (*Retícula de siluetas → cuerpo*).

**Checkpoint**: el diferencial del producto funciona de punta a punta.

---

## Phase 12: User Story 9 - Mis medidas (Priority: P3)

**Goal**: perfil de medidas en cm, con campos comunes y personalizados, consultable en dos toques.

**Independent Test**: editar dos medidas, agregar una personalizada y consultar una en dos toques.

### Tests for User Story 9 ⚠️

- [ ] T147 [P] [US9] Crear `tests/integracion/medidas.test.ts`: el perfil se crea con los 11 campos comunes (busto, bajo busto, cintura, cadera, largo de talle delantero, largo de talle trasero, ancho de espalda, largo de brazo, contorno de brazo, largo de pierna, altura) con `valorCm = null`; un valor válido es "> 0 con un decimal" (se rechazan 0, negativos y texto; 72,25 se guarda como 72,3); editar un valor fija `actualizado` en hoy; se pueden agregar, renombrar, ordenar y quitar campos personalizados, pero no quitar los comunes.

### Implementation for User Story 9

- [ ] T148 [US9] Crear `src/datos/repos/medidas.ts` (`obtenerPerfil` con los campos precargados, `actualizarValor`, `agregarPersonalizada`, `renombrar`, `reordenar`, `quitarPersonalizada`, `usePerfil()`).
- [ ] T149 [US9] Construir `src/pantallas/MisMedidas.tsx` (12): grilla de 2 columnas de medidas en cm, con números grandes y legibles, la fecha de actualización y "+ Medida"; teclado decimal (`inputmode="decimal"`) que acepta coma o punto. Conectar la fila de `Menu.tsx` (Hoy → ⋯ → Mis medidas).
- [ ] T150 [US9] Validar en el iPhone el escenario 9 de `quickstart.md` (dos toques desde Hoy, SC-005).

**Checkpoint**: medidas consultables junto a la máquina.

---

## Phase 13: User Story 10 - Onboarding, apariencia e instalación (Priority: P3)

**Goal**: bienvenida con dedicatoria, maniquí y 3 primeras prendas en menos de 2 minutos; selector
Sistema · Claro · Oscuro sin parpadeo; ícono y splash propios.

**Independent Test**: instalar desde Safari, completar el onboarding y cambiar de tema.

### Tests for User Story 10 ⚠️

- [ ] T151 [P] [US10] Crear `tests/e2e/onboarding.spec.ts` (Playwright WebKit, perfil iPhone, con el recortador falso inyectado por una variable de build de prueba): instalación limpia → bienvenida con "Para [nombre]" → maniquí → 3 prendas → listo → Hoy; `ajustes.onboarding = 'completo'`; no vuelve a aparecer al recargar.
- [ ] T152 [P] [US10] Crear `tests/e2e/tema.spec.ts`: con cada combinación de preferencia guardada y `colorScheme` emulado, el `<html>` ya tiene el `data-theme` correcto en el primer `DOMContentLoaded` y el color de fondo calculado del `body` coincide con `--bg` antes de cargar React; cambiar en Ajustes aplica al instante y persiste tras recargar.

### Implementation for User Story 10

- [ ] T153 [US10] Construir `src/pantallas/Onboarding/` (10, 10b, 10c y listo): `Bienvenida.tsx` con la dedicatoria opcional ("Para [nombre]" y la frase guía "Ver qué ponerme —y qué coser— antes de hacerlo."), que guarda `ajustes.dedicatoria` y muestra con discreción el progreso de la descarga del modelo, que `asegurarModelo()` ya inició en el primer arranque (T063); `Maniqui.tsx`, que reutiliza `NuevoManiqui`; `PrimerasPrendas.tsx`, que reutiliza AgregarPrenda tres veces con un contador "1 de 3" y la opción de saltar; `Listo.tsx`. En `src/App.tsx`, mostrar el onboarding cuando `ajustes.onboarding = 'pendiente'`.
- [ ] T154 [US10] Agregar a `src/pantallas/Ajustes.tsx` el selector Sistema · Claro · Oscuro, que llama a `ajustes.actualizar({ apariencia })` y `aplicarTema` al instante.
- [ ] T155 [US10] Generar los íconos y splash finales con `pwa-assets.config.ts`, enlazarlos en `index.html` y en el manifest de `vite.config.ts`, y verificar en el iPhone si iOS respeta `media="(prefers-color-scheme: dark)"` en `apple-touch-startup-image`. Si no lo respeta, usar un splash neutro válido en ambos modos y anotarlo en `desviaciones-diseno.md` (research R-12).
- [ ] T156 [US10] Validar en el iPhone los escenarios 10 y 12 de `quickstart.md`: instalar desde Safari, onboarding cronometrado (< 2 min sin contar la primera descarga del modelo, SC-006; anotar aparte cuánto tardó la descarga), cambiar de tema, cerrar y abrir sin parpadeo, y áreas seguras en SE y Pro Max (o los perfiles de Playwright si no hay esos equipos).

**Checkpoint**: las 10 historias funcionan.

---

## Phase 14: Polish & Cross-Cutting Concerns

**Purpose**: volumen, offline, áreas seguras, accesibilidad, documentación y entrega.

- [ ] T157 [P] Crear `src/diagnostico/datos-sinteticos.ts` y un botón en `PanelDiagnostico` que carga 300 prendas, 5 maniquíes y 200 outfits con imágenes generadas (con los tamaños de research R-9) en una base de prueba. Pide confirmación porque reemplaza los datos (hace antes el respaldo automático con el mismo camino que importar).
- [ ] T158 Con los datos sintéticos, medir en el iPhone el desplazamiento del Clóset y de Mis outfits, la apertura del Armador y la exportación del respaldo (escenario 13, SC-009). Si algo no es fluido, aplicar la corrección mínima (por ejemplo `content-visibility: auto` en las tarjetas o una grilla virtualizada en `src/pantallas/Closet.tsx`) y anotar las mediciones antes y después en `quickstart.md`.
- [ ] T159 [P] Crear `tests/e2e/areas-seguras.spec.ts`: capturas de cada pantalla en los perfiles SE (375 × 667), iPhone 15 y Pro Max (440 × 956), en claro y oscuro, comprobando que ningún control queda debajo de las áreas seguras simuladas (SC-008).
- [ ] T160 [P] Crear `tests/e2e/offline.spec.ts`: tras la primera carga con el recortador falso, `context.setOffline(true)` y un recorrido por todas las pantallas, comprobando con `page.on('request')` que no hay solicitudes de red salvo `blob:` y `data:` (SC-003). Crear también `tests/e2e/offline-modelo.spec.ts` con el **recortador real** (constitución III): instalación limpia con conexión → esperar a que `asegurarModelo()` termine sin agregar prendas → recargar → `context.setOffline(true)` → agregar una prenda de `tests/fixtures/imagenes/` → el recorte se completa sin solicitudes de red. Si el modelo es demasiado lento para correr en cada ejecución, marcar esta prueba como `@lenta` y correrla antes de cada despliegue.
- [ ] T161 [P] Crear `tests/e2e/accesibilidad.spec.ts`: todos los controles interactivos miden al menos 44 × 44 pt y tienen un nombre accesible en español; con `prefers-reduced-motion: reduce` no hay animaciones de movimiento, solo fundidos.
- [ ] T162 Revisar `specs/001-percha-closet-taller/desviaciones-diseno.md` contra todas las pantallas construidas para que no falte ningún estado no diseñado, y dejarlo listo para llevarlo a Claude Design.
- [X] T163 [P] Escribir `docs/guia-instalacion.md`, la mini guía de una página para la persona que recibe el regalo (brief §7): cómo instalar Percha desde Safari ("Compartir → Agregar a pantalla de inicio") y cómo hacer y guardar un respaldo en Archivos o iCloud, en español y sin tecnicismos.
- [ ] T164 Actualizar `CLAUDE.md` con la arquitectura final y cualquier cambio de comandos, y `specs/001-percha-closet-taller/handoff-plan.md` con el estado.
- [ ] T165 Recorrer en el iPhone todos los escenarios de `quickstart.md` (0 a 13) sobre la última previsualización y anotar los resultados. Todo bug encontrado se arregla o se reporta en `tasks.md` como tarea nueva; no se deja como "fuera de alcance" (principio VIII).
- [ ] T166 Con la aprobación explícita del dueño, confirmar con él el subdominio definitivo de `workers.dev` (o un dominio propio) y desplegar a la URL de producción definitiva (`npm run build && wrangler deploy --name percha`), recordando que los datos quedan atados a ese origen y que la URL no debe cambiar después (research R-8). Verificar la instalación desde esa URL en el iPhone y anotar la URL definitiva en `docs/guia-instalacion.md` y en `specs/001-percha-closet-taller/handoff-plan.md`. **2026-11-04**: el dueño eligió quedarse con el subdominio actual y se desplegó en https://percha.percha-spike-recorte.workers.dev (versión `950f0ddc`, commit `dc74ca9`; responde 200 con COOP/COEP, manifest y service worker). Falta verificar la instalación en el iPhone.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Spike)**: T001 no depende de nada. T002 depende de T001 y del dueño. Solo bloquea las
  tareas marcadas ⏳ T002 (T005 y T007 en los headers, T061, T063, T064 en el tope, T068).
- **Phase 2 (Setup)**: puede empezar junto con el spike. T004–T015 dependen de T003.
- **Phase 3 (Foundational)**: depende de Setup. T016 → T017 → T018 → resto; T034 depende de
  T027–T033; T038 depende de todo lo anterior de la fase. **Bloquea todas las historias.**
- **Historias (Phases 4–13)**: en el orden del brief §4.5, una historia completa y validada en el
  iPhone antes de la siguiente.
- **Polish (Phase 14)**: después de las historias.

### User Story Dependencies

- **US1 (P1)**: solo Foundational. Sus pruebas usan fixtures que escriben directo en Dexie, así que
  no necesita las otras historias.
- **US2 (P1)**: Foundational y T002 (para el recortador real; con el falso se puede avanzar antes).
- **US3 (P1)**: US2 (necesita prendas y la primera versión de `Closet.tsx`).
- **US4 (P2)**: Foundational; reutiliza `CamaraEnVivo`, `Revisar.tsx` y el `Recortador` de US2.
- **US5 (P2)**: US3 (prendas) y US4 (maniquí; sin maniquí funciona con el cuerpo por defecto).
- **US6 (P2)**: US5 (outfits, `Lienzo` y `RendererZonasFijas`).
- **US7 (P2)**: US3 (detalle de prenda).
- **US8 (P3)**: US5 (Armador) y US7 (`FotosProceso`, datos de costura); `reticula.ts` viene de US5.
- **US9 (P3)**: solo Foundational (y `Menu.tsx`); se puede adelantar si conviene.
- **US10 (P3)**: US2 y US4 (reutiliza sus flujos) y US1 (`Ajustes.tsx`).

### Within Each User Story

- Las pruebas primero; deben fallar antes de implementar.
- Tipos y repositorios → lógica pura → componentes → pantallas → validación en el iPhone.
- La historia se cierra solo después de su tarea de validación en el iPhone.

### Parallel Opportunities

- Mientras el dueño hace T002, se puede avanzar Setup y Foundational completos.
- Setup: T006–T013 en paralelo después de T003.
- Foundational: T019–T033, T036 y T037 en paralelo después de T018.
- En cada historia, todas las pruebas [P] juntas, y luego los módulos [P] de archivos distintos.
- US9 es independiente y puede hacerse en paralelo con cualquier historia posterior a Foundational.

---

## Parallel Example: User Story 5

```bash
# Pruebas del motor del Armador, juntas:
Task: "T092 tests/unidad/renderer-zonas-fijas.test.ts"
Task: "T093 tests/unidad/gestos.test.ts"
Task: "T094 tests/unidad/historial-armador.test.ts"
Task: "T095 tests/unidad/mezclar.test.ts"
Task: "T096 tests/navegador/miniatura-outfit.test.ts"
Task: "T097 tests/integracion/outfits.test.ts"

# Módulos independientes, juntos:
Task: "T098 src/armador/tipos.ts"
Task: "T099 src/armador/reticula.ts"
Task: "T102 src/armador/historial.ts"
Task: "T103 src/armador/mezclar.ts"
Task: "T106 src/componentes/CarruselZona.tsx"
Task: "T107 src/componentes/ManijasSeleccion.tsx"
```

## Parallel Example: User Story 1

```bash
Task: "T039 tests/unidad/crc32.test.ts"
Task: "T040 tests/unidad/zip.test.ts"
Task: "T041 tests/integracion/respaldo-ida-vuelta.test.ts"
Task: "T042 tests/integracion/respaldo-rechazos.test.ts"
Task: "T043 tests/integracion/respaldo-reemplazo.test.ts"
Task: "T044 tests/integracion/respaldo-migracion.test.ts"
Task: "T045 tests/unidad/recordatorio-respaldo.test.ts"
```

---

## Implementation Strategy

### MVP primero (las tres historias P1)

1. Phase 1: T001 y entregar el spike al dueño.
2. Mientras tanto, Phase 2 (Setup) y Phase 3 (Foundational), con la previsualización instalada en
   el iPhone (T038).
3. Phase 4 (US1): el respaldo existe antes que cualquier dato real (principio IV).
4. Phase 5 (US2) con el resultado de T002, y Phase 6 (US3).
5. **Parar y validar**: con US1 a US3 ya hay un clóset real, respaldable y usable sin conexión.

### Entrega incremental

Cada historia se despliega en la previsualización y se valida en el iPhone antes de la siguiente:
US4 → US5 → US6 → US7 → US8 → US9 → US10 → Polish → producción (T166, con aprobación).

---

## Notes

- [P] = otro archivo y sin dependencias pendientes.
- [USn] = trazabilidad con las historias del spec.
- Cada historia se puede probar sola en su checkpoint.
- El código está en el repositorio público `SebastianTorresG/percha` (desde el 2026-10-30). Hacer
  commits por tarea o por grupo lógico.
- Correr `/speckit-analyze` antes de `/speckit-implement` (constitución, *Flujo de trabajo*).
