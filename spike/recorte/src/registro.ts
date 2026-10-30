// Registro de mediciones en localStorage: sobrevive a una recarga por memoria y a cerrar la app.

export interface Medicion {
  n: number;
  hora: string;
  tipo: 'recorte' | 'preparar' | 'evento';
  detalle: Record<string, string>;
}

const CLAVE = 'percha.spike.registro';
const CLAVE_EN_CURSO = 'percha.spike.enCurso';

function leer(): Medicion[] {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) ?? '[]');
  } catch {
    return [];
  }
}

export const mediciones = () => leer();

export function agregar(tipo: Medicion['tipo'], detalle: Record<string, string>) {
  const todas = leer();
  const hora = new Date().toLocaleString('es-CO', { hour12: false });
  todas.push({ n: (todas.at(-1)?.n ?? 0) + 1, hora, tipo, detalle });
  localStorage.setItem(CLAVE, JSON.stringify(todas));
}

export function borrarTodo() {
  localStorage.removeItem(CLAVE);
}

/**
 * Marca un recorte en curso. Si la página se recarga antes de `terminarEnCurso` (iOS la cerró
 * por memoria), el próximo arranque lo detecta con `recuperarInterrumpido`.
 */
export function marcarEnCurso(detalle: Record<string, string>) {
  localStorage.setItem(CLAVE_EN_CURSO, JSON.stringify(detalle));
}

export function terminarEnCurso() {
  localStorage.removeItem(CLAVE_EN_CURSO);
}

export function recuperarInterrumpido() {
  const guardado = localStorage.getItem(CLAVE_EN_CURSO);
  if (!guardado) return;
  terminarEnCurso();
  agregar('evento', {
    evento: 'La app se recargó en medio de un recorte (probable cierre por memoria)',
    ...JSON.parse(guardado),
  });
}

export function comoTexto(entorno: [string, string][]): string {
  const lineas = ['PERCHA · RESULTADOS DEL SPIKE DE RECORTE', `Copiado: ${new Date().toISOString()}`, ''];
  lineas.push('## Entorno', ...entorno.map(([k, v]) => `${k}: ${v}`), '', '## Mediciones');
  for (const m of leer()) {
    const campos = Object.entries(m.detalle).map(([k, v]) => `${k}=${v}`).join(' | ');
    lineas.push(`#${m.n} ${m.hora} [${m.tipo}] ${campos}`);
  }
  return lineas.join('\n');
}
