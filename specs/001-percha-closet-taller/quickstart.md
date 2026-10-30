# Quickstart: validar Percha

**Plan**: [plan.md](./plan.md) · **Investigación**: [research.md](./research.md) (R-8, R-14)

Guía para comprobar de punta a punta que cada historia funciona, en el computador y en el iPhone.
Los comandos son los **scripts previstos** en `package.json`; se crean en las primeras tareas de
`tasks.md`.

## Requisitos

- Windows con Node.js LTS y npm.
- Un iPhone con iOS 26 o superior (WebGPU activo por defecto; research R-0), en la misma red Wi-Fi
  para el túnel, o con internet para las previsualizaciones.
- Una cuenta gratis de Cloudflare (para `wrangler deploy`; ya existe y está conectada desde el 2026-10-26) y `cloudflared` instalado (para el
  túnel).
- Prendas reales para probar: al menos una **negra**, una **blanca** y una **estampada**, más una
  tela.

## Comandos

```bash
npm install
```

```bash
npm run modelo:descargar
```

Descarga solo el subconjunto elegido del modelo de imgly a `public/modelos/imgly/1.7.0/` y verifica
los tamaños contra `resources.json`. Es la única descarga de terceros y ocurre en el build, no en el
teléfono.

```bash
npm run test
```

Pruebas unitarias y de integración (Vitest + fake-indexeddb): repositorios, migraciones, respaldo y
validación de SVG.

```bash
npm run test:navegador
```

Pruebas en WebKit (Vitest en modo navegador con Playwright): motor del Armador, máscaras y
composición del Taller.

```bash
npm run test:e2e
```

Recorridos de punta a punta con Playwright (WebKit, perfil de iPhone).

```bash
npm run dev:tunel
```

Servidor de Vite con los headers COOP/COEP más un túnel `cloudflared`; imprime una URL HTTPS para
abrir en Safari del iPhone.

```bash
npm run deploy:preview
```

Build y `wrangler deploy --name percha-preview` (Worker con archivos estáticos; research R-8). Da una URL HTTPS estable para instalar la app
en la pantalla de inicio del iPhone.

## Escenarios de validación en el iPhone

Estos son los recorridos básicos de cada historia. Los casos raros, los bordes y el estrés están en
[`docs/pruebas-intensivas.md`](../../docs/pruebas-intensivas.md).

Instalar desde la URL de previsualización: Safari → Compartir → **Agregar a pantalla de inicio**, y
abrir desde el ícono. Las mediciones se leen en el **panel de diagnóstico** (Ajustes → tocar 5 veces
la versión).

| # | Historia | Pasos | Resultado esperado |
|---|---|---|---|
| 0 | Spike (R-0) | Página del spike instalada; 5 fotos reales con cada variante | Tiempos y estabilidad anotados abajo; decisión de modelo y dispositivo |
| 1 | US1 Respaldo | Crear datos de todas las historias → Exportar → guardar en Archivos → borrar la app → reinstalar → Importar | Todo idéntico, incluidos Taller, siluetas importadas, medidas y calendario (SC-001) |
| 1b | US1 Respaldo dañado | Importar un ZIP de otra app y uno truncado | Mensaje claro; los datos no cambian |
| 1c | US1 Reemplazar | Con datos, importar otro respaldo y confirmar | Primero aparece el respaldo automático en Ajustes; luego todo se reemplaza |
| 2 | US2 Agregar prenda | Modo avión (después de la primera carga) → "Tomar foto" → recorte → Pincel/Borrador → Deshacer → datos → Guardar | Recorte sin red; tiempo anotado (SC-002); color sugerido razonable |
| 3 | US3 Clóset | 20 prendas → filtrar → editar una → borrar una que está en 3 outfits | Aviso "Está en 3 outfits guardados…"; los outfits conservan el resto |
| 3b | Contraste | Prenda negra y blanca en las tarjetas y el Armador, claro y oscuro | Ambas se distinguen (SC-007) |
| 4 | US4 Maniquíes | Crear 2 con guía y temporizador → marcar principal | El Armador y Hoy usan el principal; anotar si el permiso de cámara se repite (R-11) |
| 5 | US5 Armador | 4 prendas → mover, pellizcar, girar → deshacer 20 → mezclar → guardar | Fluido con 8 capas; nunca dispara el gesto de volver (SC-004) |
| 6 | US6 Hoy | Asignar un outfit a hoy → abrir Hoy → "Lo usé hoy" dos veces | Cada prenda suma 1 uso una sola vez; última fecha = hoy |
| 7 | US7 Hecho por mí | Marcar, completar datos, fotos del proceso → filtrar "Solo hecho por mí" | Detalle completo; filtro correcto |
| 8 | US8 Taller | Tela → silueta → escala y posición → usar en un outfit → terminar con foto real | La prenda real queda en el mismo centro y alto (SC-010); colocación sobre el maniquí razonable (anotar ajustes de la retícula) |
| 9 | US9 Medidas | Hoy → ⋯ → Mis medidas → editar 2 → agregar una personalizada | Dos toques (SC-005); fecha = hoy |
| 10 | US10 Onboarding y tema | Instalación limpia → onboarding con cronómetro → cambiar tema → cerrar y abrir | < 2 min sin contar la primera descarga del modelo (SC-006; anotar aparte cuánto tardó la descarga); sin parpadeo; splash e ícono correctos |
| 11 | Offline y red | (a) Instalación limpia con conexión → abrir la app y esperar sin agregar prendas a que termine la preparación del recorte (progreso en el panel de diagnóstico) → cerrar → modo avión → abrir y agregar la primera prenda. (b) Modo avión → recorrer todas las pantallas → mirar el contador de red | (a) El recorte funciona sin haber recortado nunca con conexión (constitución III). (b) Cero solicitudes (SC-003) |
| 12 | Áreas seguras | iPhone SE (o simulador del tamaño 375 × 667 en Playwright) y Pro Max, ambos modos | Nada tapado por la isla, el notch ni el indicador de inicio (SC-008) |
| 13 | Volumen | Cargar el conjunto sintético (300 prendas, 5 maniquíes, 200 outfits) desde el panel de diagnóstico → navegar el Clóset → exportar | Clóset fluido (SC-009); exportar sin cierre por memoria |

## Registro de mediciones en el iPhone

Llenar al validar. Los resultados del spike también van a [research.md](./research.md), R-0.

| Fecha | Modelo de iPhone / iOS | Escenario | Variante | Medición | Notas |
|---|---|---|---|---|---|
| 2026-10-26 | Escritorio (navegador integrado, 375 × 812) | T038: previsualización https://percha-preview.percha-spike-recorte.workers.dev | con COOP/COEP | `crossOriginIsolated` sí; service worker instalado; precache de 29 entradas con las 8 `.woff2`; tema claro y oscuro según el sistema | Falta la prueba en el iPhone: pantalla completa, tema sin parpadeo al cambiar el modo, fuentes en modo avión y barra inferior sobre el indicador de inicio. |
| | | | | | |
