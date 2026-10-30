// Página del spike de recorte (tasks.md T001, research.md R-0).
// Mide en el iPhone si @imgly/background-removal sirve en una PWA standalone: tiempos,
// estabilidad de memoria, modo sin conexión y comportamiento de la cámara.

import './estilos.css';
import { abrirCamara } from './camara';
import { CACHE_MODELO, VARIANTE, contadorRed, estadoPermisoCamara, leerEntorno } from './entorno';
import type { Dispositivo, Modelo, OpcionesMotor, Progreso } from './imgly-config';
import { motorDe, type Hilo } from './motor';
import * as registro from './registro';

type Tamano = 'completo' | '1500';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header>
    <h1>Prueba de recorte</h1>
    <p class="meta">Variante <b>${VARIANTE}</b> · <span id="conexion"></span></p>
  </header>

  <section>
    <h2>1. Ajustes</h2>
    <label>Modelo
      <select id="modelo">
        <option value="isnet_quint8">isnet_quint8 (44 MB, liviano)</option>
        <option value="isnet_fp16">isnet_fp16 (88 MB, el de imgly por defecto)</option>
      </select>
    </label>
    <label>Cálculo
      <select id="dispositivo">
        <option value="cpu">CPU (WASM)</option>
        <option value="gpu">GPU (WebGPU)</option>
      </select>
    </label>
    <label>Dónde corre
      <select id="hilo">
        <option value="worker">Web Worker (como en la app)</option>
        <option value="principal">Hilo principal</option>
      </select>
    </label>
    <label>Tamaño de la foto
      <select id="tamano">
        <option value="1500">Reducida a 1500 px</option>
        <option value="completo">Completa</option>
      </select>
    </label>
  </section>

  <section>
    <h2>2. Preparar el recorte</h2>
    <p>Descarga el modelo (la primera vez tarda) y lo deja guardado para usarlo sin conexión.</p>
    <button id="preparar" class="principal">Preparar modelo</button>
    <progress id="progreso" max="1" value="0" hidden></progress>
    <p id="estado" class="meta" aria-live="polite"></p>
    <div class="fila">
      <button id="reiniciar">Arranque en frío</button>
      <button id="borrar-cache">Borrar modelo guardado</button>
    </div>
  </section>

  <section>
    <h2>3. Recortar una foto</h2>
    <div class="fila">
      <label class="boton">Galería<input type="file" accept="image/*" id="galeria" hidden></label>
      <label class="boton">Cámara del iPhone<input type="file" accept="image/*" capture="environment" id="nativa" hidden></label>
    </div>
    <button id="en-vivo">Cámara en vivo (marco y 5 s)</button>
    <div id="pregunta-permiso" class="pregunta" hidden>
      <p>¿iOS te pidió permiso para usar la cámara esta vez?</p>
      <div class="fila"><button data-respuesta="sí">Sí</button><button data-respuesta="no">No</button></div>
    </div>
  </section>

  <section>
    <h2>4. Resultado</h2>
    <div class="cuadros"><img id="resultado" alt="Prenda recortada" hidden></div>
    <p id="resumen" class="meta"></p>
  </section>

  <section>
    <h2>Mediciones</h2>
    <p class="meta">Quedan guardadas aunque cierres la app. Cuando termines, cópialas y pégalas en el chat.</p>
    <div class="fila">
      <button id="copiar" class="principal">Copiar resultados</button>
      <button id="borrar-registro">Borrar mediciones</button>
    </div>
    <textarea id="texto-copia" rows="8" readonly hidden></textarea>
    <ol id="lista" reversed></ol>
  </section>

  <section>
    <h2>Entorno</h2>
    <dl id="entorno"></dl>
    <button id="actualizar-entorno">Actualizar</button>
  </section>

  <section>
    <h2>Cómo probar sin conexión</h2>
    <ol>
      <li>Con conexión, toca <b>Preparar modelo</b> y espera a que termine.</li>
      <li>Cierra la app desde el selector de apps (desliza hacia arriba).</li>
      <li>Activa el modo avión y abre la app desde su ícono.</li>
      <li>Recorta una foto. En la medición, "red" debe ser 0.</li>
    </ol>
  </section>`;

const $ = <T extends HTMLElement>(selector: string) => app.querySelector<T>(selector)!;

// --- Ajustes (se recuerdan entre aperturas) ---------------------------------------------------

const AJUSTES = 'percha.spike.ajustes';
const selects = ['modelo', 'dispositivo', 'hilo', 'tamano'].map((id) => $<HTMLSelectElement>(`#${id}`));
try {
  const guardados = JSON.parse(localStorage.getItem(AJUSTES) ?? '{}');
  for (const select of selects) if (guardados[select.id]) select.value = guardados[select.id];
} catch {
  // Ajustes dañados: se usan los valores por defecto.
}
for (const select of selects) {
  select.addEventListener('change', () =>
    localStorage.setItem(AJUSTES, JSON.stringify(Object.fromEntries(selects.map((s) => [s.id, s.value])))),
  );
}

