# Feature Specification: Percha — clóset digital y taller

**Feature Branch**: `001-percha-closet-taller`

**Created**: 2026-10-19

**Status**: Draft

**Input**: User description: "App personal de clóset digital para decidir qué ponerse viendo outfits sobre una foto de una misma, sin IA generativa. La usuaria fotografía cada prenda; la app quita el fondo automáticamente y guarda la prenda con sus datos. Maniquíes, Armador con gestos y shuffle, outfits, calendario y pantalla Hoy, prendas 'hechas por mí', Taller de prendas planeadas (silueta rellena con tela), perfil de medidas, respaldo exportable e importable y onboarding con dedicatoria." (texto completo en `brief-claude-code.md` §4.2; diseño en `Tres direcciones visuales Clóset/`)

## Clarifications

### Session 2026-10-19

- Q: Al importar un respaldo con datos existentes, ¿qué pasa? → A: Reemplazar todo, con
  confirmación clara, y antes se guarda en el teléfono un respaldo automático de lo que había.
- Q: Si se elimina un maniquí que usan outfits guardados, ¿qué pasa? → A: Se avisa "Lo usan N
  outfits" y, al confirmar, esos outfits pasan al maniquí principal conservando prendas y
  posiciones.
- Q: ¿Se guarda la foto original además del recorte? → A: Sí, reducida a ~1500 px en el lado
  mayor; el detalle de la prenda ofrece "Volver a recortar".
- Q: Al terminar una prenda del Taller, ¿qué pasa con su transformación en los outfits? → A: Se
  conserva, reajustada para que la foto real ocupe el mismo lugar del cuerpo que la silueta (mismo
  centro y mismo alto).
- Q: ¿La usuaria puede agregar siluetas propias al Taller? → A: Sí. En el MVP, importando un
  archivo SVG con un solo contorno cerrado sobre la misma retícula corporal (se valida y va en el
  respaldo). Más adelante, también dibujándolas con un editor de contorno en la app, que primero se
  diseña en Claude Design. Queda como borrador en `specs/backlog/editor-siluetas.md`.

### Session 2026-10-22

- Q: ¿Los 2 minutos del onboarding incluyen la primera descarga del modelo de recorte (56 a 100 MB,
  según el modelo)? → A: No. Se miden sin contar esa descarga, igual que el tiempo de agregar una
  prenda (SC-002). La descarga empieza sola en el primer arranque (`/speckit-analyze`, hallazgo H2;
  aprobado por el dueño).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Respaldo y datos seguros (Priority: P1)

La usuaria puede exportar todo su clóset (fotos, prendas, maniquíes, outfits, calendario, Taller,
medidas y ajustes) a un solo archivo y restaurarlo en otra instalación. Si pasaron más de 14 días
sin respaldo, ve un aviso suave en Hoy con la acción "Respaldar".

**Why this priority**: el teléfono puede liberar almacenamiento; perder el clóset arruina el regalo.
Todo lo demás se construye sobre datos que deben sobrevivir.

**Independent Test**: crear datos de prueba, exportar, borrar la app, reinstalar, importar y
comparar que todo quedó idéntico.

**Acceptance Scenarios**:

1. **Given** un clóset con prendas, outfits, prendas del Taller y medidas, **When** exporta desde
   Ajustes, **Then** obtiene un único archivo que puede guardar en Archivos o iCloud.
2. **Given** una instalación limpia, **When** importa ese archivo, **Then** se restaura todo,
   incluidos Taller, siluetas personalizadas, medidas y asignaciones del calendario.
3. **Given** que el último respaldo fue hace más de 14 días, **When** abre Hoy, **Then** ve el
   aviso suave de respaldo.
3b. **Given** que nunca hizo un respaldo y ya tiene al menos una prenda, **When** abre Hoy,
   **Then** ve el aviso suave de respaldo.
4. **Given** un archivo de respaldo dañado o de otra app, **When** intenta importarlo, **Then** ve
   un mensaje claro y sus datos actuales no cambian.
5. **Given** datos existentes, **When** importa un respaldo válido y confirma, **Then** se guarda
   primero un respaldo automático de lo anterior y luego se reemplaza todo por el contenido del
   archivo.

---

### User Story 2 - Agregar una prenda con recorte automático (Priority: P1)

