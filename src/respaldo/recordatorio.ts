// Aviso suave de respaldo en Hoy (FR-005, diseño 01b). Los días se cuentan por día del calendario
// local, no por horas: el día 15 después del último respaldo ya avisa desde las 00:00.

import { diasEntre } from '../util/fechas';

export const DIAS_RECORDATORIO = 14;

/**
 * Verdadero si pasaron **más de 14 días** desde el último respaldo, o si nunca se respaldó y hay
 * al menos una prenda. Con el clóset vacío no hay nada que perder y no avisa.
 */
export function necesitaRecordatorio(ultimoRespaldo: number | undefined, hayPrendas: boolean, hoy: Date = new Date()): boolean {
  if (!hayPrendas) return false;
  if (ultimoRespaldo === undefined) return true;
  return diasEntre(ultimoRespaldo, hoy) > DIAS_RECORDATORIO;
}

/** "Tu último respaldo fue hace 3 semanas." (01b). Las otras variantes no están diseñadas. */
export function textoRecordatorio(ultimoRespaldo: number | undefined, hoy: Date = new Date()): string {
  if (ultimoRespaldo === undefined) return 'Todavía no tienes un respaldo de tu clóset.';
  const dias = diasEntre(ultimoRespaldo, hoy);
  let cuanto: string;
  if (dias >= 365) cuanto = 'más de un año';
  else if (dias >= 60) cuanto = `${Math.floor(dias / 30)} meses`;
  else if (dias >= 14) cuanto = `${Math.floor(dias / 7)} semanas`;
  else cuanto = dias === 1 ? '1 día' : `${dias} días`;
  return `Tu último respaldo fue hace ${cuanto}.`;
}
