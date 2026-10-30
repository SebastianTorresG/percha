# Pruebas intensivas de Percha

Plan para probar la app a fondo en el iPhone, buscando que se rompa. Complementa los escenarios
de [`quickstart.md`](../specs/001-percha-closet-taller/quickstart.md), que son el recorrido básico
de cada historia. Aquí están los casos raros, los bordes y el estrés.

- **Parte A**: lo que ya está construido. Se puede correr hoy.
- **Parte B**: una sección por historia. Se corre cuando la historia esté hecha.
- **Parte C**: volumen, estrés y regresión antes de entregar el regalo.
- **Parte D**: privacidad y datos.

## Cómo usar este documento

1. Antes de empezar, anota en el *Registro* (al final) la fecha, el modelo de iPhone, la versión
   de iOS y la versión de Percha (aparece al final de **Ajustes**, por ejemplo "Percha 0.1.0").
2. Cada prueba tiene un ID (A3.4, B2.10…), los pasos y lo que debería pasar. Márcala:
   - ✅ pasó
   - ❌ falló (anota qué pasó y, si puedes, toma una captura)
   - ⏭ no se pudo probar (anota por qué)
3. Para reportar, pásale a Claude los IDs que fallaron con lo que viste. Si algo raro pasó,
   abre el **panel de diagnóstico** (tocar 5 veces la versión en Ajustes) y haz captura de la
   sección *Eventos*.
4. Todo bug se arregla o queda como tarea en `tasks.md`; nada se deja como "fuera de alcance".

### Lo que ya corre solo en la computadora

`npm run test:e2e` recorre en el WebKit de Playwright (el motor de Safari), con los perfiles de
iPhone 15, SE y Pro Max, todo lo de la Parte A que no necesita el teléfono físico: temas, navegación,
menú, Ajustes, exportar e importar (con la hoja de compartir simulada), copia automática, aviso de
Hoy, diagnóstico, modo avión, toques al azar y A14 con los respaldos de prueba. Cada prueba de
`tests/e2e/` lleva en su nombre los IDs de este plan. Lo que depende del iPhone de verdad (instalar,
splash, gestos del sistema, hoja de compartir real, Archivos e iCloud, llamadas, VoiceOver, batería)
sigue siendo manual.

`npm run test:desplegada` hace lo mismo **contra la app publicada**: despliega en `percha-preview`,
espera a que Cloudflare sirva la versión nueva y corre todas las pruebas contra esa URL, más:

- **Despliegue** (`tests/e2e/despliegue.spec.ts`): HTTPS con COOP/COEP y sin caché en la página;
  cada archivo del precache con su tipo y su caché; manifest; ícono de inicio de 180 × 180 sin
  transparencia (iOS la pinta de negro); cada splash de iOS con su tamaño y el fondo del tema (A1.3,
  A1.4); las 10 fuentes; y que lo que no existe responda 404 y no la app.
- **Visual** (`tests/e2e/visual.spec.ts`): cada estado de la app en claro y oscuro, en los tres
  perfiles, con la isla y el indicador de inicio simulados, pasa por detectores de bugs visuales
  (desbordes, textos cortados o encimados, controles fuera de la pantalla, tapados o bajo la isla,
  la barra tapando contenido, fuentes que no cargaron, letra muy chica) y se compara con su captura
  de referencia. También a 320 de ancho (Zoom de pantalla, A16.14) y en horizontal (A12.2).
  Contraste por debajo de WCAG AA y objetivos táctiles de menos de 44 px van como avisos.

Al terminar escribe `docs/reportes/pruebas-desplegada.md` con las fallas, los bugs y avisos visuales
y cómo seguir, listo para pasarle a otra sesión. Con `--sin-desplegar` prueba lo que ya está
publicado; con `--local`, el build local.

### Lo que conviene tener a mano

- El iPhone con Safari y la app instalada desde
  **https://percha-preview.percha-spike-recorte.workers.dev**.
- iCloud Drive activado en Archivos.
- En Archivos, una carpeta "Pruebas Percha" con:
  - una foto JPEG cualquiera y un PDF cualquiera;
  - un ZIP que no sea de Percha (por ejemplo, comprime dos fotos en Archivos: mantener presionado
    → Comprimir);
  - un respaldo de Percha (se crea en A7.1).
- Para la Parte B: ropa real (una prenda negra, una blanca, una estampada, una con transparencias,
  zapatos, un accesorio chico), una tela estampada y espacio para tomarte la foto del maniquí.

### Reiniciar la app desde cero

Borrar la app **borra todos sus datos**. Antes, exporta un respaldo si hay algo que quieras
conservar.

1. Mantén presionado el ícono de Percha → **Eliminar app** → **Eliminar**.
2. **Ajustes de iOS → Apps → Safari → Avanzado → Datos de sitios web**, busca
   `workers.dev` y bórralo.
3. Vuelve a instalar desde Safari (A1.1).

---

## Parte A — Lo que ya está construido

Hoy funcionan la instalación, los temas, la navegación, el menú, Ajustes con el respaldo
(exportar, importar, copia automática, espacio) y el panel de diagnóstico. Las pestañas Clóset,
Taller y Outfits todavía están vacías.

Las pruebas marcadas **[con datos]** necesitan un respaldo que traiga prendas. Mientras no exista la
Historia 2, usa los archivos de [`respaldos-de-prueba/`](respaldos-de-prueba/README.md): el
**completo** (20 prendas, del 1 de octubre) y el **chico** (3 prendas, del 28 de octubre). La
sección A14 los recorre paso a paso.

### A1. Instalación (T038)

| ID | Pasos | Esperado | ✓ |
|---|---|---|---|
| A1.1 | En Safari abre la URL → Compartir → Agregar a pantalla de inicio → Agregar | Aparece el ícono de Percha con su nombre | |
| A1.2 | Abre Percha desde el ícono | Pantalla completa, sin barra de Safari ni de direcciones | |
| A1.3 | Mira el arranque con el iPhone en modo claro | La pantalla de inicio (splash) y el fondo son claros, sin destello blanco o negro | |
| A1.4 | Repite A1.3 con el iPhone en modo oscuro (cierra la app del todo antes) | Splash y fondo oscuros, sin destello claro | |
| A1.5 | Abre el selector de apps (deslizar hacia arriba y mantener) | Percha aparece como una app aparte, con su ícono | |
| A1.6 | Arriba de todo, mira la barra de estado (hora, batería) | Se lee bien sobre el fondo en los dos modos | |
| A1.7 | Abre la misma URL en una pestaña normal de Safari | Funciona, pero sus datos son **otros**: lo de la app instalada no aparece ahí. Anótalo como comportamiento de iOS, no como bug | |
| A1.8 | Abre la URL en una pestaña **privada** de Safari | Abre; anota qué pasa en Ajustes → Exportar. Ahí iOS no deja guardar fotos (research R-14) | |

