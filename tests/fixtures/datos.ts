// Constructores de entidades del esquema actual para las pruebas (T037), con imágenes PNG y JPEG
// pequeñas y reales (tests/fixtures/imagenes/). A diferencia de tests/fixtures/esquemas/vN/, estos
// siguen al modelo actual: cuando cambie el esquema, se actualizan.

import { db as dbApp, type PerchaDB } from '../../src/datos/db';
import {
  ID_AJUSTES,
  ID_MEDIDAS,
  ZONA_DE_CATEGORIA,
  idSiluetaIncluida,
  type Ajustes,
  type Calendario,
  type Capa,
  type Categoria,
  type Imagen,
  type Maniqui,
  type Medidas,
  type Outfit,
  type Prenda,
  type RespaldoAuto,
  type Silueta,
  type TipoImagen,
  type UsosDia,
} from '../../src/datos/tipos';
import { blobDe, fotoJpeg, mascaraPng, prendaPng, type ImagenFixture } from './imagenes/imagenes';

const AHORA = 1761400000000; // 2026-10-25, fijo para que las pruebas no dependan del reloj.

const FUENTE_DE_TIPO: Record<TipoImagen, ImagenFixture> = {
  original: fotoJpeg,
  recorte: prendaPng,
  miniatura: prendaPng,
  tela: fotoJpeg,
  proceso: fotoJpeg,
  maniqui: mascaraPng,
  maniquiMiniatura: mascaraPng,
  outfitMiniatura: prendaPng,
};

export function crearImagen(tipo: TipoImagen, parcial: Partial<Imagen> = {}): Imagen {
  const fuente = FUENTE_DE_TIPO[tipo];
  const blob = parcial.blob ?? blobDe(fuente);
  return {
    id: crypto.randomUUID(),
    tipo,
    blob,
    ancho: fuente.ancho,
    alto: fuente.alto,
    bytes: blob.size,
    creada: AHORA,
    ...parcial,
  };
}

export interface ConImagenes<T> {
  entidad: T;
  imagenes: Imagen[];
}

/** Prenda comprada del Clóset, con original, recorte y miniatura. */
export function crearPrenda(parcial: Partial<Prenda> = {}): ConImagenes<Prenda> {
  const original = crearImagen('original');
  const recorte = crearImagen('recorte');
  const miniatura = crearImagen('miniatura');
  const entidad: Prenda = {
    id: crypto.randomUUID(),
    nombre: 'Blusa de lino',
    categoria: 'top',
    color: { hex: '#b9776a' },
    temporadas: [],
    ocasiones: [],
    etiquetas: [],
    origen: 'comprada',
    enCloset: 1,
    imagen: { recorteId: recorte.id, miniaturaId: miniatura.id, originalId: original.id },
    historialImagenes: [{ tipo: 'foto', recorteId: recorte.id, miniaturaId: miniatura.id, fecha: AHORA }],
    usos: 0,
    creada: AHORA,
    actualizada: AHORA,
    ...parcial,
  };
  return { entidad, imagenes: [original, recorte, miniatura] };
}

/** Prenda "hecha por mí" con datos de costura y una foto del proceso (FR-018). */
export function crearPrendaHecha(parcial: Partial<Prenda> = {}): ConImagenes<Prenda> {
  const proceso = crearImagen('proceso');
  const { entidad, imagenes } = crearPrenda({
    nombre: 'Vestido de lino',
    categoria: 'vestido',
    origen: 'hecha',
    costura: {
      tela: 'Lino lavado',
      composicion: '100 % lino',
      molde: 'Propio',
      notas: 'Bies en el escote',
      fotosProcesoIds: [proceso.id],
    },
    ...parcial,
  });
  return { entidad, imagenes: [...imagenes, proceso] };
}

/** Prenda del Taller planeada o en proceso: imagen generada de la silueta con la tela, sin original. */
export function crearPlaneada(
  siluetaId: string,
  parcial: Partial<Prenda> = {},
  estado: 'planeada' | 'en_proceso' = 'planeada',
): ConImagenes<Prenda> {
  const tela = crearImagen('tela');
  const recorte = crearImagen('recorte');
  const miniatura = crearImagen('miniatura');
  const entidad: Prenda = {
    id: crypto.randomUUID(),
    nombre: 'Falda de cuadros',
    categoria: 'bottom',
    color: { hex: '#6b4f45' },
    temporadas: [],
    ocasiones: [],
    etiquetas: [],
    origen: 'hecha',
    costura: { molde: 'Burda 6/2025', fotosProcesoIds: [] },
    estadoTaller: estado,
    enCloset: 0,
    planeada: {
      telaFotoId: tela.id,
      siluetaId,
      estampado: { escala: 1, offsetX: 0, offsetY: 0 },
      sombreado: true,
    },
    imagen: { recorteId: recorte.id, miniaturaId: miniatura.id, anclaje: { cx: 0, cy: 0.62, alto: 0.4 } },
    historialImagenes: [{ tipo: 'silueta', recorteId: recorte.id, miniaturaId: miniatura.id, fecha: AHORA }],
    usos: 0,
    creada: AHORA,
    actualizada: AHORA,
    ...parcial,
  };
  return { entidad, imagenes: [tela, recorte, miniatura] };
}

