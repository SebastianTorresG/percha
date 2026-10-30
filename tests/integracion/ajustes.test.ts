import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/datos/db';
import { AJUSTES_POR_DEFECTO, CLAVE_APARIENCIA, actualizar, obtener } from '../../src/datos/repos/ajustes';

function localStorageFalso() {
  const datos = new Map<string, string>();
  return {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
    removeItem: (k: string) => void datos.delete(k),
    clear: () => datos.clear(),
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', localStorageFalso());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('repositorio de ajustes', () => {
  it('sin registro devuelve los valores por defecto y no escribe', async () => {
    expect(await obtener()).toEqual({
      id: 'ajustes',
      apariencia: 'sistema',
      onboarding: 'pendiente',
      chipArmadorVisto: 0,
    });
    expect(await db.ajustes.count()).toBe(0);
  });

  it('actualizar mezcla con lo guardado y conserva el resto', async () => {
    await actualizar({ onboarding: 'completo', dedicatoria: { nombre: 'Sofi' } });
    await actualizar({ chipArmadorVisto: 2 });
    expect(await obtener()).toEqual({
      ...AJUSTES_POR_DEFECTO,
      onboarding: 'completo',
      dedicatoria: { nombre: 'Sofi' },
      chipArmadorVisto: 2,
    });
    expect(await db.ajustes.count()).toBe(1);
  });

  it('al cambiar la apariencia la copia a localStorage para el script de tema', async () => {
    await actualizar({ apariencia: 'oscuro' });
    expect(localStorage.getItem(CLAVE_APARIENCIA)).toBe('oscuro');
    await actualizar({ apariencia: 'claro' });
    expect(localStorage.getItem(CLAVE_APARIENCIA)).toBe('claro');
  });

  it('no toca localStorage si la apariencia no cambia', async () => {
    const espia = vi.spyOn(localStorage, 'setItem');
    await actualizar({ ultimoRespaldo: 1 });
    expect(espia).not.toHaveBeenCalled();
  });

  it('si localStorage falla, igual guarda la apariencia en la base', async () => {
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    });
    await actualizar({ apariencia: 'oscuro' });
    expect((await obtener()).apariencia).toBe('oscuro');
  });
});
