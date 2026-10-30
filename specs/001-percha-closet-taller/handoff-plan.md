# Traspaso: hacer el plan de Percha en una nueva sesión

**Fecha**: 2026-10-19 · **Feature activa**: `specs/001-percha-closet-taller` (ya fijada en
`.specify/feature.json`)

## Cómo usar este archivo

En la nueva sesión, abierta en `D:\App-Closet-Sofi`, pide algo como:

> Lee `specs/001-percha-closet-taller/handoff-plan.md` y sigue desde ahí.

## Actualización 2026-10-22: plan hecho

- El dueño eligió la **opción B** (plan ya). El spike queda como verificación pendiente en
  `research.md` (R-0) y como primera tarea.
- `/speckit-plan` generó `plan.md`, `research.md` (versiones verificadas con fuente),
  `data-model.md`, `contracts/` (`try-on-renderer.ts`, `recortador.ts`, `respaldo.md`,
  `silueta-svg.md`) y `quickstart.md`. El gate de la constitución pasa.
- `/speckit-tasks` generó `tasks.md` (166 tareas en 14 fases), con el spike como T001 y la prueba
  en el iPhone con el dueño como T002.
- `/speckit-analyze` encontró 1 hallazgo crítico, 2 altos, 6 medios y 6 bajos, con 100 % de
  cobertura. Ya se aplicaron C1 (el modelo se descarga en el primer arranque y se reintenta;
  research R-7, T060, T063, T070, T153 y T160), H1 (Hoy, el Armador y las miniaturas usan el
  maniquí del outfit; T104, T109 y T123) y H2 (SC-006 y FR-061 sin contar la primera descarga;
  Clarifications, sesión 2026-10-22).
- Quedan sin aplicar M1–M6 y L1–L7. M1 (umbrales de SC-004 y SC-009) y M4 (aviso de respaldo
  cuando nunca se respaldó) requieren una decisión del dueño.
- **T001 hecha** (2026-10-22): la página del spike está en `spike/recorte/` y funciona en el
  escritorio, también sin servidor. Hallazgos en research.md R-0 (*Página del spike*): ONNX Runtime
  debe ser la versión `1.21.0-dev.20250206-d981b153d3`, la máscara sale con `segmentForeground()`
  e imgly no guarda el modelo en caché por su cuenta.
- **Spike publicado (2026-10-26)** en la cuenta de Cloudflare del dueño (entró con GitHub). Como
  Workers con archivos estáticos (research R-8), porque wrangler 4.152 ya no crea proyectos de Pages
  clásicos:
  - con-coi: https://percha-spike-con-coi.percha-spike-recorte.workers.dev
  - sin-coi: https://percha-spike-sin-coi.percha-spike-recorte.workers.dev
  - Verificado: headers correctos en cada variante; en el escritorio, el modelo se descargó en 5,5 s
    y el recorte tomó 3,0 s con 0 solicitudes de red.
  - El subdominio `percha-spike-recorte` lo eligió wrangler; se puede cambiar antes de producción.
- **T002 pendiente, con el dueño.** Probar en el iPhone según `spike/recorte/README.md` y pegar los
  resultados para pasarlos a research.md R-0.
- **Setup hecho (T003–T015, 2026-10-26).** La app compila (PWA con 28 entradas de precache, íconos
  y splash claros y oscuros), los tipos pasan y Vitest arranca sus tres proyectos. Verificado en el
  navegador integrado: tema antes del primer pintado, preferencia manual sobre la del sistema y las
  cuatro fuentes. Hallazgos en research.md R-14: el WebKit de Playwright en Windows no tiene
  `OffscreenCanvas` ni WebGPU, y `workbox-build` trae un `glob` deprecado (solo al compilar). Se
  corrigió una entrada duplicada del manifest en el precache que habría hecho fallar la instalación
  del service worker.
- **Foundational hecho (T016–T037, 2026-10-26).** Base de datos v1 con migraciones puras y su
  mecanismo de fixtures por versión, repositorios de imágenes y ajustes, almacenamiento, integridad,
  utilidades de imagen, tema, pila de navegación, componentes del diseño, Menú (01c), pantallas vacías
  con su `data-pantalla`, panel de diagnóstico y fixtures con el recortador falso. 110 pruebas pasan
  (87 de unidad e integración y 23 en WebKit); tipos y build OK.
- **Previsualización publicada (T038)**: https://percha-preview.percha-spike-recorte.workers.dev,
  verificada en el escritorio. **Falta con el dueño**: instalarla en el iPhone y comprobar pantalla
  completa, tema sin parpadeo al cambiar el modo, fuentes en modo avión y la barra inferior.