/** Prenda del Taller terminada: foto real actual y la silueta en el historial (FR-053). */
export function crearTerminada(siluetaId: string, parcial: Partial<Prenda> = {}): ConImagenes<Prenda> {
  const planeada = crearPlaneada(siluetaId, { nombre: 'Blusa de algodón', categoria: 'top' });
  const original = crearImagen('original');
  const recorte = crearImagen('recorte');
  const miniatura = crearImagen('miniatura');
  const anterior = planeada.entidad;
  const entidad: Prenda = {
    ...anterior,
    estadoTaller: 'terminada',
    enCloset: 1,
    imagen: { recorteId: recorte.id, miniaturaId: miniatura.id, originalId: original.id },
    historialImagenes: [
      ...anterior.historialImagenes,
      { tipo: 'foto', recorteId: recorte.id, miniaturaId: miniatura.id, fecha: AHORA + 1000 },
    ],
    actualizada: AHORA + 1000,
    ...parcial,
  };
  return { entidad, imagenes: [...planeada.imagenes, original, recorte, miniatura] };
}

export function crearSiluetaImportada(parcial: Partial<Silueta> = {}): Silueta {
  return {
    id: crypto.randomUUID(),
    nombre: 'Falda lápiz',
    origen: 'importada',
    categoria: 'bottom',
    d: 'M60 130 L140 130 L146 280 L54 280 Z',
    caja: { x: 54, y: 130, ancho: 92, alto: 150 },
    creada: AHORA,
    ...parcial,
  };
}

export function crearManiqui(parcial: Partial<Maniqui> = {}): ConImagenes<Maniqui> {
  const imagen = crearImagen('maniqui');
  const miniatura = crearImagen('maniquiMiniatura');
  const entidad: Maniqui = {
    id: crypto.randomUUID(),
    nombre: 'Maniquí 1',
    imagenId: imagen.id,
    miniaturaId: miniatura.id,
    cuerpo: { x: 6, y: 6, ancho: 36, alto: 52 },
    principal: 1,
    creado: AHORA,
    ...parcial,
  };
  return { entidad, imagenes: [imagen, miniatura] };
}

const AUTOMATICA: Record<Capa['zona'], { cy: number; alto: number }> = {
  arriba: { cy: 0.32, alto: 0.3 },
  abajo: { cy: 0.66, alto: 0.44 },
  vestido: { cy: 0.5, alto: 0.58 },
  calzado: { cy: 0.965, alto: 0.07 },
  abrigo: { cy: 0.38, alto: 0.42 },
  accesorios: { cy: 0.22, alto: 0.1 },
};

/** Outfit con una capa por prenda en su zona y posición automática (data-model.md, *Colocación automática*). */
export function crearOutfit(prendas: readonly Prenda[], maniquiId: string | null, parcial: Partial<Outfit> = {}): ConImagenes<Outfit> {
  const miniatura = crearImagen('outfitMiniatura');
  const capas: Capa[] = prendas.map((p) => {
    const zona = ZONA_DE_CATEGORIA[p.categoria];
    const t = p.imagen.anclaje ?? AUTOMATICA[zona];
    return { prendaId: p.id, zona, t: { cx: 0, cy: t.cy, alto: t.alto, rotacion: 0 } };
  });
  const entidad: Outfit = {
    id: crypto.randomUUID(),
    nombre: 'Domingo',
    etiquetas: ['casual'],
    maniquiId,
    capas,
    prendaIds: capas.map((c) => c.prendaId),
    miniaturaId: miniatura.id,
    creado: AHORA,
    actualizado: AHORA,
    ...parcial,
  };
  return { entidad, imagenes: [miniatura] };
}

const MEDIDAS_COMUNES = [
  ['busto', 'Busto'],
  ['bajo-busto', 'Bajo busto'],
  ['cintura', 'Cintura'],
  ['cadera', 'Cadera'],
  ['talle-delantero', 'Largo de talle delantero'],
  ['talle-trasero', 'Largo de talle trasero'],
  ['espalda', 'Ancho de espalda'],
  ['largo-brazo', 'Largo de brazo'],
  ['contorno-brazo', 'Contorno de brazo'],
  ['largo-pierna', 'Largo de pierna'],
  ['altura', 'Altura'],
] as const;

