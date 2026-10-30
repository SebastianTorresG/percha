# Brief de implementación — App de clóset y outfits

> **Para:** Claude Code, trabajando con **GitHub Spec Kit** (desarrollo guiado por especificaciones).
> **Adjuntos:** el export de **Claude Design** (pantallas, tokens y componentes). Es la **fuente de verdad visual**. Este documento es la fuente de verdad del **comportamiento y las restricciones**. Si se contradicen, avisa y pregunta; no elijas tú.
> **Fecha del brief:** 2026-10-19

---

## 0. Reglas de trabajo (leer primero)

1. **Verifica antes de usar.** Antes de elegir o instalar cualquier librería, revisa su documentación y versión actuales y cita la fuente en `plan.md` o en `research.md`. Las librerías nombradas aquí son **candidatas**, no decisiones cerradas, salvo las marcadas con ✅.
2. **No hay atajos.** Si encuentras un bug o un problema conocido, arréglalo o repórtalo; no lo dejes como "fuera de alcance".
3. **Si hay un trade-off real, preséntalo con evidencia** y deja que yo decida.
4. **Documenta lo que verifiques** en los artefactos de Spec Kit, para que el contexto no se pierda entre sesiones.

---

## 1. Contexto del producto

Es un clóset digital para **una sola persona**, como **regalo personal**. No se publica en ninguna tienda.

- La persona fotografía cada prenda, la app le **quita el fondo en el dispositivo** y la guarda con sus datos.
- Puede guardar fotos de cuerpo completo de sí misma, ya sin fondo: los **"maniquíes"**.
- En el **Armador**, las prendas recortadas se superponen en capas sobre el maniquí. Se pueden mover, escalar y rotar con gestos, y hay un "shuffle" al azar.
- Puede **guardar outfits**, asignarlos a **días del calendario**, marcar **"lo usé hoy"** y ver cuántas veces ha usado cada prenda.
- **La usuaria cose.** Por eso hay:
  - Prendas **"hechas por mí"** con datos de costura (tela y composición, molde, notas, fotos del proceso).
  - Un **Taller**: crea prendas **planeadas** rellenando una **silueta SVG** con la foto de una tela, y las prueba en el Armador junto a su ropa real. Estados: planeada → en proceso → terminada. Al terminarla, una foto real reemplaza la versión con silueta y la prenda pasa al Clóset sin perder su historia.
  - Un **perfil de medidas** corporales.
- **Sin IA generativa.** Solo se usa ML discriminativo en el dispositivo: segmentación para quitar fondos y, en v2, detección de pose.

## 2. Decisiones ya tomadas ✅ (no reabrir sin motivo fuerte)

| Decisión | Motivo |
|---|---|
| ✅ **PWA** instalada desde Safari con "Agregar a pantalla de inicio" | Va a un iPhone sin App Store. Con Apple ID gratis, una app nativa caduca a los 7 días; TestFlight y ad hoc cuestan USD 99 al año. El sideloading tipo APK no existe en Colombia. |
| ✅ **`"display": "standalone"` en el manifest** | Las web apps en la pantalla de inicio tienen su propio contador de uso y WebKit no espera borrar sus datos, pero solo en modo `standalone` o `fullscreen`. Con `minimal-ui` corren dentro de Safari y sí se borran (WebKit bug 232302). |
| ✅ **Local-first, sin backend** | Privacidad (las fotos nunca salen del teléfono) y costo cero. El hosting solo sirve archivos estáticos. |
| ✅ **Exportar e importar el respaldo en el MVP** | iOS puede liberar almacenamiento cuando el teléfono se llena; perder el clóset arruina el regalo. |
| ✅ **Quitar el fondo en el navegador** con `@imgly/background-removal` como primera candidata | Corre en el cliente sin servidor. La licencia es AGPL, aceptable porque es uso personal y no se distribuye. |
| ✅ **Interfaz en español** | Usuaria final. |
| ✅ **Costura "ligero + Taller"** (no un gestor completo de costura) | Apps existentes (Pattern Projects, Sew Help Me) ya cubren inventario de telas, moldes y mercería. Lo que ninguna hace es previsualizar una prenda por coser junto a la ropa propia; ese es el diferencial. |
| ✅ **Prenda planeada = silueta SVG rellena con la tela**, no generación de imagen | Se compone en canvas (máscara + patrón + sombreado), así que es determinista y no usa IA generativa. |

## 3. Riesgo #1: hacer un spike ANTES de `/speckit.plan`

**Hipótesis:** `@imgly/background-removal` corre en **Safari de iOS dentro de una PWA standalone**, con memoria y tiempo aceptables, en un iPhone de gama media.

