# Brief de diseño — App de clóset y outfits

> **Para:** Claude Design
> **Entregable esperado:** las pantallas del MVP en tamaño iPhone, más los tokens de diseño (colores, tipografía, espaciado, radios) y los componentes reutilizables.
> **Contexto:** es un **regalo personal** para una sola persona. Se usará como web app instalada en la pantalla de inicio de un iPhone. No es un producto comercial.

---

## 1. Qué es la app

Es un clóset digital. La persona fotografía su ropa, la app le quita el fondo a cada prenda y luego puede **armar outfits viéndolos sobre una foto de sí misma**: su "maniquí".

No usa IA generativa. El "probador" es un **collage bien hecho**: las prendas recortadas se ponen en capas sobre la foto de cuerpo completo, y se pueden mover, agrandar y rotar con los dedos.

Además, como la persona cose, tiene un **Taller**: puede fotografiar una tela, ponerla dentro de la silueta de la prenda que piensa coser y **ver cómo combina con su ropa antes de cortarla**.

**Frase guía:** *"Ver qué ponerme —y qué coser— antes de hacerlo."*

## 2. Para quién

- Una sola persona, que recibe la app como regalo.
- **Cose.** Parte de su ropa la hace ella misma y siempre tiene telas y proyectos en camino. Para ella, el "maniquí" no es una metáfora técnica: es el **maniquí de costura** de su taller. La app debe sentirse como una extensión de ese espacio.
- Usa el iPhone a diario y está acostumbrada a apps como Instagram, Pinterest y TikTok.
- No es técnica: todo tiene que ser obvio sin explicaciones.
- La usará sobre todo **en la mañana, con prisa**, y de vez en cuando con calma para organizar su ropa o planear la semana.

## 3. Personalidad visual

Como es un regalo, tiene que sentirse **personal y cuidada**, no como una app genérica de productividad.

- **Tono:** cálido, editorial y de moda, como un lookbook o una revista. Elegante sin ser frío.
- **Protagonista:** la ropa y la foto de la persona. La interfaz debe pasar a segundo plano y no competir con las fotos.
- **Evitar:** el estilo "dashboard", los gradientes genéricos de "app de IA", los íconos infantiles y el exceso de color en los controles.

**Te pido 2 o 3 direcciones visuales cortas** antes de desarrollar todas las pantallas. Muestra cada una con las pantallas de Clóset y Armador. Algunos ejemplos de dirección:

- **Editorial minimalista:** fondo crema u off-white, serif elegante en los títulos y mucho aire.
- **Boutique cálida:** tonos tierra o rosado empolvado, esquinas suaves y textura sutil.
- **Galería oscura:** fondo casi negro, para que las prendas recortadas resalten como en una vitrina.
- **Taller de costura** (recomendada al menos como una de las opciones): guiños sutiles al oficio, como cinta métrica, puntadas, etiquetas de patrón y papel de molde. Debe verse elegante, no "manualidad"; los guiños son detalles, no decoración recargada.

Espacios para personalizar el regalo:
- **Nombre de la app:** `[NOMBRE DE LA APP]` (provisional; usa un nombre de ejemplo).
- **Colores favoritos de la persona:** `[OPCIONAL]`.
- **Pantalla de bienvenida con dedicatoria:** opcional. Solo aparece la primera vez que se abre la app, con un mensaje corto como "Hecha para ti por…".

### Modo claro y modo oscuro (obligatorio)

- La app tiene **ambos modos completos**. Por defecto sigue la configuración del iPhone, y en Ajustes hay un selector **Sistema · Claro · Oscuro**.
- **Cada pantalla y cada estado se entrega en los dos modos**, no solo los tokens.
- **La ropa tiene que verse bien en los dos modos.** Una prenda negra sobre un fondo casi negro desaparece, y una blanca sobre crema también. Las tarjetas de prenda y el lienzo del Armador necesitan una superficie que dé contraste a cualquier color de ropa en ambos modos (por ejemplo, un tono medio neutro, o un borde o sombra sutil detrás del recorte). Muéstralo con una prenda negra y una blanca en cada modo.
- Los bordes del recorte nunca son perfectos y pueden dejar un halo del fondo original. Este halo se nota distinto en cada modo, así que revisa las tarjetas con recortes imperfectos en ambos.
- Las siluetas del Taller y la foto del maniquí deben leerse bien sobre los dos fondos.

## 4. Pantallas del MVP

