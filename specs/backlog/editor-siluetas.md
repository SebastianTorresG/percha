# Borrador (v2): editor de contorno para dibujar siluetas

**Estado**: borrador, no programado. Origen: clarify de `001-percha-closet-taller` (pregunta 5,
opción D, 2026-10-19). En el MVP las siluetas propias solo se importan como SVG (FR-050a).

## Qué es

En el Taller, la usuaria puede dibujar una silueta propia dentro de la app, en lugar de importar un
SVG hecho en otro programa.

## Ideas de partida (por validar)

- Lienzo con la retícula corporal (hombro 40, cintura 130, cadera 170, rodilla 280, tobillo 390,
  viewBox 0 0 200 400) y el maniquí principal de fondo como referencia.
- Partir de una silueta existente y mover sus puntos, o trazar desde cero tocando puntos.
- Simetría opcional respecto a x = 100, ya que casi todas las prendas se ven de frente.
- El resultado se guarda igual que una silueta importada: un solo contorno cerrado (FR-050a), sin
  cambiar el modelo de datos.

## Antes de implementar

1. Diseñar las pantallas en Claude Design (no existen hoy).
2. Correr `/speckit-specify` para esta función como una nueva feature.
3. Verificar que los gestos de edición no choquen con el gesto de volver de iOS.
