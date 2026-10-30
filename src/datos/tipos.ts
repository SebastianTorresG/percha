// Tipos de las entidades de la base `percha`, esquema v1 (specs/001-percha-closet-taller/data-model.md).
// Las reglas de cada campo se copian del modelo de datos; si cambian, se cambian allá primero.
//
// Convenciones (data-model.md, *Convenciones*):
// - IDs: string con crypto.randomUUID(); las siluetas incluidas usan `incluida:<archivo>`.
// - Fechas de calendario: string local `YYYY-MM-DD`. Marcas de tiempo: milisegundos (Date.now()).
// - Booleanos indexados: 0 | 1, porque IndexedDB no indexa boolean.
// - Imágenes: nunca dentro de una entidad; las entidades guardan IDs de la tabla `imagenes`.
// - Posiciones en outfits: en unidades del cuerpo del maniquí (FR-034), ver Transformacion.

/** Versión del esquema que escribe esta versión de la app. */
export const ESQUEMA_ACTUAL = 1;

/** `YYYY-MM-DD` en la zona horaria local. */
export type FechaLocal = string;

export type Categoria = 'top' | 'bottom' | 'vestido' | 'calzado' | 'abrigo' | 'accesorio';

export const CATEGORIAS: readonly Categoria[] = [
  'top',
  'bottom',
  'vestido',
  'calzado',
  'abrigo',
  'accesorio',
];

export type Zona = 'arriba' | 'abajo' | 'vestido' | 'calzado' | 'abrigo' | 'accesorios';

export const ZONAS: readonly Zona[] = ['arriba', 'abajo', 'vestido', 'calzado', 'abrigo', 'accesorios'];

/** Zona del Armador que ocupa cada categoría. Una capa por zona, salvo `accesorios` (FR-031). */
export const ZONA_DE_CATEGORIA: Readonly<Record<Categoria, Zona>> = {
  top: 'arriba',
  bottom: 'abajo',
  vestido: 'vestido',
  calzado: 'calzado',
  abrigo: 'abrigo',
  accesorio: 'accesorios',
};

export type Origen = 'comprada' | 'hecha';

export type EstadoTaller = 'planeada' | 'en_proceso' | 'terminada';

// ---------------------------------------------------------------------------------------------
// Prenda
// ---------------------------------------------------------------------------------------------

/**
 * Una sola entidad para la ropa comprada, la hecha por ella y las prendas del Taller. Así una
 * prenda planeada que se termina conserva su `id` y los outfits que la usan no cambian (FR-053).
 */
export interface Prenda {
  id: string;
  /** Opcional (FR-013). */
  nombre?: string;
  categoria: Categoria;
  /** `hex` sugerido = promedio de los píxeles con alfa > 0,5 (FR-014). */
  color: { hex: string; nombre?: string };
  /** Puede estar vacío. */
  temporadas: string[];
  /** Puede estar vacío. */
  ocasiones: string[];
  /** Libres, sin repetidas, recortadas y en minúsculas para comparar. */
  etiquetas: string[];
  /** `'hecha'` si está marcada "hecha por mí" o viene del Taller. */
  origen: Origen;
  /** Obligatorio si `origen = 'hecha'` (puede tener campos vacíos). */
  costura?: DatosCostura;
  /** Solo si nació en el Taller. */
  estadoTaller?: EstadoTaller;
  /** `1` si `estadoTaller` es nulo o `'terminada'`; `0` si está planeada o en proceso. */
  enCloset: 0 | 1;
  /** Obligatorio si nació en el Taller (se conserva al terminar, como historia). */
  planeada?: ParametrosPlaneada;
  /** La imagen actual que usa el Armador. */
  imagen: ImagenesPrenda;
  /** Se agrega una entrada cada vez que cambia `imagen`. */
  historialImagenes: EntradaHistorial[];
  /** ≥ 0 (FR-017). */
  usos: number;
  ultimoUso?: FechaLocal;
  creada: number;
  actualizada: number;
}

export interface ImagenesPrenda {
  /** PNG con alfa, recortado al contorno opaco, ≤ 1200 px de lado mayor. */
  recorteId: string;
  /** PNG, ≤ 360 px de lado mayor. */
  miniaturaId: string;
  /** JPEG ≤ 1500 px (FR-012a); falta solo en prendas planeadas sin foto real. */
  originalId?: string;
  /** Solo en imágenes generadas desde una silueta. */
  anclaje?: Anclaje;
}

/** Para que el Armador coloque una prenda planeada exactamente sobre la retícula. */
export interface Anclaje {
  /** En unidades del cuerpo (ver Transformacion), calculadas del rectángulo de la silueta en la retícula 200 × 400. */
  cx: number;
  cy: number;
  alto: number;
}

/**
 * Al terminar una prenda del Taller, la imagen de la silueta no se borra: queda en el historial y
 * va en el respaldo.
 */
