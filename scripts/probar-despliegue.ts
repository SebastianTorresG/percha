// Despliega la app y corre todas las pruebas de punta a punta contra la URL publicada: la Parte A
// de docs/pruebas-intensivas.md, las del despliegue (headers, íconos, splash) y las visuales.
// Al final escribe un reporte en Markdown para pasarle a otra sesión.
//
// Uso:
//   npm run test:desplegada                     despliega en percha-preview y prueba
//   npm run test:desplegada -- --sin-desplegar  prueba lo que ya está publicado
//   npm run test:desplegada -- --local          prueba el build local (vite preview), sin publicar
//   npm run test:desplegada -- --url https://…  otra URL ya publicada
//   npm run test:desplegada -- --solo-reporte   reescribe el reporte con los últimos resultados
//   Lo que va después de `--playwright` pasa a Playwright, por ejemplo `--playwright -g visual`.
//
// Desplegar en percha-preview cambia la app que el dueño tiene instalada en el iPhone (le aparece
// "Hay una versión nueva"); la producción nunca se toca desde aquí (T166).

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const URL_PREVIEW = 'https://percha-preview.percha-spike-recorte.workers.dev';
const RESULTADO_JSON = 'test-results/resultado-pruebas.json';
/** URL, versión y commit de la última corrida, para que `--solo-reporte` los repita. */
const CORRIDA_JSON = 'test-results/corrida.json';

interface Corrida {
  url: string;
  version?: string;
  desplegada: boolean;
  codigo: number;
  rama?: string;
  commit?: string;
  sinCommit?: string[];
}

const argumentos = process.argv.slice(2);
const corte = argumentos.indexOf('--playwright');
const propios = corte === -1 ? argumentos : argumentos.slice(0, corte);
const paraPlaywright = corte === -1 ? [] : argumentos.slice(corte + 1);
const local = propios.includes('--local');
const sinDesplegar = local || propios.includes('--sin-desplegar') || propios.includes('--url');
const urlPedida = propios.includes('--url') ? propios[propios.indexOf('--url') + 1] : undefined;

function correr(comando: string, args: string[], env: Record<string, string> = {}): Promise<{ codigo: number; salida: string }> {
  return new Promise((listo) => {
    const proceso = spawn(comando, args, { shell: true, env: { ...process.env, ...env } });
    let salida = '';
    const copiar = (trozo: Buffer) => {
      salida += trozo.toString();
      process.stdout.write(trozo);
    };
    proceso.stdout.on('data', copiar);
    proceso.stderr.on('data', copiar);
    proceso.on('close', (codigo) => listo({ codigo: codigo ?? 1, salida }));
  });
}

/** JSON de un archivo; sin el BOM que agregan algunas herramientas de Windows. */
function leerJson<T>(ruta: string): T {
  return JSON.parse(readFileSync(ruta, 'utf8').replace(/^﻿/, '')) as T;
}