- Hallazgo al publicar (research R-8): Cloudflare manda también los 404 de `/modelos/*` con
  `immutable`; T061 agrega una verificación que impide publicar sin el modelo.
- **Siguiente paso: User Story 1, Respaldo y datos seguros (T039+).** T002 sigue pendiente.
- Las secciones de abajo son el traspaso original del 2026-10-19; "Pendiente de decidir" ya está
  resuelto.

## Estado del flujo de Spec Kit

| Paso | Estado | Archivo |
|---|---|---|
| constitution | ✅ v1.0.0 | `.specify/memory/constitution.md` |
| specify | ✅ 10 historias (P1–P3), FR y SC | `specs/001-percha-closet-taller/spec.md` |
| clarify | ✅ 5 de 5 preguntas, sin marcadores pendientes | sección `## Clarifications` del spec |
| spike de recorte | ⏳ pendiente (opción B): será T001 | `research.md`, R-0 |
| plan | ✅ 2026-10-22 | `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md` |
| tasks | ✅ 2026-10-22, 166 tareas | `tasks.md` |
| analyze → implement | ⏳ siguiente: analyze | — |

## Fuentes de verdad (leer en este orden)

1. `specs/001-percha-closet-taller/brief-claude-code.md`: brief de implementación, copiado de
   `C:\Users\sebas\Downloads\brief-claude-code.md`. Fija el comportamiento, las restricciones, las
   decisiones ✅ cerradas, la tabla de stack candidato (§4.4), lo que el plan debe resolver y los
   criterios de aceptación del MVP (§6).
2. `specs/001-percha-closet-taller/spec.md`: el spec con las aclaraciones ya integradas.
3. `.specify/memory/constitution.md`: 8 principios. Los que más condicionan el plan: local-first,
   offline, integridad de datos (NON-NEGOTIABLE) y dependencias verificadas con fuente citada.
4. El diseño de Claude Design, en `Tres direcciones visuales Clóset/`:
   - `handoff_actualizacion/README.md`: **la versión más nueva**. Agrega el calendario de mes, la
     hoja de asignar outfit, la sección Movimiento y `Percha Sistema.dc.html`.
   - `design_handoff_percha/`: `tokens.json`, `siluetas/*.svg` (8), `brief.md` de diseño,
     `Percha Pantallas v2.dc.html` y `support.js`.
   - El README propone un modelo de datos para IndexedDB (Prenda, PrendaPlaneada, Outfit,
     Calendario, Maniqui, Medidas, Ajustes). Es un punto de partida: hay que adaptarlo a las
     aclaraciones de abajo.

## Decisiones tomadas en clarify (ya están en el spec)

1. **Importar un respaldo con datos existentes**: se reemplaza todo, con confirmación, y antes se
   guarda en el teléfono un respaldo automático de lo anterior (FR-003).
2. **Eliminar un maniquí usado en outfits**: se avisa "Lo usan N outfits" y esos outfits pasan al
   maniquí principal con sus capas. Si era el último maniquí, los outfits se conservan sin maniquí
   (FR-021). Las posiciones se guardan **relativas al cuerpo**, no en píxeles (FR-034).
3. **Foto original**: se guarda reducida a ~1500 px en el lado mayor, y el detalle ofrece "Volver
   a recortar". La original va en el respaldo (FR-012a).
4. **Prenda del Taller terminada**: en cada outfit, su transformación se reajusta para que la foto
   real ocupe el mismo centro y el mismo alto sobre el cuerpo que la silueta. La rotación y la capa
   se conservan (FR-053a).
5. **Siluetas propias**: opción D, implementando **solo la parte B en el MVP**. Se importan desde
   un SVG con un solo contorno cerrado, viewBox `0 0 200 400`, sobre la retícula corporal; se
   validan y van en el respaldo (FR-050a). El editor para dibujarlas (parte C) queda para después,
   en `specs/backlog/editor-siluetas.md`. El modelo de siluetas debe permitir agregarlo sin migrar
   datos de forma destructiva. La pantalla para importar no está diseñada: se construye con los
   tokens y se anota para Design.

Supuestos del spec que conviene revisar en el plan: la sugerencia de categoría es simple (sin
modelo de clasificación); la colocación automática usa zonas fijas relativas a la altura del
maniquí; una prenda en proceso se usa igual que una planeada; las medidas se guardan en cm y solo
el valor actual.