const leerAjustes = () => ({
  opciones: {
    modelo: $<HTMLSelectElement>('#modelo').value as Modelo,
    dispositivo: $<HTMLSelectElement>('#dispositivo').value as Dispositivo,
  } satisfies OpcionesMotor,
  hilo: $<HTMLSelectElement>('#hilo').value as Hilo,
  tamano: $<HTMLSelectElement>('#tamano').value as Tamano,
});

const conexion = () => (navigator.onLine ? 'en línea' : 'sin conexión');
const ms = (valor: number) => String(Math.round(valor));
const kb = (bytes: number) => String(Math.round(bytes / 1024));
const mb = (bytes: number) => (bytes / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 });

// --- Estado de la interfaz --------------------------------------------------------------------

let ocupado = false;
function ocupar(valor: boolean) {
  ocupado = valor;
  for (const control of app.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>(
    'button, input, select',
  )) {
    if (control.id !== 'copiar') control.disabled = valor;
  }
}

const estado = (texto: string) => ($('#estado').textContent = texto);

function pintarConexion() {
  $('#conexion').textContent = conexion();
}

const NOMBRES_PASO: Record<string, string> = {
  'compute:decode': 'leyendo la foto',
  'compute:inference': 'quitando el fondo',
  'compute:mask': 'aplicando la máscara',
  'compute:encode': 'guardando el PNG',
};

function mostrarProgreso(clave: string, actual: number, total: number) {
  const barra = $<HTMLProgressElement>('#progreso');
  if (clave.startsWith('fetch:')) {
    barra.hidden = false;
    barra.value = total ? actual / total : 0;
    const que = clave.includes('/models/') ? 'modelo' : 'motor (WASM)';
    estado(`Cargando ${que}: ${mb(actual)} de ${mb(total)} MB`);
  } else if (NOMBRES_PASO[clave]) {
    barra.hidden = true;
    estado(`Recortando: ${NOMBRES_PASO[clave]}…`);
  }
}

async function pintarEntorno() {
  const filas = await leerEntorno();
  $('#entorno').innerHTML = filas.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
}

function pintarLista() {
  $('#lista').innerHTML = registro
    .mediciones()
    .reverse()
    .map((m) => {
      const campos = Object.entries(m.detalle)
        .map(([k, v]) => `<span><b>${k}</b> ${v}</span>`)
        .join('');
      return `<li class="${m.detalle.error ? 'error' : ''}"><span class="meta">#${m.n} · ${m.hora} · ${m.tipo}</span>${campos}</li>`;
    })
    .join('');
}

// --- Foto de entrada --------------------------------------------------------------------------

async function decodificar(archivo: Blob) {
  try {
    return { bitmap: await createImageBitmap(archivo, { imageOrientation: 'from-image' }), orientacion: 'from-image' };
  } catch {
    return { bitmap: await createImageBitmap(archivo), orientacion: 'por defecto' };
  }
}

async function prepararFoto(archivo: Blob, tamano: Tamano) {
  const { bitmap, orientacion } = await decodificar(archivo);
  const entrada = `${bitmap.width}×${bitmap.height}`;
  const escala = tamano === 'completo' ? 1 : Math.min(1, 1500 / Math.max(bitmap.width, bitmap.height));
  if (escala === 1) {
    bitmap.close();
    return { foto: archivo, entrada, procesada: entrada, orientacion };
  }
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(bitmap.width * escala);
  lienzo.height = Math.round(bitmap.height * escala);
  lienzo.getContext('2d')!.drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);
  bitmap.close();
  const foto = await new Promise<Blob>((resolver, rechazar) =>
    lienzo.toBlob((b) => (b ? resolver(b) : rechazar(new Error('No se pudo reducir la foto'))), 'image/jpeg', 0.9),
  );
  return { foto, entrada, procesada: `${lienzo.width}×${lienzo.height}`, orientacion };
}