export interface EntradaHistorial {
  tipo: 'silueta' | 'foto';
  recorteId: string;
  miniaturaId: string;
  fecha: number;
}

/** FR-018; compartidos por las prendas hechas y las del Taller. */
export interface DatosCostura {
  tela?: string;
  composicion?: string;
  molde?: string;
  notas?: string;
  /** IDs de imágenes de tipo `proceso`. */
  fotosProcesoIds: string[];
}

/** FR-050, FR-051. */
export interface ParametrosPlaneada {
  /** ID de una imagen de tipo `tela`. */
  telaFotoId: string;
  /** Debe existir; la silueta no se puede borrar mientras esté en uso. */
  siluetaId: string;
  /**
   * `escala` 0,25–4 (1 = la foto de la tela ocupa el ancho de la retícula); offsets en unidades de
   * la retícula, en módulo del tamaño del mosaico.
   */
  estampado: { escala: number; offsetX: number; offsetY: number };
  /** "Sombreado suave" (por defecto `true`). */
  sombreado: boolean;
}

// ---------------------------------------------------------------------------------------------
// Imagen
// ---------------------------------------------------------------------------------------------

export type TipoImagen =
  | 'original'
  | 'recorte'
  | 'miniatura'
  | 'tela'
  | 'proceso'
  | 'maniqui'
  | 'maniquiMiniatura'
  | 'outfitMiniatura';

export const TIPOS_IMAGEN: readonly TipoImagen[] = [
  'original',
  'recorte',
  'miniatura',
  'tela',
  'proceso',
  'maniqui',
  'maniquiMiniatura',
  'outfitMiniatura',
];

export type FormatoImagen = 'image/png' | 'image/jpeg';

export const FORMATOS_IMAGEN: readonly FormatoImagen[] = ['image/png', 'image/jpeg'];

/**
 * Ninguna imagen queda huérfana: los repositorios borran las imágenes de una entidad en la misma
 * transacción que la entidad. La verificación de integridad las cuenta y no las borra sola.
 */
export interface Imagen {
  id: string;
  tipo: TipoImagen;
  /** `image/png` o `image/jpeg`. */
  blob: Blob;
  /** Píxeles. */
  ancho: number;
  alto: number;
  /** Para mostrar el espacio usado. */
  bytes: number;
  creada: number;
}

// ---------------------------------------------------------------------------------------------
// Silueta (FR-050, FR-050a)
// ---------------------------------------------------------------------------------------------

/** Archivos de las 8 siluetas del diseño (public/siluetas/*.svg). */
export const SILUETAS_INCLUIDAS = [
  'falda-recta',
  'falda-acampanada',
  'blusa',
  'camisa',
  'vestido-recto',
  'vestido-vuelo',
  'pantalon-recto',
  'pantalon-ancho',
] as const;

export type ArchivoSiluetaIncluida = (typeof SILUETAS_INCLUIDAS)[number];

export const PREFIJO_SILUETA_INCLUIDA = 'incluida:';

export function idSiluetaIncluida(archivo: ArchivoSiluetaIncluida): string {
  return `${PREFIJO_SILUETA_INCLUIDA}${archivo}`;
}

export function esSiluetaIncluida(id: string): boolean {
  return (
    id.startsWith(PREFIJO_SILUETA_INCLUIDA) &&
    (SILUETAS_INCLUIDAS as readonly string[]).includes(id.slice(PREFIJO_SILUETA_INCLUIDA.length))
  );
}