La usuaria toma una foto o elige una de la galería. La app quita el fondo en el teléfono, mientras
muestra la prenda "revelándose". Revisa el recorte sobre un fondo a cuadros, lo corrige con Pincel o
Borrador (con tamaño ajustable y Deshacer) o toma otra foto. Luego confirma categoría y color
(preseleccionados con sugerencias), y opcionalmente nombre, temporada, ocasión y etiquetas.

**Why this priority**: sin prendas no hay clóset ni outfits.

**Independent Test**: agregar una prenda desde la cámara y otra desde la galería, sin conexión
(después de la primera carga), y verla guardada en el Clóset.

**Acceptance Scenarios**:

1. **Given** la app ya cargada una vez, **When** agrega una prenda sin conexión, **Then** el
   recorte funciona igual.
2. **Given** la primera vez que se recorta, **When** empieza el proceso, **Then** se avisa que
   tardará más porque está preparando el recorte.
3. **Given** un recorte con partes de fondo, **When** usa el Borrador y el Pincel, **Then** el
   resultado se corrige sin perder nitidez y puede deshacer cada trazo.
4. **Given** el paso de datos, **When** llega, **Then** la categoría y el color ya vienen
   sugeridos (color = promedio de los píxeles visibles de la prenda).

---

### User Story 3 - Navegar y gestionar el Clóset (Priority: P1)

Ve sus prendas en una grilla de 2 columnas con buscador, chips de categoría y una hoja de filtros
(color, temporada, ocasión, etiquetas, "Solo hecho por mí"). Abre el detalle de una prenda, edita
sus datos, ve cuántas veces la usó, la última vez y en qué outfits aparece, y puede eliminarla.

**Why this priority**: es la vista principal de su ropa.

**Independent Test**: con 20 prendas cargadas, filtrar, editar una y eliminar otra que esté en
outfits.

**Acceptance Scenarios**:

1. **Given** un clóset vacío, **When** abre Clóset, **Then** ve la invitación "Tomar foto" /
   "Elegir de la galería".
2. **Given** una prenda que está en 3 outfits, **When** la elimina, **Then** se le advierte
   "Está en 3 outfits guardados…", y al confirmar se quita de esos outfits y el resto de cada
   outfit se conserva.
3. **Given** prendas negras y blancas, **When** se ven en las tarjetas en modo claro y oscuro,
   **Then** ambas se distinguen bien del fondo.

---

### User Story 4 - Maniquíes (Priority: P2)

Guarda una o más fotos de cuerpo completo sin fondo ("maniquíes"), tomadas con una silueta guía de
pose y un temporizador de 5 s. Una de ellas es la principal.

**Why this priority**: el Armador necesita un maniquí, pero existe un estado sin maniquí.

**Independent Test**: crear dos maniquíes, marcar uno como principal y verlo en el Armador.

**Acceptance Scenarios**:

1. **Given** Mis maniquíes, **When** toca "+ Nuevo maniquí", **Then** toma la foto con guía y
   temporizador y se guarda sin fondo.
2. **Given** varios maniquíes, **When** marca uno como principal, **Then** el Armador y Hoy lo usan
   por defecto.

---

### User Story 5 - Armador de outfits (Priority: P2)

Sobre el maniquí elige prendas por zona (Arriba · Abajo · Vestido · Calzado · Abrigo · Accesorios).
Tocar una prenda la pone en su posición automática; tocarla de nuevo la quita. Cabe una prenda por
zona, salvo Accesorios. Selecciona una prenda para moverla con un dedo, escalarla con pellizco
(0.5× a 2.5×) y rotarla con dos dedos. Puede restablecer su posición, subir o bajar capas,
deshacer (al menos 20 pasos), mezclar al azar (priorizando prendas de poco uso) y guardar el
outfit con nombre y etiquetas opcionales.

**Why this priority**: es la pantalla estrella y la razón de ser de la app.

**Independent Test**: armar un outfit de 4 prendas, ajustar cada una con gestos, deshacer, mezclar
y guardar.

**Acceptance Scenarios**:

1. **Given** un maniquí y prendas, **When** mueve, escala y rota una prenda, **Then** responde con
   fluidez y no activa el gesto de volver de iOS.
2. **Given** ya hay una prenda en "Arriba", **When** toca otra prenda de "Arriba", **Then** la
   nueva reemplaza a la anterior.
3. **Given** no hay maniquí, **When** abre el Armador, **Then** ve la invitación a tomar la foto.
4. **Given** las primeras veces, **When** abre el Armador, **Then** ve el chip "Vista collage ·
   arrastra, pellizca y gira", que luego deja de aparecer.

