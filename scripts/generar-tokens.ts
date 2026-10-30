// Convierte los tokens del diseño (Claude Design) en variables CSS (T009, principio VI).
// Uso: npm run tokens  →  escribe src/tema/tokens.css. No editar ese archivo a mano.

import { readFileSync, writeFileSync } from 'node:fs';

const ORIGEN = 'Tres direcciones visuales Clóset/design_handoff_percha/tokens.json';
const DESTINO = 'src/tema/tokens.css';

interface Tema {
  nombre: string;
  color: Record<string, string>;
  cutoutFilter: string;
  font: { serif: string; serifWeight: number; sans: string };
  labelCase: string;
  labelTracking: string;
  chipFontSize: number;
  radius: Record<string, number>;
  selectionStyle: string;
}

interface Compartido {
  camara: Record<string, string>;
  tipo: Record<string, number>;
  espacio: number[];
  margenTexto: number;
  margenTarjetas: number;
  toqueMinimo: number;
  alturaBoton: number;
  alturaChip: number[];
  nav: Record<string, number>;
  sombraTelefono: string;
}

const tokens = JSON.parse(readFileSync(ORIGEN, 'utf8')) as {
  claro: Tema;
  oscuro: Tema;
  compartido: Compartido;
};

// "navMuted" → "nav-muted"
const kebab = (nombre: string) => nombre.replace(/[A-Z]/g, (letra) => `-${letra.toLowerCase()}`);
const px = (valor: number) => (valor === 0 ? '0' : `${valor}px`);

const RESPALDO_SERIF = "Georgia, 'Times New Roman', serif";
const RESPALDO_SANS = "system-ui, -apple-system, 'Helvetica Neue', sans-serif";

function bloqueTema(selector: string, tema: Tema, esquema: 'light' | 'dark'): string {
  const lineas = [`/* ${tema.nombre} */`, `${selector} {`, `  color-scheme: ${esquema};`];
  for (const [nombre, valor] of Object.entries(tema.color)) lineas.push(`  --${kebab(nombre)}: ${valor};`);
  lineas.push(
    `  --cutout-filter: ${tema.cutoutFilter};`,
    `  --font-serif: '${tema.font.serif}', ${RESPALDO_SERIF};`,
    `  --font-serif-weight: ${tema.font.serifWeight};`,
    `  --font-sans: '${tema.font.sans}', ${RESPALDO_SANS};`,
    `  --label-case: ${tema.labelCase};`,
    `  --label-tracking: ${tema.labelTracking};`,
    `  --chip-font-size: ${px(tema.chipFontSize)};`,
  );
  for (const [nombre, valor] of Object.entries(tema.radius)) lineas.push(`  --radius-${kebab(nombre)}: ${px(valor)};`);
  lineas.push(`  --selection-style: ${tema.selectionStyle};`, '}');
  return lineas.join('\n');
}

function bloqueCompartido(c: Compartido): string {
  const lineas = [':root {'];
  for (const [nombre, valor] of Object.entries(c.camara)) lineas.push(`  --camara-${kebab(nombre)}: ${valor};`);
  for (const [nombre, valor] of Object.entries(c.tipo)) lineas.push(`  --tipo-${kebab(nombre)}: ${px(valor)};`);
  c.espacio.forEach((valor, i) => lineas.push(`  --espacio-${i + 1}: ${px(valor)};`));
  lineas.push(
    `  --margen-texto: ${px(c.margenTexto)};`,
    `  --margen-tarjetas: ${px(c.margenTarjetas)};`,
    `  --toque-minimo: ${px(c.toqueMinimo)};`,
    `  --altura-boton: ${px(c.alturaBoton)};`,
  );
  c.alturaChip.forEach((valor, i) => lineas.push(`  --altura-chip-${i + 1}: ${px(valor)};`));
  for (const [nombre, valor] of Object.entries(c.nav)) lineas.push(`  --nav-${kebab(nombre)}: ${px(valor)};`);
  lineas.push(`  --sombra-telefono: ${c.sombraTelefono};`, '}');
  return lineas.join('\n');
}

const css = [
  `/* Generado por scripts/generar-tokens.ts desde ${ORIGEN}. No editar a mano: npm run tokens. */`,
  '',
  bloqueCompartido(tokens.compartido),
  '',
  // El claro también aplica sin data-theme, por si el script del <head> no corrió.
  bloqueTema(':root,\n[data-theme="claro"]', tokens.claro, 'light'),
  '',
  bloqueTema('[data-theme="oscuro"]', tokens.oscuro, 'dark'),
  '',
].join('\n');

writeFileSync(DESTINO, css);
console.log(`✓ ${DESTINO}`);
