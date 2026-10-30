# Research: Percha — clóset digital y taller

**Fecha**: 2026-10-22 · **Plan**: [plan.md](./plan.md) · **Spec**: [spec.md](./spec.md)

Este documento resuelve lo que el brief (§4.4) pide verificar antes de construir. Cada decisión
cita su fuente. Las versiones se consultaron el 2026-10-22 en el registro de npm
(`https://registry.npmjs.org/<paquete>`), salvo que se indique otra fuente.

> **Decisión del dueño (2026-10-22): opción B, plan ya.** El spike de recorte en iPhone real no se
> hizo antes del plan. Queda como **R-0 (verificación pendiente)** y como la primera tarea de
> `tasks.md`. Las decisiones que dependen de su resultado llevan la marca **⏳ spike**.

---

## R-0. Spike de recorte en iPhone real ⏳ PENDIENTE

**Hipótesis (brief §3):** `@imgly/background-removal` corre en Safari de iOS dentro de una PWA
standalone, con memoria y tiempo aceptables, en un iPhone de gama media.

**Qué ya se sabe sin el iPhone** (de esta investigación):

- La última versión es **1.7.0, publicada el 2025-07-18** (hace 15 meses). Fija como dependencia
  par `onnxruntime-web` **1.21.0**, mientras que la versión actual de ONNX Runtime Web es 1.30.0
  (2026-09-14). Fuente: npm.
- Los modelos y WASM pesan (fuente:
  `https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/resources.json`):

  | Recurso | Tamaño | Trozos |
  |---|---|---|
  | `models/isnet_quint8` (cuantizado, "small") | 44,3 MB | 11 |
  | `models/isnet_fp16` (por defecto, "medium") | 88,2 MB | 22 |
  | `models/isnet` (fp32) | 176,1 MB | 42 |
  | `ort-wasm-simd-threaded.wasm` (CPU) | 11,8 MB | 3 |
  | `ort-wasm-simd-threaded.jsep.wasm` (WebGPU) | 23,0 MB | 6 |

  El paquete completo de datos (`package.tgz`) pesa 284,7 MB porque trae todas las variantes; solo
  se auto-hospeda el subconjunto elegido.