---

### User Story 6 - Mis outfits, calendario y Hoy (Priority: P2)

Ve sus outfits guardados en una grilla. Asigna outfits a días en el Calendario (vista semana y mes,
semana desde el lunes). Hoy muestra el outfit asignado para hoy sobre el maniquí, o una sugerencia
al azar con prendas no usadas en más de un mes. "Lo usé hoy" suma un uso y actualiza la última
fecha de uso de cada prenda del outfit.

**Why this priority**: convierte el clóset en una ayuda diaria.

**Independent Test**: asignar un outfit a hoy, verlo en Hoy, marcar "Lo usé hoy" y comprobar el
conteo en el detalle de cada prenda.

**Acceptance Scenarios**:

1. **Given** un outfit asignado a hoy, **When** abre la app, **Then** Hoy lo muestra.
2. **Given** ningún outfit para hoy, **When** abre Hoy, **Then** ve "Una idea para hoy" con una
   sugerencia, y puede pedir "Otro" o "Armar uno".
3. **Given** el outfit de hoy, **When** toca "Lo usé hoy", **Then** cada prenda suma 1 uso y su
   última fecha de uso es hoy.

---

### User Story 7 - Prendas "hechas por mí" (Priority: P2)

Marca una prenda como "hecha por mí" y registra tela, composición, molde, notas de ajustes y fotos
del proceso. Se ve con la etiqueta "hecho por mí" en el Clóset.

**Why this priority**: la usuaria cose; es parte de su identidad en la app.

**Independent Test**: marcar una prenda como hecha, completar sus datos y filtrar "Solo hecho por mí".

**Acceptance Scenarios**:

1. **Given** una prenda, **When** la marca como hecha por mí y agrega fotos del proceso, **Then**
   el detalle muestra tela, composición, molde, notas y fotos.

---

### User Story 8 - Taller: prenda planeada → terminada (Priority: P3)

Crea una prenda planeada en 4 pasos: foto de la tela → silueta (8 en la biblioteca, previsualizadas
con su tela) → ajustar escala y posición del estampado y el "Sombreado suave" → nombre, molde y
notas. La prenda planeada aparece en el Armador marcada como "planeada" para combinarla con su ropa.
Avanza de planeada → en proceso → terminada. Al terminarla toma la foto real, que pasa por el mismo
recorte, reemplaza la silueta, y la prenda pasa al Clóset como "hecha por mí" conservando tela,
molde, notas y fotos del proceso.

**Why this priority**: es el diferencial del producto, pero depende del Clóset y del Armador.

**Independent Test**: crear una prenda planeada, usarla en un outfit con prendas reales,
terminarla con foto real y comprobar que el outfit sigue funcionando.

**Acceptance Scenarios**:

1. **Given** una foto de tela y una silueta, **When** ajusta la escala del estampado, **Then** la
   tela se repite dentro de la silueta al tamaño elegido.
2. **Given** una prenda planeada, **When** abre el Armador, **Then** aparece en el carrusel con la
   marca "planeada" y se comporta como cualquier otra prenda.
3. **Given** una prenda en proceso usada en un outfit, **When** la marca como terminada con su foto
   real, **Then** pasa al Clóset como "hecha por mí" con su historia y el outfit sigue mostrándola
   en el mismo lugar del cuerpo y con el mismo alto que tenía la silueta.

---

### User Story 9 - Mis medidas (Priority: P3)

Un perfil de medidas con campos comunes de costura (busto, bajo busto, cintura, cadera, largo de
talle delantero y trasero, ancho de espalda, largo de brazo, contorno de brazo, largo de pierna,
altura), campos personalizados y fecha de última actualización. Se abre y se lee en dos toques
(Hoy → ⋯ → Mis medidas).

**Independent Test**: editar dos medidas, agregar una personalizada y consultar una en dos toques.

**Acceptance Scenarios**:

1. **Given** el perfil, **When** edita una medida, **Then** la fecha de actualización cambia a hoy.

---

### User Story 10 - Onboarding, apariencia e instalación (Priority: P3)

La primera vez ve una bienvenida con dedicatoria opcional ("Para [nombre]"), toma la foto de su
maniquí y agrega sus 3 primeras prendas, en menos de 2 minutos (sin contar la primera descarga del
modelo de recorte). En Ajustes elige la apariencia
Sistema · Claro · Oscuro; el cambio es inmediato y la app nunca parpadea con el tema equivocado al
abrir.