## Pendiente de decidir: spike antes del plan

El brief (§3) pide probar `@imgly/background-removal` en Safari de iOS, dentro de una PWA
standalone y en un iPhone real, **antes** del plan. El dueño todavía no eligió entre:

- **A. Spike primero**: una página desechable por HTTPS, con manifest `standalone` y dos inputs de
  archivo (con y sin `capture="environment"`), que muestra el PNG recortado y los tiempos (primera
  ejecución y siguientes, con foto completa y con foto reducida a ~1500 px) y prueba sin conexión.
  Se publica en un hosting estático gratis, el dueño la prueba con 3 a 5 fotos reales (~15 min) y
  los resultados van a `research.md`. Si falla, se presentan alternativas con evidencia
  (otro modelo, MediaPipe, menor resolución).
- **B. Plan ya**: el spike queda como verificación pendiente en `research.md` y como primera tarea.
  Riesgo: rehacer parte del plan si el recorte no funciona en el iPhone.

Al dueño ya se le explicó qué es un spike.

## Lo que el plan debe resolver (brief §4.4)

- Verificar versiones y documentación actuales de cada candidata (React + Vite + TS, plugin PWA,
  Dexie / IndexedDB, imgly, Konva o Fabric, librería ZIP, hosting) y **citar la fuente**.
- Una interfaz `TryOnRenderer` para el Armador, para poder enchufar en v2 el anclaje por pose
  (MediaPipe) sin reescribir.
- Un modelo de datos versionado y con migraciones probadas. Debe cubrir: origen (comprada o
  hecha), estado del Taller, datos de costura, silueta y tela con los parámetros del estampado,
  historial de imágenes (silueta → foto real), foto original, siluetas importadas y medidas.
- Que el Armador reciba un PNG con transparencia más metadatos, sin saber si la prenda es real o
  planeada.
- Un presupuesto de rendimiento: redimensionar al importar, miniaturas para las grillas y un tope
  de resolución para los recortes. Límites esperados: unas 300 prendas, 5 maniquíes y 200 outfits.
- La estrategia offline del service worker: el app shell, el modelo y las fuentes empaquetadas
  (Cormorant Garamond, Jost, Bodoni Moda y Archivo).
- Un tema con `[data-theme="claro"|"oscuro"]` resuelto antes del primer pintado. El tema cambia
  colores, tipografía, radios y estilo de etiquetas, no solo colores.
- Cómo se valida en un iPhone real durante el desarrollo (HTTPS local o túnel, o despliegue de
  previsualización).

## Reglas de trabajo del dueño

- Trabajar en español.
- Si el diseño y el brief se contradicen, preguntar en vez de elegir.
- Presentar los trade-offs reales con evidencia y dejar que el dueño decida.
- No dejar bugs conocidos como "fuera de alcance".
- Documentar lo verificado en los artefactos de Spec Kit.
- El código está en el repositorio privado https://github.com/SebastianTorresG/percha (rama `main`).

## US1 Respaldo (2026-10-26), detenido a pedido del dueño para ahorrar créditos

- T039–T055 hechas: `src/respaldo/` tiene crc32, el escritor y el lector de ZIP con ZIP64, formato, validar, exportar e importar; además recordatorio, useExportar, `repos/respaldos-auto.ts` y `datos/referencias.ts` (lo comparte con integridad). También Ajustes (09), Hoy con AvisoRespaldo (01b) y HojaConfirmar.
- Verificado: 138 pruebas de unidad e integración y 26 en WebKit (ida y vuelta con IndexedDB real y un ZIP re-comprimido con deflate). Tipos y build bien.
- Hallazgo: WebKit no guarda Blob en IndexedDB en un contexto efímero. El proyecto `navegador` ahora usa un contexto persistente y corre en serie.
- Cambio de contrato: `manifest.imagenes[].creada`, para que la ida y vuelta sea exacta. El lector acepta una carpeta raíz y `__MACOSX/`. Ya está en `contracts/respaldo.md` y en research R-10 y R-14.
- Probado en el navegador (2026-10-30): Hoy muestra el aviso de 01b con una prenda y sin respaldo; Ajustes se ve como 09 en claro y oscuro.
- Previsualización con US1 publicada el 2026-10-30 en https://percha-preview.percha-spike-recorte.workers.dev (versión b05a506a).
- Pendiente: T056 en el iPhone y decidir M4 (aviso cuando nunca se respaldó; hoy avisa en cuanto hay una prenda).