- El README de la librería pide aislar el origen con COOP/COEP para tener `SharedArrayBuffer`
  (hilos de WASM); sin eso, funciona más lento en un solo hilo. Fuente: README de
  [@imgly/background-removal en npm](https://www.npmjs.com/package/@imgly/background-removal).
- WebGPU está activado por defecto desde iOS 26
  ([AppDeveloperMagazine: WebGPU in iOS 26](https://appdevelopermagazine.com/webgpu-in-ios-26/)),
  así que `device: 'gpu'` es una opción a medir.
- En el repositorio hay un reporte antiguo sin resolver, "Issue with operation on Mobile Safari"
  (#4, 2023, etiqueta *wontfix*)
  ([issues de background-removal-js](https://github.com/imgly/background-removal-js/issues?q=is%3Aissue+safari+OR+ios)).
  No se pudo leer el detalle.

**Qué debe medir el spike** (amplía la lista del brief §3 con lo encontrado):

1. Página desechable en el mismo hosting elegido (R-8), con manifest `standalone`, **con y sin**
   los headers COOP/COEP, instalada en la pantalla de inicio.
2. `<input type="file" accept="image/*">` con y sin `capture="environment"`, **y** cámara en vivo
   con `getUserMedia` (la necesitan la guía de pose y el temporizador de 5 s del maniquí; ver R-11).
3. Modelos `isnet_quint8` y `isnet_fp16`; `device: 'cpu'` y `device: 'gpu'`.
4. Foto de cámara a resolución completa y reducida a ~1500 px en el lado mayor.
5. Tiempo de la primera ejecución (con descarga) y de las siguientes; si la pestaña se recarga o se
   cae por memoria; calidad del borde en prendas negras, blancas y estampadas.
6. Que el recorte funcione **sin conexión** la segunda vez, con los recursos auto-hospedados y
   servidos desde la caché del service worker.
7. Los resultados se muestran **en la pantalla** de la página, porque desde Windows no se puede usar
   el Web Inspector de Safari para depurar el iPhone (ver R-14).

**Criterio de éxito propuesto**: recorte listo para revisar en ≤ 8 s (sin contar la primera
descarga) con la foto reducida a 1500 px, sin recargas por memoria en 5 fotos seguidas, y offline la
segunda vez. El dueño puede ajustar este umbral.

**Si falla**, alternativas a evaluar con evidencia y presentar al dueño:

- **A1**: ONNX Runtime Web actual (1.30.0) directo, con el mismo modelo ISNet u otro más liviano
  (por ejemplo U²-Net-p). Más código propio, pero quita la dependencia de una librería sin
  publicaciones desde 2025.
- **A2**: MediaPipe Tasks Vision (`@mediapipe/tasks-vision` 1.1.1, Apache-2.0, 2026-10-14) con
  `InteractiveSegmenter`, que segmenta el objeto bajo un punto (el centro del marco guía). Es la
  misma familia que se usará para la pose en v2.
- **A3**: procesar a menor resolución (por ejemplo 1024 px) y escalar la máscara.

**Qué depende del spike (⏳)**: el modelo y el dispositivo de cálculo (R-1), el tamaño de la
descarga inicial (R-7), los headers COOP/COEP y por eso la elección final de hosting (R-8), el
tope de resolución del recorte (R-9) y la cámara en vivo (R-11). Nada más del plan cambia: el
recorte queda detrás del contrato `Recortador` ([contracts/recortador.ts](./contracts/recortador.ts)),
así que cambiar de motor no toca el resto de la app.

### Página del spike (T001, 2026-10-22)

Está en `spike/recorte/`; cómo publicarla y probarla está en `spike/recorte/README.md`. Al
construirla se verificó lo siguiente:

- **Versión de ONNX Runtime**: los WASM y `.mjs` que imgly publica en su CDN para 1.7.0 son
  **idénticos byte a byte** a los de `onnxruntime-web@1.21.0-dev.20250206-d981b153d3` (la versión que
  indica su README) y **distintos** a los de la 1.21.0 estable que declara como dependencia par (por
  ejemplo, `ort-wasm-simd-threaded.wasm` mide 11 819 815 bytes en el CDN y 12 666 427 en la 1.21.0).
  El JavaScript de ORT debe ser de la misma compilación que el WASM, así que se usa la versión dev,
  con un `overrides` de npm para que la dependencia par no choque.
- **Código de imgly 1.7.0** (leído en `node_modules/@imgly/background-removal/dist/index.mjs`):
  - El modelo siempre procesa la imagen reescalada a **1024 × 1024**, y luego la máscara se reescala
    en JavaScript al tamaño de entrada. Una foto más grande no mejora el recorte, solo cuesta más
    memoria y tiempo, lo que apoya reducir a ~1500 px antes.
  - Codifica con `OffscreenCanvas.convertToBlob`, así que necesita `OffscreenCanvas` (Safari 16.4+).
    Por eso mismo funciona dentro de un Web Worker.
  - **No guarda el modelo en caché por su cuenta**: cada carga vuelve a pedir `resources.json` y los
    trozos con `fetch`. La caché del service worker es la que hace posible el modo sin conexión.
  - La máscara sola se obtiene con `segmentForeground()` (alias `alphamask`), que devuelve un PNG
    blanco cuyo alfa es la máscara. `output` solo acepta `format` y `quality`; no tiene un campo
    `type`. También admite `format: 'image/x-alpha8'` (bytes crudos de la máscara, sin codificar
    PNG).
  - Guarda en memoria el primer módulo de ONNX Runtime que carga (CPU o WebGPU). Para cambiar entre
    CPU y GPU hay que empezar con un worker nuevo.
- **Build**: Vite copia a `assets/` el `ort-wasm-simd-threaded.jsep.wasm` de npm (23,9 MB), que no
  se usa porque imgly le pasa a ORT sus propios WASM. Cabe en el límite de 25 MiB de Cloudflare,
  pero la app debería excluirlo del build (pendiente para T061/T063).
- **Prueba en el escritorio** (navegador integrado de Claude, Chromium en Windows, 12 núcleos;
  **no reemplaza la prueba en el iPhone**). Foto sintética reducida a 1500 px, `isnet_quint8`:

  | Variante | Preparar modelo | Recorte |
  |---|---|---|
  | CPU, worker, con COOP/COEP | 0,2–0,7 s (desde la caché) | 2,8–3,0 s |
  | CPU, hilo principal | 0,3 s | 3,7 s |
  | GPU (WebGPU), worker | 1,0 s | 5,1–6,9 s |
  | `isnet_fp16`, CPU, worker | 1,4 s | 3,9 s |
  | CPU, worker, **servidor apagado** | 0,7 s | 4,4 s, con 0 solicitudes de red |

  Sin servidor, la página se sirvió desde la caché del service worker y conservó
  `crossOriginIsolated: true`.

---

## R-1. Quitar el fondo

- **Decisión**: `@imgly/background-removal` **1.7.0** (versión exacta, sin `^`) con
  `onnxruntime-web` **1.21.0-dev.20250206-d981b153d3** exacta. Es la compilación cuyos WASM
  publica imgly (verificado en T001; ver R-0, *Página del spike*), y se fuerza con `overrides` porque
  la dependencia par declara 1.21.0. Modelo inicial
  `isnet_quint8` (44 MB) ⏳ spike; `isnet_fp16` si la calidad del cuantizado no alcanza.
  `publicPath` apunta a `/modelos/imgly/1.7.0/` del mismo origen (auto-hospedado). Se ejecuta en un
  Web Worker para no congelar la interfaz.
- **Justificación**: decisión ✅ del brief, sujeta al spike. Auto-hospedar cumple el principio I (sin
  terceros en tiempo de ejecución) y el III (offline). El README recomienda auto-hospedar en
  producción.
- **Licencia**: AGPL-3.0 (README). El brief la acepta porque el uso es personal y no se distribuye.
  Si en algún momento la app se comparte con más personas, la AGPL obliga a ofrecerles el código.
- **Riesgo conocido**: la librería no publica desde julio de 2025 y fija ONNX Runtime 1.21.0. Se
  mitiga con el contrato `Recortador` y las alternativas A1–A3.
- **Alternativas consideradas**: A1, A2 y A3 (ver R-0).

## R-2. Framework y lenguaje

- **Decisión**: React **19.3.1** + Vite **8.3.5** + `@vitejs/plugin-react` **6.1.2** + TypeScript
  **7.0.2**.
- **Fuentes y fechas** (npm): react 19.3.1 (2026-10-14), vite 8.3.5 (2026-10-21),
  @vitejs/plugin-react 6.1.2 (requiere `vite ^8`), typescript 7.0.2 (2026-07-08; es el compilador
  nativo, etiqueta `latest`).
- **Justificación**: candidata del brief y del README de diseño; las versiones son compatibles
  entre sí según sus dependencias par. Vite transpila por su cuenta; `tsc` solo hace la revisión de
  tipos.
- **Riesgo**: TypeScript 7 es la primera línea mayor del compilador nativo. Si alguna herramienta
  (por ejemplo un linter) aún no lo soporta, se usa la última 6.x solo para esa herramienta, y se
  anota aquí.
- **Alternativas**: Preact (más liviano, pero agrega una capa de compatibilidad) y Svelte (cambia de
  ecosistema sin una ganancia clara para una sola usuaria).

## R-3. Navegación y estado

- **Decisión**: **sin librería de rutas ni de estado global.** Una pila de navegación propia y
  tipada (pantallas y hojas inferiores), sincronizada con `history.pushState` para restaurar la
  pantalla al volver de segundo plano. Los datos se leen con `useLiveQuery` de
  `dexie-react-hooks` **4.4.0**, y el Armador usa un `useReducer` con historial para deshacer.
- **Justificación**: el principio VII prefiere la plataforma. Son unas 25 pantallas y hojas, sin
  URLs que compartir. En modo standalone de iOS no hay barra de direcciones ni botón de volver del
  navegador, así que la navegación es interna.
- **Alternativas**: react-router 8.5.0 (MIT; es útil con URLs profundas, que aquí no hacen falta) y
  zustand 5.0.16 (innecesario si los datos viven en Dexie y el Armador en un reducer).

## R-4. Persistencia

- **Decisión**: IndexedDB con **Dexie 4.4.6** (Apache-2.0, 2026-09-10). Las imágenes se guardan como
  `Blob` en una tabla `imagenes` aparte, y las entidades guardan solo su `id`. Esquema versionado con
  `db.version(n).stores(...).upgrade(...)`.
- **Fuentes**: npm; [Dexie: Database versioning](https://dexie.org/docs/Tutorial/Design#database-versioning).
  Dexie 3+ compara contra el esquema instalado; una versión con `upgrade` **nunca se modifica** y
  se conserva mientras pueda existir una instalación anterior. Si un `upgrade` falla, la
  transacción se revierte y `db.open()` falla: nunca queda a medio migrar.
- **Cuota en iOS**: desde Safari 17 / iOS 17, una app del navegador tiene hasta el **60 % del
  disco** por origen, y una web app de pantalla de inicio tiene la misma cuota. La expulsión es por
  origen (LRU), salvo que el origen esté en modo persistente. `navigator.storage.estimate()` está
  disponible desde Safari 17. Fuente:
  [WebKit: Updates to Storage Policy](https://webkit.org/blog/14403/updates-to-storage-policy/).
- **`navigator.storage.persist()`**: WebKit lo concede con heurísticas; una de ellas es abrir la
  app desde la pantalla de inicio. Hay un reporte de que devolvía siempre `false` en Safari 17
  ([WebKit bug 271401](https://bugs.webkit.org/show_bug.cgi?id=271401)). **Decisión**: pedirlo en
  cada arranque, registrar el resultado en Ajustes ("Almacenamiento protegido: sí/no") y no depender
  de él: el respaldo y su recordatorio son la garantía real (principio IV).
- **Alternativas**: IndexedDB a mano (más código para versiones y consultas) y OPFS (sirve para
  archivos, pero no tiene índices ni consultas).

## R-5. Lienzo del Armador y gestos

- **Decisión**: **DOM + transformaciones CSS**, sin librería de lienzo. Cada capa es un `<img>`
  posicionado con `transform: translate() rotate() scale()` sobre el maniquí, con el `cutoutFilter`
  del tema como CSS `filter`. Los gestos (mover con un dedo, pellizcar, girar con dos) se calculan
  con Pointer Events y `touch-action: none`, en un módulo de matemática pura con pruebas.
- **Justificación**:
  - El diseño define el contraste de recortes como un CSS `filter: drop-shadow(...)`. En canvas no
    se puede replicar con `ctx.filter`, porque Safari e iOS lo tienen **desactivado por defecto**
    hasta la versión 27
    ([caniuse: CanvasRenderingContext2D.filter](https://caniuse.com/mdn-api_canvasrenderingcontext2d_filter)).
  - Konva **10.9.0** (MIT) no trae gestos de pellizco y giro: su documentación dice que solo da
    eventos táctiles básicos y que los gestos se implementan a mano
    ([Konva: Gestures](https://konvajs.org/docs/sandbox/Gestures.html),
    [Multi-touch Scale Shape](https://konvajs.org/docs/sandbox/Multi-touch_Scale_Shape.html)).
    Habría que escribir la misma matemática y además cargar la librería.
  - Ocho `<img>` con transformaciones se componen en la GPU y responden con fluidez.
- **Miniaturas de outfits**: se generan con Canvas 2D (`drawImage` con la matriz de cada capa y
  `shadowBlur`/`shadowColor` para aproximar el halo) y se guardan como PNG. Así la grilla de 200
  outfits no monta 1 000 imágenes.
- **Alternativas**: Konva/react-konva 19.3.2 y Fabric 7.4.0 (MIT). Se descartan por lo anterior;
  se pueden reconsiderar si el DOM no da la fluidez de SC-004 con 8 capas en el iPhone.

## R-6. Corrección del recorte y composición del Taller

- **Pincel y Borrador**: un canvas de **máscara en escala de grises** a la resolución del recorte.
  El Borrador pinta negro, el Pincel pinta blanco y la imagen final es la foto original con esa
  máscara aplicada (`globalCompositeOperation = 'destination-in'`). Así el Pincel recupera los
  píxeles reales de la foto sin perder nitidez (US2, escenario 3). Deshacer guarda cada trazo como
  una lista de puntos y vuelve a dibujarlos; no guarda copias del bitmap.
- **Prenda planeada**: Canvas 2D con `new Path2D(d)` desde el `d` del SVG, `ctx.clip(path)`,
  `ctx.createPattern(tela, 'repeat')` con `pattern.setTransform(new DOMMatrix(...))` para la escala
  y el desplazamiento del estampado, y la capa de sombreado como el degradado lineal del diseño,
  dibujado encima dentro del mismo recorte.
- **Nota sobre el brief**: el brief proponía como candidata un modo de fusión tipo *multiply*. El
  diseño especifica el sombreado como un degradado con alfa (oscuro y claro) dibujado encima, sin
  modo de fusión. Se sigue el diseño, que es la fuente visual. No es una contradicción, porque el
  brief lo marcaba como algo por verificar.
- **Salida**: un PNG recortado al rectángulo de la silueta, más su anclaje en la retícula corporal
  (ver [data-model.md](./data-model.md), *ImagenArmable*). El Armador lo recibe igual que una foto
  real (FR-035).
- **Verificación pendiente en iPhone**: `Path2D` con cadena SVG y `CanvasPattern.setTransform` en
  Safari de iOS. Se cubren con pruebas en WebKit (Playwright) y con validación manual.

## R-7. Service worker y modo offline

- **Decisión**: `vite-plugin-pwa` **2.0.0** (MIT, 2026-10-03; acepta `vite ^8`) en modo
  `generateSW` con Workbox **7.4.1**.
  - **Precache** (se instala con el service worker): app shell (HTML, JS, CSS), las fuentes, las 8
    siluetas, los íconos y la pantalla de splash.
  - **Modelo y WASM** de imgly: **no** van en el precache (son 56 MB o más; si la instalación del
    service worker se interrumpe, falla entera). Van en una caché aparte `percha-modelo-1.7.0` con
    estrategia `CacheFirst`.
  - **La "primera carga" incluye el modelo** (constitución III: "Después de la primera carga, todas
    las funciones MUST funcionar sin conexión, incluido el recorte"). Por eso no se espera al
    onboarding ni a la primera prenda: `asegurarModelo()` se ejecuta en **cada arranque** de la app.
    Si el modelo no está completo en la caché y hay conexión, lanza `preload()` de imgly en segundo
    plano. Si se corta, lo reintenta en el siguiente arranque y con el evento `online`. El onboarding
    y el 04b muestran el progreso de esa descarga (US2, escenario 2: "tardará más la primera vez").
  - Si la usuaria intenta recortar sin conexión antes de que el modelo esté completo, Agregar prenda
    lo dice con claridad y no pierde la foto. Es un estado no diseñado y se anota en
    `desviaciones-diseno.md`.
  - Al cambiar de versión de modelo se borra la caché anterior.
  - Actualización de la app: `registerType: 'prompt'`, con un aviso suave "Hay una versión nueva" en
    Ajustes. Nunca se recarga sola en medio de un recorte o del Armador.
- **Fuentes**: npm;
  [vite-plugin-pwa releases](https://github.com/vite-pwa/vite-plugin-pwa/releases) (v1.3.0 agregó
  soporte de Vite 8; v2.0.0 no anuncia cambios en `generateSW`).
- **Prueba de SC-003**: con la app ya cargada, modo avión y el panel de diagnóstico (R-14) contando
  las solicitudes de red: deben ser cero.

## R-8. Hosting

- **Decisión**: **Cloudflare Pages** (plan gratis), con despliegue directo usando `wrangler`
  **4.152.0** (`wrangler pages deploy`), sin necesidad de un repositorio git.
- **Justificación**:
  - Permite headers propios con un archivo `_headers` (hasta 100 reglas), que se aplican a los
    archivos estáticos ([Cloudflare Pages: Headers](https://developers.cloudflare.com/pages/configuration/headers/)).
    Así se pueden poner COOP/COEP para los hilos de WASM (⏳ spike) y los `Cache-Control` correctos.
  - Límite de **25 MiB por archivo** y 20 000 archivos en el plan gratis
    ([Cloudflare Pages: Limits](https://developers.cloudflare.com/pages/platform/limits/)). Los
    trozos de modelo de imgly y el WASM más grande (23 MB) caben.
  - Cada despliegue con `--branch` da una URL de previsualización con HTTPS para probar en el iPhone.
- **Alternativas**:
  - **GitHub Pages**: no permite headers propios
    ([discusión de la comunidad #13309](https://github.com/orgs/community/discussions/13309)). El
    truco `coi-serviceworker` agrega COOP/COEP desde un service worker, pero recarga la página la
    primera vez y choca con el service worker propio de la app.
  - **Netlify**: también admite `_headers`; es una alternativa equivalente si el dueño la prefiere.
- **Importante**: los datos de IndexedDB quedan atados al **origen** (dominio). La app del regalo se
  instala desde la URL de producción definitiva, que no debe cambiar después. Las previsualizaciones
  tienen otro origen y otros datos.
- **Actualización 2026-10-26 (al publicar el spike)**: wrangler 4.152.0 ya no crea proyectos de
  Pages clásicos. `wrangler pages project create` responde "Delegating to the latest version of
  Cloudflare Pages, now part of Cloudflare Workers". Se usa entonces **Workers con archivos
  estáticos**, el mismo producto en su versión actual:
  - Admite `_headers` con la misma sintaxis (100 reglas, 2 000 caracteres por línea), que se aplica a
    las respuestas de archivos estáticos
    ([Workers: Headers](https://developers.cloudflare.com/workers/static-assets/headers/)).
  - Tiene los mismos límites del plan gratis: 25 MiB por archivo y 20 000 archivos por versión
    ([Workers: Limits](https://developers.cloudflare.com/workers/platform/limits/)).
  - Se publica con un `wrangler.jsonc` que tiene `assets.directory` y `wrangler deploy --name <worker>`.
    La URL queda `https://<worker>.<subdominio>.workers.dev`. Para previsualizar se usa otro Worker
    (por ejemplo `percha-preview`), no una rama.
  - En la primera publicación wrangler registró solo el subdominio de la cuenta,
    `percha-spike-recorte`. Antes de publicar la app de producción conviene cambiarlo en el panel por
    uno definitivo (por ejemplo `percha`), porque forma parte del origen y no debe cambiar después de
    entregar el regalo.
- **Hallazgo 2026-10-26 (al publicar la previsualización, T038)**: las reglas de `_headers` se
  aplican también a las respuestas 404. Medido con `curl -I`: `/modelos/no-existe` responde **404 con
  `Cache-Control: public, max-age=31536000, immutable`**. Si alguna vez se publica sin el modelo y la
  app lo pide, el iPhone guardaría ese 404 en su caché HTTP por un año y publicar de nuevo no lo
  arreglaría (el `CacheFirst` del service worker solo guarda 200, pero la caché HTTP del navegador sí
  guarda el 404). Hoy no ocurre porque ningún código pide el modelo todavía. **Decisión**: T061 agrega
  una verificación que hace fallar `build` y los `deploy` si `dist/modelos/imgly/1.7.0/` no tiene
  todos los trozos de `resources.json`, para que nunca se publique sin el modelo.
- **Previsualización publicada (2026-10-26)**: https://percha-preview.percha-spike-recorte.workers.dev
  (Worker `percha-preview`). Verificado con `curl -I`: COOP/COEP en todas las respuestas;
  `no-cache` en `/`, `/sw.js` y `/manifest.webmanifest`; `immutable` en `/assets/*`.

## R-9. Presupuesto de rendimiento y espacio

Límites esperados (SC-009): 300 prendas, 5 maniquíes y 200 outfits.

| Imagen | Formato | Tope | Peso estimado |
|---|---|---|---|
| Foto original de la prenda (FR-012a) | JPEG calidad 0,85 | 1500 px lado mayor | ~300–500 KB |
| Recorte de la prenda | PNG con alfa, recortado a su contorno | 1200 px lado mayor ⏳ spike | ~0,4–1,2 MB |
| Miniatura de grilla | PNG con alfa | 360 px lado mayor | ~40–90 KB |
| Maniquí recortado | PNG con alfa | 1600 px de alto | ~1–2 MB |
| Foto de tela (Taller) | JPEG 0,85 | 1500 px | ~300–500 KB |
| Fotos del proceso | JPEG 0,85 | 1500 px | ~300–500 KB c/u |
| Miniatura de outfit | PNG | 360 × 540 px | ~60–120 KB |

- **Total estimado** con 300 prendas: 300 × ~1,6 MB ≈ **480 MB**, más maniquíes, Taller y outfits:
  **≈ 0,5–0,7 GB**. Cabe de sobra en la cuota (R-4); Ajustes muestra el uso real con `estimate()`.
- **Formato**: se usa PNG y JPEG porque son los que se pueden codificar con certeza en Safari desde
  `canvas.toBlob`. Si la codificación WebP con alfa funciona en el iPhone, se puede adoptar después
  para ahorrar espacio, con una migración probada.
- **Grillas**: el Clóset, Mis outfits y las hojas de asignar usan solo miniaturas, con
  `loading="lazy"` y `decoding="async"`. Los object URLs se liberan al desmontar
  (`URL.revokeObjectURL`).
- **Al importar fotos**: se redimensionan con `createImageBitmap` y canvas **antes** de pasar al
  recorte, y se respeta la orientación EXIF.

## R-10. Respaldo (formato ZIP)

- **Decisión**: un **ZIP sin compresión (método STORE)**, escrito con un módulo propio pequeño
  (encabezados ZIP + CRC-32 + ZIP64 si pasa de 4 GB), armado como `new Blob([encabezado, blobImagen,
  …])`. Las imágenes ya están comprimidas (PNG/JPEG), así que comprimir otra vez no ahorra casi nada.
  Lo importante es que **el `Blob` final referencia los `Blob` de IndexedDB sin copiarlos a la
  memoria de JavaScript**. Un respaldo de ~600 MB armado en memoria podría hacer que iOS cierre la
  app.
- **Importar**: se lee el directorio central del ZIP al final del archivo y cada entrada se obtiene
  con `File.slice()`. Si una entrada viene comprimida (por ejemplo, porque la usuaria
  re-comprimió el archivo en otra app), se descomprime con `DecompressionStream('deflate-raw')` de
  la plataforma. **Corrección del 2026-10-30**: las imágenes no se guardan como ese `slice` sino
  como un `Blob` nuevo con sus bytes (ver R-14, *Hallazgo de las pruebas intensivas*). Al importar,
  las fotos quedan en memoria hasta que termina la transacción; con un respaldo grande eso se mide
  en el iPhone (C4, C5 y C10 de `docs/pruebas-intensivas.md`).
- **Entrega del archivo**: `navigator.share({ files: [archivo] })` si
  `navigator.canShare({ files })` lo acepta, para guardarlo en Archivos o iCloud desde la hoja de
  compartir de iOS. Si no, se usa `<a download>`. `canShare` existe en Safari desde la 14, pero no
  hay confirmación de que acepte ZIP
  ([web.dev: Web Share API](https://web.dev/articles/web-share)). Por eso se detecta en tiempo de
  ejecución y se valida en el iPhone.
- **Alternativas**: fflate 0.8.3 (MIT) con `Zip` + `ZipPassThrough` (streaming, pero copia cada
  trozo a un `Uint8Array`, así que la memoria pico es mayor); client-zip 2.5.1 (MIT, streaming con
  `Response`, pero obtener el `Blob` final también lo materializa); JSZip 3.10.2 (todo en memoria).
  Si el módulo propio da problemas, fflate es el plan B.
- **Formato exacto**: [contracts/respaldo.md](./contracts/respaldo.md).
- **Implementado (US1, 2026-10-26)**: `src/respaldo/` (~600 líneas con validación). El ZIP se arma
  como `new Blob([...])` con los `Blob` de IndexedDB. Se probó en WebKit real: la ida y vuelta con
  IndexedDB de verdad y un respaldo re-comprimido con deflate dentro de una carpeta pasan
  (`tests/navegador/respaldo.test.ts`). ZIP64 se activa desde 65 535 entradas o 4 GB, porque los
  valores centinela ya obligan a leer ZIP64. Si `share` falla con `NotAllowedError` (se venció el
  toque mientras se armaba el archivo), la app pide un segundo toque con el archivo ya listo. Falta
  medir en el iPhone si `canShare` acepta el ZIP (T056).

## R-11. Cámara

- **Galería, telas y fotos del proceso**: `<input type="file" accept="image/*">` ("Elegir de la
  galería", sin `capture`). Es lo más confiable en iOS.
- **Cámara de prendas (04, marco guía a pantalla completa) y del maniquí (guía de pose +
  temporizador de 5 s, FR-020)**: requieren cámara en vivo con `getUserMedia`, porque la cámara
  nativa no permite superponer una guía. Se usa un solo componente de cámara para ambas. **Riesgo**: hay reportes de que en apps de pantalla de inicio iOS pide el
  permiso de cámara en cada arranque o que el video no arranca
  ([WebKit bug 215884](https://bugs.webkit.org/show_bug.cgi?id=215884),
  [WebKit bug 268159](https://bugs.webkit.org/show_bug.cgi?id=268159)).
  **Decisión**: cámara en vivo con guía y temporizador; si `getUserMedia` falla o se niega, se usa
  el `<input capture>` nativo (se pierde la guía superpuesta, pero se puede usar el temporizador de
  la cámara del iPhone). ⏳ spike: medir si el permiso se repite.

## R-12. Tema sin parpadeo

- **Decisión**: un script inline y síncrono en el `<head>` de `index.html`, antes de cualquier CSS
  o JS. Lee la preferencia de `localStorage` (`percha.apariencia`: `sistema` | `claro` | `oscuro`),
  resuelve `sistema` con `matchMedia('(prefers-color-scheme: dark)')` y pone
  `document.documentElement.dataset.theme = 'claro' | 'oscuro'` y el `<meta name="theme-color">`.
  La fuente de verdad es Ajustes en IndexedDB; `localStorage` es solo un espejo para leerlo de forma
  síncrona. Un listener de `matchMedia` cambia el tema en vivo cuando la preferencia es `sistema`.
- **Tokens**: `tokens.json` se convierte en variables CSS bajo `[data-theme="claro"]` y
  `[data-theme="oscuro"]`: colores, familias tipográficas, pesos, radios, `text-transform` y
  `letter-spacing` de las etiquetas, tamaño de los chips, estilo de selección (`dashed`/`solid`) y
  `cutoutFilter`.
- **Splash de iOS**: `apple-touch-startup-image` es una imagen estática por tamaño de pantalla. Se
  generan versiones clara y oscura con `@vite-pwa/assets-generator` **2.0.0** (MIT); está por
  verificar en el iPhone si iOS respeta `media="(prefers-color-scheme: dark)"` en esos `<link>`.
  Si no, se usa un splash neutro que funcione en ambos modos, y se anota para Design.

## R-13. Fuentes empaquetadas

- **Decisión**: paquetes `@fontsource/*` **5.3.0** (OFL-1.1): `cormorant-garamond` (500 y 500
  cursiva), `jost` (400 y 500), `bodoni-moda` (400 y 400 cursiva) y `archivo` (400 y 500). Solo el
  subconjunto `latin` (incluye á, é, í, ó, ú, ñ, ¿, ¡). Se importan solo los CSS de esos pesos y
  Vite empaqueta los `woff2`, que entran en el precache.
- **Justificación**: el diseño pide incluir las fuentes en el bundle para que funcionen sin internet;
  así no se hacen solicitudes a Google Fonts (principio I).

## R-14. Pruebas y validación en iPhone real

- **Pruebas automatizadas** (principio VIII):
  - Vitest **5.0.5** + `fake-indexeddb` **6.2.6**: repositorios, migraciones (con fixtures de cada
    versión de esquema), respaldo (exportar → importar → comparar) y validación de SVG.
  - Vitest en modo navegador con `@vitest/browser-playwright` 5.0.5 sobre **WebKit**: motor de
    composición del Armador (transformaciones, colocación, reajuste de FR-053a), máscaras del
    recorte y composición del Taller con canvas real.
  - Playwright **1.64.1** (WebKit con perfil de iPhone): recorridos de punta a punta por historia.
- **Validación en el iPhone** (principio VIII; la Mac no está disponible, el equipo de desarrollo
  es Windows):
  1. **Previsualización en Cloudflare** (`wrangler deploy --name percha-preview`, ver R-8): HTTPS
     real, mismos headers que producción, instalable en la pantalla de inicio. Es la vía principal
     para probar la PWA instalada.
  2. **Túnel durante el desarrollo**: `vite --host` más `cloudflared tunnel --url
     http://localhost:5173` da una URL HTTPS temporal. Sirve para iterar rápido en Safari; el
     service worker y la instalación se prueban mejor con la opción 1, porque la URL del túnel cambia.
     Un certificado autofirmado no sirve, porque iOS no registra service workers con certificados no
     confiables.
  3. **Panel de diagnóstico** oculto en Ajustes (se abre tocando 5 veces la versión): muestra
     tiempos de recorte, `storage.estimate()`, `persisted()`, el contador de solicitudes de red, el
     estado del service worker y los últimos errores. Sustituye al Web Inspector, que necesita una
     Mac.
- **Antes de cerrar cada historia**: validarla en el iPhone y anotar el resultado en
  [quickstart.md](./quickstart.md).
- **Límite del WebKit de Playwright en Windows** (medido el 2026-10-26 en el Setup; la UA dice
  "Version/27.2 Safari/605.1.15"):

  | API | Playwright WebKit (Windows) | Safari de iOS 26 |
  |---|---|---|
  | `OffscreenCanvas` | **no** | sí (16.4+) |
  | WebGPU (`navigator.gpu`) | **no** | sí (26+) |
  | `ctx.filter` | no | no (desactivado por defecto) |
  | `createImageBitmap` con `imageOrientation`, `Path2D` con path SVG, `CanvasPattern.setTransform`, `DecompressionStream`/`CompressionStream` `deflate-raw`, `crypto.randomUUID`, IndexedDB, `storage.estimate()`, `toBlob` WebP | sí | sí, salvo WebP, por verificar |

  Por eso las pruebas de `tests/navegador/` usan `HTMLCanvasElement` en los módulos que se prueban
  (composición del recorte, máscara, Taller, miniaturas). Lo que depende de `OffscreenCanvas` o
  WebGPU (imgly dentro del worker) se verifica en el iPhone (T074) y con la página del spike.
- **Aviso conocido de npm**: `workbox-build` 7.4.1 (la última, dependencia de `vite-plugin-pwa`
  2.0.0) trae `glob@11.1.0`, marcado como deprecado. Solo se usa al compilar, para listar archivos
  locales, y no llega al teléfono. Se revisa cuando salga una versión nueva de Workbox.
- **Hallazgos de Foundational (2026-10-26)**:
  - El WebKit de Playwright **sí** aplica la orientación EXIF con `createImageBitmap(blob, {
    imageOrientation: 'from-image' })`: una JPEG de 40 × 20 con orientación 6 sale de 20 × 40
    (`tests/navegador/redimensionar.test.ts`).
  - En el proyecto `navegador`, si Vite descubre una dependencia a mitad de la corrida, vuelve a
    optimizarla y quedan dos copias de React ("resolveDispatcher() is null"). `vitest.config.ts`
    declara `optimizeDeps.include` con React, `react-dom/client`, Dexie y `dexie-react-hooks`.
  - Las imágenes de prueba (`tests/fixtures/imagenes/imagenes.ts`) son PNG y JPEG reales codificados
    por el canvas de WebKit con `tests/fixtures/imagenes/generar.mjs`, más una JPEG con un segmento
    Exif de orientación 6 agregado a mano. Funcionan en Node y en el navegador.
  - El contador de red del panel de diagnóstico cuenta solo lo que salió a la red: los
    `PerformanceResourceTiming` con `transferSize` 0 (lo servido por el service worker o la caché
    HTTP), `blob:` y `data:` no cuentan. Si el navegador no informa `transferSize`, se cuenta, para no
    esconder una solicitud real. Aparte cuenta las de otros orígenes, que deben ser 0 (principio I).
    Está por confirmar en el iPhone que Safari informa `transferSize` 0 para lo servido por el service
    worker.
  - Para comprobar la restauración de la pila de navegación: al recargar la página, `history.state`
    sobrevive y la app vuelve a la misma pantalla con su pila (verificado en el navegador integrado);
    si iOS lo pierde, se usa la copia en `sessionStorage` (`tests/unidad/pila.test.ts`).

### Hallazgo de US1: Blob en IndexedDB y contextos efímeros (2026-10-26)

- Un contexto efímero de WebKit (el de Playwright por defecto, como la navegación privada de
  Safari) no puede guardar `Blob` en IndexedDB: falla con `UnknownError: Error preparing Blob/File
  data to be stored in object store`. Con un contexto persistente sí funciona. Por eso el proyecto
  `navegador` de Vitest usa `persistentContext` y corre los archivos en serie (unos 15 s), y las e2e
  que guarden fotos necesitan `launchPersistentContext` (tasks.md, *Convenciones*).
- En el iPhone, la PWA instalada no es efímera. Si alguien abre Percha en una pestaña privada de
  Safari, guardar fotos va a fallar. US2 tiene que mostrar un mensaje claro en ese caso.

### Hallazgo de las pruebas intensivas: `slice` guardado en IndexedDB (2026-10-30)

- Al automatizar la Parte A de `docs/pruebas-intensivas.md` (tests/e2e) apareció que, en WebKit, un
  `Blob` que es un `slice` de otro (de un `File` elegido en el selector o de un `Blob` en memoria)
  se guarda bien y se lee bien **mientras vive el original**. Después de recargar la página, el
  registro conserva su `size`, pero `arrayBuffer()` devuelve el **archivo entero** del que salió, y
  `new Blob([registro])` también lo arma con el archivo entero.
- Consecuencia antes de corregirlo: tras importar un respaldo y volver a abrir la app, cada foto
  importada se leía como el ZIP completo (firma `PK`); exportar daba un ZIP de 208 KB con un
  respaldo de 17 KB, dañado, y restaurar la copia automática decía "El respaldo está dañado".
- Una copia propia (`new Blob([bytes])`) y un `Blob` compuesto de registros leídos de IndexedDB
  (la copia automática) sí sobreviven a la recarga, al cierre del navegador y a que se borren los
  registros de los que salió. Medido con scripts de Playwright sobre el WebKit de Windows.
- **Regla**: nunca guardar en IndexedDB un `Blob` que venga de `slice()`. La importación guarda
  copias propias (`src/respaldo/importar.ts`), y US2 y las demás historias deben guardar lo que sale
  del canvas o de `arrayBuffer()`, no un `slice`. La e2e "A14.17 … las fotos siguen siendo fotos"
  lo vigila. Falta confirmarlo en el iPhone (A14.17 y C5 del plan de pruebas).
- Otros hallazgos del mismo día: `vite-plugin-pwa` agregaba una segunda `<meta name="theme-color">`
  (ahora `injectThemeColor: false`), y el puerto por defecto de Vitest en modo navegador (63315)
  puede caer en un rango que Windows reserva para Hyper-V (`vitest.config.ts` usa el 4175).

## R-15. Interfaz para el anclaje por pose en v2

- **Decisión**: el Armador depende de la interfaz `TryOnRenderer`
  ([contracts/try-on-renderer.ts](./contracts/try-on-renderer.ts)). La implementación del MVP,
  `RendererZonasFijas`, coloca por zonas relativas al **cuerpo** del maniquí (el rectángulo de sus
  píxeles opacos). En v2, `RendererPose` puede calcular el cuerpo y las zonas a partir de los puntos
  de MediaPipe Pose Landmarker sin cambiar el Armador ni el formato de los outfits, porque las
  transformaciones ya se guardan en unidades del cuerpo (FR-034).

## R-16. Siluetas importadas

- **Decisión**: validación con `DOMParser` (`image/svg+xml`) sin insertar el SVG en el DOM. Se
  acepta solo si el viewBox es exactamente `0 0 200 400`, hay **una sola** forma (`<path>`,
  `<polygon>`, `<rect>` o `<ellipse>`, que se normaliza a un `d` de path), el contorno está cerrado
  y cae dentro del viewBox. Se ignoran `<metadata>`, `<title>` y `<desc>`: las 8 siluetas del diseño
  traen un bloque `<metadata>` (C2PA). Se rechazan `<script>`, `<image>`, `<use>`, `<foreignObject>`,
  `<text>` y referencias externas. Solo se guarda el `d` normalizado, nunca el SVG original, así que
  no hay riesgo de ejecutar contenido.
- **Detalle**: [contracts/silueta-svg.md](./contracts/silueta-svg.md).

---

## Resumen de dependencias

| Paquete | Versión | Licencia | Uso |
|---|---|---|---|
| react, react-dom | 19.3.1 | MIT | Interfaz |
| vite | 8.3.5 | MIT | Build y servidor de desarrollo |
| @vitejs/plugin-react | 6.1.2 | MIT | JSX y refresco rápido |
| typescript | 7.0.2 | Apache-2.0 | Tipos |
| vite-plugin-pwa (Workbox 7.4.1) | 2.0.0 | MIT | Manifest y service worker |
| @vite-pwa/assets-generator | 2.0.0 | MIT | Íconos y splash (solo en build) |
| dexie | 4.4.6 | Apache-2.0 | IndexedDB |
| dexie-react-hooks | 4.4.0 | Apache-2.0 | `useLiveQuery` |
| @imgly/background-removal | 1.7.0 ⏳ | AGPL-3.0 | Quitar fondo |
| onnxruntime-web | 1.21.0-dev.20250206-d981b153d3 ⏳ | MIT | Motor de imgly (versión fija; ver R-1) |
| @fontsource/{cormorant-garamond, jost, bodoni-moda, archivo} | 5.3.0 | OFL-1.1 | Fuentes offline |
| vitest, @vitest/browser-playwright | 5.0.5 | MIT | Pruebas (desarrollo) |
| fake-indexeddb | 6.2.6 | Apache-2.0 | Pruebas (desarrollo) |
| @playwright/test | 1.64.1 | Apache-2.0 | Pruebas (desarrollo) |
| wrangler | 4.152.0 | MIT o Apache-2.0 | Despliegue (desarrollo) |

En tiempo de ejecución hay 6 dependencias (React ×2, Dexie ×2, imgly + ONNX Runtime), más las
fuentes y el service worker generado.