**Independent Test**: instalar desde Safari, completar el onboarding y cambiar de tema.

**Acceptance Scenarios**:

1. **Given** Safari en el iPhone, **When** usa "Agregar a pantalla de inicio", **Then** la app abre
   a pantalla completa con su ícono y su splash.
2. **Given** el tema en Oscuro, **When** cierra y abre la app, **Then** abre directo en oscuro.

---

### Edge Cases

- Se queda sin espacio el teléfono: la app avisa cuánto ocupa (Ajustes muestra el espacio usado) y
  sugiere respaldar; nunca deja datos a medio guardar.
- El recorte devuelve una imagen vacía o casi vacía: se ofrece "Otra foto" o el Pincel.
- Se interrumpe el recorte (la app pasa a segundo plano o el sistema la cierra): al volver no queda
  una prenda incompleta guardada.
- Se elimina un maniquí que usan outfits guardados: se avisa "Lo usan N outfits" y, al confirmar,
  esos outfits pasan al maniquí principal con sus prendas y posiciones. Si el eliminado era el
  principal, otro maniquí pasa a ser principal. Si era el último, los outfits se conservan y se
  muestran sobre el lienzo sin maniquí hasta que haya uno nuevo.
- Se elimina la última prenda de un outfit: el outfit queda vacío pero no se borra solo.
- Un día del calendario apunta a un outfit eliminado: el día queda sin asignar.
- "Lo usé hoy" dos veces el mismo día: cuenta una sola vez por día.
- Se importa un SVG con varios contornos, abierto o con otro viewBox: se rechaza con un mensaje que
  explica el formato esperado.
- Se intenta borrar una silueta importada que usan prendas del Taller: no se permite mientras esté
  en uso, y se indica qué prendas la usan.
- Importar un respaldo de una versión de esquema anterior: se migra; de una versión más nueva: se
  rechaza con un mensaje claro.

## Requirements *(mandatory)*

### Functional Requirements

**Datos y respaldo**

- **FR-001**: Todos los datos y fotos MUST guardarse solo en el dispositivo; la app MUST NOT
  enviar datos a ningún servidor.
- **FR-002**: La usuaria MUST poder exportar un respaldo completo en un solo archivo y guardarlo en
  Archivos o iCloud.
- **FR-003**: La usuaria MUST poder importar un respaldo. Si ya hay datos, la importación
  reemplaza todo tras una confirmación clara; antes de reemplazar, la app MUST guardar en el
  dispositivo un respaldo automático de los datos anteriores, que la usuaria puede restaurar.
- **FR-004**: El respaldo MUST incluir la versión de su formato; la app MUST validar el archivo
  antes de modificar cualquier dato.
- **FR-005**: Hoy MUST mostrar un aviso suave de respaldo si pasaron más de 14 días de calendario
  desde el último, o si nunca se hizo un respaldo y hay al menos una prenda. Con el clóset vacío
  no se muestra.
- **FR-006**: Ajustes MUST mostrar el espacio usado por la app.

**Prendas**

- **FR-010**: La usuaria MUST poder agregar una prenda desde la cámara o la galería.
- **FR-011**: La app MUST quitar el fondo en el dispositivo y funcionar sin conexión después de la
  primera carga.
- **FR-012**: La usuaria MUST poder corregir el recorte con Pincel y Borrador de tamaño ajustable,
  deshacer trazos y reintentar con otra foto.
- **FR-012a**: La app MUST guardar la foto original de cada prenda reducida a ~1500 px en su lado
  mayor, y el detalle de la prenda MUST ofrecer "Volver a recortar" desde esa original (con la misma
  revisión con Pincel y Borrador). La original se incluye en el respaldo.
- **FR-013**: Cada prenda MUST tener categoría (top, bottom, vestido, calzado, abrigo, accesorio) y
  color; MAY tener nombre, temporadas, ocasiones y etiquetas libres.
- **FR-014**: La app MUST sugerir categoría y color al guardar; el color sugerido es el promedio de
  los píxeles visibles.
- **FR-015**: La usuaria MUST poder buscar, filtrar (categoría, color, temporada, ocasión,
  etiquetas, solo hecho por mí), editar y eliminar prendas.