### A2. Temas claro y oscuro

| ID | Pasos | Esperado | ✓ |
|---|---|---|---|
| A2.1 | Con la app abierta en Hoy, cambia el modo del iPhone desde el Centro de control | La app cambia de tema al instante, sin recargar | |
| A2.2 | Tema claro: mira títulos y botones | Títulos en serif con remates finos (Cormorant), etiquetas en minúscula, esquinas redondeadas | |
| A2.3 | Tema oscuro: mira títulos y botones | Títulos en Bodoni, etiquetas en MAYÚSCULAS espaciadas, esquinas casi rectas | |
| A2.4 | En oscuro, cierra la app del todo y ábrela | Abre directo en oscuro, sin un instante claro | |
| A2.5 | Programa el cambio automático claro/oscuro de iOS y deja la app abierta al cruzar la hora | Cambia sola | |
| A2.6 | Abre el menú ⋯ y Ajustes en los dos modos | Todo legible: nada de texto oscuro sobre fondo oscuro | |

### A3. Sin conexión y red

| ID | Pasos | Esperado | ✓ |
|---|---|---|---|
| A3.1 | Abre la app con conexión, ciérrala, activa **modo avión** y ábrela | Abre normal, con sus fuentes (no letras del sistema) | |
| A3.2 | En modo avión, recorre Hoy, Clóset, Taller, Outfits, el menú, Ajustes, Mis maniquíes y Mis medidas | Todo abre, sin pantallas en blanco ni errores | |
| A3.3 | En modo avión, panel de diagnóstico → *Red y aislamiento* | "Desde la red: página 0 · workers 0" después de abrir en modo avión | |
| A3.4 | En modo avión, exporta un respaldo | Funciona igual: no necesita internet | |
| A3.5 | En modo avión, importa un respaldo | Funciona igual | |
| A3.6 | Con Wi-Fi lento o datos con mala señal, abre la app | Abre rápido desde la caché; no espera a la red | |
| A3.7 | Panel de diagnóstico: *crossOriginIsolated* y *Service worker* | "sí", y el service worker "activo" y "controla la página" | |

### A4. Navegación

| ID | Pasos | Esperado | ✓ |
|---|---|---|---|
| A4.1 | Toca cada pestaña: Hoy, Clóset, Taller, Outfits | Cambia la pantalla y se marca la pestaña activa | |
| A4.2 | Toca la misma pestaña dos veces | No pasa nada raro (no se duplica ni parpadea) | |
| A4.3 | Toca **+** | Abre "Agregar prenda" (todavía vacía) y tiene ‹ para volver | |
| A4.4 | Hoy → ⋯ → Ajustes y respaldo → Mis maniquíes → ‹ → ‹ | Vuelve paso a paso: Mis maniquíes → Ajustes → Hoy | |
| A4.5 | Toca ‹ muy rápido varias veces seguidas | Vuelve una pantalla por toque, sin saltarse ni quedar en blanco | |
| A4.6 | Abre Ajustes, deja la app en segundo plano 10 minutos y vuelve | Sigue en Ajustes | |
| A4.7 | Abre Ajustes, cierra la app del todo (deslizar hacia arriba) y ábrela | Abre en Hoy o en Ajustes; en cualquier caso, ‹ funciona y no queda atascada | |
| A4.8 | Desliza desde el borde izquierdo de la pantalla | Anota qué hace: no debe dejar la app en una pantalla rota | |
| A4.9 | Baja en una pantalla larga (Ajustes), abre otra encima y vuelve | Ajustes conserva dónde estabas | |
| A4.10 | Toca rápido dos botones distintos casi a la vez (por ejemplo ⋯ y una pestaña) | Termina en una sola pantalla coherente | |

### A5. Menú ⋯ (01c)

| ID | Pasos | Esperado | ✓ |
|---|---|---|---|
| A5.1 | Hoy → ⋯ | Sube una hoja con Mis maniquíes, Mis medidas y Ajustes y respaldo, cada uno con su subtítulo | |
| A5.2 | Sin datos, mira los subtítulos | "Todavía no hay fotos", "Todavía sin medidas", "Todavía no hay respaldo" | |
| A5.3 | Después de exportar un respaldo (A7.1), abre ⋯ | "Último respaldo: [fecha de hoy]" | |
| A5.4 | Cierra la hoja arrastrándola hacia abajo | Baja y se cierra | |
| A5.5 | Arrástrala poco y suelta | Vuelve a su lugar, sin cerrarse | |
| A5.6 | Ciérrala tocando la zona oscura de arriba | Se cierra | |
| A5.7 | Toca una fila | La hoja baja y después se abre la pantalla | |
| A5.8 | Abre y cierra la hoja 15 veces seguidas rápido | Nunca queda una hoja trabada ni la pantalla oscurecida sin hoja | |
| A5.9 | Con un teclado conectado al iPhone: abre ⋯, toca la zona oscura justo mientras la hoja sube y luego pulsa Escape | La hoja se cierra con Escape (si el toque no la cerró) | |

### A6. Ajustes (09)

| ID | Pasos | Esperado | ✓ |
|---|---|---|---|
| A6.1 | Abre Ajustes y compara con el diseño 09 | Tarjetas Respaldo, Espacio y la lista Mis maniquíes / Mis medidas; la versión al final | |
| A6.2 | Sin respaldo previo, lee la tarjeta Respaldo | "Todavía no hay respaldo. Guárdalo en Archivos o iCloud para no perder tu clóset." | |
| A6.3 | Mira *Espacio* | Un tamaño en MB y "0 prendas · 0 outfits · 0 maniquíes" (con la app vacía) | |
| A6.4 | Mira "Almacenamiento protegido" | Anota "sí" o "no". Debería ser "sí" en la app instalada; si dice "no", repórtalo | |
| A6.5 | Toca Mis maniquíes y Mis medidas | Abren sus pantallas (todavía vacías) | |
| A6.6 | Toca la versión 5 veces seguidas | Abre el panel de diagnóstico | |
| A6.7 | Toca la versión 4 veces, espera 3 segundos y toca 1 más | No abre el panel | |
| A6.8 | Después de una actualización publicada, abre Ajustes | Aparece "Hay una versión nueva de Percha." con "Actualizar"; al tocarlo, recarga con la versión nueva | |
| A6.9 | Con **Ajustes de iOS → Accesibilidad → Tamaño del texto** al máximo | Anota cómo se ve: nada debe quedar cortado ni encimado | |