**Prueba (una sola página, desechable):**
1. Página estática servida por HTTPS (local con túnel o en un hosting estático gratis), con manifest `standalone`.
2. Usar `<input type="file" accept="image/*">` para la galería y la cámara, en dos variantes: sin `capture` y con `capture="environment"`.
3. Quitar el fondo y mostrar el PNG resultante.
4. Medir el tiempo de la primera ejecución (incluye la descarga del modelo) y de las siguientes, y registrar si la pestaña se recarga o se cae por memoria.
5. Probar con fotos reales de la cámara del iPhone en resolución completa, y también redimensionando antes a ~1500 px en el lado mayor.
6. Verificar que el modelo y los WASM quedan en caché y que el recorte funciona **sin conexión** la segunda vez (decidir entre el CDN por defecto y auto-hospedar el modelo).
7. Documentar los resultados en `specs/.../research.md`.

**Si falla:** evaluar alternativas (otro modelo o tamaño, segmentación de MediaPipe, procesar a menor resolución) y **presentarme el trade-off** antes de continuar.

## 4. Flujo con Spec Kit

**Instalación** (verificar la sintaxis actual con `specify init --help`, porque los flags han cambiado entre versiones):

```bash
uvx --from git+https://github.com/github/spec-kit.git specify init outfit-app --ai claude
```

**Orden de comandos:**

### 4.1 `/speckit.constitution`

```text
/speckit.constitution Principios del proyecto:
1. Local-first y privado: ningún dato ni foto sale del dispositivo; sin backend, sin analítica, sin terceros en tiempo de ejecución salvo la descarga y caché de modelos.
2. Sin IA generativa. Solo ML en dispositivo (segmentación; pose en v2).
3. PWA instalable en iOS Safari en modo standalone; debe funcionar offline después de la primera carga.
4. Integridad de datos: export/import completo (imágenes + metadatos) desde el MVP; nunca perder datos en migraciones de esquema (migraciones versionadas y probadas).
5. Mobile-first para iPhone: áreas seguras, objetivos táctiles ≥44pt, gestos sin conflicto con el gesto de volver de iOS.
6. Fidelidad al diseño entregado por Claude Design (tokens y componentes); desviaciones documentadas.
7. Simplicidad: mínimas dependencias, cada una justificada con documentación verificada.
8. Calidad: pruebas para la lógica de datos (repositorios, migraciones, export/import) y para el motor de composición del Armador; validación manual en iPhone real antes de cerrar cada historia.
```

### 4.2 `/speckit.specify` (solo el qué y el porqué, sin tecnología)

```text
/speckit.specify App personal de clóset digital para decidir qué ponerse viendo outfits sobre una foto de una misma, sin IA generativa.

La usuaria fotografía cada prenda; la app quita el fondo automáticamente y guarda la prenda con categoría (top, bottom, vestido, calzado, abrigo, accesorio), color, temporada, ocasión y etiquetas libres. Si el recorte queda mal, puede corregirlo con un pincel/borrador simple o reintentar. Puede navegar y filtrar su clóset y editar o eliminar prendas.

Puede guardar una o más fotos de cuerpo completo ("maniquíes") sin fondo, tomadas con una guía de pose.

En el Armador elige prendas por zona del cuerpo; las prendas se superponen en capas sobre el maniquí, puede reordenar capas y mover, escalar y rotar cada prenda con gestos táctiles, restablecer la posición, deshacer, y usar "shuffle" para combinaciones al azar. Puede guardar el outfit con nombre y etiquetas.

La pantalla Hoy muestra el outfit asignado para hoy o sugiere uno al azar priorizando prendas no usadas recientemente. Puede asignar outfits a días del calendario (vista semana y mes), marcar "lo usé hoy" y ver conteo y última fecha de uso por prenda.

La usuaria cose. Puede marcar una prenda como "hecha por mí" y registrar tela, composición, molde usado, notas de ajustes y fotos del proceso.

En el Taller puede crear prendas planeadas: toma o elige una foto de tela, elige una silueta de prenda de una biblioteca, la app rellena la silueta con la tela, y ella ajusta escala y posición del estampado. Las prendas planeadas aparecen en el Armador (marcadas como planeadas) para combinarlas con su ropa. Cada prenda del Taller tiene estado planeada → en proceso → terminada; al terminarla puede tomar la foto real, que reemplaza la versión de silueta, y la prenda pasa al clóset conservando su historia.

Tiene un perfil de medidas corporales con campos comunes de costura, campos personalizados y fecha de última actualización.

Todo se guarda en el dispositivo. Puede exportar e importar un respaldo completo y ve un recordatorio suave si hace tiempo no respalda. Incluye onboarding de menos de 2 minutos con dedicatoria opcional.

Fuera de alcance: probador generativo, cuentas, social, tienda, clima, estadísticas avanzadas, listas de viaje, inventario de telas con metraje, biblioteca de moldes PDF, mercería y listas de compra.
```