- **FR-016**: Al eliminar una prenda que está en outfits, la app MUST advertir cuántos outfits la
  usan y, al confirmar, quitarla de ellos conservando el resto de cada outfit.
- **FR-017**: Cada prenda MUST llevar conteo de usos y fecha del último uso.
- **FR-018**: Una prenda MUST poder marcarse como "hecha por mí" con tela, composición, molde,
  notas y fotos del proceso.

**Maniquíes**

- **FR-020**: La usuaria MUST poder crear varios maniquíes con guía de pose y temporizador de 5 s,
  con el fondo quitado, y marcar uno como principal.
- **FR-021**: Al eliminar un maniquí usado por outfits, la app MUST avisar cuántos lo usan y, al
  confirmar, reasignar esos outfits al maniquí principal conservando sus capas.

**Armador y outfits**

- **FR-030**: El Armador MUST colocar cada prenda en una posición automática según su zona, relativa
  a la altura del maniquí.
- **FR-031**: Cada zona MUST admitir una sola prenda, salvo Accesorios, que admite varias.
- **FR-032**: La usuaria MUST poder mover, escalar (0.5× a 2.5×) y rotar la prenda seleccionada con
  gestos, sin activar el gesto de volver del sistema (los gestos se ignoran en los 20 px del borde).
- **FR-033**: El Armador MUST permitir restablecer la posición, cambiar el orden de capas, deshacer
  al menos 20 pasos y mezclar al azar priorizando prendas de poco uso.
- **FR-034**: Un outfit guardado MUST conservar su maniquí y, por cada prenda, su posición, escala,
  rotación y orden de capa. Las posiciones se guardan relativas al cuerpo del maniquí (no en
  píxeles), para que el outfit se vea razonable si cambia de maniquí.
- **FR-035**: El Armador MUST tratar igual a una prenda planeada y a una real: ambas se muestran
  como una imagen con transparencia.
- **FR-036**: La usuaria MUST poder guardar, nombrar, etiquetar, ver y eliminar outfits.

**Calendario y Hoy**

- **FR-040**: La usuaria MUST poder asignar un outfit a cualquier día, en vista semana y mes
  (semana desde el lunes); un día tiene como máximo un outfit.
- **FR-041**: Hoy MUST mostrar el outfit asignado a hoy o, si no hay, una sugerencia al azar que
  priorice prendas no usadas en más de un mes.
- **FR-042**: "Lo usé hoy" MUST sumar un uso y fijar la última fecha de uso en cada prenda del
  outfit, como máximo una vez por día.

**Taller**

- **FR-050**: La usuaria MUST poder crear una prenda planeada con una foto de tela y una silueta de
  la biblioteca (8 siluetas incluidas).
- **FR-051**: La tela MUST repetirse en mosaico dentro de la silueta, con escala y posición
  ajustables, y un sombreado suave que se puede activar o desactivar.
- **FR-050a**: La usuaria MUST poder importar siluetas propias desde un archivo SVG con un solo
  contorno cerrado (viewBox 0 0 200 400, sobre la misma retícula corporal que las incluidas). La app
  MUST validar el archivo, rechazar con un mensaje claro los que no cumplan, y mostrar las siluetas
  importadas junto a las incluidas. Pantalla no diseñada: se construye con los tokens existentes y
  se anota para revisarla en Claude Design. El modelo de siluetas MUST permitir agregar en v2 un
  editor de contorno dentro de la app sin migrar datos de forma destructiva (una silueta dibujada se
  guarda igual que una importada).
- **FR-052**: Una prenda del Taller MUST tener estado planeada → en proceso → terminada.
- **FR-053**: Al terminarla, la foto real MUST pasar por el mismo recorte que una prenda nueva,
  reemplazar la silueta, y la prenda MUST pasar al Clóset como "hecha por mí" conservando tela,
  molde, notas, fotos del proceso, usos y su presencia en outfits.
- **FR-053a**: En cada outfit que la usaba, la transformación de la prenda terminada MUST
  reajustarse para que la foto real ocupe el mismo centro y el mismo alto sobre el cuerpo que ocupaba
  la silueta; la rotación y el orden de capa se conservan.
- **FR-054**: El Taller MUST listar las prendas agrupadas por estado.

**Medidas, onboarding y apariencia**

- **FR-060**: La app MUST tener un perfil de medidas en cm con los campos comunes de costura, campos
  personalizados y fecha de última actualización.
