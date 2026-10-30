# Handoff: Percha — clóset digital y taller (web app para iPhone)

## Resumen
Percha es un clóset digital personal (un regalo para una sola persona). Sirve para fotografiar la ropa, quitarle el fondo y armar outfits como collage sobre una foto de cuerpo completo (el "maniquí"). También tiene un **Taller** para probar telas dentro de siluetas de prendas antes de coserlas. El brief original está en `brief.md`: es la fuente de verdad sobre alcance y restricciones.

## Sobre los archivos de diseño
Los archivos de este paquete son **referencias de diseño hechas en HTML**: muestran el aspecto y el comportamiento esperados, pero no son código de producción para copiar. La tarea es **recrear estos diseños** en un proyecto nuevo. Recomendación: una PWA con Vite + React + TypeScript, IndexedDB para guardar datos y fotos, y un service worker para que funcione sin internet. Si ya existe un codebase, usa sus patrones.

Para ver el diseño, abre `Percha Pantallas v2.dc.html` en un navegador; `support.js` debe estar en la misma carpeta. Cada teléfono tiene un atributo `data-screen-label` con el nombre de la pantalla. La propiedad `modo` del archivo permite ver solo el modo claro, solo el oscuro o ambos.

## Fidelidad
**Alta fidelidad** en colores, tipografía, radios, espaciado, jerarquía y copy (el copy es definitivo, en español). Las prendas, el maniquí y las telas son **marcadores de posición**:
- Las prendas son siluetas rellenas de color: en la app serán los PNG recortados de la usuaria.
- El maniquí es una forma de píldora a rayas: en la app será su foto sin fondo.
- Las telas son patrones CSS (cuadros, lunares, rayas): en la app serán la foto de la tela.

## Temas: claro y oscuro (obligatorio)
- Hay dos temas completos. Por defecto se sigue `prefers-color-scheme`, y en Ajustes hay un selector **Sistema · Claro · Oscuro** que se guarda en local.
- **Importante:** además de los colores, el tema cambia la **tipografía, los radios y el estilo de las etiquetas**. Así lo eligió la usuaria: claro = "Boutique cálida" y oscuro = "Galería oscura".
  - **Claro:** serif Cormorant Garamond 500 + Jost, esquinas suaves (28/18/10), chips en minúsculas a 13 px, selección con borde punteado.
  - **Oscuro:** serif Bodoni Moda 400 + Archivo, esquinas casi rectas (4/2), etiquetas y botones en MAYÚSCULAS con tracking 0.1em, chips a 11 px, selección con borde sólido.
- Implementación: variables CSS bajo `[data-theme="claro"]` y `[data-theme="oscuro"]`. Los valores exactos están en `tokens.json`.

## Design tokens
Los valores completos están en `tokens.json`. Resumen:

| Token | Claro | Oscuro |
|---|---|---|
| bg | #f4ebe6 | #0f0e0d |
| surface | #fbf6f3 | #181716 |
| chip / control secundario | #ead9d1 | #262422 |
| ink (texto) | #3a2a25 | #f2efe9 |
| muted | #8f7a71 | #8c867e |
| line | #e6d6ce | #2a2826 |
| accent (botón principal) | #b9776a / texto #fff | #f2efe9 / texto #0f0e0d |
| nav (barra) | #3a2a25, inactivo #c9b3aa, activo #fff | #1a1918, inactivo #77716a, activo #f2efe9 |
| stitch (etiqueta "hecho por mí") | #b9776a | #bdb7ae |
| scrim (fondo de hoja) | rgba(58,42,37,.38) | rgba(0,0,0,.6) |
| tileBg (fondo de tarjeta de prenda) | radial #ebe0d7 → #d9c9bd | radial #3f3b37 → #2a2826 |
| canvas (lienzo Armador/Hoy) | radial #efe5de → #dfd0c5 | radial #3b3734 → #242220 |
| radios lg/md/sm/chip/botón/nav | 28/18/10/17/26/34 | 4/2/2/2/2/4 |

**Contraste de recortes:** a cada PNG de prenda se le aplica el filtro `cutoutFilter`:
- claro: `drop-shadow(0 0 .5px rgba(58,42,37,.55)) drop-shadow(0 5px 7px rgba(58,42,37,.18))`
- oscuro: `drop-shadow(0 0 .6px rgba(255,250,240,.5)) drop-shadow(0 6px 10px rgba(0,0,0,.45))`

Junto con el fondo de tono medio (`tileBg` / `canvas`), esto hace que las prendas negras y blancas se vean en los dos modos y que el halo del recorte se disimule. Revisa la tabla "02d Contraste".

