# Contrato: importar una silueta SVG

Fuente: FR-050a, Edge Cases, research.md R-16, data-model.md (*Silueta*), retícula de
`handoff_actualizacion/README.md` (sección Siluetas).

## Formato aceptado

- Un archivo `.svg` de **≤ 200 KB**.
- Raíz `<svg>` con `viewBox="0 0 200 400"` exacto (se toleran espacios o comas como separadores).
  `width` y `height` se ignoran.
- **Exactamente una** forma: `<path>`, `<polygon>`, `<rect>` o `<ellipse>`/`<circle>`. Puede estar
  dentro de un `<g>` sin `transform`.
- La forma es **un solo contorno cerrado**: un path con un solo subtrayecto (`M` inicial y ningún
  otro `M`/`m`) que termina en `Z`/`z`, o cuyo último punto coincide con el primero (tolerancia de
  0,5 unidades).
- El contorno cae dentro del viewBox (tolerancia de 1 unidad) y su caja mide al menos 20 × 20.
- Se ignoran `<metadata>` (las siluetas del diseño traen un bloque C2PA), `<title>`, `<desc>`,
  `fill`, `stroke` y estilos: solo importa el contorno.

## Se rechaza

| Caso | Mensaje (español, con el formato esperado) |
|---|---|
| No se puede leer como SVG | "No pudimos leer este archivo. Elige un SVG con una sola forma cerrada de 200 × 400." |
| viewBox distinto | "La silueta debe usar viewBox 0 0 200 400, la misma retícula que las siluetas de Percha." |
| Ninguna forma, o más de una | "La silueta debe tener una sola forma cerrada. Esta tiene N." |
| Contorno abierto o con varios subtrayectos | "El contorno debe ser una sola línea cerrada." |
| Fuera del viewBox o muy pequeño | "La forma se sale de la retícula o es demasiado pequeña." |
| Contiene `<script>`, `<image>`, `<use>`, `<foreignObject>`, `<text>`, `transform`, o URLs externas (`href`, `url(...)`) | "Este SVG tiene elementos que Percha no usa. Exporta solo el contorno." |

## Procesamiento

1. `new DOMParser().parseFromString(texto, 'image/svg+xml')`; si hay `<parsererror>`, se rechaza.
   **Nunca** se inserta el SVG en el DOM.
2. Se valida con las reglas de arriba.
3. La forma se normaliza a un `d` de path absoluto (`M`, `L`, `C`, `Q`, `Z`), con números redondeados
   a 2 decimales.
4. Se calcula `caja` (rectángulo del contorno) y se muestra una vista previa rellena con una tela de
   ejemplo y sobre el maniquí principal, en el mismo lugar que tendría en el Armador.
5. La usuaria pone **nombre** y **categoría** (top, bottom, vestido, etc.) y confirma.
6. Se guarda `{ origen: 'importada', nombre, categoria, d, caja }`. El texto SVG original no se
   guarda.

## Pantalla

No está diseñada (FR-050a). Se construye con los tokens y los componentes existentes (HojaInferior,
BotonPrincipal, BotonSecundario) y se anota en `specs/001-percha-closet-taller/desviaciones-diseno.md`
para revisarla en Claude Design. Se abre desde el paso Silueta (11d) del Taller con
"+ Importar silueta".

## Pruebas de contrato

- Las 8 siluetas del diseño (`design_handoff_percha/siluetas/*.svg`) se aceptan, y su `caja` queda
  contenida en el viewBox de miniatura del README (que deja unas 6 unidades de margen; por ejemplo,
  la blusa tiene caja `28 34 144 138` y miniatura `22 28 156 150`).
- Un caso de prueba por cada fila de rechazo.
- Un `<rect>`, un `<polygon>` y un `<ellipse>` válidos se normalizan a un path equivalente.