export function crearMedidas(parcial: Partial<Medidas> = {}): Medidas {
  return {
    id: ID_MEDIDAS,
    campos: [
      ...MEDIDAS_COMUNES.map(([id, nombre], orden) => ({
        id,
        nombre,
        valorCm: orden < 4 ? 80 + orden * 4.5 : null,
        personalizada: false,
        orden,
      })),
      { id: crypto.randomUUID(), nombre: 'Largo de falda', valorCm: 62, personalizada: true, orden: MEDIDAS_COMUNES.length },
    ],
    actualizado: '2026-10-03',
    ...parcial,
  };
}

export function crearAjustes(parcial: Partial<Ajustes> = {}): Ajustes {
  return {
    id: ID_AJUSTES,
    apariencia: 'sistema',
    onboarding: 'completo',
    chipArmadorVisto: 1,
    ultimoRespaldo: AHORA - 86400000,
    dedicatoria: { nombre: 'Sofi', texto: 'Para que veas todo lo que ya tienes.' },
    ultimaCategoria: 'top' satisfies Categoria,
    ...parcial,
  };
}

export interface Conjunto {
  prendas: Prenda[];
  imagenes: Imagen[];
  siluetas: Silueta[];
  maniquies: Maniqui[];
  outfits: Outfit[];
  calendario: Calendario[];
  usosDia: UsosDia[];
  medidas: Medidas[];
  ajustes: Ajustes[];
  respaldosAuto: RespaldoAuto[];
}

/**
 * Un conjunto completo y consistente (sin referencias rotas ni imágenes huérfanas): Clóset, hecha
 * por mí, Taller en los tres estados, silueta importada, dos maniquíes, outfits (uno con una
 * planeada), calendario, usos, medidas, ajustes y un respaldo automático.
 */
export function conjuntoCompleto(): Conjunto {
  const importada = crearSiluetaImportada();
  const blusa = crearPrenda({ nombre: 'Blusa de lino', categoria: 'top', usos: 3, ultimoUso: '2026-10-19', etiquetas: ['lino'] });
  const pantalon = crearPrenda({ nombre: 'Pantalón ancho', categoria: 'bottom', color: { hex: '#2b2b2b', nombre: 'negro' } });
  const tenis = crearPrenda({ nombre: 'Tenis blancos', categoria: 'calzado', color: { hex: '#f5f5f0', nombre: 'blanco' } });
  const vestido = crearPrendaHecha();
  const planeada = crearPlaneada(idSiluetaIncluida('falda-acampanada'));
  const enProceso = crearPlaneada(importada.id, { nombre: 'Falda lápiz de lana' }, 'en_proceso');
  const terminada = crearTerminada(idSiluetaIncluida('blusa'));
  const principal = crearManiqui({ nombre: 'Con tenis' });
  const otro = crearManiqui({ nombre: 'Con botas', principal: 0, creado: AHORA + 5000 });
  const look = crearOutfit([pantalon.entidad, blusa.entidad, tenis.entidad], principal.entidad.id, { nombre: 'Domingo' });
  const prueba = crearOutfit([planeada.entidad, terminada.entidad], otro.entidad.id, { nombre: 'Prueba de falda', etiquetas: [] });
  const zip = blobDe(prendaPng);

  const conImagenes = [blusa, pantalon, tenis, vestido, planeada, enProceso, terminada];
  return {
    prendas: conImagenes.map((c) => c.entidad),
    imagenes: [...conImagenes, principal, otro, look, prueba].flatMap((c) => c.imagenes),
    siluetas: [importada],
    maniquies: [principal.entidad, otro.entidad],
    outfits: [look.entidad, prueba.entidad],
    calendario: [
      { fecha: '2026-10-25', outfitId: look.entidad.id },
      { fecha: '2026-10-27', outfitId: prueba.entidad.id },
    ],
    usosDia: [{ fecha: '2026-10-19', outfitId: look.entidad.id, prendaIds: [blusa.entidad.id] }],
    medidas: [crearMedidas()],
    ajustes: [crearAjustes()],
    respaldosAuto: [{ id: crypto.randomUUID(), creado: AHORA, motivo: 'antes_de_importar', blob: zip, bytes: zip.size }],
  };
}

/** Escribe un conjunto en una sola transacción. */
export async function sembrar(conjunto: Partial<Conjunto>, base: PerchaDB = dbApp): Promise<void> {
  await base.transaction('rw', base.tables, async () => {
    for (const [tabla, filas] of Object.entries(conjunto)) {
      if (filas) await base.table(tabla).bulkPut(filas);
    }
  });
}