| # | Pantalla | Qué tiene que lograr |
|---|---|---|
| 1 | **Hoy (inicio)** | Muestra el outfit planeado para hoy sobre el maniquí. Si no hay ninguno, sugiere uno al azar con prendas que no ha usado hace tiempo. Acciones: "Lo usé hoy", "Otro" y "Armar uno". |
| 2 | **Clóset** | Grilla de prendas recortadas con filtros rápidos por categoría (chips) y filtros avanzados (color, temporada, ocasión, etiquetas). Es la pantalla más visitada. |
| 3 | **Detalle de prenda** | Foto grande, datos editables, cuántas veces la ha usado y la última vez, y en qué outfits aparece. Opción de eliminar. Si es **hecha por ella**: tela y composición, molde usado, notas (ajustes, talla cortada) y fotos del proceso. |
| 4 | **Agregar prenda** (flujo de 3 pasos) | 1) Cámara o galería. 2) La app quita el fondo; se ve el resultado y se puede corregir con un pincel o borrador simple. 3) Categoría y color (sugerido), y guardar. |
| 5 | **Armador de outfits** ⭐ | **Es la pantalla estrella** (detalle en la sección 5). |
| 6 | **Mis outfits** | Galería de outfits guardados como miniaturas sobre el maniquí. Filtros por etiqueta. |
| 7 | **Calendario** | Vista de semana (la principal) y de mes. Cada día muestra la miniatura del outfit asignado. Tocar un día permite asignar o cambiar el outfit. |
| 8 | **Mis maniquíes** | Fotos de cuerpo completo ya sin fondo (por ejemplo "con tenis" o "con tacones"). Agregar uno nuevo con guía de silueta. |
| 9 | **Ajustes y respaldo** | Exportar e importar el respaldo, ver cuánto espacio ocupa y ver la fecha del último respaldo. |
| 10 | **Primera vez (onboarding)** | Bienvenida (con dedicatoria opcional) → tomar la foto del maniquí con guía de pose → agregar las 3 primeras prendas → listo. Debe tomar menos de 2 minutos. |
| 11 | **Taller** ⭐ | Prendas **planeadas y en proceso** (detalle en la sección 5.1). Crear una prenda planeada a partir de una foto de tela más una silueta. Ver su estado: planeada → en proceso → terminada. |
| 12 | **Mis medidas** | Un perfil de medidas corporales (busto, cintura, cadera, largo de espalda, etc.) con fecha de la última actualización. Debe ser fácil de consultar rápido mientras cose. |

**Navegación sugerida:** barra inferior con 5 pestañas (Hoy · Clóset · Taller · Outfits · Calendario) y un botón "+" para agregar prendas. Maniquíes, medidas y ajustes van en un menú secundario. Si 5 pestañas se sienten apretadas, propón otra organización (por ejemplo, el Calendario dentro de Hoy).

**En el Clóset y el Armador**, las prendas hechas por ella llevan una marca discreta (por ejemplo, una etiqueta tipo "hecho a mano"). Las prendas **planeadas** también aparecen en el Armador, con una marca distinta, para poder combinarlas con la ropa que ya tiene.

## 5. Armador de outfits (la pantalla más importante)

**Composición:**
- **Centro:** la foto del maniquí, grande, con las prendas superpuestas.
- **Abajo:** carruseles horizontales por zona del cuerpo: Arriba · Abajo · Vestido · Calzado · Abrigo · Accesorios. Tocar una prenda la pone sobre el maniquí; tocarla otra vez la quita.
- **Acciones:** 🔀 Shuffle (combinación al azar), capas (subir o bajar una prenda), deshacer, guardar.

**Interacción con las prendas sobre el maniquí:**
- Arrastrar con un dedo para mover.
- Pellizcar para escalar y girar con dos dedos.
- La prenda seleccionada se marca con un contorno sutil y pequeñas manijas.
- Con "Restablecer posición" la prenda vuelve a su lugar automático.

**Estados que hay que diseñar:**
- Todavía no hay maniquí: invitación a tomar la foto.
- Hay maniquí pero no hay prendas en una zona.
- Outfit vacío al empezar.
- Guardar: modal corto con nombre y etiquetas opcionales.

**Mensaje de expectativas:** debe quedar claro, sin decirlo de forma negativa, que es una vista previa tipo collage y no una foto realista. Los ajustes manuales deben sentirse naturales, no como una corrección de errores.

## 5.1 Taller (la segunda pantalla estrella)

**Para qué sirve:** responder *"¿con qué de mi clóset combina esta tela, antes de cortarla?"*. Ninguna app de costura hace esto hoy.

**Cómo funciona una prenda planeada (sin IA generativa):**
1. Toma una foto de la tela (o la elige de la galería).
2. Elige una **silueta** de prenda: falda recta, falda acampanada, blusa, camisa, vestido, pantalón, etc.
3. La app rellena la silueta con la tela. Puede ajustar el **tamaño del estampado** (escala) y su posición dentro de la silueta, y se aplica un sombreado suave para que no se vea plana.
4. Le pone nombre y, si quiere, el molde que va a usar y notas.
5. Queda guardada como prenda **planeada** y ya se puede usar en el Armador junto a su ropa.

