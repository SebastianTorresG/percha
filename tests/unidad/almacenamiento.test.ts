import { afterEach, describe, expect, it, vi } from 'vitest';
import { estaPersistido, estimar, hayEspacioPara, pedirPersistencia } from '../../src/datos/almacenamiento';

function conStorage(storage: Partial<StorageManager> | undefined) {
  vi.stubGlobal('navigator', storage === undefined ? {} : { storage });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('pedirPersistencia', () => {
  it('llama a persist() y devuelve persisted()', async () => {
    const persist = vi.fn(async () => true);
    conStorage({ persist, persisted: async () => true });
    expect(await pedirPersistencia()).toBe(true);
    expect(persist).toHaveBeenCalledOnce();
  });

  it('devuelve false si WebKit no lo concede', async () => {
    conStorage({ persist: async () => false, persisted: async () => false });
    expect(await pedirPersistencia()).toBe(false);
  });

  it('devuelve null sin la API y no falla si persist() lanza', async () => {
    conStorage(undefined);
    expect(await pedirPersistencia()).toBeNull();
    conStorage({
      persist: async () => {
        throw new Error('SecurityError');
      },
    });
    expect(await pedirPersistencia()).toBeNull();
  });
});

describe('estaPersistido', () => {
  it('no pide persistencia', async () => {
    const persist = vi.fn(async () => true);
    conStorage({ persist, persisted: async () => false });
    expect(await estaPersistido()).toBe(false);
    expect(persist).not.toHaveBeenCalled();
  });
});

describe('estimar', () => {
  it('devuelve uso y cuota', async () => {
    conStorage({ estimate: async () => ({ usage: 100, quota: 1000 }) });
    expect(await estimar()).toEqual({ usado: 100, cuota: 1000 });
  });

  it('devuelve null sin la API, con datos incompletos o si falla', async () => {
    conStorage(undefined);
    expect(await estimar()).toBeNull();
    conStorage({ estimate: async () => ({ usage: 100 }) });
    expect(await estimar()).toBeNull();
    conStorage({
      estimate: async () => {
        throw new Error('fallo');
      },
    });
    expect(await estimar()).toBeNull();
  });
});

describe('hayEspacioPara', () => {
  it('deja un margen del 10 % de la cuota', async () => {
    conStorage({ estimate: async () => ({ usage: 800, quota: 1000 }) });
    expect(await hayEspacioPara(100)).toBe(true);
    expect(await hayEspacioPara(101)).toBe(false);
  });

  it('sin estimación no bloquea', async () => {
    conStorage(undefined);
    expect(await hayEspacioPara(10 ** 12)).toBe(true);
  });
});
