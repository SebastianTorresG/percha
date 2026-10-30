# Implementation Plan: Percha — clóset digital y taller

**Branch**: `001-percha-closet-taller` | **Date**: 2026-10-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-percha-closet-taller/spec.md`, con el brief de
comportamiento [brief-claude-code.md](./brief-claude-code.md) y el diseño de
`Tres direcciones visuales Clóset/handoff_actualizacion/`.

> **Decisión del dueño (2026-10-22): opción B.** El plan se hace antes del spike de recorte en el
> iPhone. El spike es la **primera tarea** de `tasks.md` y su resultado se anota en
> [research.md](./research.md), R-0. Lo que depende de él está marcado **⏳ spike** y resumido en
> [Partes que dependen del spike](#partes-que-dependen-del-spike).

## Summary

Percha es una PWA local-first en español para el iPhone de una sola usuaria: fotografía su ropa, le
quita el fondo en el teléfono, arma outfits como collage sobre su foto ("maniquí"), los planifica en
un calendario y prueba telas dentro de siluetas antes de coserlas (Taller).

Enfoque técnico: React 19 + Vite 8 + TypeScript 7, IndexedDB con Dexie 4 (imágenes como `Blob` en
una tabla aparte), recorte con `@imgly/background-removal` 1.7.0 auto-hospedado y ejecutado en un
Web Worker detrás del contrato `Recortador`, el Armador en DOM con transformaciones CSS y gestos
propios detrás del contrato `TryOnRenderer`, el Taller compuesto en Canvas 2D, el respaldo como ZIP
sin compresión armado sin copiar las imágenes a memoria, un service worker de Workbox con el modelo en
una caché propia, y hosting estático en Cloudflare (Workers con archivos estáticos, la versión actual de Pages; research R-8) con headers COOP/COEP.

## Technical Context

**Language/Version**: TypeScript 7.0.2 sobre ES2022; React 19.3.1. Fuentes en
[research.md](./research.md), R-2.

**Primary Dependencies**: vite 8.3.5, @vitejs/plugin-react 6.1.2, vite-plugin-pwa 2.0.0
(Workbox 7.4.1), dexie 4.4.6, dexie-react-hooks 4.4.0, @imgly/background-removal 1.7.0 ⏳ con
onnxruntime-web 1.21.0-dev.20250206-d981b153d3 ⏳ (la compilación de los WASM de imgly; research R-1), @fontsource/* 5.3.0. Tabla completa con licencias en research.md,
*Resumen de dependencias*.

**Storage**: IndexedDB (Dexie), esquema v1 versionado con migraciones puras y probadas
([data-model.md](./data-model.md)). `localStorage` solo como espejo de la apariencia para el script
de tema. Cache Storage del service worker para el app shell y el modelo.

**Testing**: Vitest 5.0.5 + fake-indexeddb 6.2.6 (datos, migraciones, respaldo, SVG); Vitest en modo
navegador con Playwright sobre WebKit (Armador, máscaras, Taller); Playwright 1.64.1 (recorridos de
punta a punta con perfil de iPhone); validación manual en iPhone real por historia
([quickstart.md](./quickstart.md)).

**Target Platform**: Safari de iOS 26+ en un iPhone, instalada en la pantalla de inicio con
`display: standalone`. Referencia 393 × 852; también SE (375 × 667) y Pro Max.

**Project Type**: aplicación web (PWA) de un solo proyecto, sin backend.

**Performance Goals**: recorte listo para revisar en ≤ 8 s sin contar la primera descarga ⏳ spike
(SC-002); gestos del Armador a la tasa de refresco de la pantalla con 8 capas (SC-004); Clóset
fluido con 300 prendas (SC-009).

**Constraints**: cero solicitudes de red después de la primera carga, incluido el recorte (SC-003);
todo en el dispositivo (FR-001); tema resuelto antes del primer pintado (FR-062); objetivos táctiles
≥ 44 pt y gestos fuera de los 20 px del borde (FR-032); memoria acotada al exportar respaldos de
~0,5–0,7 GB (research R-9, R-10).

**Scale/Scope**: una usuaria; hasta 300 prendas, 5 maniquíes y 200 outfits; unas 25 pantallas y
hojas en dos temas completos; 10 historias de usuario.

Sin marcadores NEEDS CLARIFICATION: todo quedó resuelto en research.md. Las incógnitas que solo se
resuelven en el iPhone están marcadas ⏳ spike y tienen alternativas.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo lo cumple el plan | Estado |
|---|---|---|
| I. Local-first y privado | Sin backend ni cuentas. El modelo y el WASM se auto-hospedan en el mismo origen (R-1); las fuentes van en el bundle (R-13). La única descarga de terceros es en el build (`modelo:descargar`). Cero requests en uso, verificado con el contador del panel de diagnóstico (SC-003). | ✅ |
| II. Sin IA generativa | Recorte con segmentación discriminativa (ISNet). El Taller se compone de forma determinista en Canvas 2D: silueta, tela en mosaico y degradado (R-6). | ✅ |
| III. PWA standalone offline | Manifest `standalone`; precache del app shell y caché `CacheFirst` del modelo. La primera carga incluye el modelo: `asegurarModelo()` lo descarga en el primer arranque y lo reintenta en cada arranque hasta completarlo (R-7). Se verifica con el modelo real sin conexión (T160) y en el iPhone (quickstart, escenario 11). | ✅ ⏳ el recorte offline se confirma en el spike |
| IV. Integridad de datos (NON-NEGOTIABLE) | Respaldo ZIP completo desde la historia P1, validado antes de tocar datos e importado en una sola transacción, con respaldo automático previo ([contracts/respaldo.md](./contracts/respaldo.md)). Esquema versionado con migraciones puras, usadas tanto por Dexie como por el import, y probadas con fixtures. `persist()` en cada arranque y recordatorio a los 14 días. | ✅ |
| V. Mobile-first para iPhone | `viewport-fit=cover` y `env(safe-area-inset-*)`; tokens de 44 pt; gestos con `touch-action: none` que ignoran los 20 px del borde; tema completo antes del primer pintado (R-12). | ✅ |
| VI. Fidelidad al diseño | `tokens.json` → variables CSS por tema antes de las pantallas; nombres de pantallas y componentes del diseño en el código (ver *Project Structure*); los estados no diseñados se anotan en `desviaciones-diseno.md`. Sin contradicciones abiertas entre el diseño y el brief (ver *Revisión diseño ↔ brief*). | ✅ |
| VII. Simplicidad y dependencias verificadas | 6 dependencias en tiempo de ejecución, cada una con versión, fecha, licencia y fuente en research.md. Sin librería de lienzo, rutas, estado global ni ZIP: se usa la plataforma. | ✅ (ver *Complexity Tracking*) |
| VIII. Calidad verificable | Pruebas automatizadas para repositorios, migraciones, export/import y el motor del Armador; validación por historia en el iPhone con [quickstart.md](./quickstart.md); el panel de diagnóstico reemplaza al Web Inspector (sin Mac). | ✅ |

**Resultado del gate (antes y después del diseño de la Fase 1): PASA.** No hay violaciones. Las
decisiones propias que agregan código están justificadas en *Complexity Tracking*.

## Lo que el plan debe resolver (brief §4.4) → dónde quedó

| Pedido | Resolución |
|---|---|
| Versiones y documentación actuales con fuente | [research.md](./research.md), R-1 a R-16 y tabla final |
| Interfaz `TryOnRenderer` para enchufar la pose en v2 | [contracts/try-on-renderer.ts](./contracts/try-on-renderer.ts); research R-15 |
| Modelo de datos versionado con migraciones | [data-model.md](./data-model.md), *Migraciones* |
| Origen, estado del Taller, costura, silueta y tela con estampado, historial de imágenes, foto original, siluetas importadas, medidas | data-model.md: *Prenda*, *ParametrosPlaneada*, *EntradaHistorial*, *Silueta*, *Medidas* |
| El Armador recibe PNG + metadatos sin saber si es real o planeada | `ImagenArmable` en el contrato del Armador; una sola entidad *Prenda* |
| Presupuesto de rendimiento | research R-9 (topes por tipo de imagen, miniaturas, estimación de espacio) |
| Estrategia offline del service worker | research R-7 (precache del shell y las fuentes; caché aparte del modelo) |
| Tema `[data-theme]` antes del primer pintado | research R-12 |
| Validación en iPhone real | research R-14 y [quickstart.md](./quickstart.md) |

## Partes que dependen del spike

| Decisión | Valor provisional | Si el spike no lo confirma |
|---|---|---|
| Motor de recorte | imgly 1.7.0 detrás de `Recortador` | A1 ONNX Runtime directo, A2 MediaPipe InteractiveSegmenter o A3 menor resolución; se presenta el trade-off al dueño (research R-0) |
| Modelo y dispositivo | `isnet_quint8`, CPU | `isnet_fp16` y/o WebGPU |
| Descarga inicial | ~56 MB (modelo 44 MB + WASM 12 MB) | ~100 MB con fp16, o ~67 MB con WebGPU |
| Headers COOP/COEP y hosting | Cloudflare (Workers con archivos estáticos) con `_headers` | Si no aportan velocidad, se quitan (el hosting sigue igual) |
| Tope del recorte | 1200 px | Menor si hay cierres por memoria |
| Cámara en vivo para el maniquí | `getUserMedia` con guía y temporizador | `<input capture>` nativo (sin guía superpuesta) |

Todo lo demás (datos, respaldo, Clóset, Armador, calendario, Taller, medidas, tema) no depende del
spike y puede avanzar en paralelo usando un `Recortador` falso en las pruebas.

## Revisión diseño ↔ brief

No se encontraron contradicciones que requieran decisión. Diferencias resueltas a favor de la fuente
que corresponde:

- **Sombreado del Taller**: el brief proponía como candidata un modo de fusión *multiply*; el diseño
  define un degradado con alfa dibujado encima. Se sigue el diseño (fuente visual).
- **Navegación**: el brief sugería 5 pestañas con Calendario; el diseño puso el Calendario dentro de
  Hoy, como el mismo brief de diseño permitía proponer. Se sigue el diseño.
- **Modelo de datos del README**: se adaptó a las aclaraciones del spec (cambios en data-model.md,
  sección final). El spec prevalece sobre el README en comportamiento.

## Project Structure

### Documentation (this feature)

```text
specs/001-percha-closet-taller/
├── brief-claude-code.md     # Brief de comportamiento (fuente de verdad)
├── handoff-plan.md          # Estado entre sesiones
├── spec.md
├── plan.md                  # Este archivo
├── research.md              # Fase 0 (+ resultados del spike, R-0)
├── data-model.md            # Fase 1
├── quickstart.md            # Fase 1 (+ registro de mediciones en el iPhone)
├── contracts/
│   ├── try-on-renderer.ts   # Armador: TryOnRenderer, ImagenArmable, Transformacion, gestos
│   ├── recortador.ts        # Recorte de fondos intercambiable
│   ├── respaldo.md          # Formato ZIP, validación e importación
│   └── silueta-svg.md       # Reglas para importar siluetas
├── desviaciones-diseno.md   # Estados no diseñados, para revisar en Claude Design (se crea al implementar)
├── checklists/
└── tasks.md                 # Fase 2 (/speckit-tasks; no lo crea este comando)
```

### Source Code (repository root)

```text
index.html                   # Script inline de tema (R-12), metas de iOS, viewport-fit=cover
package.json
vite.config.ts               # React, PWA (generateSW), headers COOP/COEP en dev
public/
├── _headers                 # COOP/COEP y Cache-Control (Cloudflare Workers con archivos estáticos)
├── modelos/imgly/1.7.0/     # Generado por `npm run modelo:descargar` (no se versiona)
└── siluetas/*.svg           # Las 8 del diseño
scripts/
└── descargar-modelo.ts
spike/
└── recorte/                 # Página desechable del spike (T001), con su propio manifest
src/
├── main.tsx
├── App.tsx                  # Pila de navegación + BarraInferior
├── tema/                    # tokens.css generado de tokens.json, useApariencia
├── navegacion/              # Pila tipada de pantallas y hojas (R-3)
├── datos/
│   ├── db.ts                # Dexie, versiones
│   ├── migraciones/         # v1.ts, … (funciones puras)
│   ├── repos/               # prendas, imagenes, siluetas, maniquies, outfits, calendario, usos, medidas, ajustes
│   ├── almacenamiento.ts    # persist(), estimate()
│   └── integridad.ts
├── respaldo/                # crc32, zip-escritor, zip-lector, validar, exportar, importar
├── imagen/                  # redimensionar, color-promedio, recortar-al-contorno
├── recorte/                 # Recortador, imgly (worker), componer, mascara (Pincel/Borrador)
├── armador/                 # RendererZonasFijas, gestos, historial (deshacer), mezclar, miniatura
├── taller/                  # siluetas-incluidas, componer-planeada, validar-silueta-svg, terminar
├── componentes/             # TarjetaPrenda, ChipFiltro, CarruselZona, BarraInferior,
│                            # BotonPrincipal, BotonSecundario, HojaInferior, EstadoTaller,
│                            # ManijasSeleccion, FranjaSemana
├── pantallas/               # Un archivo por pantalla del diseño, con su data-screen-label:
│                            # Hoy (01, 01b), Menu (01c), Closet (02, 02b), Filtros (02c),
│                            # DetallePrenda (03, 03b, 03c), AgregarPrenda (04–04d), Armador (05–05d),
│                            # MisOutfits (06), Calendario (07, 07b), AsignarOutfit (07c),
│                            # MisManiquies (08), Ajustes (09), Onboarding (10–10c), Taller (11, 11b),
│                            # CrearPlaneada (11c–11f), DetalleTaller (11g), Terminada (11h),
│                            # MisMedidas (12), ImportarSilueta (no diseñada)
└── diagnostico/             # Panel oculto: tiempos, almacenamiento, red, service worker, errores
tests/
├── unidad/                  # Vitest: gestos, transformaciones, migraciones puras, zip, svg
├── integracion/             # Vitest + fake-indexeddb: repos, respaldo ida y vuelta, borrados en cascada
├── navegador/               # Vitest browser (WebKit): canvas del Taller, máscaras, miniaturas
├── e2e/                     # Playwright (WebKit, iPhone)
└── fixtures/                # Datos por versión de esquema, imágenes de prueba, SVG válidos e inválidos
```

**Structure Decision**: un solo proyecto web en la raíz del repositorio, junto a `specs/` y al export
de diseño. Los nombres de pantallas y componentes siguen el diseño (principio VI). La lógica pura
(gestos, transformaciones, migraciones, ZIP, validación de SVG) está separada de React para probarla
sin navegador.

## Orden de implementación

Sigue el brief §4.5, por historia completa y validada en el iPhone:

1. **Spike de recorte** (R-0) → resultados en research.md y decisión de modelo y dispositivo.
2. Base: proyecto, tokens y tema, fuentes, PWA, navegación, componentes del diseño, panel de
   diagnóstico, despliegue de previsualización.
3. US1 Respaldo y datos seguros (P1).
4. US2 Agregar prenda (P1).
5. US3 Clóset (P1).
6. US4 Maniquíes (P2).
7. US5 Armador (P2).
8. US6 Outfits, calendario y Hoy (P2).
9. US7 Hecho por mí (P2).
10. US8 Taller (P3).
11. US9 Medidas (P3).
12. US10 Onboarding, apariencia e instalación (P3), y pulido visual.

## Pendientes para Claude Design

Estados que el diseño no cubre; se construyen con los tokens y se anotan en
`desviaciones-diseno.md`:

- Pantalla **Importar silueta** (FR-050a) y sus mensajes de rechazo.
- Errores del respaldo (archivo dañado, versión más nueva, sin espacio) y "Restaurar el respaldo
  automático".
- Progreso de la primera descarga del modelo, si el estado "revelándose" del 04b no alcanza.
- Aviso "Hay una versión nueva" en Ajustes.
- Espacio insuficiente al guardar una prenda.
- Splash de iOS en modo oscuro, si iOS no respeta el `media` (R-12).
- Panel de diagnóstico (interno; no hace falta diseñarlo).

## Complexity Tracking

| Decisión | Por qué hace falta | Alternativa más simple descartada porque |
|---|---|---|
| Escritor y lector de ZIP propios (~250 líneas + pruebas) | Un respaldo de ~0,5–0,7 GB debe armarse referenciando los `Blob` sin copiarlos, o iOS puede cerrar la app por memoria (R-10) | fflate, client-zip y JSZip copian los datos a memoria para producir el `Blob` final; fflate queda como plan B |
| Gestos propios en lugar de Konva o Fabric | El diseño exige el `cutoutFilter` de CSS, que no existe en el canvas de Safari; Konva tampoco trae pellizco y giro (R-5) | Una librería de lienzo agregaría peso y aun así requeriría la misma matemática de gestos |
| Un Web Worker para el recorte | Evitar que la interfaz se congele durante varios segundos de inferencia | Correr en el hilo principal bloquea la animación "revelándose" del diseño |