**Estados de una prenda del Taller:** planeada → en proceso → terminada. Al pasar a **terminada**, la app ofrece tomar la foto real de la prenda: esa foto reemplaza la versión con silueta y la prenda pasa al Clóset como "hecha por mí", sin perder su historia (tela, molde, notas, fotos del proceso).

**Lo que hay que diseñar:**
- La lista del Taller agrupada por estado.
- El flujo de crear una prenda planeada (tela → silueta → ajustar → datos).
- El editor de ajuste del estampado (escala y posición), que debe ser simple: un deslizador y arrastrar.
- El paso de "terminada" con la foto real.
- **La biblioteca de siluetas** (ver la sección 9): formas vectoriales limpias, de frente, con proporciones consistentes entre sí para que encajen en el maniquí.

## 5.2 Mis medidas

- Un solo perfil, con campos comunes de costura (busto, bajo busto, cintura, cadera, largo de talle delantero y trasero, ancho de espalda, largo de brazo, contorno de brazo, largo de pierna, altura). Se pueden agregar campos personalizados.
- Unidad en cm por defecto.
- Fecha de la última actualización visible.
- Lectura rápida: debe poder abrirse y encontrar una medida en dos toques mientras está en la máquina.

## 6. Otros estados y momentos

- **Quitando el fondo:** tarda unos segundos en el teléfono. Se necesita un estado de carga agradable (por ejemplo la prenda "revelándose"). La primera vez puede tardar más porque descarga el modelo.
- **El recorte salió mal:** ofrecer el pincel de corrección o reintentar con otra foto.
- **Clóset vacío:** debe invitar a empezar, no verse triste.
- **Recordatorio de respaldo:** un aviso suave, no alarmante, cuando hace tiempo no se hace un respaldo.
- **Confirmaciones:** al eliminar una prenda que está en outfits guardados.

## 7. Restricciones técnicas que afectan el diseño

- **Plataforma:** web app instalada en iPhone (modo standalone, pantalla completa, sin barra de Safari).
- **Pantalla de referencia:** iPhone de 6.1" (393 × 852 pt). Debe verse bien también en iPhone SE (375 × 667) y en Pro Max.
- **Áreas seguras:** respetar el notch o Dynamic Island arriba y el indicador de inicio abajo.
- **Toques:** zonas táctiles de al menos 44 × 44 pt. Los gestos del Armador no deben chocar con el gesto de volver deslizando desde el borde izquierdo.
- **Fotos:** las prendas llegan como PNG con fondo transparente y proporciones variadas. El diseño debe verse bien con imágenes imperfectas (bordes no tan limpios, tamaños distintos).
- **Funciona sin internet**, así que no se deben diseñar funciones que dependan de la red.
- **Idioma:** español.

## 8. Fuera de alcance (no diseñar)

- Login o cuentas, perfiles sociales, feed, compartir con amigos.
- Tienda, compras, reventa.
- Clima, estadísticas avanzadas, listas de viaje (quedan para una versión 2).
- Inventario completo de telas (metros, ubicación), biblioteca de moldes en PDF, mercería y listas de compra: eso ya lo resuelven apps de costura existentes.
- Cualquier cosa que sugiera un "probador realista con IA".

## 9. Qué necesito que entregues

1. **2 o 3 direcciones visuales** (solo Clóset y Armador), para elegir una.
2. Con la dirección elegida: **las 12 pantallas** de la sección 4, con sus estados vacíos y de carga, **cada una en modo claro y en modo oscuro**.
3. **Tokens de diseño:** paleta en claro y oscuro, escala tipográfica, espaciados, radios y sombras.
4. **Componentes:** tarjeta de prenda (con variantes normal, hecha por mí y planeada), chip de filtro, carrusel por zona, barra inferior, botón principal y secundario, modal o hoja inferior, indicador de estado del Taller y las manijas de selección del Armador.
5. **Biblioteca de siluetas:** al menos 8 (falda recta, falda acampanada, blusa, camisa, vestido recto, vestido con vuelo, pantalón recto, pantalón ancho), como **SVG de una sola forma cerrada**, de frente, en el mismo sistema de proporciones. Se van a usar como máscara para rellenarlas con la foto de la tela, así que solo importa el contorno; el sombreado, si lo propones, va como una capa aparte.
6. **Notas de interacción** para el Armador, el flujo de Agregar prenda y el flujo de crear una prenda planeada.

Este diseño se entregará después a Claude Code para implementarlo, así que conviene que los nombres de pantallas y componentes sean claros y consistentes.