/** Rectángulo en la retícula `0 0 200 400` o en píxeles, según el campo. */
export interface Rect {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

/**
 * Las 8 incluidas no se guardan en la base: viven en el código de la app. Solo las importadas van
 * en la tabla y en el respaldo. v2 agrega `origen: 'dibujada'` y un campo opcional `edicion`
 * (migración aditiva).
 */
export interface Silueta {
  /** `incluida:<archivo>` o UUID. */
  id: string;
  nombre: string;
  origen: 'incluida' | 'importada';
  /** La eligen al importar; las incluidas la traen fija. */
  categoria: Categoria;
  /** Path normalizado en la retícula `0 0 200 400`, cerrado. */
  d: string;
  /** Rectángulo del contorno en la retícula; sirve para recortar el PNG, las miniaturas y el Anclaje. */
  caja: Rect;
  creada: number;
}

// ---------------------------------------------------------------------------------------------
// Maniquí (FR-020, FR-021)
// ---------------------------------------------------------------------------------------------

/**
 * Invariante: si hay al menos un maniquí, exactamente uno es principal. Al crear el primero,
 * queda como principal. Al borrar el principal, pasa a serlo el más reciente de los que quedan.
 */
export interface Maniqui {
  id: string;
  /** Por defecto "Maniquí N". */
  nombre: string;
  /** Imagen de tipo `maniqui`: PNG con alfa, ≤ 1600 px de alto. */
  imagenId: string;
  /** Imagen de tipo `maniquiMiniatura`. */
  miniaturaId: string;
  /** Rectángulo de los píxeles opacos de la foto, en píxeles de la imagen; se calcula al guardar. */
  cuerpo: Rect;
  principal: 0 | 1;
  creado: number;
}

// ---------------------------------------------------------------------------------------------
// Outfit (FR-034, FR-036)
// ---------------------------------------------------------------------------------------------

export interface Outfit {
  id: string;
  nombre?: string;
  etiquetas: string[];
  /**
   * `null` si se borró el último maniquí: el Armador usa un cuerpo por defecto (rectángulo
   * centrado de 90 % del alto del lienzo) hasta que exista uno nuevo.
   */
  maniquiId: string | null;
  /** Ordenadas de abajo hacia arriba; el índice es el orden de capa. */
  capas: Capa[];
  /** Derivado de `capas`, solo para el índice multivalor. */
  prendaIds: string[];
  /** Imagen de tipo `outfitMiniatura`; se regenera cuando cambian sus capas, su maniquí o la imagen de una de sus prendas. */
  miniaturaId?: string;
  creado: number;
  actualizado: number;
}

export interface Capa {
  /** Debe existir. */
  prendaId: string;
  /** Una capa por zona, salvo `accesorios` (FR-031). */
  zona: Zona;
  t: Transformacion;
}

/**
 * Unidades del cuerpo. Se usa el alto del cuerpo también para `cx` para que la escala sea
 * uniforme: un outfit se ve proporcionado en un maniquí más ancho o más angosto.
 */
export interface Transformacion {
  /** Centro horizontal, como fracción del alto del cuerpo, desde el eje central del cuerpo (0 = centrado). */
  cx: number;
  /** Centro vertical, como fracción del alto del cuerpo desde su borde superior (0 = cabeza, 1 = pies). */
  cy: number;
  /** Alto de la prenda como fracción del alto del cuerpo. */
  alto: number;
  /** Grados, sentido horario. */
  rotacion: number;
}

// ---------------------------------------------------------------------------------------------
// Calendario y usos
// ---------------------------------------------------------------------------------------------

/** FR-040. Un día tiene como máximo un outfit; al borrar el outfit se borran sus días. */
export interface Calendario {
  fecha: FechaLocal;
  outfitId: string;
}

/**
 * FR-042. "Lo usé hoy" suma 1 a `usos` y fija `ultimoUso = hoy` solo para las prendas que no
 * estén ya en `prendaIds` de hoy, y las agrega: tocarlo dos veces el mismo día cuenta una vez.
 */
export interface UsosDia {
  fecha: FechaLocal;
  /** El outfit marcado ese día. */
  outfitId?: string;
  /** Prendas ya contadas ese día. */
  prendaIds: string[];
}

// ---------------------------------------------------------------------------------------------
// Medidas (FR-060)
// ---------------------------------------------------------------------------------------------

export const ID_MEDIDAS = 'perfil';

export interface CampoMedida {
  id: string;
  nombre: string;
  /** > 0 con un decimal; `null` si no se midió. */
  valorCm: number | null;
  personalizada: boolean;
  orden: number;
}

/** Un solo registro `id = 'perfil'`. Solo el valor actual (Assumptions). */
export interface Medidas {
  id: typeof ID_MEDIDAS;
  /** Los 11 comunes vienen precargados con `valorCm = null`. */
  campos: CampoMedida[];
  /** Cambia a hoy cada vez que se edita un valor. */
  actualizado?: FechaLocal;
}

// ---------------------------------------------------------------------------------------------
// Ajustes
// ---------------------------------------------------------------------------------------------

export const ID_AJUSTES = 'ajustes';

export type Apariencia = 'sistema' | 'claro' | 'oscuro';

/** Un solo registro `id = 'ajustes'`. */
export interface Ajustes {
  id: typeof ID_AJUSTES;
  /** Por defecto `'sistema'`; se copia a localStorage para el script de tema (research R-12). */
  apariencia: Apariencia;
  /** Se fija al exportar con éxito. */
  ultimoRespaldo?: number;
  /** Onboarding. */
  dedicatoria?: { nombre?: string; texto?: string };
  onboarding: 'pendiente' | 'completo';
  /** Veces que se mostró "Vista collage…"; se deja de mostrar en 3. */
  chipArmadorVisto: number;
  /** Base de la sugerencia simple de categoría (Assumptions). */
  ultimaCategoria?: Categoria;
}

// ---------------------------------------------------------------------------------------------
// RespaldoAuto (FR-003)
// ---------------------------------------------------------------------------------------------

/**
 * Se guarda solo el más reciente y no se incluye en el respaldo exportado. Antes de crearlo se
 * compara con storage.estimate(): si no hay espacio, se pide primero exportar a Archivos.
 */
export interface RespaldoAuto {
  id: string;
  creado: number;
  motivo: 'antes_de_importar';
  /** El ZIP completo, en el mismo formato que el respaldo exportado. */
  blob: Blob;
  bytes: number;
}