**Tipografía:** la serif del tema para títulos y la sans para el resto.
- Tamaños: hero 72 · título de pantalla 42 (line-height 1) · detalle 30–32 · hoja inferior 28 · tarjeta 22 · cuerpo 15 (lh 1.5) · secundario 14 · meta 13 · etiqueta 12 · nav 11 · tag 10.
- Títulos en cursiva de la serif para mensajes cálidos ("Una idea para hoy", "Recortando tu prenda…").
- Fuentes de Google Fonts: Cormorant Garamond, Jost, Bodoni Moda, Archivo. Inclúyelas en el bundle para que funcionen sin internet.

**Espaciado y tamaños:**
- Márgenes laterales: 22 px para texto, 16 px para tarjetas y lienzos.
- Escala de espaciado: 4 · 8 · 10 · 12 · 14 · 16 · 18 · 22 · 24 · 28.
- Botón 52 px de alto; chips 34–40 px; zona táctil mínima 44 × 44.
- Barra inferior flotante: 68 px de alto, a 16 px de los lados y 26 px del borde inferior; botón "+" circular de 52 px.

## Navegación
- Barra inferior: **Hoy · Clóset · (+) · Taller · Outfits**. El "+" abre Agregar prenda.
- El **Calendario** (vista semanal) se abre desde la franja de 7 días de Hoy. Así se resolvió que 6 elementos no cabían en la barra.
- El menú **⋯** de Hoy abre una hoja con Mis maniquíes, Mis medidas y Ajustes y respaldo.

## Pantallas (nombres = `data-screen-label`)
| Etiqueta | Pantalla | Notas clave |
|---|---|---|
| 01 Hoy | Outfit planeado sobre el maniquí | Franja de semana (hoy resaltado con ink, punto = día con plan). Lienzo 430 px. Botones: "Lo usé hoy" (principal), "Otro", "Armar uno". |
| 01b Hoy sugerencia | Sin plan para hoy | Sugerencia al azar con prendas sin usar hace más de un mes, más un aviso suave de respaldo con la acción "Respaldar". |
| 01c Menú | Hoja secundaria | Filas de 64 px con subtítulo. |
| 02 Clóset | Grilla de 2 columnas | Buscador, botón "Filtros N", chips de categoría con scroll horizontal. Tarjeta: surface + tile cuadrado con `tileBg`, nombre, "Usada N×", tag "hecho por mí". |
| 02b Clóset vacío | Invitación a empezar | "Tomar foto" / "Elegir de la galería". |
| 02c Filtros | Hoja de filtros avanzados | Color, temporada, ocasión, etiquetas, interruptor "Solo hecho por mí", botón "Ver N prendas". |
| 02d Contraste | Tabla de referencia, no es pantalla | Prendas negra y blanca, con y sin halo. |
| 03 Detalle de prenda | Foto 260 px, datos, en qué outfits aparece, eliminar | |
| 03b Confirmar eliminar | Hoja | "Está en 3 outfits guardados…": se quita de ellos y el resto del outfit se conserva. |
| 03c Detalle hecho por mí | Variante de prenda hecha por ella | Tela, composición, molde, notas, fotos del proceso. |
| 04 → 04d Agregar prenda | Flujo de 3 pasos | Ver las notas de interacción. |
| 05 Armador | Pantalla estrella | Ver las notas de interacción. |
| 05b / 05c / 05d | Armador sin maniquí / outfit vacío y zona sin prendas / hoja para guardar | |
| 06 Mis outfits | Grilla de 2 columnas de miniaturas sobre el maniquí | Chips de etiqueta. |
| 07 Calendario | Semana (principal) y mes, en un control segmentado | Cada fila: miniatura, día, nombre, y "Cambiar" o "Asignar". |
| 08 Mis maniquíes | Grilla de 2 columnas | Tag "Principal"; "+ Nuevo maniquí". |
| 09 Ajustes | Respaldo, espacio usado, maniquíes, medidas, apariencia | Exportar e importar el respaldo como archivo; selector Sistema · Claro · Oscuro. |
| 10 / 10b / 10c | Onboarding | Bienvenida con dedicatoria ("Para [nombre]", frase guía) → foto del maniquí con silueta guía y temporizador de 5 s → 3 primeras prendas → listo. |
| 11 Taller | Lista agrupada | En proceso / Planeadas / Terminadas. |
| 11b Taller vacío | Invitación | Diagrama tela → silueta. |
| 11c → 11f | Crear prenda planeada (4 pasos) | Ver las notas de interacción. |
| 11g Detalle taller | Prenda en proceso | Indicador de estado; botones "En el Armador" y "Ya la terminé". |
| 11h Terminada | Hoja | Foto real → la prenda pasa al Clóset como "hecho por mí". |
| 12 Mis medidas | Grilla de 2 columnas de medidas en cm | Fecha de actualización, "+ Medida" para campos personalizados. |
| Siluetas | Biblioteca | Ver la sección Siluetas. |

