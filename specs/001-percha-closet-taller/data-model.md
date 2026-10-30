# Modelo de datos: Percha

**Fecha**: 2026-10-22 · **Plan**: [plan.md](./plan.md) · **Investigación**: [research.md](./research.md) (R-4, R-9, R-10)

Base de datos IndexedDB `percha` manejada con Dexie 4. **Esquema v1.** Este modelo adapta el
"Modelo de datos sugerido" de `handoff_actualizacion/README.md` a las aclaraciones del spec. Los
cambios frente a esa propuesta están en la sección final.

## Convenciones

- **IDs**: `string` generados con `crypto.randomUUID()`. Las siluetas incluidas usan IDs fijos
  `incluida:<archivo>` (por ejemplo `incluida:blusa`).
- **Fechas de calendario**: `string` local `YYYY-MM-DD` (la usuaria vive en una sola zona horaria;
  no se guardan como instantes para que "hoy" no cambie con la zona).
- **Marcas de tiempo**: `number` en milisegundos (`Date.now()`).
- **Booleanos indexados**: `0 | 1`, porque IndexedDB no indexa `boolean`.
- **Imágenes**: nunca dentro de una entidad. Cada entidad guarda IDs que apuntan a la tabla
  `imagenes`. Así las consultas de la grilla no cargan blobs y el respaldo puede enumerarlas.
- **Unidades del cuerpo**: las posiciones de las prendas en un outfit se guardan relativas al
  **cuerpo** del maniquí (FR-034), no en píxeles. Ver *Transformacion*.

## Esquema Dexie v1

```text
prendas        id, categoria, enCloset, estadoTaller, origen, *etiquetas, ultimoUso, creada
imagenes       id, tipo
siluetas       id, origen
maniquies      id, principal
outfits        id, maniquiId, *etiquetas, *prendaIds, actualizado
calendario     fecha, outfitId
usosDia        fecha
medidas        id
ajustes        id
respaldosAuto  id, creado
```

`outfits.prendaIds` es un campo derivado (los `prendaId` de sus capas) que existe solo para el
índice multivalor. Permite responder "¿en cuántos outfits está esta prenda?" (FR-016, detalle de
prenda) sin recorrer los 200 outfits.

---

## Entidades

### Prenda

Una sola entidad para la ropa comprada, la hecha por ella y las prendas del Taller. Así una prenda
planeada que se termina **conserva su `id`**, y los outfits que la usan no cambian (FR-053, SC-010).

| Campo | Tipo | Regla |
|---|---|---|
| `id` | string | |
| `nombre` | string? | opcional (FR-013) |
| `categoria` | `'top' \| 'bottom' \| 'vestido' \| 'calzado' \| 'abrigo' \| 'accesorio'` | obligatorio |
| `color` | `{ hex: string; nombre?: string }` | obligatorio; `hex` sugerido = promedio de píxeles con alfa > 0,5 (FR-014) |
| `temporadas` | string[] | puede estar vacío |
| `ocasiones` | string[] | puede estar vacío |
| `etiquetas` | string[] | libres, sin repetidas, recortadas y en minúsculas para comparar |
| `origen` | `'comprada' \| 'hecha'` | `'hecha'` si está marcada "hecha por mí" o viene del Taller |
| `costura` | *DatosCostura*? | obligatorio si `origen = 'hecha'` (puede tener campos vacíos) |
| `estadoTaller` | `'planeada' \| 'en_proceso' \| 'terminada'`? | solo si nació en el Taller |
| `enCloset` | `0 \| 1` | `1` si `estadoTaller` es nulo o `'terminada'`; `0` si está planeada o en proceso |
| `planeada` | *ParametrosPlaneada*? | obligatorio si nació en el Taller (se conserva al terminar, como historia) |
| `imagen` | *ImagenesPrenda* | la imagen **actual** que usa el Armador |
| `historialImagenes` | *EntradaHistorial*[] | se agrega una entrada cada vez que cambia `imagen` |
| `usos` | number | ≥ 0 (FR-017) |
| `ultimoUso` | string? `YYYY-MM-DD` | |
| `creada`, `actualizada` | number | |

