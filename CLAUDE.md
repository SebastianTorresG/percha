# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

The project is **Percha**, a Spanish-language, local-first PWA closet/sewing app for a single user's iPhone. The constitution (`.specify/memory/constitution.md`, v1.0.0) governs all work. The active feature is `specs/001-percha-closet-taller/`. Its `brief-claude-code.md` is the behavior source of truth, `handoff-plan.md` holds the current status, and `tasks.md` tracks implementation (tasks marked `[X]` are done). The visual source of truth is the Claude Design export in `Tres direcciones visuales Clóset/`; `handoff_actualizacion/` is the newest version. The code lives in the private GitHub repository `SebastianTorresG/percha` (branch `main`); commit per task or logical group. The README starts with how to install and use the app on the iPhone. Manual iPhone testing lives in `docs/pruebas-intensivas.md` (320 tests: A = built now, B = per story, C = volume, D = privacy; add new tests there when a story lands; the parts of A that don't need the physical phone are automated in `tests/e2e/`, named by plan ID), and `docs/respaldos-de-prueba/` holds test backups with data, regenerated with `npm run respaldos:prueba` (`tests/herramientas/`).

Implementation has started: Setup (T003–T015), Foundational (T016–T037) and User Story 1, backup (T039–T055), are in place. T038 and T056 (checks on the iPhone) wait for the owner, and User Story 2 (T057+) is next. `spike/recorte/` is a throwaway, self-contained Vite project for the background-removal spike (T001/T002); it is not app code and has its own `package.json`.

## Commands

Run from the repo root (Node 22.12+):

- `npm run dev` / `npm run build` / `npm run preview` — Vite dev server, production build to `dist/`, local preview. Dev and preview send COOP/COEP headers.
- `npm run dev:tunel` — dev server plus a temporary `trycloudflare.com` HTTPS tunnel for Safari on the iPhone (needs `cloudflared`).
- `npm run typecheck` — `tsc` over `tsconfig.json` (app + Vitest tests), `tsconfig.node.json` (configs + scripts) and `tsconfig.e2e.json` (Playwright tests: Node + DOM types).
- `npm run test` — Vitest projects `unidad` (Node) and `integracion` (Node + fake-indexeddb, `tests/setup/indexeddb.ts` deletes the `percha` DB before each test). Single file: `npx vitest run tests/unidad/x.test.ts`.
- `npm run test:navegador` — Vitest browser mode on WebKit (`tests/navegador/`). Needs `npx playwright install webkit` once.
- `npm run test:e2e` — Playwright (`tests/e2e/`), WebKit with iPhone 15, SE (3rd gen) and Pro Max (440×956) profiles; builds and serves `dist/` on port 4173 (reuses a server already on 4173, so stop stale previews first). `tests/e2e/apoyo.ts` gives each test its own persistent WebKit profile and a simulated iOS share sheet (`compartir` option).
- `npm run test:desplegada` — deploys to `percha-preview`, waits until the URL serves the new `dist/index.html`, runs every e2e spec against it (`PERCHA_URL`), plus `despliegue.spec.ts` (headers, precache, icons, splash) and `visual.spec.ts` (visual-bug detectors in `tests/e2e/visual/revisar.ts` and screenshot baselines in `visual.spec.ts-snapshots/`), then writes `docs/reportes/pruebas-desplegada.md` for handing off. `--sin-desplegar`, `--local`, `--url <u>`; args after `--playwright` go to Playwright. Regenerate baselines with `--update-snapshots` only after checking the change by eye.
- `npm run tokens` — regenerates `src/tema/tokens.css` from the design's `tokens.json` (never edit that CSS by hand).
- `npm run deploy:preview` — builds and deploys to the Cloudflare Worker `percha-preview` (Workers static assets, configured in `wrangler.jsonc`). Production deploys need the owner's explicit approval (T166).

## Architecture (see `specs/001-percha-closet-taller/plan.md`)