- **FR-061**: El onboarding MUST incluir dedicatoria opcional, foto del maniquí y 3 primeras
  prendas, y poder completarse en menos de 2 minutos, sin contar la primera descarga del modelo de
  recorte.
- **FR-062**: La app MUST tener modo claro y oscuro completos, seguir al sistema por defecto y
  permitir elegir Sistema · Claro · Oscuro en Ajustes, sin parpadeo al abrir.
- **FR-063**: Toda la interfaz MUST estar en español y seguir el diseño entregado.

### Key Entities *(include if feature involves data)*

- **Prenda**: una pieza de ropa con su imagen recortada, su foto original reducida, categoría, color, temporadas, ocasiones,
  etiquetas, usos, última fecha de uso y origen (comprada o hecha por mí). Si es hecha por mí, lleva
  datos de costura.
- **Datos de costura**: tela, composición, molde, notas y fotos del proceso. Los comparten las
  prendas hechas y las prendas del Taller.
- **Prenda del Taller**: una prenda en estado planeada, en proceso o terminada, con su foto de tela,
  silueta y parámetros del estampado (escala, posición, sombreado). Al terminarse se convierte en
  Prenda conservando su identidad y su historial de imágenes (silueta → foto real).
- **Silueta**: una forma de prenda usada como máscara, sobre una retícula corporal común. Puede
  ser incluida (las 8 de la app) o importada por la usuaria; las importadas van en el respaldo.
- **Maniquí**: foto de cuerpo completo sin fondo; uno es el principal.
- **Outfit**: nombre y etiquetas opcionales, un maniquí y una lista de capas (prenda + posición,
  escala, rotación y orden).
- **Asignación de calendario**: un día → un outfit.
- **Perfil de medidas**: lista de medidas (nombre, valor en cm, si es personalizada) y fecha de
  actualización.
- **Ajustes**: apariencia, fecha del último respaldo, dedicatoria y estado del onboarding.
- **Respaldo**: archivo con versión de formato que contiene todas las entidades y sus imágenes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un respaldo exportado se importa en una instalación limpia y restaura el 100 % de
  prendas, imágenes, outfits, asignaciones, Taller, siluetas y medidas.
- **SC-002**: Agregar una prenda (foto → recorte listo para revisar) toma pocos segundos en un iPhone
  de gama media, sin contar la primera descarga; el tiempo medido queda anotado.
- **SC-003**: Después de la primera carga, la app hace cero solicitudes de red durante el uso normal,
  incluido el recorte.
- **SC-004**: Mover, escalar y rotar prendas en el Armador se siente fluido con 8 prendas en capas y
  nunca dispara el gesto de volver.
- **SC-005**: Una medida se encuentra en dos toques desde Hoy.
- **SC-006**: El onboarding se completa en menos de 2 minutos, sin contar la primera descarga del
  modelo de recorte.
- **SC-007**: Prendas negras y blancas se distinguen en tarjetas y Armador en ambos modos (verificado
  con prendas reales).
- **SC-008**: Las pantallas respetan las áreas seguras en iPhone SE y Pro Max en ambos modos.
- **SC-009**: La app soporta al menos 300 prendas, 5 maniquíes y 200 outfits sin volverse lenta al
  navegar el Clóset.
- **SC-010**: Una prenda planeada terminada sigue apareciendo en el 100 % de los outfits que la
  usaban.

## Assumptions

- Una sola usuaria, un solo dispositivo (iPhone) y sin cuentas.
- La interfaz y los nombres de pantallas siguen el export de Claude Design
  (`Tres direcciones visuales Clóset/`); el copy de ese diseño es definitivo.
- Las medidas se guardan en cm y solo se conserva el valor actual de cada una.
- La sugerencia de categoría puede ser simple (por proporciones de la imagen o la última elegida);
  no requiere un modelo de clasificación.
- Para la colocación automática en el MVP (sin detección de pose) se usan zonas fijas relativas a la
  altura del maniquí.
- Una prenda en proceso se puede usar en outfits y en el calendario igual que una planeada.
- Planeado para v2 (no en el MVP): editor de contorno para dibujar siluetas en la app y anclaje
  automático de prendas por detección de pose.
- Fuera de alcance: probador generativo, cuentas, sincronización, social, tienda, clima,
  estadísticas avanzadas, listas de viaje, analítica, inventario de telas con metraje, biblioteca de
  moldes PDF, mercería y listas de compra.
