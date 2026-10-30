// Tema claro ("Boutique cálida") u oscuro ("Galería oscura") según la preferencia de Ajustes
// (FR-062, research R-12). El primer pintado lo resuelve el script inline de index.html con la
// misma regla que `resolverTema`; tests/unidad/apariencia.test.ts comprueba que coinciden.

import { actualizar, espejarApariencia, obtener } from '../datos/repos/ajustes';
import type { Apariencia } from '../datos/tipos';

export type Tema = 'claro' | 'oscuro';

/** `bg` de cada tema en tokens.json, para la barra de estado de iOS. */
export const COLOR_BARRA: Readonly<Record<Tema, string>> = {
  claro: '#f4ebe6',
  oscuro: '#0f0e0d',
};

const CONSULTA_OSCURO = '(prefers-color-scheme: dark)';

let preferenciaActual: Apariencia = 'sistema';

export function resolverTema(preferencia: Apariencia, prefiereOscuro: boolean): Tema {
  if (preferencia === 'sistema') return prefiereOscuro ? 'oscuro' : 'claro';
  return preferencia;
}

function sistemaPrefiereOscuro(): boolean {
  return typeof matchMedia === 'function' && matchMedia(CONSULTA_OSCURO).matches;
}

/** Fija `data-theme` y la meta `theme-color`; devuelve el tema resultante. */
export function aplicarTema(preferencia: Apariencia): Tema {
  preferenciaActual = preferencia;
  const tema = resolverTema(preferencia, sistemaPrefiereOscuro());
  document.documentElement.dataset.theme = tema;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLOR_BARRA[tema]);
  return tema;
}

/**
 * Cambia el tema en vivo cuando cambia el modo del iPhone y la preferencia es "Sistema".
 * Devuelve la función para dejar de escuchar.
 */
export function escucharSistema(): () => void {
  if (typeof matchMedia !== 'function') return () => {};
  const consulta = matchMedia(CONSULTA_OSCURO);
  const alCambiar = () => {
    if (preferenciaActual === 'sistema') aplicarTema('sistema');
  };
  consulta.addEventListener('change', alCambiar);
  return () => consulta.removeEventListener('change', alCambiar);
}

/**
 * Al arrancar: la base es la fuente de verdad. Si el espejo de localStorage se perdió o quedó
 * distinto, se corrige y se vuelve a aplicar el tema.
 */
export async function sincronizarApariencia(): Promise<Tema> {
  const { apariencia } = await obtener();
  espejarApariencia(apariencia);
  return aplicarTema(apariencia);
}

/** Selector Sistema · Claro · Oscuro de Ajustes. */
export async function cambiarApariencia(preferencia: Apariencia): Promise<Tema> {
  await actualizar({ apariencia: preferencia });
  return aplicarTema(preferencia);
}