- React 19 + Vite 8 + TypeScript 7, all dependency versions pinned exactly and justified in `research.md`. `onnxruntime-web` must stay at `1.21.0-dev.20250206-d981b153d3` (the build matching imgly's WASM; enforced with `overrides`).
- Theme: `index.html` sets `data-theme="claro"|"oscuro"` before first paint from `localStorage['percha.apariencia']`. Tokens are CSS variables per theme; the theme changes fonts, radii and label style, not just colors.
- PWA: `vite-plugin-pwa` `generateSW` with `registerType: 'prompt'` and `injectRegister: false`. Icons and iOS splash screens come from `pwa-assets.config.ts`. The ML model is not precached; it lives in a runtime `CacheFirst` cache (`percha-modelo-1.7.0`).
- Headers (COOP/COEP, cache control) live in `public/_headers`; `wrangler.jsonc` deliberately has no SPA fallback so a missing model chunk 404s instead of caching `index.html`.
- Data: Dexie `PerchaDB` in `src/datos/db.ts`; each schema version is a module in `src/datos/migraciones/` with `stores` and a **pure** `migrar` used both by Dexie's `upgrade` and by backup import (`migrarDatos`). A published version is never edited: add `vN.ts` plus a frozen fixture `tests/fixtures/esquemas/vN/datos.ts`, and the tests pick up the N−1 → N pair automatically. Images live only in the `imagenes` table (entities store IDs); never store a `Blob` that came from `slice()` (after a reload WebKit returns the whole parent file; research R-14), store a copy built from its bytes; `imagenes.borrar` must run inside the owner entity's transaction. Every multi-table write goes in one Dexie transaction.
- Navigation: no router. `src/navegacion/pila.ts` keeps a typed stack of screens and bottom sheets mirrored into `history.state` (and `sessionStorage` for iOS reloads); screen/sheet names and params live in `src/navegacion/rutas.ts`, and `src/App.tsx` maps them to components. All stacked screens stay mounted (hidden) to keep their scroll. Sheets close through `useHoja().cerrar(despues)` so the exit animation runs before navigating.
- UI: base components from the design in `src/componentes/` (BotonPrincipal/Secundario/Texto, ChipFiltro, TarjetaPrenda, BarraInferior, HojaInferior, Pantalla headers); one file per design screen in `src/pantallas/`, with the design's `data-screen-label` as `data-pantalla`. Canvas code goes through `src/imagen/lienzo.ts` (HTMLCanvasElement on the page, OffscreenCanvas in workers) because Playwright's WebKit on Windows lacks OffscreenCanvas.
- Diagnostics: `src/diagnostico/registro.ts` (events, network counter, integrity) and the hidden `PanelDiagnostico` (tap the version in Ajustes 5 times) replace the Web Inspector on the iPhone.
- Tests: fixtures in `tests/fixtures/` (`datos.ts` builders and `conjuntoCompleto()`, real PNG/JPEG in `imagenes/imagenes.ts`, `recortador-falso.ts`). Compare records with Blobs through `tests/fixtures/comparar.ts`.
- Backup: `src/respaldo/` writes and reads a STORE ZIP (with ZIP64) that references the IndexedDB `Blob`s without copying them (`contracts/respaldo.md`). Import validates everything (`validar.ts`, sharing reference rules with `src/datos/referencias.ts`) before writing, saves an automatic backup, and replaces all tables in one transaction. WebKit can't store `Blob`s in IndexedDB in an ephemeral context, so the `navegador` Vitest project uses a persistent Playwright context and runs serially.
- Planned modules: background removal behind the `Recortador` contract in `src/recorte/`, the outfit builder behind `TryOnRenderer` in `src/armador/`.
- Undesigned states and design deviations are logged in `specs/001-percha-closet-taller/desviaciones-diseno.md`.

## Development workflow: Spec-Driven Development

Features are built through the Spec Kit cycle, invoked as skills:

1. `/speckit-constitution` — define/update project principles (`.specify/memory/constitution.md`).
2. `/speckit-specify <description>` — creates a numbered feature directory under `specs/` (sequential numbering, e.g. `specs/001-...`) with `spec.md`.
3. `/speckit-clarify` — optional; resolves underspecified areas in the spec.
4. `/speckit-plan` — produces `plan.md` and design artifacts.
5. `/speckit-tasks` — produces a dependency-ordered `tasks.md`.
6. `/speckit-analyze` — optional; cross-checks spec/plan/tasks consistency.
7. `/speckit-implement` — executes `tasks.md`. `/speckit-converge` appends tasks for any remaining unbuilt work.

`/speckit-checklist` generates feature-specific checklists. The full gated cycle is defined in `.specify/workflows/speckit/workflow.yml`.

### Spec Kit internals worth knowing

- Scripts are PowerShell (`.specify/scripts/powershell/`), configured via `"script": "ps"` in `.specify/init-options.json`. The skills call these; prefer running them through the skills rather than by hand.
- The active feature is resolved from `SPECIFY_FEATURE_DIRECTORY` env var, else `.specify/feature.json` (machine-local, gitignored), else the `SPECIFY_FEATURE` env var / branch context.
- Templates for generated artifacts live in `.specify/templates/`; edit those to change the shape of specs, plans, and tasks.