/** Fracción de píxeles visibles del PNG, medida sobre una copia pequeña. */
async function cobertura(png: Blob) {
  const bitmap = await createImageBitmap(png);
  const lado = 256;
  const lienzo = new OffscreenCanvas(lado, lado);
  const ctx = lienzo.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, lado, lado);
  bitmap.close();
  const { data } = ctx.getImageData(0, 0, lado, lado);
  let opacos = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i]! > 128) opacos++;
  return opacos / (lado * lado);
}

// --- Acciones ---------------------------------------------------------------------------------

// imgly informa "fetch:" tanto si el recurso sale de la red como de la caché del service worker.
// Por eso `cargoModelo` solo dice que el modelo se cargó en este paso; lo que salió a la red lo
// dice el contador `red`.
function seguirPasos(): { progreso: Progreso; cargoModelo: () => boolean; inicioRecorte: () => number | null } {
  let cargo = false;
  let tDecode: number | null = null;
  return {
    progreso: (clave, actual, total) => {
      if (clave.startsWith('fetch:')) cargo = true;
      if (clave === 'compute:decode' && tDecode === null) tDecode = performance.now();
      mostrarProgreso(clave, actual, total);
    },
    cargoModelo: () => cargo,
    inicioRecorte: () => tDecode,
  };
}

async function preparar() {
  if (ocupado) return;
  ocupar(true);
  const { opciones, hilo } = leerAjustes();
  const detalle: Record<string, string> = { ...opciones, hilo, conexion: conexion(), coi: String(crossOriginIsolated) };
  const redAntes = await contadorRed();
  const pasos = seguirPasos();
  const t0 = performance.now();
  try {
    await motorDe(hilo).preparar(opciones, pasos.progreso);
    detalle.ms = ms(performance.now() - t0);
    detalle.cargoModelo = pasos.cargoModelo() ? 'sí' : 'no (ya estaba en memoria)';
    estado(`Listo en ${(Number(detalle.ms) / 1000).toFixed(1)} s`);
  } catch (error) {
    detalle.error = error instanceof Error ? error.message : String(error);
    estado(`Error: ${detalle.error}`);
  } finally {
    const redDespues = await contadorRed();
    detalle.red = redAntes === null || redDespues === null ? '?' : String(redDespues - redAntes);
    $<HTMLProgressElement>('#progreso').hidden = true;
    registro.agregar('preparar', detalle);
    ocupar(false);
    pintarLista();
    void pintarEntorno();
  }
}

let urlResultado: string | null = null;

async function recortar(archivo: Blob, entrada: string) {
  if (ocupado) return;
  ocupar(true);
  const { opciones, hilo, tamano } = leerAjustes();
  const detalle: Record<string, string> = {
    entrada,
    ...opciones,
    hilo,
    tamano,
    conexion: conexion(),
    coi: String(crossOriginIsolated),
  };
  const redAntes = await contadorRed();
  try {
    const t0 = performance.now();
    const foto = await prepararFoto(archivo, tamano);
    Object.assign(detalle, {
      entradaPx: foto.entrada,
      entradaKB: kb(archivo.size),
      procesadaPx: foto.procesada,
      orientacion: foto.orientacion,
      reducirMs: ms(performance.now() - t0),
    });
    registro.marcarEnCurso(detalle);

    const pasos = seguirPasos();
    const tInicio = performance.now();
    const png = await motorDe(hilo).recortar(foto.foto, opciones, pasos.progreso);
    const tFin = performance.now();
    const tRecorte = pasos.inicioRecorte() ?? tInicio;

    Object.assign(detalle, {
      preparacionMs: ms(tRecorte - tInicio),
      recorteMs: ms(tFin - tRecorte),
      cargoModelo: pasos.cargoModelo() ? 'sí' : 'no',
      salidaKB: kb(png.size),
      cobertura: `${Math.round((await cobertura(png)) * 100)} %`,
    });

    if (urlResultado) URL.revokeObjectURL(urlResultado);
    urlResultado = URL.createObjectURL(png);
    const imagen = $<HTMLImageElement>('#resultado');
    imagen.src = urlResultado;
    imagen.hidden = false;
    $('#resumen').textContent =
      `Recorte en ${(Number(detalle.recorteMs) / 1000).toFixed(1)} s` +
      (Number(detalle.preparacionMs) > 200
        ? ` (más ${(Number(detalle.preparacionMs) / 1000).toFixed(1)} s preparando el modelo)`
        : '') +
      ` · ${detalle.procesadaPx} · ${detalle.cobertura} visible`;
    estado('Listo');
  } catch (error) {
    detalle.error = error instanceof Error ? error.message : String(error);
    estado(`Error: ${detalle.error}`);
  } finally {
    const redDespues = await contadorRed();
    detalle.red = redAntes === null || redDespues === null ? '?' : String(redDespues - redAntes);
    registro.terminarEnCurso();
    registro.agregar('recorte', detalle);
    $<HTMLProgressElement>('#progreso').hidden = true;
    ocupar(false);
    pintarLista();
  }
}