### A7. Exportar respaldo

| ID | Pasos | Esperado | ✓ |
|---|---|---|---|
| A7.1 | Ajustes → **Exportar** | "Preparando…" y luego la hoja de compartir de iOS con el archivo `Percha-respaldo-AAAA-MM-DD.zip` | |
| A7.2 | En la hoja, elige **Guardar en Archivos** → iCloud Drive → Pruebas Percha → Guardar | El archivo queda en Archivos. Anota tamaño y cuánto tardó | |
| A7.3 | Vuelve a Ajustes | "Último respaldo: [hoy]." | |
| A7.4 | Exportar → en la hoja de compartir toca la X (cancelar) | No pasa nada; la fecha del último respaldo **no** cambia | |
| A7.5 | Exportar → Guardar en Archivos → en el selector toca **Cancelar** | Anota si la fecha cambió (iOS puede contar como "compartido" haber elegido la acción) | |
| A7.6 | Si en vez de la hoja aparece el botón **Guardar respaldo** | Tócalo: abre la hoja con el archivo ya listo. Anota cuándo pasó | |
| A7.7 | Exporta dos veces el mismo día | Archivos guarda el segundo como "… 2" o pregunta si reemplazar; los dos sirven | |
| A7.8 | Exportar → compartir por AirDrop a una Mac, o por Mail a ti | Llega un .zip que se puede abrir y tiene `manifest.json`, `datos.json` y la carpeta `imagenes` | |
| A7.9 | En Archivos, toca el ZIP exportado | Archivos lo descomprime y se ven los archivos de adentro | |
| A7.10 | Toca Exportar dos veces muy rápido | Se arma un solo archivo; el botón queda deshabilitado mientras prepara | |
| A7.11 | Exportar y, mientras dice "Preparando…", manda la app a segundo plano y vuelve | Termina bien, o se puede volver a tocar Exportar sin errores | |
| A7.12 | **[con datos]** Exporta con muchas prendas | Anota tamaño y tiempo; la app no se cierra sola | |
| A7.13 | **[con datos]** Si aparece **Guardar respaldo** (A7.6), no lo toques: importa otro respaldo y confirma **Reemplazar todo** | "Listo: se restauró…"; el botón vuelve a ser **Exportar** (el archivo de antes ya no sirve). Si cancelas el reemplazo, **Guardar respaldo** sigue | |

### A8. Importar respaldo

| ID | Pasos | Esperado | ✓ |
|---|---|---|---|
| A8.1 | Con la app vacía: Ajustes → **Importar** → elige el respaldo de A7.2 | "Revisando el respaldo…" y luego "Listo: se restauró el respaldo del [fecha]." Sin pedir confirmación | |
| A8.2 | Importar → en el selector toca **Cancelar** | No pasa nada | |
| A8.3 | Importar la foto JPEG | "Este archivo no es un respaldo de Percha." | |
| A8.4 | Importar el PDF | Mismo mensaje. Si el selector no deja elegirlo, anótalo como ⏭ | |
| A8.5 | Importar el ZIP de fotos que no es de Percha | "Este archivo no es un respaldo de Percha." | |
| A8.6 | En Archivos descomprime un respaldo, vuelve a comprimir esa carpeta e importa el ZIP nuevo | Se importa igual: "Listo: se restauró…" | |
| A8.7 | Renombra un respaldo (por ejemplo `mi-closet.zip`) e impórtalo | Se importa igual: el nombre no importa | |
| A8.8 | Descomprime un respaldo, borra una foto de la carpeta `imagenes`, comprime e importa | "El respaldo está dañado y no se puede usar. Tus datos no cambiaron." | |
| A8.9 | Descomprime un respaldo, borra `datos.json`, comprime e importa | Mensaje de dañado; los datos no cambian | |
| A8.10 | Importa el mismo respaldo dos veces seguidas | La segunda vez [con datos] pide confirmar; todo queda igual que tras la primera | |
| A8.11 | **[con datos]** Con datos en la app, importa otro respaldo | Hoja "¿Reemplazar todo con este respaldo?" con la fecha del respaldo y "Antes guardaremos una copia de lo actual en el teléfono." | |
| A8.12 | **[con datos]** En esa hoja toca **Cancelar** | Nada cambia y no se crea copia automática | |
| A8.13 | **[con datos]** Cierra esa hoja arrastrándola hacia abajo | Igual que cancelar | |
| A8.14 | **[con datos]** Confirma **Reemplazar todo** | "Importando… No cierres Percha." y luego "Listo…"; Espacio y los conteos cambian a los del respaldo | |
| A8.15 | **[con datos]** Durante "Importando…", cierra la app del todo y ábrela | Quedan **o** los datos de antes **o** los del respaldo, nunca una mezcla; Ajustes abre sin errores | |
| A8.16 | **[con datos]** Durante "Importando…", recibe una llamada o bloquea el iPhone | Al volver terminó bien, o quedaron los datos de antes completos | |
| A8.17 | Importa un respaldo con la app en tema claro cuando el respaldo se hizo en oscuro (cuando exista el selector de US10) | La app aplica la apariencia del respaldo | |

### A9. Copia automática

Necesita datos: se crea al importar sobre una app que ya tenía algo.

| ID | Pasos | Esperado | ✓ |
|---|---|---|---|
| A9.1 | **[con datos]** Después de A8.14, mira la tarjeta Respaldo | "Antes de importar se guardó una copia automática de lo que había (N MB)", "Restaurar el respaldo automático del [fecha]" y "Exportarlo" | |
| A9.2 | **[con datos]** Toca **Restaurar…** → **Cancelar** | No cambia nada | |
| A9.3 | **[con datos]** Toca **Restaurar…** → **Restaurar** | Vuelven los datos de antes de importar; "Listo: se restauró la copia automática…" | |
| A9.4 | **[con datos]** Restaura otra vez | Vuelven los datos del respaldo importado: restaurar se deshace | |
| A9.5 | **[con datos]** Toca **Exportarlo** y guárdalo en Archivos | Se guarda `Percha-copia-automatica-AAAA-MM-DD.zip`; "Último respaldo" **no** cambia | |
| A9.6 | **[con datos]** Importa ese archivo de copia automática | Se importa como cualquier respaldo | |
| A9.7 | **[con datos]** Importa tres respaldos seguidos sobre datos | Siempre hay **una** sola copia automática, la más reciente | |
| A9.8 | **[con datos]** Mira *Espacio* antes y después de que exista la copia automática | La barra muestra una segunda parte (gris) para la copia | |

