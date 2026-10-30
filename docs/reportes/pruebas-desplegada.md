# Pruebas de Percha publicada — 30 de octubre de 2026, 17:04

Generado por `npm run test:desplegada` (scripts/probar-despliegue.ts). Se reescribe en cada corrida.

- **URL**: https://percha-preview.percha-spike-recorte.workers.dev
- **Despliegue**: sin desplegar en esta corrida
- **Código probado**: rama `claude/intensive-project-testing-c45c7e`, commit `ee9bca6`
- **Navegador**: WebKit de Playwright en Windows, perfiles iPhone 15 (393 × 852), SE (375 × 667) y Pro Max (440 × 956); no reemplaza la prueba en el iPhone
- **Resultado**: 306 pasaron, 0 fallaron, 0 inestables, 42 omitidas (527 s)

## Fallas

Ninguna.

## Bugs visuales (hacen fallar la prueba)

Ninguno.

## Avisos visuales (no hacen fallar: revisar con Claude Design)

Contraste por debajo de WCAG AA y objetivos táctiles de menos de 44 × 44 px. Pueden venir de los tokens del diseño: no se cambian sin el dueño.

### Contraste, por par de colores

- **#8f7a71 (--muted claro) sobre #fbf6f3 (--surface claro): 3.77:1 (mínimo 4.5:1)** — 29 textos, por ejemplo span.aviso-respaldo-texto "Tu último respaldo fue hace 4 semanas."; h2.ajustes-etiqueta "Respaldo"; h2.ajustes-etiqueta "Espacio"; p.t-meta "0 prendas · 0 outfits · 0 maniquíes"; p.t-meta "Almacenamiento protegido: no"; …. Pantallas: hoy-aviso-respaldo (claro); hoy-aviso-respaldo (zoom de pantalla 320); hoy-aviso-respaldo (horizontal); ajustes-vacia (claro); ajustes-copia-automatica (claro); ajustes-rechazo (claro); …
- **#8f7a71 (--muted claro) sobre #f4ebe6 (--bg claro): 3.44:1 (mínimo 4.5:1)** — 13 textos, por ejemplo span.encabezado-meta "Viernes 30 de octubre"; span.menu-fila-subtitulo "Todavía no hay fotos"; span.menu-fila-subtitulo "Todavía sin medidas"; span.menu-fila-subtitulo "Todavía no hay respaldo"; span.menu-fila-subtitulo "2 fotos · principal: Con tenis"; …. Pantallas: hoy-vacia (claro); hoy-aviso-respaldo (claro); hoy-aviso-respaldo (zoom de pantalla 320); hoy-aviso-respaldo (horizontal); menu-vacio (claro); menu-con-datos (claro); …
- **#77716a (--nav-muted oscuro) sobre #1a1918 (--nav oscuro): 3.64:1 (mínimo 4.5:1)** — 4 textos, por ejemplo button.barra-inferior-pestana "Clóset"; button.barra-inferior-pestana "Taller"; button.barra-inferior-pestana "Outfits"; button.barra-inferior-pestana "Hoy". Pantallas: hoy-vacia (oscuro); hoy-aviso-respaldo (oscuro); taller (oscuro); outfits (oscuro); closet (oscuro)
- **#ffffff (--on-accent claro, --nav-ink claro) sobre #b9776a (--accent claro, --select claro, --stitch claro): 3.55:1 (mínimo 4.5:1)** — 2 textos, por ejemplo button.boton "Exportar"; button.boton "Guardar respaldo". Pantallas: ajustes-vacia (claro); ajustes-copia-automatica (claro); ajustes-rechazo (claro); ajustes-copia-automatica (zoom de pantalla 320); ajustes-copia-automatica (horizontal); ajustes-guardar-respaldo (claro)

### Otros avisos

Ninguno.

## Cómo seguir desde otra sesión

1. Leer `CLAUDE.md`, `specs/001-percha-closet-taller/handoff-plan.md` y `docs/pruebas-intensivas.md` (las pruebas llevan en el nombre los IDs del plan).
2. Las pruebas están en `tests/e2e/`: `a-*.spec.ts` y `a14-*.spec.ts` (Parte A), `despliegue.spec.ts` (servidor publicado), `visual.spec.ts` con los detectores de `visual/revisar.ts` y las capturas de referencia en `visual.spec.ts-snapshots/`.
3. Reproducir una falla: `npm run test:desplegada -- --sin-desplegar --playwright -g "<ID o título>"`, o en local `npx playwright test -g "<ID>" --project=iphone-15`.
4. Si una captura cambió a propósito, revisarla a ojo y regenerarla con `npx playwright test tests/e2e/visual.spec.ts --update-snapshots`.
5. Todo bug se arregla o queda como tarea en `specs/001-percha-closet-taller/tasks.md`; nada queda "fuera de alcance".

