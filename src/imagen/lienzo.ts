// Canvas que sirve en la página y en un worker. En la página se usa HTMLCanvasElement: el WebKit de
// Playwright en Windows no tiene OffscreenCanvas y así las pruebas de navegador cubren el mismo
// código que corre en Safari (research R-14). En un worker no hay document y se usa OffscreenCanvas.

export type Lienzo = HTMLCanvasElement | OffscreenCanvas;
export type Contexto2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function crearLienzo(ancho: number, alto: number): Lienzo {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;
    return canvas;
  }
  return new OffscreenCanvas(ancho, alto);
}

export function contexto2D(lienzo: Lienzo, opciones?: CanvasRenderingContext2DSettings): Contexto2D {
  const ctx = lienzo.getContext('2d', opciones) as Contexto2D | null;
  if (!ctx) throw new Error('No se pudo crear el contexto 2D del canvas');
  return ctx;
}

export function aBlob(lienzo: Lienzo, tipo: 'image/png' | 'image/jpeg', calidad?: number): Promise<Blob> {
  if ('convertToBlob' in lienzo) return lienzo.convertToBlob({ type: tipo, quality: calidad });
  return new Promise((resolver, rechazar) => {
    lienzo.toBlob(
      (blob) => (blob ? resolver(blob) : rechazar(new Error('El canvas no se pudo codificar'))),
      tipo,
      calidad,
    );
  });
}