### A10. Aviso de respaldo en Hoy

| ID | Pasos | Esperado | ✓ |
|---|---|---|---|
| A10.1 | Con la app vacía, abre Hoy | No hay aviso | |
| A10.2 | **[con datos]** Importa un respaldo con prendas cuya fecha tenga más de 14 días | Hoy muestra "Tu último respaldo fue hace N semanas." con **Respaldar** | |
| A10.3 | **[con datos]** Toca **Respaldar** y guarda en Archivos | El aviso desaparece | |
| A10.4 | **[con datos]** Toca Respaldar y cancela la hoja | El aviso sigue | |
| A10.5 | **[con datos]** Deja la app abierta en Hoy hasta pasada la medianoche (o cambia la fecha del iPhone) | La fecha de arriba cambia sola al volver a la app | |
| A10.6 | Con datos y un respaldo de hace exactamente 14 días | Todavía no avisa; al día 15 sí | |
| A10.7 | **[con datos]** Si el aviso dice "Tu respaldo está listo." con **Guardarlo**, ve a Ajustes e importa un respaldo viejo (más de 14 días) | Al volver a Hoy, el aviso vuelve a decir "Tu último respaldo fue hace N semanas." con **Respaldar** | |

### A11. Panel de diagnóstico e integridad

| ID | Pasos | Esperado | ✓ |
|---|---|---|---|
| A11.1 | Abre el panel (A6.6) y revisa cada sección | Almacenamiento, Red y aislamiento, Componentes, Integridad y Eventos con datos, sin "…" eternos | |
| A11.2 | *Integridad* con la app vacía | Imágenes 0, sin referencia 0, referencias rotas 0 | |
| A11.3 | **[con datos]** *Integridad* después de importar | Referencias rotas 0 | |
| A11.4 | Toca **Verificar otra vez** | Cambia la hora de *Revisado* | |
| A11.5 | Después de importar un archivo malo (A8.3), mira *Eventos* | Aparece "Respaldo rechazado (…)" con el motivo | |
| A11.6 | *URLs vivas* después de navegar mucho | Un número chico que no crece sin parar | |

### A12. Pantalla, accesibilidad y robustez

| ID | Pasos | Esperado | ✓ |
|---|---|---|---|
| A12.1 | En cada pantalla, mira arriba (isla o notch) y abajo (barra de inicio) | Nada tapado; la barra de pestañas queda por encima del indicador de inicio | |
| A12.2 | Gira el iPhone en horizontal | Anota qué pasa; no debe quedar inusable | |
| A12.3 | **Accesibilidad → Movimiento → Reducir movimiento** activado, abre y cierra hojas | Las hojas aparecen con un fundido, sin deslizarse | |
| A12.4 | Activa **VoiceOver** y recorre Hoy y Ajustes | Cada botón se lee en español con un nombre que se entiende ("Menú", "Volver", "Agregar prenda"…) | |
| A12.5 | **Modo de bajo consumo** activado | Todo funciona igual | |
| A12.6 | Con el iPhone casi sin espacio libre, importa un respaldo grande **[con datos]** | Mensaje "No hay espacio en el teléfono…" o importa bien; nunca datos a medias | |
| A12.7 | Deja la app sin abrir 3 días y ábrela | Abre normal, con los datos intactos | |
| A12.8 | Reinicia el iPhone y abre la app | Datos intactos | |
| A12.9 | Actualiza iOS (si hay versión nueva) y abre la app | Datos intactos | |
| A12.10 | Toca muchos botones muy rápido en todas las pantallas durante un minuto | Ningún error, pantalla en blanco ni cierre | |

### A13. Spike del recorte (T002)

Sigue las instrucciones de la página del spike y pega el resultado de **Copiar resultados**. Las
pruebas del recorte dentro de la app están en B2.

### A14. Con los respaldos de prueba

Usa los archivos de [`respaldos-de-prueba/`](respaldos-de-prueba/README.md). Empieza con la app vacía.

| ID | Pasos | Esperado | ✓ |
|---|---|---|---|
| A14.1 | Con la app vacía, importa `Percha-respaldo-2026-10-01.zip` (el completo) | Sin confirmación; "Listo: se restauró el respaldo del 1 de octubre." | |
| A14.2 | Ajustes → Espacio | "20 prendas · 4 outfits · 2 maniquíes" | |
| A14.3 | Ajustes → Respaldo | "Último respaldo: 1 de octubre." | |
| A14.4 | Ve a Hoy | "Tu último respaldo fue hace N semanas." con Respaldar (el 30 de octubre dice 4 semanas) | |
| A14.5 | Hoy → ⋯ | "2 fotos · principal: Con tenis", "Actualizadas el 3 de octubre", "Último respaldo: 1 de octubre" | |
| A14.6 | Panel de diagnóstico → Verificar otra vez | Unas 70 imágenes; sin referencia 0; rotas 0 | |
| A14.7 | Importa encima `Percha-respaldo-2026-10-28.zip` (el chico) | Hoja de confirmación: "…por el contenido del respaldo del 28 de octubre. Antes guardaremos una copia de lo actual en el teléfono." | |
| A14.8 | Toca **Reemplazar todo** | "3 prendas · 1 outfit · 1 maniquí"; aparece la copia automática con la fecha de hoy; Hoy ya no avisa | |
| A14.9 | Hoy → ⋯ | "1 foto · principal: Frente", "Todavía sin medidas", "Último respaldo: 28 de octubre" | |
| A14.10 | Ajustes → Restaurar el respaldo automático → Restaurar | Vuelve a "20 prendas · 4 outfits · 2 maniquíes", "Último respaldo: 1 de octubre" y el aviso en Hoy | |
| A14.11 | Restaura otra vez | Vuelve el chico (3 · 1 · 1): restaurar se deshizo | |
| A14.12 | Importa `Percha-respaldo-version-nueva.zip` | "Este respaldo es de una versión más nueva de Percha…"; los conteos y la copia automática no cambian | |
| A14.13 | Importa `Percha-respaldo-danado.zip` | "El respaldo está dañado y no se puede usar. Tus datos no cambiaron."; nada cambia | |
| A14.14 | Con el completo cargado, Exportar y guardar en Archivos | "Último respaldo" pasa a hoy y el aviso de Hoy desaparece | |
| A14.15 | Compara en Archivos el tamaño del exportado con el completo original (~97 KB) | Parecido | |
| A14.16 | Reinicia la app desde cero e importa el archivo de A14.14 | 20 · 4 · 2 y "Último respaldo" de hoy | |
| A14.17 | Con el completo cargado, cierra la app del todo y ábrela | Conteos intactos | |
| A14.18 | Importa el completo en modo avión | Funciona igual | |
| A14.19 | Importa el completo 5 veces seguidas, confirmando cada vez | Siempre 20 · 4 · 2 y una sola copia automática | |
| A14.20 | Toca **Exportarlo** en la copia automática y guarda el archivo | `Percha-copia-automatica-AAAA-MM-DD.zip`; "Último respaldo" no cambia | |
| A14.21 | Reinicia desde cero e importa ese archivo de copia automática | Se importa como cualquier respaldo | |
| A14.22 | Importa el chico, luego el completo y restaura | Queda el chico | |
| A14.23 | Mientras dice "Revisando el respaldo…", intenta tocar Importar o Exportar | Están deshabilitados | |
| A14.24 | Repite A14.7 a A14.13 con el iPhone en modo oscuro | Mensajes y hojas legibles | |
| A14.25 | Con la copia automática presente, mira la barra de Espacio | Tiene una segunda franja más clara para la copia | |
| A14.26 | Con el chico cargado, cambia la fecha del iPhone al 10 de octubre (antes del respaldo) y abre Hoy | Sin aviso y sin errores | |
| A14.27 | Con el chico cargado, cambia la fecha al 13 de noviembre y abre Hoy | "Tu último respaldo fue hace 2 semanas." | |
| A14.28 | Vuelve a poner la fecha automática | Todo normal; la fecha de Hoy es la real | |
| A14.29 | Con la app vacía, importa el chico, **cierra la app del todo** (deslizar hacia arriba), ábrela y exporta | El archivo pesa como el chico (~17 KB), no 200 KB, y se vuelve a importar sin "dañado". Confirma en el iPhone el arreglo del 30 de octubre (research R-14) | |