## Componentes
- **TarjetaPrenda** — variantes:
  - `normal`
  - `hecha`: tag "hecho por mí" con fondo `surface`, borde 1 px **punteado** color `stitch`, radio 3 px y texto de 10 px. Imita una etiqueta cosida.
  - `planeada`: tag "planeada" con fondo `ink` y texto `bg`; en el carrusel, la casilla lleva contorno 1.5 px punteado `muted`.
  - El tile usa `tileBg` y el PNG lleva `cutoutFilter`.
- **ChipFiltro** — 34–40 px de alto, radio `chip`; activo con `accent`, inactivo con `chip`.
- **CarruselZona** — pestañas Arriba · Abajo · Vestido · Calzado · Abrigo · Accesorios, y debajo casillas de 76 × 84. La casilla seleccionada lleva contorno 2 px `select`.
- **BarraInferior** — ver la sección Navegación.
- **BotonPrincipal / BotonSecundario** — 52 px de alto, radio `button`, 15 px (el principal en 500). Fondo `accent` (principal) o `chip` (secundario).
- **HojaInferior** — a 8 px de los lados y del borde inferior; esquinas `lg` arriba y 40 px abajo; tirador de 36 × 5; scrim detrás.
- **EstadoTaller** — 3 segmentos (Planeada · En proceso · Terminada): los completados son una línea sólida de 3 px `ink` y los pendientes una línea punteada de 2 px `muted`, con la etapa actual en peso 500.
- **ManijasSeleccion** — contorno 1.5 px `select` (punteado en claro, sólido en oscuro) con 6 px de separación, más 4 manijas circulares de 12 px (fondo `bg`, borde `select`).
- **FranjaSemana** — 7 casillas de 56 px de alto más "›".

## Notas de interacción

### Armador (05)
- **Lienzo:** foto del maniquí centrada sobre `canvas`, con las prendas en capas encima. Deja 16 px de margen lateral para que los gestos no choquen con el gesto de volver del borde izquierdo de iOS. Los gestos no se activan en los primeros 20 px del borde.
- **Carrusel:** tocar una prenda la pone sobre el maniquí en su posición automática según la zona; tocarla de nuevo la quita. Solo cabe una prenda por zona, excepto Accesorios, que admite varias.
- **Gestos sobre la prenda seleccionada:**
  - arrastrar con un dedo → mover;
  - pellizcar → escalar (de 0.5× a 2.5×);
  - girar con dos dedos → rotar.
  - Usa pointer events y `touch-action:none` sobre el lienzo.
- **Selección:** tocar una prenda la selecciona (contorno y manijas); tocar el fondo la deselecciona.
- **Botones:**
  - "Restablecer posición" devuelve la prenda seleccionada a su transformación automática.
  - Mezclar: elige una prenda al azar por zona, priorizando las de poco uso.
  - Capas: sube o baja la prenda seleccionada.
  - Deshacer: deshace el último cambio, con un historial de al menos 20 pasos.
  - Guardar: abre la hoja 05d (nombre y etiquetas opcionales).
- **Mensaje de expectativas:** el chip "Vista collage · arrastra, pellizca y gira" aparece las primeras veces y luego se oculta.
- **Prendas planeadas:** aparecen en el carrusel con la marca "planeada" y se renderizan como silueta con la tela.

