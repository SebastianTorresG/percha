# Respaldos de prueba

Archivos para correr en el iPhone las pruebas **[con datos]** de
[`pruebas-intensivas.md`](../pruebas-intensivas.md) mientras la app todavía no deja agregar
prendas. Las fotos son imágenes de prueba diminutas (cuadritos de color), no ropa real.

| Archivo | Qué trae | Qué debería pasar al importarlo |
|---|---|---|
| `Percha-respaldo-2026-10-01.zip` | **Completo**: 20 prendas (con Taller planeada, en proceso y terminada, y una hecha por mí), 1 silueta importada, 2 maniquíes (principal "Con tenis"), 4 outfits, 4 días en el calendario, medidas (actualizadas el 3 de octubre) y dedicatoria | Se importa. Ajustes: "20 prendas · 4 outfits · 2 maniquíes" y "Último respaldo: 1 de octubre". Hoy muestra el aviso de respaldo |
| `Percha-respaldo-2026-10-28.zip` | **Chico y reciente**: 3 prendas, 1 maniquí ("Frente"), 1 outfit | Se importa. Ajustes: "3 prendas · 1 outfit · 1 maniquí". Sin aviso en Hoy hasta el 12 de noviembre |
| `Percha-respaldo-version-nueva.zip` | El chico, marcado como de una versión futura de Percha | "Este respaldo es de una versión más nueva de Percha. Actualiza la app y vuelve a intentarlo." Nada cambia |
| `Percha-respaldo-danado.zip` | El completo, con una foto alterada por dentro | "El respaldo está dañado y no se puede usar. Tus datos no cambiaron." Nada cambia |

## Cómo pasarlos al iPhone

- Desde la conversación con Claude, donde se envían como archivos, o desde el repositorio en la
  app de GitHub: abre el archivo → Compartir → **Guardar en Archivos**.
- Guárdalos en iCloud Drive → "Pruebas Percha".

## Volver a generarlos

```bash
npm run respaldos:prueba
```

Los arma `tests/herramientas/respaldos-de-prueba.test.ts` con los mismos datos de prueba que usan
las pruebas automáticas. Cada vez salen con IDs nuevos, pero con el mismo contenido.