### A15. Archivos e iCloud

| ID | Pasos | Esperado | ✓ |
|---|---|---|---|
| A15.1 | Importa desde iCloud Drive un respaldo que no está descargado (ícono de nube) | Lo descarga y lo importa, o avisa; nunca queda colgada | |
| A15.2 | Exporta a "En mi iPhone" e importa desde ahí | Funciona | |
| A15.3 | Importa desde Google Drive, OneDrive o Dropbox dentro de Archivos (si los tienes) | Funciona, o anota qué pasa | |
| A15.4 | Mándate el respaldo por Mail o WhatsApp → Guardar en Archivos → importar | Funciona | |
| A15.5 | Exporta a "En mi iPhone", muévelo a iCloud e impórtalo | Funciona | |
| A15.6 | Renombra un respaldo con espacios, tildes y un emoji e impórtalo | Funciona | |
| A15.7 | Exporta con iCloud Drive lleno | Anota el aviso de iOS; la app sigue bien | |
| A15.8 | Importa un respaldo e inmediatamente exporta | El archivo nuevo trae los datos importados | |
| A15.9 | Borra en Archivos un respaldo exportado | La app no cambia: el archivo era una copia | |
| A15.10 | Pasa un respaldo por AirDrop a otro iPhone, instala Percha allá e impórtalo | Mismos conteos en el otro teléfono | |

### A16. iOS y multitarea

| ID | Pasos | Esperado | ✓ |
|---|---|---|---|
| A16.1 | Bloquea el iPhone con la app en Ajustes y desbloquéalo | Sigue en Ajustes, igual | |
| A16.2 | Con la hoja ⋯ abierta, abre el Centro de control y ciérralo | La hoja sigue bien | |
| A16.3 | Haz una captura de pantalla en cada pantalla | Nada se activa sin querer | |
| A16.4 | Recibe una llamada con la app abierta | Al volver, sigue igual | |
| A16.5 | Toca un botón justo cuando baja una notificación | No se activa el botón equivocado | |
| A16.6 | Que suene una alarma durante "Preparando…" | Termina, o se puede volver a exportar | |
| A16.7 | Activa el modo de datos reducidos | Todo igual | |
| A16.8 | Activa una VPN o el Relay privado de iCloud | Todo igual | |
| A16.9 | Cambia el idioma del iPhone a inglés | La app sigue en español, con fechas en español | |
| A16.10 | Cambia la región del iPhone a otro país | Las fechas siguen como "1 de octubre" | |
| A16.11 | Activa Accesibilidad → Zoom y usa la app | Se puede usar | |
| A16.12 | Activa Texto en negrita | Todo legible y sin cortes | |
| A16.13 | Activa Aumentar contraste | Todo legible | |
| A16.14 | Ajustes de iOS → Pantalla → Zoom de pantalla ("texto más grande") | Nada cortado ni encimado | |
| A16.15 | Usa la app con 5 % de batería | Funciona | |

---

## Parte B — Por historia, cuando esté construida

### B2. Agregar prenda con recorte automático (US2)