### Agregar prenda (04 → 04d)
1. **Foto:** cámara a pantalla completa (fondo #0d0c0b) con un marco guía, o elegir de la galería con `<input type="file" accept="image/*" capture="environment">`.
2. **Quitar el fondo (04b):** se hace en el teléfono, con un modelo local (WASM/ONNX) guardado en caché para usar sin internet.
   - La primera vez se descarga el modelo y se avisa que tardará más.
   - Mientras procesa, la prenda se va "revelando": una línea de escaneo `accent` baja y descubre la prenda con una máscara en degradado; debajo hay una barra de progreso de 3 px.
3. **Revisar (04c):**
   - Fondo a cuadros para que se vea qué partes quedaron transparentes.
   - Herramientas Borrador / Pincel con un deslizador de tamaño, y Deshacer.
   - "Otra foto" vuelve a intentar; "Se ve bien" continúa.
4. **Datos (04d):**
   - La categoría y el color llegan preseleccionados con sugerencias (el color se calcula como el promedio de los píxeles opacos).
   - El nombre es opcional; temporada, ocasión y etiquetas se pueden agregar después.
   - "Guardar en el clóset" guarda el PNG y los datos en IndexedDB.

### Crear prenda planeada (11c → 11f)
1. **Tela:** foto cercana, plana y con luz pareja, que muestre al menos una repetición del estampado; o elegir de la galería.
2. **Silueta:** grilla de 4 columnas con las 8 siluetas ya rellenas con la tela elegida, para previsualizar.
3. **Ajustar:**
   - La tela se dibuja con la silueta como máscara (CSS `mask-image` o canvas con `globalCompositeOperation`).
   - El deslizador cambia la escala del estampado (`background-size`); arrastrar sobre la prenda cambia su posición (`background-position`).
   - El interruptor "Sombreado suave" activa o desactiva la capa de sombreado.
4. **Datos:** nombre, molde (opcional) y notas (opcionales). Se guarda con estado `planeada` y ya está disponible en el Armador.

**Cambio de estado:** planeada → en proceso → terminada. Al marcarla como terminada (11h) se ofrece tomar la foto real. Esa foto pasa por el mismo recorte que en Agregar prenda, reemplaza la silueta, y la prenda pasa al Clóset con `origen: "hecha"`. Se conservan tela, molde, notas y fotos del proceso.

## Siluetas
En `siluetas/` hay 8 SVG, cada uno con **un solo `<path>` cerrado** y viewBox `0 0 200 400`, centrados en x = 100 y sobre la misma retícula corporal:
- hombro y = 40
- cintura y = 130
- cadera y = 170
- rodilla y = 280
- tobillo y = 390

Archivos: `falda-recta`, `falda-acampanada`, `blusa`, `camisa`, `vestido-recto`, `vestido-vuelo`, `pantalon-recto`, `pantalon-ancho`.

- **Uso como máscara:** el contorno es lo único que importa.
- **Encaje en el maniquí:** si se usa el viewBox completo, encajan sobre el maniquí escalando la retícula a la altura de la figura.
- **Miniaturas:** se recortan con estos viewBox:
  - falda-recta `50 124 100 164`
  - falda-acampanada `26 124 148 176`
  - blusa `22 28 156 150`
  - camisa `18 22 164 168`
  - vestido-recto `50 28 100 264`
  - vestido-vuelo `22 28 156 282`
  - pantalon-recto `54 124 92 274`
  - pantalon-ancho `32 124 136 274`
- **Sombreado (capa aparte):** se dibuja encima con la misma máscara, usando este degradado: `linear-gradient(90deg, rgba(0,0,0,.24), transparent 26%, rgba(255,255,255,.14) 48%, transparent 70%, rgba(0,0,0,.26))`.

## Modelo de datos sugerido (IndexedDB)
- `Prenda { id, nombre?, categoria, color, temporadas[], ocasiones[], etiquetas[], imagen (Blob PNG), usos, ultimaVez?, origen: 'comprada'|'hecha', taller?: { tela, composicion?, molde?, notas?, fotosProceso: Blob[] } }`
- `PrendaPlaneada { id, nombre, estado: 'planeada'|'en_proceso'|'terminada', telaFoto: Blob, siluetaId, escala, offsetX, offsetY, sombreado: boolean, molde?, notas?, fotosProceso: Blob[] }`
- `Outfit { id, nombre?, etiquetas[], maniquiId, capas: [{ prendaId | planeadaId, x, y, escala, rotacion, z }] }`
- `Calendario { fecha (YYYY-MM-DD) → outfitId }`
- `Maniqui { id, nombre, imagen (Blob PNG), principal: boolean }`
- `Medidas { campos: [{ nombre, valor_cm, personalizado }], actualizado }`
- `Ajustes { apariencia: 'sistema'|'claro'|'oscuro', ultimoRespaldo?, dedicatoriaVista }`

**Respaldo:** exportar crea un solo archivo (ZIP o JSON con los blobs en base64) que se guarda con la Web Share API o como descarga en Archivos o iCloud; importar restaura todo. Si pasan más de 14 días sin respaldo, Hoy muestra el aviso suave de 01b.

## Restricciones (del brief)
- PWA standalone en iPhone: `apple-mobile-web-app-capable`, `viewport-fit=cover` y márgenes con `env(safe-area-inset-*)`.
- Tamaño de referencia 393 × 852. Debe verse bien también en SE (375 × 667) y Pro Max.
- Sin internet, sin cuentas y sin IA generativa. Idioma: español.

## Archivos
- `Percha Pantallas v2.dc.html` — todas las pantallas en claro y oscuro, más la tabla de contraste y la biblioteca de siluetas. Ábrelo junto con `support.js`.
- `tokens.json` — tokens de los dos temas y los valores compartidos.
- `siluetas/*.svg` — las 8 máscaras.
- `brief.md` — el brief original de producto.