**ImagenesPrenda**

| Campo | Tipo | Regla |
|---|---|---|
| `recorteId` | id de imagen `recorte` | PNG con alfa, recortado al contorno opaco, ≤ 1200 px lado mayor |
| `miniaturaId` | id de imagen `miniatura` | PNG, ≤ 360 px lado mayor |
| `originalId` | id de imagen `original`? | JPEG ≤ 1500 px (FR-012a); falta solo en prendas planeadas sin foto real |
| `anclaje` | *Anclaje*? | solo en imágenes generadas desde una silueta |

**Anclaje** (para que el Armador coloque una prenda planeada exactamente sobre la retícula)

| Campo | Tipo | Regla |
|---|---|---|
| `cx`, `cy`, `alto` | number | en unidades del cuerpo (ver *Transformacion*), calculadas del rectángulo de la silueta en la retícula 200 × 400 |

**EntradaHistorial**

| Campo | Tipo |
|---|---|
| `tipo` | `'silueta' \| 'foto'` |
| `recorteId`, `miniaturaId` | ids de imagen |
| `fecha` | number |

Al terminar una prenda del Taller, la imagen de la silueta **no se borra**: queda en el historial
(spec, *Prenda del Taller*: "historial de imágenes silueta → foto real") y va en el respaldo.

**DatosCostura** (FR-018; compartidos por prendas hechas y prendas del Taller)

| Campo | Tipo |
|---|---|
| `tela` | string? (descripción) |
| `composicion` | string? |
| `molde` | string? |
| `notas` | string? |
| `fotosProcesoIds` | id de imagen `proceso`[] |

**ParametrosPlaneada** (FR-050, FR-051)

| Campo | Tipo | Regla |
|---|---|---|
| `telaFotoId` | id de imagen `tela` | |
| `siluetaId` | id de *Silueta* | debe existir; la silueta no se puede borrar mientras esté en uso |
| `estampado` | `{ escala: number; offsetX: number; offsetY: number }` | `escala` 0,25–4 (1 = la foto de la tela ocupa el ancho de la retícula); offsets en unidades de la retícula, en módulo del tamaño del mosaico |
| `sombreado` | boolean | "Sombreado suave" (por defecto `true`) |

**Transiciones de `estadoTaller`** (FR-052)

```text
planeada ⇄ en_proceso → terminada
```

- `planeada → en_proceso` y su vuelta: solo cambia el estado.
- `en_proceso → terminada` (también se permite desde `planeada`): exige una foto real que pasa por el
  recorte (FR-053). En una sola transacción:
  1. Se guardan las imágenes nuevas (`original`, `recorte`, `miniatura`).
  2. `imagen` pasa a la foto real (sin `anclaje`) y se agrega `{ tipo: 'foto' }` al historial.
  3. `origen = 'hecha'`, `enCloset = 1`, `estadoTaller = 'terminada'`. Se conservan `costura`,
     `planeada`, `usos`, `ultimoUso` y las etiquetas.
  4. **Reajuste en outfits (FR-053a)**: cada capa guarda `cx`, `cy` y `alto` absolutos en unidades
     del cuerpo, y tanto el PNG de la silueta como el de la foto están recortados a su contorno.
     Por eso la foto real ocupa automáticamente **el mismo centro y el mismo alto**. Se conservan
     `rotacion` y el orden de la capa. El ancho sale de la proporción de la foto. Solo se regeneran
     las miniaturas de esos outfits.
- `terminada` es final.

**Validación**: `categoria` de una prenda planeada = la categoría de su silueta, editable.

### Imagen

| Campo | Tipo | Regla |
|---|---|---|
| `id` | string | |
| `tipo` | `'original' \| 'recorte' \| 'miniatura' \| 'tela' \| 'proceso' \| 'maniqui' \| 'maniquiMiniatura' \| 'outfitMiniatura'` | |
| `blob` | Blob | `image/png` o `image/jpeg` |
| `ancho`, `alto` | number | píxeles |
| `bytes` | number | para mostrar el espacio usado |
| `creada` | number | |

