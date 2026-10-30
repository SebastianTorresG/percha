import { useLiveQuery } from 'dexie-react-hooks';
import { AvisoRespaldo } from '../componentes/AvisoRespaldo';
import { EncabezadoPestana, Pantalla } from '../componentes/Pantalla';
import { db } from '../datos/db';
import { useAjustes } from '../datos/repos/ajustes';
import { useNavegacion } from '../navegacion/useNavegacion';
import { necesitaRecordatorio } from '../respaldo/recordatorio';
import { formatearFechaLarga } from '../util/fechas';
import { useHoy } from '../util/useHoy';
import type { PropsPantallaDe } from './tipos';

/**
 * 01 Hoy — primera versión (T055): encabezado, "⋯" que abre el Menú (01c) y el aviso suave de
 * respaldo de 01b (FR-005). US6 agrega el plan del día, la sugerencia y la tira de la semana.
 */
export default function Hoy({ oculta }: PropsPantallaDe<'hoy'>) {
  const { navegacion } = useNavegacion();
  const hoy = useHoy();
  const ajustes = useAjustes();
  const hayPrendas = useLiveQuery(async () => (await db.prendas.count()) > 0, []);
  const avisar = ajustes !== undefined && hayPrendas !== undefined && necesitaRecordatorio(ajustes.ultimoRespaldo, hayPrendas, hoy);

  return (
    <Pantalla etiqueta="01 Hoy" conBarra oculta={oculta}>
      <EncabezadoPestana
        meta={formatearFechaLarga(hoy.getTime())}
        titulo="Hoy"
        accion={
          <button type="button" className="boton-redondo" aria-label="Menú" onClick={() => navegacion.abrirHoja({ hoja: 'menu' })}>
            ⋯
          </button>
        }
      />
      {avisar && <AvisoRespaldo ultimoRespaldo={ajustes.ultimoRespaldo} hoy={hoy} />}
    </Pantalla>
  );
}