### 4.3 `/speckit.clarify`

Córrelo **antes** del plan. Las ambigüedades que espero que salgan (si no salen, plantéalas tú):
- ¿Qué pasa con los outfits guardados cuando se elimina una prenda que está en ellos?
- ¿Cómo se coloca una prenda automáticamente sobre el maniquí en el MVP (sin pose)? Por ejemplo, zonas fijas relativas a la altura del maniquí.
- ¿Se guardan las transformaciones de cada prenda por outfit y también por maniquí?
- Límites esperados: hasta unas 300 prendas, 5 maniquíes y unos 200 outfits.
- Formato y versión del archivo de respaldo, y qué pasa al importar sobre datos existentes (reemplazar o fusionar).
- ¿Se conserva la foto original además del recorte? (Afecta el espacio y la posibilidad de re-recortar.)
- Prenda planeada: ¿la tela se repite como mosaico dentro de la silueta o se estira una sola vez? (Recomendado: mosaico con escala ajustable, porque así se comportan los estampados reales.)
- Al marcar una prenda planeada como terminada, ¿los outfits que la usaban conservan su transformación al cambiar de la silueta a la foto real?
- ¿Una prenda en proceso puede usarse en outfits y en el calendario, o solo las terminadas y las planeadas?
- Medidas: ¿unidad fija en cm o seleccionable? ¿Se guarda historial o solo el valor actual?

### 4.4 `/speckit.plan` (stack y arquitectura)

Mi propuesta de partida, **para comparar con la tuya**. Verifica cada punto:

| Área | Candidata | Qué verificar |
|---|---|---|
| Framework | React + Vite + TypeScript | Versiones actuales |
| PWA | Plugin PWA para Vite (manifest + service worker) | Compatibilidad con iOS, estrategia de caché de los modelos |
| Persistencia | IndexedDB con un wrapper (p. ej. Dexie) guardando las imágenes como Blob | Límites de cuota en iOS, `navigator.storage.persist()` y `estimate()` en Safari |
| Quitar fondo | `@imgly/background-removal` ✅ (sujeto al spike) | Resultado del spike, auto-hospedar el modelo para uso offline |
| Lienzo con gestos | Konva/react-konva o Fabric.js | Soporte de pinch y rotate en Safari táctil, rendimiento con unas 8 capas PNG |
| Corrección del recorte | Pincel y borrador sobre un canvas de máscara | Que la máscara se aplique sin perder resolución |
| Prenda planeada (Taller) | Canvas 2D: la silueta SVG como trazo de recorte, la tela como patrón repetido con transformación (escala y desplazamiento) y la capa de sombreado encima con un modo de fusión tipo *multiply* | Soporte en Safari de iOS para usar un `Path2D` desde el SVG y para el modo de fusión. Exportar el resultado a PNG para reutilizar el mismo pipeline del Armador |
| Respaldo | ZIP (imágenes + JSON con versión de esquema) | Librería ZIP en el cliente; en iOS, descarga con `<a download>` o Web Share API con archivos |
| Hosting | GitHub Pages, Netlify o Vercel (estático, HTTPS) | Rutas SPA, headers para WASM |

**El plan debe resolver explícitamente:**
- Una interfaz `TryOnRenderer` (o equivalente) para el Armador. Así se puede enchufar en v2 el anclaje automático por pose (MediaPipe Pose Landmarker) sin reescribir.
- El modelo de datos con versión de esquema y migraciones. Debe contemplar: origen de la prenda (comprada / hecha por mí), estado del Taller (planeada / en proceso / terminada), datos de costura, referencia a silueta y tela con los parámetros del estampado, historial de imágenes de la prenda (silueta → foto real) y el perfil de medidas.
- Que el Armador trate igual a una prenda planeada y a una real: ambas entregan un PNG con transparencia y metadatos. El Armador no debe saber cómo se generó la imagen.
- El presupuesto de rendimiento: redimensionar las imágenes al importarlas, miniaturas para las grillas y un tope de resolución para los recortes.
- La estrategia offline del service worker (app shell + modelo).
- Cómo se valida en un iPhone real durante el desarrollo.

### 4.5 `/speckit.tasks` → `/speckit.analyze` → `/speckit.implement`

- Corre `/speckit.analyze` siempre antes de implementar.
- Implementa **por historia de usuario completa** y valida cada una en un iPhone real antes de seguir.
- Orden sugerido: datos y respaldo → agregar prenda (recorte) → clóset → maniquí → armador → outfits → calendario y Hoy → **Taller (prenda planeada → terminada)** → medidas → onboarding → pulido visual.

