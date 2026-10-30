/**
 * Contrato del Armador — Percha
 *
 * Fuente: plan.md, research.md R-5 y R-15, data-model.md (Transformacion, Anclaje).
 * Es un contrato de diseño, no código de producción: fija los tipos y las responsabilidades
 * para que el MVP (`RendererZonasFijas`) y la v2 (`RendererPose`, MediaPipe Pose Landmarker)
 * sean intercambiables sin tocar el Armador, Hoy, Mis outfits ni el formato de los outfits.
 */

export type Zona = 'arriba' | 'abajo' | 'vestido' | 'calzado' | 'abrigo' | 'accesorios';

/** Rectángulo en píxeles de una imagen o del lienzo. */
export interface Rect {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

/**
 * Posición de una prenda en unidades del cuerpo (FR-034).
 * - cx: centro horizontal, fracción del ALTO del cuerpo desde su eje central (0 = centrado).
 * - cy: centro vertical, fracción del alto del cuerpo desde su borde superior (0 = cabeza, 1 = pies).
 * - alto: alto de la prenda como fracción del alto del cuerpo.
 * - rotacion: grados, sentido horario.
 */
export interface Transformacion {
  cx: number;
  cy: number;
  alto: number;
  rotacion: number;
}

/**
 * Lo único que el Armador sabe de una prenda (FR-035): una imagen con transparencia y metadatos.
 * No sabe si es una foto recortada o una silueta rellena con tela, ni si la prenda es planeada.
 * La marca "planeada" del carrusel la decide la interfaz con `etiqueta`, no el renderer.
 */
export interface ImagenArmable {
  prendaId: string;
  /** URL de objeto del PNG recortado a su contorno opaco. */
  url: string;
  anchoPx: number;
  altoPx: number;
  /** Solo en imágenes generadas desde una silueta: posición exacta sobre la retícula. */
  anclaje?: Pick<Transformacion, 'cx' | 'cy' | 'alto'>;
  /** Para la interfaz (carrusel, accesibilidad). El renderer no lo usa. */
  etiqueta?: 'planeada' | 'en_proceso' | 'hecha';
  /** Usos de la prenda; lo usa Mezclar para priorizar las de poco uso (FR-033). */
  usos: number;
}

/** El cuerpo de un maniquí, o el cuerpo por defecto cuando no hay maniquí (FR-021). */
export interface Cuerpo {
  /** Rectángulo de los píxeles opacos de la foto del maniquí, en píxeles de esa imagen. */
  rectEnImagen: Rect;
  /** Tamaño completo de la imagen del maniquí; null si es el cuerpo por defecto. */
  imagen: { url: string; anchoPx: number; altoPx: number } | null;
}

/** Matriz afín 2D (como DOMMatrix 2D): x' = a·x + c·y + e ; y' = b·x + d·y + f. */
export interface Matriz2D {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export interface CapaArmada {
  imagen: ImagenArmable;
  zona: Zona;
  t: Transformacion;
}

export interface TryOnRenderer {
  /** Identificador para el panel de diagnóstico: 'zonas-fijas' (MVP) o 'pose' (v2). */
  readonly id: string;

  /**
   * Prepara el renderer para un maniquí. En el MVP solo guarda el cuerpo; en v2 puede
   * detectar la pose (una vez por maniquí) y cachear los puntos.
   */
  prepararCuerpo(cuerpo: Cuerpo): Promise<void>;

  /**
   * Transformación automática de una prenda en una zona (FR-030).
   * Si la imagen trae `anclaje`, se usa tal cual (con rotacion 0).
   * Es determinista: misma entrada, misma salida (lo usa "Restablecer posición").
   */
  colocacionAutomatica(imagen: ImagenArmable, zona: Zona): Transformacion;

  /** Rango permitido de `alto` para el gesto de escala: 0,5× a 2,5× del alto automático (FR-032). */
  rangoAlto(imagen: ImagenArmable, zona: Zona): { min: number; max: number };

  /**
   * Matriz que lleva la imagen (en sus píxeles, con origen en la esquina superior izquierda)
   * al lienzo (en píxeles CSS). El Armador la aplica como `transform: matrix(...)` en el <img>.
   */
  matrizEnLienzo(capa: CapaArmada, lienzo: { anchoPx: number; altoPx: number }): Matriz2D;

  /** Inversa para los gestos: un punto del lienzo → unidades del cuerpo. */
  lienzoACuerpo(
    punto: { x: number; y: number },
    lienzo: { anchoPx: number; altoPx: number },
  ): { cx: number; cy: number };

  /**
   * Dibuja el outfit en un canvas para su miniatura (Mis outfits, Calendario, hoja de asignar).
   * Aproxima el `cutoutFilter` del tema con shadowBlur/shadowColor, porque Safari no tiene
   * `ctx.filter` activo (research R-5).
   */
  renderizarMiniatura(
    capas: CapaArmada[],
    opciones: { anchoPx: number; altoPx: number; tema: 'claro' | 'oscuro' },
  ): Promise<Blob>;
}

/**
 * Reajuste al terminar una prenda del Taller (FR-053a), expuesto para probarlo aislado.
 * Con transformaciones en unidades del cuerpo y ambas imágenes recortadas a su contorno,
 * conserva cx, cy, alto y rotacion; el ancho sale de la proporción de la imagen nueva.
 * Debe devolver la misma transformación salvo por la referencia a la imagen.
 */
export type ReajustarAlTerminar = (
  anterior: Transformacion,
  imagenSilueta: ImagenArmable,
  imagenFoto: ImagenArmable,
) => Transformacion;

/**
 * Gestos (módulo de matemática pura, sin DOM). Recibe los punteros activos y devuelve la
 * transformación nueva. Ignora los punteros que empiezan a menos de 20 px de un borde del
 * lienzo (FR-032).
 */
export interface EstadoGesto {
  inicio: Transformacion;
  punterosInicio: { id: number; x: number; y: number }[];
}

export type AplicarGesto = (
  estado: EstadoGesto,
  punterosActuales: { id: number; x: number; y: number }[],
  renderer: TryOnRenderer,
  capa: CapaArmada,
  lienzo: { anchoPx: number; altoPx: number },
) => Transformacion;
