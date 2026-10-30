// Fechas de calendario en hora local (data-model.md, *Convenciones*) y su formato en español.

import type { FechaLocal } from '../datos/tipos';

const dos = (n: number) => String(n).padStart(2, '0');

/** `YYYY-MM-DD` del día local de `fecha` (hoy por defecto). */
export function fechaLocal(fecha: Date = new Date()): FechaLocal {
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

/** Fecha local a medianoche; acepta `YYYY-MM-DD` o una marca de tiempo. */
export function aFecha(valor: FechaLocal | number): Date {
  if (typeof valor === 'number') return new Date(valor);
  const [a, m, d] = valor.split('-').map(Number);
  return new Date(a!, m! - 1, d!);
}

const diaMes = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long' });
const diaSemana = new Intl.DateTimeFormat('es', { weekday: 'long' });

/** "3 de octubre" (01c Menú, 09 Ajustes, 12 Mis medidas). */
export function formatearDiaMes(valor: FechaLocal | number): string {
  return diaMes.format(aFecha(valor));
}

/** "3 de octubre", o "3 de octubre de 2025" si no es del año de `hoy`. */
export function formatearDiaMesAnio(valor: FechaLocal | number, hoy: Date = new Date()): string {
  const fecha = aFecha(valor);
  const diaMesTexto = diaMes.format(fecha);
  return fecha.getFullYear() === hoy.getFullYear() ? diaMesTexto : `${diaMesTexto} de ${fecha.getFullYear()}`;
}

/** Días de calendario entre dos fechas locales (sin contar horas ni cambios de horario). */
export function diasEntre(desde: FechaLocal | number | Date, hasta: FechaLocal | number | Date): number {
  const a = desde instanceof Date ? desde : aFecha(desde);
  const b = hasta instanceof Date ? hasta : aFecha(hasta);
  const utc = (f: Date) => Date.UTC(f.getFullYear(), f.getMonth(), f.getDate());
  return Math.round((utc(b) - utc(a)) / 86_400_000);
}

/** "Lunes 19 de octubre" (01 Hoy). */
export function formatearFechaLarga(valor: FechaLocal | number): string {
  const fecha = aFecha(valor);
  const dia = diaSemana.format(fecha);
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${diaMes.format(fecha)}`;
}