for (const [id, entrada] of [
  ['#galeria', 'galería (sin capture)'],
  ['#nativa', 'cámara del iPhone (capture)'],
] as const) {
  const input = $<HTMLInputElement>(id);
  input.addEventListener('change', () => {
    const archivo = input.files?.[0];
    input.value = '';
    if (archivo) void recortar(archivo, entrada);
  });
}

$('#en-vivo').addEventListener('click', async () => {
  if (ocupado) return;
  const permisoAntes = await estadoPermisoCamara();
  let foto: Blob | null;
  try {
    foto = await abrirCamara();
    registro.agregar('evento', { evento: 'Cámara en vivo abierta', permisoAntes });
  } catch (error) {
    registro.agregar('evento', {
      evento: 'La cámara en vivo no abrió',
      permisoAntes,
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    });
    estado('La cámara en vivo no abrió; queda anotado en las mediciones.');
    pintarLista();
    return;
  }
  $('#pregunta-permiso').hidden = false;
  pintarLista();
  if (foto) await recortar(foto, 'cámara en vivo');
});

$('#pregunta-permiso').addEventListener('click', (evento) => {
  const respuesta = (evento.target as HTMLElement).closest('button')?.dataset.respuesta;
  if (!respuesta) return;
  registro.agregar('evento', { evento: 'iOS pidió permiso de cámara esta vez', respuesta });
  $('#pregunta-permiso').hidden = true;
  pintarLista();
});

$('#preparar').addEventListener('click', () => void preparar());

$('#reiniciar').addEventListener('click', () => {
  const { hilo } = leerAjustes();
  estado(
    motorDe(hilo).reiniciar()
      ? 'Worker reiniciado: el próximo recorte vuelve a cargar el modelo desde la caché.'
      : 'En el hilo principal no se puede: cierra la app desde el selector de apps y ábrela otra vez.',
  );
});

$('#borrar-cache').addEventListener('click', async () => {
  await caches.delete(CACHE_MODELO);
  motorDe('worker').reiniciar();
  registro.agregar('evento', { evento: 'Modelo guardado borrado' });
  estado('Modelo borrado. Cierra y abre la app para medir otra vez la primera descarga.');
  pintarLista();
  void pintarEntorno();
});

$('#copiar').addEventListener('click', async () => {
  const texto = registro.comoTexto(await leerEntorno());
  const area = $<HTMLTextAreaElement>('#texto-copia');
  try {
    await navigator.clipboard.writeText(texto);
    area.hidden = true;
    estado('Resultados copiados. Pégalos en el chat.');
  } catch {
    area.value = texto;
    area.hidden = false;
    area.select();
    estado('No se pudo copiar solo: mantén presionado el texto y elige Copiar.');
  }
});

$('#borrar-registro').addEventListener('click', () => {
  if (!confirm('¿Borrar todas las mediciones?')) return;
  registro.borrarTodo();
  pintarLista();
});

$('#actualizar-entorno').addEventListener('click', () => void pintarEntorno());

addEventListener('online', pintarConexion);
addEventListener('offline', pintarConexion);

// --- Arranque ---------------------------------------------------------------------------------

registro.recuperarInterrumpido();
pintarConexion();
pintarLista();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch((error) =>
    registro.agregar('evento', { evento: 'No se pudo registrar el service worker', error: String(error) }),
  );
  navigator.serviceWorker.addEventListener('controllerchange', () => void pintarEntorno());
}

void (async () => {
  const filas = Object.fromEntries(await leerEntorno());
  registro.agregar('evento', {
    evento: 'Inicio de la app',
    standalone: filas['Pantalla de inicio (standalone)']!,
    permisoCamara: filas['Permiso de cámara']!,
    conexion: conexion(),
    modeloGuardado: filas['Caché del modelo']!,
  });
  pintarLista();
  await pintarEntorno();
})();
