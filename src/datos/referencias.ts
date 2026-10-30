// Referencias entre entidades (data-model.md): qué imágenes, prendas, maniquíes, siluetas y outfits
// nombra cada registro. Lo usan la verificación de integridad al arrancar y la validación de un
// respaldo antes de importarlo, para que las dos apliquen exactamente las mismas reglas.

import { esSiluetaIncluida, type Calendario, type Maniqui, type Outfit, type Prenda } from './tipos';

export interface Referencia {
  tabla: string;
  id: string;
  campo: string;
  ref: string;
}

export interface TablasConReferencias {
  prendas: readonly Prenda[];
  maniquies: readonly Maniqui[];
  outfits: readonly Outfit[];
  calendario: readonly Calendario[];
  idsImagenes: ReadonlySet<string>;
  /** Solo las importadas: las incluidas viven en el código. */
  idsSiluetas: ReadonlySet<string>;
}

export function imagenesDePrenda(p: Prenda): [campo: string, id: string][] {
  const refs: [string, string][] = [
    ['imagen.recorteId', p.imagen.recorteId],
    ['imagen.miniaturaId', p.imagen.miniaturaId],
  ];
  if (p.imagen.originalId) refs.push(['imagen.originalId', p.imagen.originalId]);
  p.historialImagenes.forEach((h, i) => {
    refs.push([`historialImagenes[${i}].recorteId`, h.recorteId], [`historialImagenes[${i}].miniaturaId`, h.miniaturaId]);
  });
  p.costura?.fotosProcesoIds.forEach((id, i) => refs.push([`costura.fotosProcesoIds[${i}]`, id]));
  if (p.planeada) refs.push(['planeada.telaFotoId', p.planeada.telaFotoId]);
  return refs;
}

/**
 * Las imágenes referenciadas y las referencias rotas. `usosDia` no se revisa: es historia y puede
 * nombrar prendas u outfits que ya no existen.
 */
export function revisarReferencias(t: TablasConReferencias): { referenciadas: Set<string>; rotas: Referencia[] } {
  const idsPrendas = new Set(t.prendas.map((p) => p.id));
  const idsManiquies = new Set(t.maniquies.map((m) => m.id));
  const idsOutfits = new Set(t.outfits.map((o) => o.id));
  const referenciadas = new Set<string>();
  const rotas: Referencia[] = [];
  const imagen = (tabla: string, id: string, campo: string, ref: string) => {
    referenciadas.add(ref);
    if (!t.idsImagenes.has(ref)) rotas.push({ tabla, id, campo, ref });
  };

  for (const p of t.prendas) {
    for (const [campo, ref] of imagenesDePrenda(p)) imagen('prendas', p.id, campo, ref);
    const silueta = p.planeada?.siluetaId;
    if (silueta && !esSiluetaIncluida(silueta) && !t.idsSiluetas.has(silueta)) {
      rotas.push({ tabla: 'prendas', id: p.id, campo: 'planeada.siluetaId', ref: silueta });
    }
  }

  for (const m of t.maniquies) {
    imagen('maniquies', m.id, 'imagenId', m.imagenId);
    imagen('maniquies', m.id, 'miniaturaId', m.miniaturaId);
  }

  for (const o of t.outfits) {
    if (o.miniaturaId) imagen('outfits', o.id, 'miniaturaId', o.miniaturaId);
    if (o.maniquiId !== null && !idsManiquies.has(o.maniquiId)) {
      rotas.push({ tabla: 'outfits', id: o.id, campo: 'maniquiId', ref: o.maniquiId });
    }
    o.capas.forEach((c, i) => {
      if (!idsPrendas.has(c.prendaId)) {
        rotas.push({ tabla: 'outfits', id: o.id, campo: `capas[${i}].prendaId`, ref: c.prendaId });
      }
    });
  }

  for (const c of t.calendario) {
    if (!idsOutfits.has(c.outfitId)) {
      rotas.push({ tabla: 'calendario', id: c.fecha, campo: 'outfitId', ref: c.outfitId });
    }
  }

  return { referenciadas, rotas };
}
