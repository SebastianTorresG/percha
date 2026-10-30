<!--
Sync Impact Report
- Version change: (template, unversioned) → 1.0.0
- Modified principles: all placeholders replaced (initial ratification)
- Added principles: I. Local-first y privado · II. Sin IA generativa · III. PWA standalone offline ·
  IV. Integridad de datos · V. Mobile-first para iPhone · VI. Fidelidad al diseño ·
  VII. Simplicidad y dependencias verificadas · VIII. Calidad verificable
- Added sections: Restricciones del producto; Flujo de trabajo y control de calidad; Governance
- Removed sections: none
- Templates requiring updates: none (plan/spec/tasks templates read the constitution at runtime)
- Deferred TODOs: none
-->

# Percha Constitution

Percha es un clóset digital y taller de costura para una sola usuaria, entregado como regalo
personal. No se publica en ninguna tienda. La interfaz está en español.

## Core Principles

### I. Local-first y privado

- Ningún dato ni foto MUST salir del dispositivo. No hay backend, cuentas, sincronización,
  analítica ni tracking.
- En tiempo de uso MUST NOT haber requests de red a terceros. La única excepción es la carga
  inicial de la app y la descarga de los modelos de ML, que quedan en caché.
- El hosting solo sirve archivos estáticos por HTTPS.

**Rationale:** las fotos son personales; la privacidad y el costo cero son requisitos del regalo.

### II. Sin IA generativa

- Solo se permite ML discriminativo que corre en el dispositivo: segmentación para quitar fondos
  (MVP) y detección de pose (v2).
- Las prendas planeadas del Taller se componen de forma determinista (silueta + tela + sombreado);
  MUST NOT generarse imágenes con modelos generativos.

**Rationale:** decisión de producto explícita; resultados predecibles y sin servicios externos.

### III. PWA standalone, offline después de la primera carga

- La app MUST instalarse desde Safari de iOS ("Agregar a pantalla de inicio") con
  `display: standalone` en el manifest (WebKit solo protege el almacenamiento en standalone o
  fullscreen; ver WebKit bug 232302).
- Después de la primera carga, todas las funciones MUST funcionar sin conexión, incluido el
  recorte de fondos (modelo y WASM en caché o auto-hospedados).

**Rationale:** va a un iPhone sin App Store; una app nativa con Apple ID gratis caduca a los 7 días.

### IV. Integridad de datos (NON-NEGOTIABLE)

- Exportar e importar un respaldo completo (imágenes + metadatos, incluidos Taller, siluetas
  personalizadas y medidas) MUST existir desde el MVP.
- Un respaldo exportado MUST restaurarse completo en una instalación limpia.
- El esquema de datos MUST estar versionado. Toda migración MUST ser explícita, tener pruebas y
  no perder datos.
- La app MUST pedir almacenamiento persistente cuando la plataforma lo permita y recordar con
  suavidad que se haga un respaldo.

**Rationale:** iOS puede liberar almacenamiento; perder el clóset arruina el regalo.

### V. Mobile-first para iPhone

- La app MUST respetar las áreas seguras (`env(safe-area-inset-*)`) desde iPhone SE hasta Pro Max.
- Los objetivos táctiles MUST medir al menos 44 × 44 pt.
- Los gestos MUST NOT chocar con el gesto de volver desde el borde de iOS.
- Modo claro y modo oscuro MUST estar completos en todas las pantallas. El tema se resuelve antes
  del primer pintado.

**Rationale:** la app se usa con una mano en un iPhone real.

### VI. Fidelidad al diseño

- El export de Claude Design (`Tres direcciones visuales Clóset/`) es la fuente de verdad visual:
  tokens, componentes, nombres de pantallas y copy.
- Los tokens MUST extraerse a un tema antes de construir pantallas. Los nombres de pantallas y
  componentes del diseño MUST conservarse en el código.
- Toda desviación o estado no diseñado (vacío, error, carga) MUST documentarse para revisarlo
  después en Design.
- Si el diseño y el brief de comportamiento se contradicen, se MUST preguntar; no se elige solo.

**Rationale:** la usuaria eligió el diseño; el brief define comportamiento y restricciones.

### VII. Simplicidad y dependencias verificadas

- Cada dependencia MUST estar justificada. Antes de adoptarla se MUST verificar su documentación
  y versión actuales, y citar la fuente en `plan.md` o `research.md`.
- Se prefiere la plataforma web nativa antes que una librería cuando el costo es similar.

**Rationale:** menos piezas que mantener; las APIs y librerías cambian entre versiones.

### VIII. Calidad verificable

- La lógica de datos (repositorios, migraciones, export/import) y el motor de composición del
  Armador MUST tener pruebas automatizadas.
- Cada historia de usuario MUST validarse a mano en un iPhone real antes de cerrarse.
- Los bugs conocidos se arreglan o se reportan; MUST NOT dejarse como "fuera de alcance".

**Rationale:** Safari de iOS tiene comportamientos que solo aparecen en el dispositivo.

## Restricciones del producto

- Fuera de alcance: probador generativo, cuentas o login, sincronización, funciones sociales,
  tienda, clima, estadísticas avanzadas, listas de viaje, analítica, inventario de telas con
  metraje, biblioteca de moldes PDF, mercería y listas de compra.
- Las decisiones marcadas ✅ en el brief (PWA standalone, local-first, respaldo en MVP, recorte en
  el navegador, interfaz en español, costura "ligero + Taller", prenda planeada como silueta SVG)
  no se reabren sin un motivo fuerte documentado.

## Flujo de trabajo y control de calidad

- Se usa Spec Kit: constitution → specify → clarify → plan → tasks → analyze → implement.
  `/speckit-analyze` corre siempre antes de implementar.
- Lo verificado (versiones, documentación, mediciones en dispositivo) se documenta en los
  artefactos de Spec Kit para no perder contexto entre sesiones.
- Los trade-offs reales se presentan con evidencia al dueño del proyecto, que decide.
- Se implementa por historia de usuario completa y se valida en iPhone real antes de seguir.

## Governance

- Esta constitución prevalece sobre otras prácticas. Los planes y las revisiones MUST verificar
  que se cumple; toda complejidad o desviación MUST justificarse en `plan.md`.
- Enmiendas: se proponen por escrito con su motivo, las aprueba el dueño del proyecto y se
  registran con un Sync Impact Report.
- Versionado semántico: MAJOR para quitar o redefinir principios; MINOR para agregar principios o
  secciones; PATCH para aclaraciones de redacción.

**Version**: 1.0.0 | **Ratified**: 2026-10-19 | **Last Amended**: 2026-10-19
