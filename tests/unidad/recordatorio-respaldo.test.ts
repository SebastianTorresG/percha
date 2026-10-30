import { describe, expect, it } from 'vitest';
import { necesitaRecordatorio, textoRecordatorio } from '../../src/respaldo/recordatorio';

const dia = (a: number, m: number, d: number, h = 12) => new Date(a, m - 1, d, h).getTime();

describe('necesitaRecordatorio (FR-005)', () => {
  const hoy = new Date(2026, 9, 26, 9, 30);

  it('es falso a los 14 días exactos y verdadero desde el día 15, por día del calendario', () => {
    expect(necesitaRecordatorio(dia(2026, 10, 12, 23), true, hoy)).toBe(false);
    expect(necesitaRecordatorio(dia(2026, 10, 11, 23), true, hoy)).toBe(true);
    // A las 00:01 del día 15 ya cuenta, aunque no hayan pasado 15 × 24 horas.
    expect(necesitaRecordatorio(dia(2026, 10, 11, 23), true, new Date(2026, 9, 26, 0, 1))).toBe(true);
    expect(necesitaRecordatorio(dia(2026, 10, 25), true, hoy)).toBe(false);
  });

  it('si nunca se respaldó, avisa solo si hay al menos una prenda', () => {
    expect(necesitaRecordatorio(undefined, true, hoy)).toBe(true);
    expect(necesitaRecordatorio(undefined, false, hoy)).toBe(false);
  });

  it('con el clóset vacío no avisa', () => {
    expect(necesitaRecordatorio(dia(2026, 9, 1), false, hoy)).toBe(false);
  });
});

describe('textoRecordatorio (01b)', () => {
  const hoy = new Date(2026, 9, 26, 9, 30);

  it('dice hace cuántas semanas o meses fue el último respaldo', () => {
    expect(textoRecordatorio(dia(2026, 10, 11), hoy)).toBe('Tu último respaldo fue hace 2 semanas.');
    expect(textoRecordatorio(dia(2026, 10, 5), hoy)).toBe('Tu último respaldo fue hace 3 semanas.');
    expect(textoRecordatorio(dia(2026, 8, 28), hoy)).toBe('Tu último respaldo fue hace 8 semanas.');
    expect(textoRecordatorio(dia(2026, 8, 20), hoy)).toBe('Tu último respaldo fue hace 2 meses.');
    expect(textoRecordatorio(dia(2025, 9, 1), hoy)).toBe('Tu último respaldo fue hace más de un año.');
  });

  it('sin respaldo, invita a hacer el primero', () => {
    expect(textoRecordatorio(undefined, hoy)).toBe('Todavía no tienes un respaldo de tu clóset.');
  });
});