Ninguna imagen queda huérfana: los repositorios borran las imágenes de una entidad en la misma
transacción que la entidad. Al arrancar, una verificación de integridad cuenta las imágenes sin
referencia y las reporta en el panel de diagnóstico; **no las borra sola** (se borran con una acción
explícita y probada).

### Silueta (FR-050, FR-050a)

| Campo | Tipo | Regla |
|---|---|---|
| `id` | string | `incluida:<archivo>` o UUID |
| `nombre` | string | obligatorio |
| `origen` | `'incluida' \| 'importada'` (v2 agrega `'dibujada'`) | |
| `categoria` | categoría de *Prenda* | la eligen al importar; las incluidas la traen fija |
| `d` | string | path **normalizado** en la retícula `0 0 200 400`, cerrado |
| `caja` | `{ x, y, ancho, alto }` | rectángulo del contorno en la retícula; sirve para recortar el PNG, las miniaturas y el *Anclaje* |
| `creada` | number | |

- Las **8 incluidas** no se guardan en la base: viven en el código de la app (son los SVG del
  diseño), con su `caja` calculada del path y el viewBox de miniatura del README. Para las
  importadas, la miniatura usa la `caja` con 6 unidades de margen. Solo las **importadas** van en
  la tabla y en el respaldo.
- **v2 sin migración destructiva**: el editor de contorno guardará `origen: 'dibujada'` con el mismo
  `d` y `caja`, más un campo opcional `edicion` (los puntos de control). Agregar un valor a `origen` y
  un campo opcional es una migración aditiva.
- Borrar una silueta importada en uso está prohibido; se muestran las prendas que la usan (spec,
  Edge Cases).
- Reglas de importación: [contracts/silueta-svg.md](./contracts/silueta-svg.md).

### Maniquí (FR-020, FR-021)

| Campo | Tipo | Regla |
|---|---|---|
| `id` | string | |
| `nombre` | string | por defecto "Maniquí N" |
| `imagenId` | id de imagen `maniqui` | PNG con alfa, ≤ 1600 px de alto |
| `miniaturaId` | id de imagen `maniquiMiniatura` | |
| `cuerpo` | `{ x, y, ancho, alto }` | rectángulo de los píxeles opacos de la foto, en píxeles de la imagen; se calcula al guardar |
| `principal` | `0 \| 1` | |
| `creado` | number | |

**Invariante**: si hay al menos un maniquí, **exactamente uno** es principal. Al crear el primero,
queda como principal. Al borrar el principal, pasa a serlo el más reciente de los que quedan.

**Borrar un maniquí usado por N outfits** (FR-021): se avisa "Lo usan N outfits"; al confirmar, en
una transacción, esos outfits pasan a `maniquiId` = el principal (después de reasignarlo si hacía
falta) y se conservan sus capas tal cual (están en unidades del cuerpo). Si era el último maniquí,
quedan con `maniquiId = null` y el Armador usa un **cuerpo por defecto** (rectángulo centrado de
90 % del alto del lienzo) hasta que exista uno nuevo.

### Outfit (FR-034, FR-036)

| Campo | Tipo | Regla |
|---|---|---|
| `id` | string | |
| `nombre` | string? | |
| `etiquetas` | string[] | |
| `maniquiId` | string \| null | |
| `capas` | *Capa*[] | ordenadas **de abajo hacia arriba**; el índice es el orden de capa |
| `prendaIds` | string[] | derivado de `capas`, para el índice |
| `miniaturaId` | id de imagen `outfitMiniatura`? | se regenera cuando cambian sus capas, su maniquí o la imagen de una de sus prendas |
| `creado`, `actualizado` | number | |

**Capa**

| Campo | Tipo | Regla |
|---|---|---|
| `prendaId` | string | debe existir |
| `zona` | `'arriba' \| 'abajo' \| 'vestido' \| 'calzado' \| 'abrigo' \| 'accesorios'` | una capa por zona, salvo `accesorios` (FR-031) |
| `t` | *Transformacion* | |