## 5. Cómo usar el export de Claude Design

- Extrae los **tokens** (colores en claro y oscuro, tipografía, espaciado, radios, sombras) a variables CSS o a un archivo de tema **antes** de construir pantallas.
- Construye los **componentes** del export como piezas reutilizables y luego arma las pantallas con ellos.
- Respeta los nombres de pantallas y componentes del diseño en el código.
- Si el diseño no cubre un estado (vacío, error o carga), impleméntalo con los mismos tokens y **anótalo** para que se revise después en Design.

## 6. Criterios de aceptación del MVP

- [ ] Se instala desde Safari ("Agregar a pantalla de inicio") y abre en pantalla completa con ícono y splash propios.
- [ ] Funciona **sin conexión** después de la primera carga, incluido el recorte de fondos.
- [ ] Agregar una prenda desde la cámara o la galería, con recorte automático, toma pocos segundos en un iPhone real (anotar el tiempo medido) y permite corregir el recorte.
- [ ] El Armador permite mover, escalar y rotar prendas con fluidez, sin activar el gesto de volver de iOS.
- [ ] Guardar un outfit y asignarlo a un día; la pantalla Hoy lo muestra.
- [ ] "Lo usé hoy" actualiza el conteo y la última fecha de uso de cada prenda.
- [ ] Crear una prenda planeada (foto de tela + silueta), ajustar la escala del estampado y usarla en un outfit junto a prendas reales.
- [ ] Marcar una prenda planeada como terminada con su foto real: pasa al Clóset como "hecha por mí", conserva tela, molde y notas, y los outfits que la usaban siguen funcionando.
- [ ] El perfil de medidas se puede editar y consultar en dos toques.
- [ ] Un respaldo exportado se puede importar en una instalación limpia y restaura **todo**, incluidos Taller, siluetas personalizadas y medidas (verificado).
- [ ] Modo claro y modo oscuro completos en todas las pantallas. Por defecto sigue el sistema, y en Ajustes hay un selector Sistema · Claro · Oscuro que se guarda en el dispositivo. El cambio se aplica al instante y sin parpadeo al abrir la app (el tema se resuelve antes del primer pintado).
- [ ] Prendas negras y blancas se distinguen bien en ambos modos, en las tarjetas y en el Armador (verificado con prendas reales).
- [ ] Se respetan las áreas seguras en iPhone SE y en Pro Max, en ambos modos.
- [ ] Ningún request de red en tiempo de uso, salvo la carga inicial de la app y del modelo (verificado con el inspector de red).

## 7. Entrega e instalación

1. Desplegar en un hosting estático con HTTPS.
2. Abrir la URL en **Safari** del iPhone → Compartir → **Agregar a pantalla de inicio**.
3. Escribir una mini guía de una página para la persona que recibe el regalo: cómo instalarla y **cómo hacer un respaldo**.

## 8. Fuera de alcance (no implementar)

Probador generativo, cuentas o login, sincronización, funciones sociales, tienda, clima, estadísticas avanzadas, listas de viaje, analítica o tracking. De costura: inventario de telas con metraje, biblioteca de moldes PDF, mercería y listas de compra (ya existen apps que lo resuelven).

## 9. Referencias verificadas (2026-10-19)

- [Spec Kit: comandos y flujo (Microsoft Learn)](https://learn.microsoft.com/en-us/training/modules/spec-driven-development-github-spec-kit-greenfield-intro/8-examine-github-spec-kit-commands-results?pivots=text)
- [Spec Kit: lista de slash commands (PR de documentación)](https://github.com/github/spec-kit/pull/937.diff)
- [@imgly/background-removal (npm)](https://npmjs.com/package/@imgly/background-removal)
- [MediaPipe Pose Landmarker para web (v2)](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js?authuser=1)
- [WebKit: contador propio de 7 días para apps en la pantalla de inicio](https://mjtsai.com/blog/2020/03/26/safari-13-1-third-party-cookie-blocking-and-7-day-script-writeable-storage/)
- [WebKit Bugzilla 232302: requiere standalone o fullscreen](https://bugs.webkit.org/show_bug.cgi?id=232302)
- [Instalar apps propias con Xcode: 7 días con Apple ID gratis](https://flaviocopes.com/install-iphone-apps/)
- [Expo: TestFlight requiere cuenta paga y los builds caducan a 90 días](https://docs.expo.dev/submit/testflight.md)
- [Pattern Projects (App Store): telas, proyectos y medidas para costura](https://apps.apple.com/us/app/-/id6754258425)
- [Sew Help Me: telas, moldes, mercería y proyectos](https://mwm.ai/apps/sew-help-me/1515971634)