| ID | Pasos | Esperado | ✓ |
|---|---|---|---|
| B2.1 | + → Tomar foto de una blusa sobre una cama | Recorte listo para revisar en pocos segundos; anota el tiempo (SC-002) | |
| B2.2 | La primera vez, con conexión | Se ve el progreso de la preparación del recorte; anota cuánto tarda la descarga | |
| B2.3 | Repite B2.1 en modo avión (después de la primera carga) | Recorta igual, sin red (SC-003) | |
| B2.4 | Foto desde la galería | Igual que con la cámara | |
| B2.5 | Foto girada (tomada con el teléfono de lado) | La prenda sale derecha | |
| B2.6 | Prenda negra sobre fondo negro, blanca sobre blanco, estampada sobre estampado | Recorte razonable o se puede corregir con Pincel/Borrador | |
| B2.7 | Prenda con transparencias o encaje | Anota cómo queda | |
| B2.8 | Foto donde no hay prenda (una pared) | Mensaje claro; deja reintentar con otra foto | |
| B2.9 | Pincel y Borrador, cambiando el tamaño | Agregan y quitan donde tocas, con el tamaño elegido | |
| B2.10 | 25 trazos y Deshacer hasta el principio | Deshace cada trazo en orden | |
| B2.11 | Pellizcar para acercar mientras corriges | Se puede acercar y seguir pintando con precisión | |
| B2.12 | Reintentar con otra foto | Descarta la anterior sin dejar basura (Integridad: sin referencia 0) | |
| B2.13 | Categoría y color sugeridos | Categoría razonable (la última usada); color parecido a la prenda | |
| B2.14 | Guardar sin nombre | Se guarda (el nombre es opcional) | |
| B2.15 | Etiquetas repetidas, con mayúsculas o espacios ("Lino", " lino ") | Queda una sola etiqueta "lino" | |
| B2.16 | Cerrar la app a mitad del recorte o de la revisión | Al volver no hay prenda a medias ni imágenes huérfanas | |
| B2.17 | Agregar 10 prendas seguidas | Cada recorte tarda parecido; la app no se pone lenta ni se cierra | |
| B2.18 | Detalle → **Volver a recortar** | Abre la revisión con la foto original; al guardar, cambia la imagen en el Clóset y en los outfits | |
| B2.19 | Foto enorme (panorámica o de 48 MP) | Se procesa sin cerrarse; la original queda reducida (~1500 px) | |
| B2.20 | Rechazar el permiso de cámara y luego tocar Tomar foto | Mensaje que explica cómo darlo; galería sigue funcionando | |
| B2.21 | Pestaña privada de Safari: intentar guardar | Mensaje claro de que no se puede guardar ahí | |
| B2.22 | Foto con poca luz y con flash | Recorte usable o corregible | |
| B2.23 | Prenda colgada de una percha contra la pared | La percha no queda como parte de la prenda, o se borra fácil | |
| B2.24 | Foto con dos prendas | Se puede quedar con una borrando la otra | |
| B2.25 | Cancelar en cada paso del flujo sin guardar | No queda nada guardado (Integridad: sin referencia 0) | |
| B2.26 | Prenda muy chica (un anillo, unos aretes) | Se recorta o se corrige a mano | |
| B2.27 | Girar el iPhone mientras está la cámara abierta | La cámara no se rompe | |
| B2.28 | Nombre de 80 caracteres con emoji | Se guarda y se ve bien cortado en la tarjeta | |

### B3. Clóset (US3)

| ID | Pasos | Esperado | ✓ |
|---|---|---|---|
| B3.1 | Con 20 prendas, recorre la grilla | Fluido; las miniaturas cargan sin parpadear | |
| B3.2 | Filtra por cada categoría, color, temporada, ocasión y etiqueta | Solo aparecen las que corresponden | |
| B3.3 | Combina dos filtros | Se cumplen los dos | |
| B3.4 | Filtro sin resultados | Mensaje de vacío, con forma de quitar los filtros | |
| B3.5 | Buscar por nombre, con y sin tildes ("pantalon" / "pantalón") | Encuentra la prenda | |
| B3.6 | Editar todos los campos de una prenda y volver | Cambios guardados en la grilla y el detalle | |
| B3.7 | Borrar una prenda que no está en outfits | Confirmación y desaparece | |
| B3.8 | Borrar una que está en 3 outfits | "Está en 3 outfits guardados…"; al confirmar, los outfits conservan el resto (FR-016) | |
| B3.9 | "Conservarla" en esa hoja | No se borra nada | |
| B3.10 | Prenda negra y blanca en las tarjetas, claro y oscuro | Las dos se distinguen del fondo (SC-007) | |
| B3.11 | Clóset vacío | Diseño 02b, con la invitación a agregar | |
| B3.12 | Integridad después de borrar 5 prendas | Sin referencia 0, rotas 0 | |
| B3.13 | Baja en el Clóset, abre una prenda y vuelve | Misma posición en la grilla | |
| B3.14 | Cambia la categoría de una prenda que está en un outfit | Anota cómo queda el outfit | |
| B3.15 | Detalle de una prenda usada | Muestra usos y la fecha del último uso (FR-017) | |
| B3.16 | Quita todos los filtros de una vez | Vuelven todas las prendas | |
| B3.17 | Borra 3 prendas seguidas rápido | Se borran las 3; nada huérfano | |
| B3.18 | Detalle de una prenda sin nombre | Se ve bien, sin "undefined" ni huecos raros | |

### B4. Maniquíes (US4)

| ID | Pasos | Esperado | ✓ |
|---|---|---|---|
| B4.1 | Crear un maniquí con la guía de pose y el temporizador de 5 s | Cuenta 5 s, toma la foto y quita el fondo | |
| B4.2 | Crear un segundo y marcarlo principal | El Armador y Hoy usan el principal | |
| B4.3 | Borrar el principal | Pasa a principal el más reciente que queda | |
| B4.4 | Borrar uno usado por 2 outfits | Aviso con el número; los outfits pasan al principal con sus capas (FR-021) | |
| B4.5 | Borrar el último maniquí | Los outfits siguen viéndose con el cuerpo por defecto | |
| B4.6 | Foto del maniquí con mala luz o de lejos | Mensaje o recorte corregible | |
| B4.7 | ¿Pide permiso de cámara cada vez? | Anótalo (research R-11) | |
| B4.8 | 5 maniquíes | Lista fluida; Ajustes cuenta 5 | |
| B4.9 | Cancelar durante el temporizador de 5 s | No toma la foto | |
| B4.10 | Renombrar un maniquí | El nombre nuevo aparece en el menú ⋯ | |
| B4.11 | Maniquí de cuerpo entero y otro de medio cuerpo | Anota cómo caen las prendas en cada uno | |
| B4.12 | Maniquí con ropa holgada | Recorte usable | |

### B5. Armador (US5)

| ID | Pasos | Esperado | ✓ |
|---|---|---|---|
| B5.1 | Agregar arriba, abajo, calzado y un accesorio | Cada uno cae en su zona sobre el cuerpo (FR-030) | |
| B5.2 | Agregar una segunda prenda de "arriba" | Reemplaza a la primera; en Accesorios se suman (FR-031) | |
| B5.3 | Mover, pellizcar y girar | Sigue el dedo; la escala queda entre 0,5× y 2,5× | |
| B5.4 | Gestos empezando en los 20 px del borde | No mueve la prenda ni activa el volver del sistema (FR-032) | |
| B5.5 | 8 prendas en capas, moviendo rápido | Fluido, sin saltos (SC-004) | |
| B5.6 | Cambiar el orden de capas | La de arriba queda delante | |
| B5.7 | Deshacer 20 pasos y rehacer | Vuelve exactamente a cada estado | |
| B5.8 | Restablecer posición | La prenda vuelve a su lugar automático | |
| B5.9 | Mezclar 10 veces | Cambia prendas, prefiriendo las poco usadas | |
| B5.10 | Guardar, cerrar la app, abrir el outfit | Todo en la misma posición, escala, rotación y orden (FR-034) | |
| B5.11 | Cambiar el maniquí de un outfit guardado | Las prendas se ven proporcionadas sobre el otro cuerpo | |
| B5.12 | Armador sin maniquí y sin prendas | Diseños 05b y 05c | |
| B5.13 | Llamada entrante a mitad de un gesto | Al volver, nada quedó a medio mover | |
| B5.14 | Prenda planeada y prendas reales en el mismo outfit | Se ven y se manipulan igual (FR-035) | |
| B5.15 | Girar una prenda una vuelta completa | Gira suave, sin saltos | |
| B5.16 | Escalar al mínimo y al máximo | Se detiene en 0,5× y 2,5× | |
| B5.17 | Salir del Armador sin guardar | Anota si avisa; no se guarda nada a medias | |
| B5.18 | Editar un outfit guardado y guardar | Se actualiza, no se duplica | |
| B5.19 | Doble toque sobre una prenda | Anota qué hace; nada raro | |
| B5.20 | Guardar con nombre vacío y sin etiquetas | Se guarda | |