**Transformacion** (unidades del cuerpo)

| Campo | Significado |
|---|---|
| `cx` | centro horizontal, como fracción del **alto** del cuerpo, medido desde el eje central del cuerpo (0 = centrado) |
| `cy` | centro vertical, como fracción del alto del cuerpo desde su borde superior (0 = cabeza, 1 = pies) |
| `alto` | alto de la prenda como fracción del alto del cuerpo |
| `rotacion` | grados, sentido horario |

Se usa el alto del cuerpo también para `cx` para que la escala sea uniforme: un outfit se ve
proporcionado en un maniquí más ancho o más angosto.

**Límites del gesto de escala** (FR-032): `alto` entre 0,5× y 2,5× del alto automático de esa
prenda en esa zona. Se aplican al hacer el gesto, no al guardar.

**Reglas al borrar una prenda en outfits** (FR-016): se quitan sus capas de esos outfits en una
transacción; el resto de cada outfit se conserva. Un outfit puede quedar sin capas y no se borra
solo (Edge Cases).

### Colocación automática (constantes, no datos)

Viven en el código de `RendererZonasFijas` ([contracts/try-on-renderer.ts](./contracts/try-on-renderer.ts))
y se afinan en el iPhone con prendas reales (Assumptions del spec). Valores iniciales:

| Zona | `cy` | `alto` |
|---|---|---|
| arriba | 0,32 | 0,30 |
| abajo | 0,66 | 0,44 |
| vestido | 0,50 | 0,58 |
| calzado | 0,965 | 0,07 |
| abrigo | 0,38 | 0,42 |
| accesorios | 0,22 | 0,10 |

Con `cx = 0` y `rotacion = 0`. Las prendas con `anclaje` (planeadas) usan su anclaje en lugar de la
tabla.

**Retícula de siluetas → cuerpo**: la retícula del diseño tiene hombro en y = 40 y tobillo en
y = 390. Se mapea linealmente, con escala uniforme, para que el hombro caiga en 0,18 del alto del
cuerpo y el tobillo en 0,96 (proporciones de una figura de pie). Factor: `(0,96 − 0,18) / 350` por
unidad de retícula. Esto se verifica en el iPhone con un maniquí real y se anota en
[quickstart.md](./quickstart.md).

### Calendario (FR-040)

| Campo | Tipo | Regla |
|---|---|---|
| `fecha` | `YYYY-MM-DD` | clave primaria: un día tiene como máximo un outfit |
| `outfitId` | string | al borrar el outfit se borran sus días (el día queda sin asignar) |

### UsosDia (FR-042)

| Campo | Tipo | Regla |
|---|---|---|
| `fecha` | `YYYY-MM-DD` | clave primaria |
| `outfitId` | string? | el outfit marcado ese día |
| `prendaIds` | string[] | prendas ya contadas ese día |

"Lo usé hoy" suma 1 a `usos` y fija `ultimoUso = hoy` solo para las prendas que **no** estén ya en
`prendaIds` de hoy, y las agrega. Así, tocarlo dos veces el mismo día cuenta una vez (Edge Cases).
El calendario de mes usa esta tabla para atenuar los días pasados usados.

### Medidas (FR-060)

Un solo registro `id = 'perfil'`.

| Campo | Tipo | Regla |
|---|---|---|
| `campos` | `{ id: string; nombre: string; valorCm: number \| null; personalizada: boolean; orden: number }[]` | los 11 comunes vienen precargados con `valorCm = null`; `valorCm` > 0 con un decimal |
| `actualizado` | `YYYY-MM-DD`? | cambia a hoy cada vez que se edita un valor |

Campos comunes: busto, bajo busto, cintura, cadera, largo de talle delantero, largo de talle
trasero, ancho de espalda, largo de brazo, contorno de brazo, largo de pierna, altura. Solo el valor
actual (Assumptions).

### Ajustes

Un solo registro `id = 'ajustes'`.

