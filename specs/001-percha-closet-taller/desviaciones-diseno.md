# Desviaciones y estados no diseñados

Registro para revisar en Claude Design (principio VI, plan.md *Pendientes para Claude Design*).
Cada estado que el diseño no cubre se construye con los tokens existentes y se anota aquí.

| Pantalla o estado | Qué se hizo | Por qué | Revisar en Design |
|---|---|---|---|
| Ícono de la app y splash de iOS | Ícono provisional: una percha dibujada con trazos en `--ink` sobre `--bg` (`public/icono-fuente.svg`), y splash con la misma percha centrada; en modo oscuro, percha clara sobre `#0f0e0d` (T012). | El export de diseño no trae ícono de app. | Diseñar el ícono definitivo y su versión para el splash. |
| Importar silueta (FR-050a) | Pendiente (T144): se construirá con `HojaInferior`, `BotonPrincipal` y `BotonSecundario`, con los mensajes de rechazo de `contracts/silueta-svg.md`. | La pantalla no está diseñada. | Diseñar la pantalla y sus mensajes. |
| Errores del respaldo | Pendiente (T054): archivo dañado, versión más nueva y espacio insuficiente, con los mensajes de `contracts/respaldo.md`. | No hay estados de error de respaldo en el diseño. | Revisar el tono y la ubicación de los mensajes. |
| Restaurar el respaldo automático | Pendiente (T054): fila en Ajustes con "Restaurar el respaldo automático del [fecha]" y "Exportarlo". | FR-003; no está en el diseño. | Revisar la fila y la confirmación. |
| Preparación del recorte | Pendiente (T070, T153): progreso de la descarga del modelo en el onboarding y en 04b, y aviso cuando falta conexión la primera vez. | El 04b solo muestra el estado "revelándose". | Revisar si alcanza con el 04b. |
| Hay una versión nueva | Pendiente (T054): aviso suave en Ajustes. | Actualización de la PWA sin recarga automática (research R-7). | Revisar el aviso. |
| Espacio insuficiente al guardar | Pendiente (T073, M3 de `/speckit-analyze`): mensaje con el espacio usado y la sugerencia de respaldar. | Edge Cases del spec. | Revisar el mensaje. |
| Splash oscuro | Se generan splash claros y oscuros con `media="(prefers-color-scheme: dark)"`. Si iOS no respeta ese `media`, se usará un splash neutro (T155). | research R-12. | Revisar el splash neutro si hace falta. |
| Calendario de mes con 6 semanas | Pendiente (T121): sexta fila con los mismos tokens. | El diseño muestra 5 × 7, pero algunos meses necesitan 6 semanas. | Confirmar la sexta fila. |
| Panel de diagnóstico | Hecho (T036): pantalla interna con secciones en `--surface` (almacenamiento, red, componentes, integridad, eventos). Se abre tocando 5 veces la versión en Ajustes. | Validación en el iPhone sin Mac (research R-14). | No hace falta diseñarla. |
| Botones y chips presionados o deshabilitados | `BotonPrincipal`, `BotonSecundario` y `BotonTexto` bajan a opacidad 0,8 al presionar y a 0,45 deshabilitados; foco visible con contorno de 2 px en `--select` (T029). | El diseño no muestra estos estados. | Confirmar la respuesta táctil. |
| 01c Menú sin datos | Subtítulos "Todavía no hay fotos", "Todavía sin medidas" y "Todavía no hay respaldo" (T035). Con un solo maniquí dice "1 foto". | El diseño solo muestra el menú con datos. | Revisar el copy. M4 de `/speckit-analyze` (aviso cuando nunca se respaldó) sigue pendiente de decisión. |
| No se pudo abrir la base | Pantalla con "No se pudo abrir tu clóset", la indicación de cerrar y volver a abrir, y el detalle técnico en `--muted` (`src/ErrorBase.tsx`). | Principio IV: si IndexedDB no abre (por ejemplo, una migración revertida), no se muestra la app para no escribir nada. | Revisar el tono del mensaje. |
| Pantallas todavía vacías | Cada pantalla del plan existe con su `data-pantalla` y el encabezado del diseño, sin contenido, hasta que su historia la construye (T034). | Para navegar y probar la PWA en el iPhone desde Foundational. | No: es temporal. |

## US1 Respaldo (T053–T055, 2026-10-26)

- 01b: sin respaldo previo, el aviso dice "Todavía no tienes un respaldo de tu clóset." Pasados 60 días dice "hace N meses", y pasado un año, "hace más de un año".
- 01b y 09: "Preparando…" mientras se arma el archivo. Si iOS vence el toque, el botón cambia a "Guardar respaldo" ("Guardarlo" en el aviso). También hay un mensaje de error.
- 09: sin respaldo previo, la tarjeta dice "Todavía no hay respaldo.". Los mensajes de revisión, importación, rechazo y resultado van debajo de los botones.
- 09: copia automática con "Restaurar el respaldo automático del [fecha]" y "Exportarlo". Restaurar intercambia los datos: lo actual queda como la nueva copia automática, así que se puede deshacer.
- 09: hojas de confirmación con el formato de 03b ("¿Reemplazar todo con este respaldo?", "¿Restaurar la copia automática?").
- 09: en la barra de Espacio, ink son las fotos y muted la copia automática, en proporción al uso total. Debajo va "Almacenamiento protegido: sí/no". El aviso "Hay una versión nueva" usa el botón "Actualizar".
- 09: el selector de Apariencia y la dedicatoria quedan para US10 (T154, T156).
