// Fixture **congelado** del esquema v1 (data-model.md). No se actualiza cuando cambie el modelo:
// es lo que tiene en el teléfono quien instaló la v1, y la v2 lo usará como entrada de su
// migración (ver tests/fixtures/esquemas/index.ts). Cubre todas las tablas, con imágenes reales.

import type { Registros } from '../../../../src/datos/migraciones';
import { blobDe, fotoJpeg, mascaraPng, prendaPng } from '../../imagenes/imagenes';

export const version = 1;

function imagen(id: string, tipo: string, fuente: typeof prendaPng) {
  const blob = blobDe(fuente);
  return { id, tipo, blob, ancho: fuente.ancho, alto: fuente.alto, bytes: blob.size, creada: 1760000000000 };
}

export function datos(): Registros {
  return {
    prendas: [
      {
        id: 'p-blusa',
        nombre: 'Blusa de lino',
        categoria: 'top',
        color: { hex: '#b9776a', nombre: 'terracota' },
        temporadas: ['verano'],
        ocasiones: ['diario'],
        etiquetas: ['lino', 'favorita'],
        origen: 'comprada',
        enCloset: 1,
        imagen: { recorteId: 'i-blusa-recorte', miniaturaId: 'i-blusa-mini', originalId: 'i-blusa-original' },
        historialImagenes: [
          { tipo: 'foto', recorteId: 'i-blusa-recorte', miniaturaId: 'i-blusa-mini', fecha: 1760000000000 },
        ],
        usos: 3,
        ultimoUso: '2026-10-19',
        creada: 1760000000000,
        actualizada: 1760000000000,
      },
      {
        id: 'p-falda',
        nombre: 'Falda de cuadros',
        categoria: 'bottom',
        color: { hex: '#6b4f45' },
        temporadas: [],
        ocasiones: [],
        etiquetas: [],
        origen: 'hecha',
        costura: { tela: 'Lana a cuadros', molde: 'Burda 6/2025', fotosProcesoIds: ['i-falda-proceso'] },
        estadoTaller: 'en_proceso',
        enCloset: 0,
        planeada: {
          telaFotoId: 'i-falda-tela',
          siluetaId: 's-importada',
          estampado: { escala: 1.5, offsetX: 4, offsetY: -2 },
          sombreado: true,
        },
        imagen: {
          recorteId: 'i-falda-recorte',
          miniaturaId: 'i-falda-mini',
          anclaje: { cx: 0, cy: 0.62, alto: 0.4 },
        },
        historialImagenes: [
          { tipo: 'silueta', recorteId: 'i-falda-recorte', miniaturaId: 'i-falda-mini', fecha: 1760000100000 },
        ],
        usos: 0,
        creada: 1760000100000,
        actualizada: 1760000200000,
      },
    ],
    imagenes: [
      imagen('i-blusa-recorte', 'recorte', prendaPng),
      imagen('i-blusa-mini', 'miniatura', prendaPng),
      imagen('i-blusa-original', 'original', fotoJpeg),
      imagen('i-falda-recorte', 'recorte', prendaPng),
      imagen('i-falda-mini', 'miniatura', prendaPng),
      imagen('i-falda-tela', 'tela', fotoJpeg),
      imagen('i-falda-proceso', 'proceso', fotoJpeg),
      imagen('i-maniqui', 'maniqui', mascaraPng),
      imagen('i-maniqui-mini', 'maniquiMiniatura', mascaraPng),
      imagen('i-outfit-mini', 'outfitMiniatura', prendaPng),
    ],
    siluetas: [
      {
        id: 's-importada',
        nombre: 'Falda lápiz',
        origen: 'importada',
        categoria: 'bottom',
        d: 'M60 130 L140 130 L146 280 L54 280 Z',
        caja: { x: 54, y: 130, ancho: 92, alto: 150 },
        creada: 1760000050000,
      },
    ],
    maniquies: [
      {
        id: 'm-1',
        nombre: 'Con tenis',
        imagenId: 'i-maniqui',
        miniaturaId: 'i-maniqui-mini',
        cuerpo: { x: 6, y: 6, ancho: 36, alto: 52 },
        principal: 1,
        creado: 1760000000000,
      },
    ],
    outfits: [
      {
        id: 'o-1',
        nombre: 'Domingo',
        etiquetas: ['casual'],
        maniquiId: 'm-1',
        capas: [
          { prendaId: 'p-falda', zona: 'abajo', t: { cx: 0, cy: 0.62, alto: 0.4, rotacion: 0 } },
          { prendaId: 'p-blusa', zona: 'arriba', t: { cx: 0.01, cy: 0.32, alto: 0.3, rotacion: -4 } },
        ],
        prendaIds: ['p-falda', 'p-blusa'],
        miniaturaId: 'i-outfit-mini',
        creado: 1760000300000,
        actualizado: 1760000400000,
      },
    ],
    calendario: [{ fecha: '2026-10-25', outfitId: 'o-1' }],
    usosDia: [{ fecha: '2026-10-19', outfitId: 'o-1', prendaIds: ['p-blusa'] }],
    medidas: [
      {
        id: 'perfil',
        campos: [
          { id: 'busto', nombre: 'Busto', valorCm: 88.5, personalizada: false, orden: 0 },
          { id: 'cintura', nombre: 'Cintura', valorCm: null, personalizada: false, orden: 1 },
          { id: 'c-1', nombre: 'Largo de falda', valorCm: 62, personalizada: true, orden: 2 },
        ],
        actualizado: '2026-10-03',
      },
    ],
    ajustes: [
      {
        id: 'ajustes',
        apariencia: 'oscuro',
        ultimoRespaldo: 1760000500000,
        dedicatoria: { nombre: 'Sofi', texto: 'Para que veas todo lo que ya tienes.' },
        onboarding: 'completo',
        chipArmadorVisto: 2,
        ultimaCategoria: 'top',
      },
    ],
    respaldosAuto: [
      { id: 'r-1', creado: 1760000600000, motivo: 'antes_de_importar', blob: blobDe(prendaPng), bytes: blobDe(prendaPng).size },
    ],
  };
}