| Campo | Tipo | Regla |
|---|---|---|
| `apariencia` | `'sistema' \| 'claro' \| 'oscuro'` | por defecto `'sistema'`; se copia a `localStorage` para el script de tema (research R-12) |
| `ultimoRespaldo` | number? | se fija al exportar con éxito |
| `dedicatoria` | `{ nombre?: string; texto?: string }`? | onboarding |
| `onboarding` | `'pendiente' \| 'completo'` | |
| `chipArmadorVisto` | number | veces que se mostró "Vista collage…"; se deja de mostrar en 3 |
| `ultimaCategoria` | categoría? | base de la sugerencia simple de categoría (Assumptions) |

### RespaldoAuto (FR-003)

| Campo | Tipo | Regla |
|---|---|---|
| `id` | string | |
| `creado` | number | |
| `motivo` | `'antes_de_importar'` | |
| `blob` | Blob | el ZIP completo, en el mismo formato que el respaldo exportado |
| `bytes` | number | |

Se guarda solo el más reciente. No se incluye en el respaldo exportado. Ajustes ofrece "Restaurar el
respaldo automático del [fecha]" y "Exportarlo". Antes de crearlo se compara con
`storage.estimate()`: si no hay espacio para el respaldo automático más el que se importa, se pide
primero exportar a Archivos y no se importa.

---

## Migraciones (principio IV)

- Cada versión de esquema es un módulo `migraciones/vN.ts` con:
  - `stores`: el esquema Dexie de esa versión.
  - `migrar(registros)`: una **función pura** que transforma los registros de la versión N−1 a la N.
- La misma función pura se usa en dos lugares:
  1. En `db.version(N).stores(...).upgrade(tx => …)` para los datos del teléfono.
  2. Al importar un respaldo de una versión anterior: se aplican en cadena `v(k+1) … vN` sobre el
     JSON antes de escribir nada.
- Una versión con migración publicada **no se modifica** (Dexie: si un `upgrade` falla, la
  transacción se revierte y la base queda en la versión anterior).
- **Pruebas obligatorias por versión**: un fixture de datos de la versión N−1 (con imágenes) →
  migrar → comparar con el resultado esperado, tanto por Dexie (`fake-indexeddb`) como por el camino
  del respaldo.
- Un respaldo con `esquema` **mayor** que el de la app se rechaza con el mensaje "Este respaldo es
  de una versión más nueva de Percha. Actualiza la app y vuelve a intentarlo." (Edge Cases).

## Cambios frente al modelo sugerido en el README de diseño

| README | Este modelo | Motivo |
|---|---|---|
| `Prenda` y `PrendaPlaneada` separadas; la capa apunta a `prendaId \| planeadaId` | Una sola `Prenda` con `estadoTaller` y `planeada` | Al terminar conserva el `id`; los outfits no se reescriben (FR-053, SC-010) |
| `imagen: Blob` dentro de la entidad | Tabla `imagenes` aparte | Grillas rápidas sin cargar blobs; respaldo por streaming (R-9, R-10) |
| Sin foto original | `imagen.originalId` (JPEG 1500 px) | Clarificación 3 (FR-012a) |
| Sin historial de imágenes | `historialImagenes` | Spec, *Prenda del Taller* |
| Capa `{ x, y, escala, rotacion, z }` | `{ cx, cy, alto, rotacion }` en unidades del cuerpo, orden = índice | Clarificación 2 (FR-034) y 4 (FR-053a) |
| `Maniqui` sin datos del cuerpo | `cuerpo` (rectángulo opaco) | Base de las unidades del cuerpo |
| Sin siluetas en la base | Tabla `siluetas` para las importadas | Clarificación 5 (FR-050a) |
| `Medidas.campos[].valor_cm` | `valorCm` + `id` + `orden` | Campos personalizados editables y ordenables |
| `Ajustes.dedicatoriaVista` | `onboarding` + `dedicatoria` | La dedicatoria tiene contenido, no solo una bandera |
| Sin registro de usos por día | `usosDia` | "Lo usé hoy" una vez por día (Edge Cases) |
| Sin respaldo automático | `respaldosAuto` | Clarificación 1 (FR-003) |