### B6. Outfits, calendario y Hoy (US6)

| ID | Pasos | Esperado | ✓ |
|---|---|---|---|
| B6.1 | Nombrar, etiquetar, ver y borrar outfits | Funciona cada acción | |
| B6.2 | Asignar un outfit a hoy | Hoy lo muestra | |
| B6.3 | Asignar otro outfit al mismo día | Reemplaza al anterior (un outfit por día) | |
| B6.4 | Vista semana (desde el lunes) y mes | Los días correctos, con el punto en los que tienen outfit | |
| B6.5 | Borrar un outfit asignado a 3 días | Esos días quedan sin asignar | |
| B6.6 | "Lo usé hoy" dos veces | Cada prenda suma 1 uso una sola vez; última fecha = hoy (FR-042) | |
| B6.7 | Sin outfit para hoy | Sugerencia con prendas sin usar hace más de un mes; "Otro" cambia la sugerencia | |
| B6.8 | Hoy cruzando la medianoche con la app abierta | Cambia al día nuevo | |
| B6.9 | Cambio de horario (si toca) o cambio manual de zona horaria | Las fechas del calendario no se corren un día | |
| B6.10 | Asignar outfits en el pasado y a meses de distancia | Se ven en el mes correcto | |
| B6.11 | Cambiar de mes muy rápido en el calendario | Sin trabas ni días cruzados | |
| B6.12 | Semana que cruza de un mes al otro y de un año al otro | Días correctos | |
| B6.13 | "Lo usé hoy" sobre la sugerencia (sin outfit asignado) | Suma usos a esas prendas, una vez | |
| B6.14 | Cambia la fecha del iPhone al 29 de febrero de 2028 | El calendario lo muestra bien | |
| B6.15 | Borrar una prenda que se usó hoy | Hoy sigue funcionando | |

### B7. Hecho por mí (US7)

| ID | Pasos | Esperado | ✓ |
|---|---|---|---|
| B7.1 | Marcar una prenda como hecha por mí con todos los datos y 3 fotos del proceso | Detalle 03c completo | |
| B7.2 | Filtro "Solo hecho por mí" | Solo esas prendas, con la marca punteada | |
| B7.3 | Quitar una foto del proceso | Desaparece y no queda huérfana (Integridad) | |
| B7.4 | Respaldo e importación con prendas hechas | Todo vuelve igual, incluidas las fotos del proceso | |
| B7.5 | Quitar la marca "hecho por mí" | Anota qué pasa con los datos de costura | |
| B7.6 | Notas muy largas | Se ven completas en el detalle | |
| B7.7 | 10 fotos del proceso | Se ven todas; Espacio sube | |
| B7.8 | La marca punteada en tema oscuro | Se distingue | |

### B8. Taller (US8)

| ID | Pasos | Esperado | ✓ |
|---|---|---|---|
| B8.1 | Crear una planeada con foto de tela y cada una de las 8 siluetas | La tela llena la silueta en mosaico | |
| B8.2 | Escala y posición del estampado; sombreado on/off | Cambia en vivo | |
| B8.3 | Importar un SVG válido (viewBox 0 0 200 400, un contorno cerrado) | Aparece junto a las incluidas | |
| B8.4 | SVG con dos contornos, abierto, con otro viewBox, o que no es SVG | Rechazo con un mensaje que explica el formato | |
| B8.5 | Borrar una silueta importada que usan prendas | No deja, y dice qué prendas la usan | |
| B8.6 | Usar una planeada en un outfit | Se ve igual que una prenda real (FR-035) | |
| B8.7 | Pasar a "en proceso" y luego terminar con una foto real | Pasa al Clóset como hecha por mí con sus datos, usos y outfits (FR-053) | |
| B8.8 | Abrir el outfit que la usaba | La foto real ocupa el mismo centro y alto que la silueta (SC-010) | |
| B8.9 | Taller vacío y lista por estados | Diseño 11b; agrupada por planeada, en proceso, terminada | |
| B8.10 | Tela con una foto muy chica y otra enorme | El mosaico se ve bien en las dos | |
| B8.11 | Escala del estampado al mínimo y al máximo | Se detiene en 0,25 y 4 | |
| B8.12 | Borrar una planeada que está en outfits | Aviso con el número de outfits | |
| B8.13 | Pasar de "en proceso" a "planeada" | Anota si se puede | |
| B8.14 | Silueta importada con nombre largo y emoji | Se ve bien en la biblioteca | |
| B8.15 | Terminar con una foto mal recortada | Se puede corregir con Pincel y Borrador | |

### B9. Mis medidas (US9)

| ID | Pasos | Esperado | ✓ |
|---|---|---|---|
| B9.1 | Desde Hoy, llegar a una medida | Dos toques (SC-005) | |
| B9.2 | Editar dos medidas | Fecha de actualización = hoy | |
| B9.3 | Valores raros: 0, negativo, 1000, "abc", con coma decimal | Acepta "82,5"; rechaza o corrige los inválidos | |
| B9.4 | Agregar, renombrar y borrar una medida personalizada | Funciona y se respalda | |
| B9.5 | Borrar el valor de una medida | Queda vacía, sin error | |
| B9.6 | Escribir "82,456" | Queda con un decimal | |
| B9.7 | Agregar 20 medidas personalizadas | Todas visibles y en el respaldo | |

### B10. Bienvenida, apariencia e instalación (US10)

