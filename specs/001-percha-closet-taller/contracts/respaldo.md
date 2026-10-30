# Contrato: archivo de respaldo de Percha

**Formato**: `1` · Fuente: research.md R-10, data-model.md · Requisitos: FR-002, FR-003, FR-004, SC-001

## Archivo

- Nombre: `Percha-respaldo-AAAA-MM-DD.zip` (`.zip` para que Archivos e iCloud lo reconozcan).
- ZIP con entradas **sin compresión (STORE)**, CRC-32 en cada entrada y ZIP64 si el archivo pasa de
  4 GB o de 65 535 entradas.
- Nombres de entrada en UTF-8 (bit 11 activado), solo ASCII en la práctica.

## Estructura

```text
manifest.json                 ← primera entrada
datos.json
imagenes/<imagenId>.png
imagenes/<imagenId>.jpg
```

### manifest.json

```json
{
  "app": "percha",
  "formato": 1,
  "esquema": 1,
  "creado": "2026-10-22T08:15:00-05:00",
  "versionApp": "1.0.0",
  "conteos": {
    "prendas": 0, "imagenes": 0, "siluetas": 0, "maniquies": 0,
    "outfits": 0, "calendario": 0, "usosDia": 0
  },
  "imagenes": [
    { "id": "…", "ruta": "imagenes/….png", "tipo": "recorte", "mime": "image/png",
      "bytes": 0, "crc32": "1a2b3c4d", "ancho": 0, "alto": 0, "creada": 0 }
  ]
}
```

`creada` (marca de tiempo de la imagen) se agregó al implementar (T051) para que la ida y vuelta
sea exacta (SC-001).

### datos.json

Los registros de cada tabla tal como están en la base, **sin** blobs (las imágenes van por ID):

```json
{
  "prendas": [], "siluetas": [], "maniquies": [], "outfits": [],
  "calendario": [], "usosDia": [], "medidas": {}, "ajustes": {}
}
```

- `ajustes.ultimoRespaldo` se exporta, pero al importar se fija a la fecha del archivo.
- No se exportan `respaldosAuto` ni las siluetas incluidas (viven en el código).

## Exportar

1. Leer todas las tablas en una transacción de solo lectura.
2. Escribir `manifest.json` y `datos.json` como `Uint8Array`, y cada imagen como el `Blob` de la base
   (sin copiarlo a memoria). El CRC-32 se calcula leyendo cada blob por trozos con `blob.stream()`.
3. Armar el ZIP como `new Blob([...partes])`.
4. Entregar con `navigator.share({ files })` si `navigator.canShare({ files })` es verdadero; si no,
   con `<a download>`.
5. Solo si la entrega se completa (la promesa de `share` se resuelve, o se dispara la descarga), se
   fija `ajustes.ultimoRespaldo = ahora`. Si la usuaria cancela la hoja de compartir, no cambia.

## Importar: validar antes de tocar nada (FR-004)

Se rechaza con un mensaje claro y **sin modificar datos** (US1, escenario 4) si:

| Condición | Mensaje |
|---|---|
| No es un ZIP o falta el directorio central | "Este archivo no es un respaldo de Percha." |
| Falta `manifest.json` o `app ≠ "percha"` | "Este archivo no es un respaldo de Percha." |
| `formato` mayor que el soportado | "Este respaldo es de una versión más nueva de Percha. Actualiza la app y vuelve a intentarlo." |
| `esquema` mayor que el de la app | igual que el anterior |
| `datos.json` no es JSON válido o no cumple el esquema (tipos, enums, IDs referenciados) | "El respaldo está dañado y no se puede usar. Tus datos no cambiaron." |
| Una imagen del manifest falta, o su tamaño o su CRC-32 no coinciden | igual que el anterior |
| Una referencia apunta a una imagen, prenda, maniquí, silueta u outfit que no existe | igual que el anterior |

Lectura sin copias: se ubica el directorio central al final del archivo y cada entrada se obtiene con
`archivo.slice(inicio, fin)`. Si una entrada está comprimida (método 8, por ejemplo porque se volvió
a comprimir en otra app), se descomprime con `DecompressionStream('deflate-raw')`.

Otras reglas de la implementación (T048, T052):

- Si `manifest.json` no está en la raíz pero está dentro de una sola carpeta (Archivos mete todo en
  una carpeta al volver a comprimir), esa carpeta es la raíz. Se ignora `__MACOSX/`.
- `manifest.json` y `datos.json` se comparan con el CRC-32 del directorio central, y los
  `conteos` del manifest con las listas de `datos.json`. Si algo no coincide, el respaldo está
  dañado.
- Un respaldo de un esquema anterior se migra en memoria **antes** de validar `datos.json`, que
  siempre se valida contra el esquema actual. Si la migración falla, el respaldo está dañado.

## Importar: reemplazar (FR-003)

1. Si hay datos, confirmar: "Se reemplazará todo lo que hay en Percha por el contenido del respaldo
   del [fecha]. Antes guardaremos una copia de lo actual en el teléfono."
2. Verificar el espacio con `navigator.storage.estimate()`: hace falta espacio para el respaldo
   automático más lo que se importa. Si no alcanza, pedir primero exportar a Archivos y detenerse.
3. Generar el respaldo automático de lo actual (el mismo formato) y guardarlo en `respaldosAuto`.
4. Si el `esquema` del archivo es anterior, migrar `datos.json` en memoria con las funciones puras
   de `migraciones/` (data-model.md, *Migraciones*).
5. **En una sola transacción** sobre todas las tablas: vaciar y escribir los registros y las
   imágenes (`Blob` obtenidos con `slice`). Si algo falla (por ejemplo, la cuota), la transacción se
   revierte y los datos anteriores quedan intactos.
6. Volver a copiar `ajustes.apariencia` a `localStorage` y aplicar el tema.

Si la escritura falla por la cuota (`QuotaExceededError`), el mensaje es el de falta de espacio. Si
falla por otra causa: "No se pudo terminar de importar el respaldo. Tus datos no cambiaron."

**Restaurar el respaldo automático** usa la misma validación y la misma escritura, pero
intercambia los datos: lo actual se guarda como la nueva copia automática, y la anterior se borra
solo cuando la escritura terminó (si falla, se borra la nueva). Así restaurar se puede deshacer.
`ultimoRespaldo` queda como estaba en esa copia, porque no es un respaldo guardado fuera del
teléfono. Exportar la copia automática ("Exportarlo") tampoco cambia `ultimoRespaldo`.

## Pruebas de contrato (obligatorias)

- Ida y vuelta: datos de prueba con todas las entidades → exportar → importar en una base vacía →
  igualdad profunda de registros y bytes de imágenes (SC-001).
- Cada fila de la tabla de rechazo, con su mensaje, y la verificación de que la base no cambió.
- Un ZIP re-comprimido con deflate se importa igual.
- Un respaldo de `esquema` anterior (fixture) se migra y se importa.
- Falla simulada en el paso 5 → los datos anteriores y el respaldo automático siguen ahí.
