# Percha

Percha es un clóset digital y un taller de costura para el iPhone de una sola persona. Es una app
web (PWA) en español que se instala en la pantalla de inicio. Funciona sin conexión y **guarda
todo solo en el teléfono**: no hay cuentas ni servidor, y las fotos nunca salen del iPhone.

> **Estado (30 de octubre de 2026):** la app está en construcción. Hoy funcionan la navegación, los
> temas claro y oscuro, y el **respaldo**: exportar, importar y la copia automática. Agregar prendas
> con recorte automático es lo siguiente (Historia 2). El detalle está en
> [`specs/001-percha-closet-taller/tasks.md`](specs/001-percha-closet-taller/tasks.md).

---

## Cómo se usa la app

### 1. Instalarla en el iPhone

1. Abre en **Safari** la dirección de la app:
   **https://percha.percha-spike-recorte.workers.dev**. Es la dirección definitiva (publicada el 4
   de noviembre de 2026) y no debe cambiar: los datos quedan atados a ella. La previsualización
   para probar antes, `https://percha-preview.percha-spike-recorte.workers.dev`, es solo para el
   desarrollo.
2. Toca **Compartir** (el cuadrado con la flecha hacia arriba).
3. Elige **Agregar a pantalla de inicio** y luego **Agregar**.
4. Abre Percha desde el ícono nuevo. Se abre a pantalla completa, como una app normal.

Tiene que ser desde Safari y desde el ícono: en una pestaña privada de Safari, la app no puede
guardar fotos.

### 2. Moverse por la app

- La barra de abajo tiene cuatro pestañas: **Hoy**, **Clóset**, **Taller** y **Outfits**. El botón
  **+** del centro sirve para agregar una prenda.
- En **Hoy**, el botón **⋯** de arriba a la derecha abre el menú: **Mis maniquíes**, **Mis
  medidas** y **Ajustes y respaldo**.
- En las pantallas que se abren encima, la flecha **‹** de arriba a la izquierda vuelve atrás.
- La app sigue el modo claro u oscuro del iPhone.

### 3. Hacer un respaldo (importante)

Como todo vive solo en el teléfono, el respaldo es la única copia si el iPhone se pierde, se
cambia o libera espacio. Si pasan más de 14 días sin respaldo, **Hoy** muestra un aviso con el
botón **Respaldar**.

1. Ve a **Hoy → ⋯ → Ajustes y respaldo**.
2. Toca **Exportar**. La app arma un archivo `Percha-respaldo-AAAA-MM-DD.zip`.
3. En la hoja que aparece, elige **Guardar en Archivos** y guárdalo en **iCloud Drive**.
4. Si en vez de la hoja aparece el botón **Guardar respaldo**, tócalo: el archivo ya está listo.

### 4. Recuperar un respaldo

1. Ve a **Ajustes** y toca **Importar**.
2. Elige el archivo `Percha-respaldo-….zip` en Archivos.
3. Percha revisa el archivo antes de tocar nada. Si está dañado o es de otra app, te avisa y tus
   datos no cambian.
4. Si ya hay datos en el teléfono, te pide confirmar. Antes de reemplazar, guarda una **copia
   automática** de lo que había.
5. Si te arrepientes, en Ajustes toca **Restaurar el respaldo automático del [fecha]**. Restaurar
   también se puede deshacer de la misma forma.

### 5. Ver cuánto espacio usa

**Ajustes → Espacio** muestra cuánto ocupa Percha, cuántas prendas, outfits y maniquíes hay, y si
iOS protege el almacenamiento para que no lo borre solo.

### Probarla a fondo

[`docs/pruebas-intensivas.md`](docs/pruebas-intensivas.md) tiene el plan de pruebas manuales:
lo que se puede probar hoy, lo de cada historia cuando esté lista y las pruebas de volumen. Lo que
no necesita el iPhone físico corre solo en la computadora con `npm run test:e2e`.

---

## Para desarrollar

La especificación, el plan y las tareas están en `specs/001-percha-closet-taller/`. El diseño está
en `Tres direcciones visuales Clóset/` y las pautas para trabajar con Claude Code, en
[`CLAUDE.md`](CLAUDE.md).

### Requisitos

- Node.js 22.12 o superior (Vite 8) y npm.
- Para probar en el iPhone: una cuenta de Cloudflare (gratis) y, para el túnel de desarrollo,
  `cloudflared`.

### Comandos

```bash
npm install
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con los headers COOP/COEP |
| `npm run dev:tunel` | Lo mismo más un túnel HTTPS temporal para abrirlo en Safari del iPhone |
| `npm run build` | Compila la app, el service worker, los íconos y los splash en `dist/` |
| `npm run preview` | Sirve `dist/` en local |
| `npm run typecheck` | Revisa los tipos de la app, las pruebas, las configuraciones y los scripts |
| `npm run test` | Pruebas unitarias y de integración (Vitest + fake-indexeddb) |
| `npm run test:navegador` | Pruebas en WebKit (Vitest en modo navegador, con contexto persistente) |
| `npm run test:e2e` | Recorridos de punta a punta con Playwright (WebKit, perfiles de iPhone) |
| `npm run tokens` | Regenera `src/tema/tokens.css` desde `tokens.json` del diseño |
| `npm run modelo:descargar` | Descarga el modelo de recorte a `public/modelos/` (T061) |
| `npm run deploy:preview` | Compila y publica en el Worker `percha-preview` de Cloudflare |
| `npm run deploy:produccion` | Compila y publica en el Worker `percha`, la app del regalo (probar antes en la previsualización) |

Las pruebas en WebKit necesitan el navegador de Playwright, que se instala una vez:

```bash
npx playwright install webkit
```

### Publicar para probar en el iPhone

La primera vez, conecta wrangler con la cuenta de Cloudflare (se abre el navegador para autorizar):

```bash
npx wrangler login
```

Después:

```bash
npm run deploy:preview
```

La URL queda `https://percha-preview.<subdominio>.workers.dev`. Ábrela en Safari → Compartir →
**Agregar a pantalla de inicio**.

Los datos de la app quedan atados a la dirección desde la que se instala. La app del regalo se
instala desde la URL de producción definitiva, **https://percha.percha-spike-recorte.workers.dev**,
que no debe cambiar después (research R-8). No cambies el subdominio `percha-spike-recorte` de la
cuenta de Cloudflare ni el nombre del Worker `percha`: la persona perdería su clóset.

Para llevarle una versión nueva, primero pruébala con `npm run deploy:preview` y después publícala
con `npm run deploy:produccion`. La app instalada avisa en Ajustes que hay una versión nueva.

### Túnel de desarrollo

`npm run dev:tunel` necesita `cloudflared`:

```bash
winget install --id Cloudflare.cloudflared
```

La URL del túnel cambia en cada ejecución. Sirve para iterar rápido en Safari; para probar la app
instalada y sin conexión es mejor `npm run deploy:preview`.
