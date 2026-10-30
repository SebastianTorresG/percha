// Verificación de integridad al arrancar (data-model.md, *Imagen*). Cuenta las imágenes sin
// referencia y las referencias rotas, **sin borrar nada**: la limpieza es una acción explícita y
// probada. El resultado va al panel de diagnóstico. Las reglas están en referencias.ts y son las
// mismas que valida la importación de un respaldo.

import { fijarIntegridad, type ResultadoIntegridad } from '../diagnostico/registro';
import { db } from './db';
import { revisarReferencias } from './referencias';

export async function verificar(): Promise<ResultadoIntegridad> {
  const resultado = await db.transaction(
    'r',
    [db.imagenes, db.prendas, db.maniquies, db.outfits, db.siluetas, db.calendario],
    async () => {
      const idsImagenes = new Set(await db.imagenes.toCollection().primaryKeys());
      const { referenciadas, rotas } = revisarReferencias({
        prendas: await db.prendas.toArray(),
        maniquies: await db.maniquies.toArray(),
        outfits: await db.outfits.toArray(),
        calendario: await db.calendario.toArray(),
        idsImagenes,
        idsSiluetas: new Set(await db.siluetas.toCollection().primaryKeys()),
      });
      return {
        fecha: Date.now(),
        imagenes: idsImagenes.size,
        huerfanas: [...idsImagenes].filter((id) => !referenciadas.has(id)),
        rotas,
      };
    },
  );
  fijarIntegridad(resultado);
  return resultado;
}
