# Spike de recorte (T001)

Página desechable para comprobar, en un iPhone real y con la app instalada en la pantalla de
inicio, si `@imgly/background-removal` 1.7.0 sirve para Percha. Lo que se mide y por qué está en
`specs/001-percha-closet-taller/research.md`, sección R-0. **No es código de la app**: cuando
terminen las pruebas (T002), esta carpeta se puede borrar.

## Qué prueba

- Tres formas de tomar la foto: la galería, la cámara del iPhone (`capture="environment"`) y la
  cámara en vivo con `getUserMedia`, marco guía y temporizador de 5 s.
- Modelo `isnet_quint8` (44 MB) o `isnet_fp16` (88 MB); CPU (WASM) o GPU (WebGPU); en un Web
  Worker o en el hilo principal; foto completa o reducida a 1500 px.
- Dos variantes de despliegue: **con-coi** (headers COOP/COEP, que habilitan los hilos de WASM) y
  **sin-coi**.
- Funcionamiento sin conexión: un service worker guarda la página y el modelo, y cuenta las
  solicitudes que salen a la red.
- Cierres por memoria: si la app se recarga en medio de un recorte, el siguiente arranque lo anota.

Cada medición queda guardada en el teléfono. El botón **Copiar resultados** copia todo como texto,
para pegarlo en el chat y pasarlo a `research.md`.

## Preparar (en el computador)

Desde esta carpeta (`spike/recorte`):

```bash
npm install
```

```bash
npm run modelo
```

`npm run modelo` baja de `staticimgly.com` solo los recursos que usa el spike (los dos modelos y
los WASM de CPU y WebGPU, unos 167 MB) a `public/modelos/imgly/1.7.0/`, y verifica el tamaño y el
SHA-256 de cada trozo. Es la única descarga de terceros y ocurre aquí, no en el teléfono.

Para probar en el computador:

```bash
npm run build
```

```bash
npm run preview
```

## Publicar las dos variantes en Cloudflare

wrangler 4.152 ya no crea proyectos de Pages clásicos: Cloudflare integró Pages en Workers. Por eso
cada variante se publica como un Worker con archivos estáticos (`wrangler.jsonc`), que también lee
`dist/_headers`.

La primera vez, inicia sesión con tu cuenta de Cloudflare (se abre el navegador; la cuenta gratis
alcanza):

```bash
npx wrangler login
```

Después publica cada variante:

```bash
npm run deploy:con-coi
```

```bash
npm run deploy:sin-coi
```

Publicadas el 2026-10-26:

- con-coi: `https://percha-spike-con-coi.percha-spike-recorte.workers.dev`
- sin-coi: `https://percha-spike-sin-coi.percha-spike-recorte.workers.dev`

`percha-spike-recorte` es el subdominio de `workers.dev` que wrangler registró solo para la cuenta en
la primera publicación. Se cambia en el panel de Cloudflare (Workers → Subdominio), y al cambiarlo
cambian estas URLs.

## Probar en el iPhone (T002, unos 15 minutos)

Para cada variante:

1. Abre la URL en **Safari** → Compartir → **Agregar a pantalla de inicio**, y abre la app desde
   su ícono. En "Entorno" debe decir standalone "sí".
2. Toca **Preparar modelo** con conexión y espera a que termine.
3. Recorta 3 a 5 fotos reales (una prenda negra, una blanca y una estampada), probando la galería,
   la cámara del iPhone y la cámara en vivo, con la foto reducida y completa.
4. Prueba sin conexión: cierra la app desde el selector de apps, activa el modo avión, ábrela y
   recorta una foto. La medición debe decir `red 0`.
5. Prueba el modelo `isnet_fp16` y el cálculo por GPU al menos una vez cada uno.
6. Toca **Copiar resultados** y pega el texto en el chat.

Si la app se cierra sola en medio de un recorte, ábrela otra vez: queda anotado como probable
cierre por memoria.

## Archivos

| Archivo | Para qué |
|---|---|
| `src/main.ts` | Interfaz, medición de tiempos y registro |
| `src/motor.ts`, `src/recorte.worker.ts`, `src/imgly-config.ts` | imgly en un worker o en el hilo principal |
| `src/camara.ts` | Cámara en vivo con marco y temporizador |
| `src/entorno.ts` | Datos del dispositivo, caché y contador de red |
| `src/registro.ts` | Mediciones guardadas en el teléfono |
| `public/sw.js` | Service worker para el modo sin conexión |
| `public/_headers` | COOP/COEP para la variante con-coi (la sin-coi lo reemplaza al compilar) |
| `scripts/descargar-modelo.mjs` | Descarga verificada del modelo |
| `scripts/generar-icono.mjs` | Ícono liso de 180 px para la pantalla de inicio |