const sinFinDeLinea = (texto: string) => texto.replace(/\r\n/g, '\n');
const sinColores = (texto: string) => texto.replace(/\u001b\[[0-9;]*m/g, '');

/** Espera a que la URL sirva el mismo index.html que el build local (Cloudflare tarda unos segundos). */
async function esperarVersion(url: string): Promise<boolean> {
  if (!existsSync('dist/index.html')) return false;
  const esperado = sinFinDeLinea(readFileSync('dist/index.html', 'utf8'));
  for (let intento = 0; intento < 45; intento++) {
    try {
      const respuesta = await fetch(`${url}/?v=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
      if (sinFinDeLinea(await respuesta.text()) === esperado) return true;
    } catch {
      // Todavía no responde.
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

// --- Reporte ------------------------------------------------------------------------------------

interface Anotacion {
  type: string;
  description?: string;
}
interface Resultado {
  status: string;
  duration: number;
  errors?: { message?: string }[];
  attachments?: { name: string; path?: string }[];
  annotations?: Anotacion[];
}
interface Prueba {
  projectName: string;
  status: 'expected' | 'unexpected' | 'flaky' | 'skipped';
  annotations?: Anotacion[];
  results: Resultado[];
}
interface Spec {
  title: string;
  file: string;
  tests: Prueba[];
}
interface Suite {
  title: string;
  specs?: Spec[];
  suites?: Suite[];
}
interface Informe {
  suites: Suite[];
  stats: { startTime: string; duration: number; expected: number; unexpected: number; flaky: number; skipped: number };
}

function* recorrer(suite: Suite, camino: string[] = []): Generator<{ titulo: string; spec: Spec }> {
  for (const spec of suite.specs ?? []) yield { titulo: [...camino, spec.title].filter(Boolean).join(' › '), spec };
  for (const hija of suite.suites ?? []) yield* recorrer(hija, [...camino, hija.title]);
}

function git(args: string[]): Promise<string> {
  return new Promise((listo) => {
    const proceso = spawn('git', args, { shell: true });
    let salida = '';
    proceso.stdout.on('data', (t: Buffer) => (salida += t.toString()));
    // Solo el final: `git status --porcelain` empieza con un espacio que es parte del formato.
    proceso.on('close', () => listo(salida.trimEnd()));
  });
}

/** Rama, commit y archivos sin commit en este momento (el estado del código que se prueba). */
async function estadoDelCodigo(): Promise<Pick<Corrida, 'rama' | 'commit' | 'sinCommit'>> {
  return {
    rama: await git(['rev-parse', '--abbrev-ref', 'HEAD']),
    commit: await git(['rev-parse', '--short', 'HEAD']),
    sinCommit: (await git(['status', '--porcelain']))
      .split('\n')
      .filter(Boolean)
      .map((l) => l.slice(3)),
  };
}

async function escribirReporte(datos: Corrida): Promise<string> {
  const destino = datos.desplegada ? 'docs/reportes/pruebas-desplegada.md' : 'docs/reportes/pruebas-local.md';
  mkdirSync('docs/reportes', { recursive: true });
  const lineas: string[] = [];
  const fecha = new Date(existsSync(RESULTADO_JSON) ? leerJson<Informe>(RESULTADO_JSON).stats.startTime : Date.now());
  const { rama, commit, sinCommit = [] } = datos.commit ? datos : await estadoDelCodigo();

  lineas.push(`# Pruebas de Percha ${datos.desplegada ? 'publicada' : 'local'} — ${fecha.toLocaleString('es', { dateStyle: 'long', timeStyle: 'short' })}`, '');
  lineas.push('Generado por `npm run test:desplegada` (scripts/probar-despliegue.ts). Se reescribe en cada corrida.', '');
  lineas.push(`- **URL**: ${datos.url}`);
  lineas.push(`- **Despliegue**: ${datos.version ? `versión ${datos.version}, publicada en esta corrida` : 'sin desplegar en esta corrida'}`);
  const archivos = sinCommit.map((a) => `\`${a}\``);
  lineas.push(
    `- **Código probado**: rama \`${rama}\`, commit \`${commit}\`${archivos.length ? ` **con cambios sin commit** en ${archivos.slice(0, 6).join(', ')}${archivos.length > 6 ? ', …' : ''}` : ''}`,
  );
  lineas.push('- **Navegador**: WebKit de Playwright en Windows, perfiles iPhone 15 (393 × 852), SE (375 × 667) y Pro Max (440 × 956); no reemplaza la prueba en el iPhone');

  if (!existsSync(RESULTADO_JSON)) {
    lineas.push('', `**Playwright no dejó resultados** (código de salida ${datos.codigo}). Revisar la salida de la consola.`);
    writeFileSync(destino, `${lineas.join('\n')}\n`);
    return destino;
  }
  const informe = leerJson<Informe>(RESULTADO_JSON);
  const { expected, unexpected, flaky, skipped, duration } = informe.stats;
  lineas.push(
    `- **Resultado**: ${expected} pasaron, ${unexpected} fallaron, ${flaky} inestables, ${skipped} omitidas (${Math.round(duration / 1000)} s)`,
    '',
  );

  const fallas: string[] = [];
  const inestables: string[] = [];
  const visuales = new Map<string, { nivel: string; donde: Set<string> }>();
  for (const suite of informe.suites) {
    for (const { titulo, spec } of recorrer(suite)) {
      for (const prueba of spec.tests) {
        const donde = `${prueba.projectName}: ${titulo.replace(/^.*?› /, '')}`;
        const anotaciones = [...(prueba.annotations ?? []), ...prueba.results.flatMap((r) => r.annotations ?? [])];
        for (const a of anotaciones) {
          if (a.type !== 'error-visual' && a.type !== 'aviso-visual') continue;
          const clave = a.description ?? '';
          const entrada = visuales.get(clave) ?? { nivel: a.type, donde: new Set<string>() };
          entrada.donde.add(donde);
          visuales.set(clave, entrada);
        }
        const ultimo = prueba.results.at(-1);
        if (prueba.status === 'unexpected' && ultimo) {
          const error = sinColores(ultimo.errors?.map((e) => e.message ?? '').join('\n') ?? '')
            .split('\n')
            .filter((l) => l.trim())
            .slice(0, 12)
            .join('\n');
          const adjuntos = (ultimo.attachments ?? []).filter((a) => a.path && /diff|actual|trace|screenshot/.test(a.name)).map((a) => `\`${a.path}\``);
          fallas.push(`### ${titulo}\n\n- Perfil: ${prueba.projectName} · archivo \`${spec.file}\`\n${adjuntos.length ? `- Adjuntos: ${adjuntos.join(', ')}\n` : ''}\n\`\`\`text\n${error}\n\`\`\`\n`);
        }
        if (prueba.status === 'flaky') inestables.push(`- ${prueba.projectName}: ${titulo}`);
      }
    }
  }

  lineas.push('## Fallas', '');
  lineas.push(fallas.length ? fallas.join('\n') : 'Ninguna.', '');
  if (inestables.length) lineas.push('## Inestables (pasaron al reintentar)', '', ...inestables, '');

  const lista = (donde: Set<string>, maximo = 4) => `${[...donde].slice(0, maximo).join('; ')}${donde.size > maximo ? '; …' : ''}`;
  const porNivel = (nivel: string) =>
    [...visuales]
      .filter(([descripcion, v]) => v.nivel === nivel && !descripcion.startsWith('contraste bajo'))
      .sort((a, b) => b[1].donde.size - a[1].donde.size)
      .map(([descripcion, v]) => `- **${descripcion}** — ${v.donde.size} ${v.donde.size === 1 ? 'caso' : 'casos'} (${lista(v.donde)})`);
  // El contraste depende del par de colores (casi siempre dos tokens del diseño): se agrupa por par
  // y se nombra cada color con sus tokens de src/tema/tokens.css.
  const tokens = new Map<string, string[]>();
  for (const [, tema, cuerpo] of readFileSync('src/tema/tokens.css', 'utf8').matchAll(/\[data-theme="(\w+)"\]\s*\{([^}]*)\}/g)) {
    for (const [, nombre, valor] of cuerpo!.matchAll(/(--[\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
      const clave = valor!.toLowerCase();
      tokens.set(clave, [...(tokens.get(clave) ?? []), `${nombre} ${tema}`]);
    }
  }
  const hex = (rgb: string) => {
    const valor = `#${rgb.match(/\d+/g)!.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
    const nombres = tokens.get(valor);
    return nombres ? `${valor} (${nombres.join(', ')})` : valor;
  };
  const pares = new Map<string, { textos: Set<string>; donde: Set<string> }>();
  for (const [descripcion, v] of visuales) {
    const m = descripcion.match(/^contraste bajo: (.+): ([\d.]+):1 \(mínimo ([\d.]+):1, (rgba?\([^)]*\)) sobre (rgb\([^)]*\))\)$/);
    if (!m) continue;
    const clave = `${hex(m[4]!)} sobre ${hex(m[5]!)}: ${m[2]}:1 (mínimo ${m[3]}:1)`;
    const par = pares.get(clave) ?? { textos: new Set<string>(), donde: new Set<string>() };
    par.textos.add(m[1]!);
    for (const d of v.donde) par.donde.add(d.replace(/^[^:]+: visual /, ''));
    pares.set(clave, par);
  }
  const contraste = [...pares]
    .sort((a, b) => b[1].textos.size - a[1].textos.size)
    .map(([clave, par]) => `- **${clave}** — ${par.textos.size} textos, por ejemplo ${lista(par.textos, 5)}. Pantallas: ${lista(par.donde, 6)}`);

  lineas.push('## Bugs visuales (hacen fallar la prueba)', '');
  lineas.push(...(porNivel('error-visual').length ? porNivel('error-visual') : ['Ninguno.']), '');
  lineas.push('## Avisos visuales (no hacen fallar: revisar con Claude Design)', '');
  lineas.push('Contraste por debajo de WCAG AA y objetivos táctiles de menos de 44 × 44 px. Pueden venir de los tokens del diseño: no se cambian sin el dueño.', '');
  lineas.push('### Contraste, por par de colores', '');
  lineas.push(...(contraste.length ? contraste : ['Ninguno.']), '');
  lineas.push('### Otros avisos', '');
  lineas.push(...(porNivel('aviso-visual').length ? porNivel('aviso-visual') : ['Ninguno.']), '');

  lineas.push('## Cómo seguir desde otra sesión', '');
  lineas.push(
    '1. Leer `CLAUDE.md`, `specs/001-percha-closet-taller/handoff-plan.md` y `docs/pruebas-intensivas.md` (las pruebas llevan en el nombre los IDs del plan).',
    '2. Las pruebas están en `tests/e2e/`: `a-*.spec.ts` y `a14-*.spec.ts` (Parte A), `despliegue.spec.ts` (servidor publicado), `visual.spec.ts` con los detectores de `visual/revisar.ts` y las capturas de referencia en `visual.spec.ts-snapshots/`.',
    '3. Reproducir una falla: `npm run test:desplegada -- --sin-desplegar --playwright -g "<ID o título>"`, o en local `npx playwright test -g "<ID>" --project=iphone-15`.',
    '4. Si una captura cambió a propósito, revisarla a ojo y regenerarla con `npx playwright test tests/e2e/visual.spec.ts --update-snapshots`.',
    '5. Todo bug se arregla o queda como tarea en `specs/001-percha-closet-taller/tasks.md`; nada queda "fuera de alcance".',
    '',
  );
  writeFileSync(destino, `${lineas.join('\n')}\n`);
  return destino;
}

// --- Corrida ------------------------------------------------------------------------------------

let url = local ? 'http://localhost:4173' : (urlPedida ?? URL_PREVIEW);
let version: string | undefined;

if (propios.includes('--solo-reporte')) {
  // Vuelve a escribir el reporte con los resultados y los datos de la última corrida, sin correr nada.
  const ultima: Corrida = existsSync(CORRIDA_JSON) ? leerJson<Corrida>(CORRIDA_JSON) : { url, desplegada: !local, codigo: 0 };
  console.log(`▶ Reporte: ${await escribirReporte(ultima)}`);
  process.exit(0);
}

if (!sinDesplegar) {
  console.log(`\n▶ Desplegando en percha-preview…\n`);
  const despliegue = await correr('npm', ['run', 'deploy:preview']);
  if (despliegue.codigo !== 0) {
    console.error('\n✖ El despliegue falló; no se corren las pruebas.');
    process.exit(despliegue.codigo);
  }
  version = despliegue.salida.match(/Current Version ID: (\S+)/)?.[1];
  url = despliegue.salida.match(/https:\/\/\S+\.workers\.dev/)?.[0] ?? url;
  console.log(`\n▶ Esperando a que ${url} sirva la versión nueva…`);
  if (!(await esperarVersion(url))) {
    console.error('✖ La URL no sirve el build recién desplegado después de 90 s.');
    process.exit(1);
  }
} else if (!local && !(await esperarVersion(url))) {
  console.warn('⚠ La URL no sirve el mismo index.html que dist/: las pruebas corren contra lo publicado, que es otra versión.');
}

console.log(`\n▶ Pruebas contra ${url}\n`);
const codigoProbado = await estadoDelCodigo();
const pruebas = await correr('npx', ['playwright', 'test', '--reporter=list,json', ...paraPlaywright], {
  ...(local ? {} : { PERCHA_URL: url }),
  PLAYWRIGHT_JSON_OUTPUT_NAME: RESULTADO_JSON,
});
const corrida: Corrida = { url, version, desplegada: !local, codigo: pruebas.codigo, ...codigoProbado };
writeFileSync(CORRIDA_JSON, JSON.stringify(corrida, null, 2));
const reporte = await escribirReporte(corrida);
console.log(`\n▶ Reporte: ${reporte}`);
process.exit(pruebas.codigo);
