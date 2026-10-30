import { describe, expect, it } from 'vitest';
import { aFecha, fechaLocal, formatearDiaMes, formatearFechaLarga } from '../../src/util/fechas';

describe('fechas', () => {
  it('fechaLocal usa el día local, no UTC', () => {
    expect(fechaLocal(new Date(2026, 9, 3, 23, 59))).toBe('2026-10-03');
    expect(fechaLocal(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });

  it('aFecha lee YYYY-MM-DD como medianoche local', () => {
    const fecha = aFecha('2026-10-19');
    expect([fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), fecha.getHours()]).toEqual([2026, 9, 19, 0]);
  });

  it('formatea como el diseño', () => {
    expect(formatearDiaMes('2026-10-03')).toBe('3 de octubre');
    expect(formatearFechaLarga('2026-10-19')).toBe('Lunes 19 de octubre');
    expect(formatearDiaMes(new Date(2026, 9, 2, 15).getTime())).toBe('2 de octubre');
  });
});