| ID | Pasos | Esperado | ✓ |
|---|---|---|---|
| B10.1 | Instalación limpia → bienvenida completa con cronómetro | Menos de 2 minutos sin contar la descarga del modelo (SC-006) | |
| B10.2 | Saltar la dedicatoria | Se puede; no aparece después | |
| B10.3 | Dedicatoria con emojis y texto largo | Se ve bien en Ajustes ("Hecha para ti por…") | |
| B10.4 | Selector Sistema · Claro · Oscuro | Aplica al instante y se mantiene al cerrar y abrir, sin parpadeo | |
| B10.5 | Oscuro elegido a mano con el iPhone en claro | La app queda oscura | |
| B10.6 | Ícono y splash en los dos modos | Correctos | |
| B10.7 | Cerrar la app a mitad de la bienvenida | Al volver, sigue o empieza de nuevo sin datos a medias | |
| B10.8 | Rechazar la cámara en la bienvenida | Se puede seguir o saltar el paso | |
| B10.9 | Saltar todos los pasos | Llega a Hoy | |
| B10.10 | Después de terminarla, cerrar y abrir | La bienvenida no vuelve a aparecer | |

---

## Parte C — Volumen, estrés y regresión

| ID | Pasos | Esperado | ✓ |
|---|---|---|---|
| C1 | Panel de diagnóstico → cargar datos sintéticos (300 prendas, 5 maniquíes, 200 outfits) | Pide confirmación y hace antes la copia automática | |
| C2 | Con esos datos, recorrer Clóset y Mis outfits rápido | Fluido (SC-009) | |
| C3 | Abrir el Armador con un outfit de 8 capas | Abre rápido | |
| C4 | Exportar el respaldo grande | Sin cierre por memoria; anota tamaño y tiempo | |
| C5 | Borrar la app, reinstalar, importar ese respaldo | Todo idéntico (SC-001) | |
| C6 | Restaurar la copia automática del volumen | Vuelve lo de antes | |
| C7 | Una semana de uso real: agregar ropa, armar, marcar "Lo usé hoy" cada día | Anota cualquier cosa rara | |
| C8 | Antes de entregar: repetir toda la Parte A y los escenarios 0–13 de quickstart sobre la versión final | Todo ✅ | |
| C9 | Con los datos sintéticos, exportar en modo avión | Funciona igual | |
| C10 | Importar el respaldo grande en otro iPhone más viejo (si hay) | Anota tiempo; no se cierra | |
| C11 | Abrir y cerrar el Armador 30 veces seguidas | No se pone lento (panel: URLs vivas estable) | |
| C12 | Cambiar el tema del iPhone 20 veces con 300 prendas | Cambia rápido cada vez | |
| C13 | Dejar la app abierta en Hoy toda la noche | A la mañana muestra el día nuevo y responde | |
| C14 | Usar la app 30 minutos seguidos | Anota cuánta batería gastó y si el iPhone se calentó | |

---

## Parte D — Privacidad y datos

| ID | Pasos | Esperado | ✓ |
|---|---|---|---|
| D1 | Después de usar la app un rato, panel de diagnóstico → Otros orígenes | 0: la app no habla con otros servidores | |
| D2 | Descomprime un respaldo exportado y mira `datos.json` con vista rápida | Solo datos del clóset, nada más | |
| D3 | Recorre toda la app buscando dónde pide cuenta, correo o contraseña | En ningún lado | |
| D4 | Ajustes de iOS → Apps → Percha (o Safari) | Solo pide los permisos que usa (cámara cuando exista US2) | |
| D5 | Ajustes de iOS → Safari → Borrar historial y datos | Anota si la app instalada pierde los datos; por eso el respaldo | |
| D6 | Elimina la app sin respaldo y reinstala | Los datos se pierden: es lo esperado, y la guía de instalación lo advierte | |
| D7 | Instala desde dos direcciones distintas (si las hay) | Cada una tiene sus propios datos: anótalo | |
| D8 | [US2] En una foto del respaldo, mira la información en Archivos | Sin ubicación GPS | |
| D9 | Selector de apps con Percha abierta | Muestra una vista previa de la pantalla; anota si molesta | |
| D10 | Una semana entera en modo avión [con datos] | Todo funciona | |

---

## Registro

| Fecha | iPhone / iOS | Versión de Percha | Pruebas corridas | Fallaron | Notas |
|---|---|---|---|---|---|
| 2026-10-30 | Sin iPhone: WebKit de Playwright en Windows, perfiles iPhone 15, SE y Pro Max | 0.1.0 (rama `claude/pruebas-intensivas-c52d4b`) | Parte A automatizable (56 pruebas × 3 perfiles: A1.3–A1.4, A2.1–A2.4, A3.1–A3.5, A3.7, A4.1–A4.5, A4.7, A4.9, A4.10, A5.1–A5.8, A6.1–A6.3, A6.5–A6.7, A7.1–A7.4, A7.6, A7.8, A7.10, A8.1, A8.3–A8.15, A9.1–A9.8, A10.1–A10.4, A10.6, A11.1–A11.5, A12.3, A12.4 parcial, A12.10, A14.1–A14.27, A15.6, A15.8, A16.9, A16.10, D1–D3) | Antes de arreglar: A9.3/A9.4 y A14.10/A14.11 (restaurar la copia automática decía "dañado") y exportar después de reabrir la app (las fotos importadas se leían como el ZIP entero); A1.3/A1.4 (dos `theme-color`) | Arreglados el mismo día (research R-14). Después: 168 de 168. Falta confirmarlo en el iPhone con A14.29 |
| 2026-10-30 | Sin iPhone: la app publicada en `percha-preview` (versión 568250d0), WebKit de Playwright con los tres perfiles | 0.1.0 (commit `bc52ca5`) | `npm run test:desplegada`: Parte A, despliegue y visual (339 pruebas, 297 corridas) | Antes de arreglar: el "+" de la barra en peso 400 (faltaba el 300) y las filas del Menú sin separación | Arreglados (T170). Después: 297 de 297. Avisos de contraste para Claude Design en `docs/reportes/pruebas-desplegada.md` |
| 2026-10-30 | Sin iPhone: la app publicada (versión 568250d0, sin redesplegar) y el build local, WebKit de Playwright con los tres perfiles | 0.1.0 (commit `e6c4db1` más T171) | `npm run test:desplegada -- --sin-desplegar` (297 de 297) y la suite local, con A7.13 y A10.7 nuevas | A7.13 y A10.7 fallan en la versión publicada: después de importar, "Guardar respaldo" y "Guardarlo" entregaban el archivo de antes | Arreglado (T171): 300 de 300 en local. Falta publicarlo en `percha-preview` y probarlo en el iPhone |
| | | | | | |
