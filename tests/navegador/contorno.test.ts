import { describe, expect, it } from 'vitest';
import { cobertura, recortarAlContorno, rectOpaco } from '../../src/imagen/contorno';

function lienzo(ancho: number, alto: number, dibujar?: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext('2d')!;
  dibujar?.(ctx);
  return canvas;
}

function datos(canvas: HTMLCanvasElement) {
  return canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
}

describe('rectOpaco', () => {
  it('devuelve el rectángulo exacto de los píxeles opacos', () => {
    const c = lienzo(40, 30, (ctx) => {
      ctx.fillStyle = '#000';
      ctx.fillRect(5, 7, 10, 12);
      ctx.fillRect(20, 3, 2, 2);
    });
    expect(rectOpaco(datos(c))).toEqual({ x: 5, y: 3, ancho: 17, alto: 16 });
  });

  it('devuelve null si todo es transparente', () => {
    expect(rectOpaco(datos(lienzo(10, 10)))).toBeNull();
  });

  it('ignora los píxeles con alfa por debajo del umbral', () => {
    const c = lienzo(20, 20, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, 0, 20, 20);
      ctx.fillStyle = '#000';
      ctx.fillRect(8, 8, 4, 4);
    });
    expect(rectOpaco(datos(c))).toEqual({ x: 8, y: 8, ancho: 4, alto: 4 });
    expect(rectOpaco(datos(c), 50)).toEqual({ x: 0, y: 0, ancho: 20, alto: 20 });
  });
});

describe('cobertura', () => {
  it('es la fracción de píxeles opacos', () => {
    const c = lienzo(10, 10, (ctx) => {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 5, 10);
    });
    expect(cobertura(datos(c))).toBeCloseTo(0.5, 5);
    expect(cobertura(datos(lienzo(10, 10)))).toBe(0);
  });
});

describe('recortarAlContorno', () => {
  it('devuelve un canvas nuevo del tamaño del contorno con los mismos píxeles', () => {
    const c = lienzo(50, 60, (ctx) => {
      ctx.fillStyle = '#b9776a';
      ctx.fillRect(10, 20, 15, 25);
    });
    const r = recortarAlContorno(c)!;
    expect(r.rect).toEqual({ x: 10, y: 20, ancho: 15, alto: 25 });
    expect(r.lienzo).not.toBe(c);
    expect([r.lienzo.width, r.lienzo.height]).toEqual([15, 25]);
    const ctx = r.lienzo.getContext('2d') as CanvasRenderingContext2D;
    expect([...ctx.getImageData(0, 0, 1, 1).data]).toEqual([0xb9, 0x77, 0x6a, 255]);
    expect([...ctx.getImageData(14, 24, 1, 1).data]).toEqual([0xb9, 0x77, 0x6a, 255]);
  });

  it('devuelve null si no hay nada opaco', () => {
    expect(recortarAlContorno(lienzo(10, 10))).toBeNull();
  });
});
